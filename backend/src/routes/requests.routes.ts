import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error-handler.js';
import { createAuditLog, maskPhone } from '../services/audit.service.js';
import { smsProvider } from '../services/sms.service.js';

export const requestsRouter = Router();

requestsRouter.use(authenticate);

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const dir = path.join(config.uploadDir, 'documents');
        await fs.mkdir(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: config.maxFileSize },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});

const phoneRegex = /^\+7[0-9]{10}$/;

function normalizePhone(input: string): string {
    let digits = input.replace(/\D/g, '');
    if (digits.startsWith('8') && digits.length === 11) {
        digits = '7' + digits.slice(1);
    }
    if (!digits.startsWith('7') || digits.length !== 11) {
        throw new AppError(400, 'Неверный формат номера телефона');
    }
    return '+' + digits;
}

async function generateDisplayId(): Promise<string> {
    const year = new Date().getFullYear();
    const lastRequest = await prisma.request.findFirst({
        where: { displayId: { startsWith: `REQ-${year}` } },
        orderBy: { displayId: 'desc' },
    });

    let num = 1;
    if (lastRequest) {
        const match = lastRequest.displayId.match(/REQ-\d{4}-(\d+)/);
        if (match) num = parseInt(match[1], 10) + 1;
    }

    return `REQ-${year}-${String(num).padStart(3, '0')}`;
}

async function calculateFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
}

// GET /api/requests
requestsRouter.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { search, status, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const where: any = { organizationId: req.user!.organizationId };

        if (status && status !== 'all') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { displayId: { contains: search as string, mode: 'insensitive' } },
                { clientName: { contains: search as string, mode: 'insensitive' } },
                { documentName: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const [requests, total] = await Promise.all([
            prisma.request.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    displayId: true,
                    clientName: true,
                    clientPhone: true,
                    documentName: true,
                    status: true,
                    createdAt: true,
                    deadline: true,
                    managerName: true,
                },
            }),
            prisma.request.count({ where }),
        ]);

        res.json({
            requests,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/requests (with file upload)
requestsRouter.post('/', upload.single('documentFile'), async (req: AuthRequest, res, next) => {
    try {
        const { clientId, clientName, clientPhone, documentName, comment, deadline } = req.body;

        if (!req.file) {
            throw new AppError(400, 'PDF файл обязателен');
        }

        const normalizedPhone = normalizePhone(clientPhone);
        const displayId = await generateDisplayId();
        const signToken = uuidv4();
        const fileHash = await calculateFileHash(req.file.path);

        // Create document record
        const document = await prisma.document.create({
            data: {
                organizationId: req.user!.organizationId,
                name: documentName,
                originalPath: req.file.path,
                originalHash: fileHash,
                fileSizeBytes: req.file.size,
                uploadedBy: req.user!.id,
                versions: {
                    create: {
                        versionType: 'original',
                        storagePath: req.file.path,
                        fileHash,
                    },
                },
            },
        });

        // Create or reuse client
        let resolvedClientId = clientId;
        if (!clientId) {
            const existingClient = await prisma.client.findFirst({
                where: { organizationId: req.user!.organizationId, phone: normalizedPhone },
            });

            if (existingClient) {
                resolvedClientId = existingClient.id;
            } else {
                const newClient = await prisma.client.create({
                    data: {
                        organizationId: req.user!.organizationId,
                        name: clientName,
                        phone: normalizedPhone,
                    },
                });
                resolvedClientId = newClient.id;
            }
        }

        // Create request
        const request = await prisma.request.create({
            data: {
                displayId,
                organizationId: req.user!.organizationId,
                clientId: resolvedClientId,
                clientName,
                clientPhone: normalizedPhone,
                documentId: document.id,
                documentName,
                signToken,
                managerId: req.user!.id,
                managerName: req.user!.name,
                comment,
                deadline: deadline ? new Date(deadline) : null,
                status: 'sent',
                sentAt: new Date(),
            },
        });

        const signLink = `${config.frontendUrl}/client/${signToken}`;

        // Send SMS with link
        const settings = await prisma.settings.findFirst({
            where: { organizationId: req.user!.organizationId },
        });

        const messageTemplate = settings?.smsLinkTemplate || 'Вам поступил документ для подписания от 961.kz.\nСсылка: {link}';
        const message = messageTemplate.replace('{link}', signLink);

        const smsResult = await smsProvider.send(normalizedPhone, message);

        // Audit log
        await createAuditLog({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            userName: req.user!.name,
            action: 'create_request',
            resourceType: 'request',
            resourceId: request.id,
            ipAddress: req.ip,
            metadata: {
                displayId,
                clientPhone: maskPhone(normalizedPhone),
                smsSent: smsResult.success,
            },
        });

        res.status(201).json({
            request: {
                id: request.id,
                displayId: request.displayId,
                status: request.status,
                signLink,
            },
            signLink,
            smsSent: smsResult.success,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/requests/:id
requestsRouter.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const request = await prisma.request.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.user!.organizationId,
            },
            include: {
                document: {
                    include: { versions: true },
                },
            },
        });

        if (!request) {
            throw new AppError(404, 'Заявка не найдена');
        }

        // Build timeline
        const timeline: Array<{ type: string; title: string; timestamp: Date; metadata: Record<string, unknown> }> = [
            { type: 'created', title: 'Создано', timestamp: request.createdAt, metadata: { manager: request.managerName } },
        ];

        if (request.sentAt) {
            timeline.push({ type: 'sent', title: 'Отправлено', timestamp: request.sentAt, metadata: {} });
        }
        if (request.viewedAt) {
            timeline.push({ type: 'viewed', title: 'Просмотрено', timestamp: request.viewedAt, metadata: { ip: request.clientIp } });
        }
        if (request.signedAt) {
            timeline.push({ type: 'signed', title: 'Подписано', timestamp: request.signedAt, metadata: {} });
        }
        if (request.canceledAt) {
            timeline.push({ type: 'canceled', title: 'Отменено', timestamp: request.canceledAt, metadata: { reason: request.cancelReason } });
        }

        const signedVersion = request.document?.versions.find((v) => v.versionType === 'signed');

        res.json({
            request: {
                id: request.id,
                displayId: request.displayId,
                clientName: request.clientName,
                clientPhone: request.clientPhone,
                documentName: request.documentName,
                status: request.status,
                createdAt: request.createdAt,
                deadline: request.deadline,
                managerName: request.managerName,
                comment: request.comment,
            },
            timeline,
            documentUrl: request.document ? `/api/requests/${request.id}/document` : null,
            signedDocumentUrl: signedVersion ? `/api/requests/${request.id}/signed-document` : null,
            signLink: `${config.frontendUrl}/client/${request.signToken}`,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/requests/:id/resend
requestsRouter.post('/:id/resend', async (req: AuthRequest, res, next) => {
    try {
        const request = await prisma.request.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.user!.organizationId,
                status: { in: ['sent', 'viewed', 'code_sent'] },
            },
        });

        if (!request) {
            throw new AppError(404, 'Заявка не найдена или не может быть повторно отправлена');
        }

        const signLink = `${config.frontendUrl}/client/${request.signToken}`;

        const settings = await prisma.settings.findFirst({
            where: { organizationId: req.user!.organizationId },
        });

        const message = (settings?.smsLinkTemplate || 'Подпишите документ: {link}').replace('{link}', signLink);
        const smsResult = await smsProvider.send(request.clientPhone, message);

        await createAuditLog({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            userName: req.user!.name,
            action: 'resend_sms',
            resourceType: 'request',
            resourceId: request.id,
            metadata: { smsSent: smsResult.success },
        });

        res.json({ success: smsResult.success, message: 'SMS отправлено повторно' });
    } catch (error) {
        next(error);
    }
});

// PUT /api/requests/:id/cancel
requestsRouter.put('/:id/cancel', async (req: AuthRequest, res, next) => {
    try {
        const { reason } = req.body;

        const request = await prisma.request.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.user!.organizationId,
                status: { in: ['draft', 'sent', 'viewed', 'code_sent'] },
            },
        });

        if (!request) {
            throw new AppError(404, 'Заявка не найдена или не может быть отменена');
        }

        await prisma.request.update({
            where: { id: request.id },
            data: {
                status: 'canceled',
                canceledAt: new Date(),
                cancelReason: reason || null,
            },
        });

        await createAuditLog({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            userName: req.user!.name,
            action: 'cancel_request',
            resourceType: 'request',
            resourceId: request.id,
            metadata: { reason },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/requests/:id/document - serve original PDF
requestsRouter.get('/:id/document', async (req: AuthRequest, res, next) => {
    try {
        const request = await prisma.request.findFirst({
            where: { id: req.params.id, organizationId: req.user!.organizationId },
            include: { document: true },
        });

        if (!request?.document) {
            throw new AppError(404, 'Документ не найден');
        }

        const encodedFilename = encodeURIComponent(`${request.documentName}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`);
        res.sendFile(request.document.originalPath);
    } catch (error) {
        next(error);
    }
});

// GET /api/requests/:id/signed-document
requestsRouter.get('/:id/signed-document', async (req: AuthRequest, res, next) => {
    try {
        const request = await prisma.request.findFirst({
            where: { id: req.params.id, organizationId: req.user!.organizationId, status: 'signed' },
            include: { document: { include: { versions: true } } },
        });

        if (!request?.document) {
            throw new AppError(404, 'Документ не найден');
        }

        const signedVersion = request.document.versions.find((v) => v.versionType === 'signed');
        if (!signedVersion) {
            throw new AppError(404, 'Подписанный документ не найден');
        }

        const encodedFilename = encodeURIComponent(`${request.documentName}_signed.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
        res.sendFile(signedVersion.storagePath);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/requests/:id - Delete a request
requestsRouter.delete('/:id', async (req: AuthRequest, res, next) => {
    try {
        const { id } = req.params;

        const request = await prisma.request.findFirst({
            where: {
                id,
                organizationId: req.user!.organizationId,
            },
            include: {
                document: {
                    include: {
                        versions: true,
                    },
                },
            },
        });

        if (!request) {
            throw new AppError(404, 'Заявка не найдена');
        }

        // Delete files from disk
        if (request.document) {
            for (const version of request.document.versions) {
                try {
                    await fs.unlink(version.storagePath);
                } catch {
                    // File may not exist
                }
            }
        }

        // Create audit log BEFORE deletion (to avoid FK constraint violation)
        await createAuditLog({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            action: 'delete_request',
            resourceType: 'request',
            metadata: { displayId: request.displayId, documentName: request.documentName, deletedRequestId: id },
            ipAddress: req.ip || 'unknown',
        });

        // Delete request (cascades to document and versions)
        await prisma.request.delete({
            where: { id },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});
