import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error-handler.js';
import { createAuditLog, maskPhone } from '../services/audit.service.js';
import { smsProvider } from '../services/sms.service.js';
import { stampPdf } from '../services/pdf.service.js';

export const signRouter = Router();

// Rate limit for sending OTP codes - stricter (SMS costs money!)
const sendCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // max 3 code requests per 15 min per IP
    message: { error: 'Слишком много запросов кода. Попробуйте через 15 минут.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limit for verifying OTP - allow more attempts for typos
const verifyCodeLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // max 10 verify attempts per 5 min per IP
    message: { error: 'Слишком много попыток. Попробуйте через 5 минут.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General rate limit for document viewing
const viewLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: { error: 'Слишком много запросов' },
});

// GET /sign/:token - Get document info for signing
signRouter.get('/:token', async (req, res, next) => {
    try {
        const { token } = req.params;

        const request = await prisma.request.findUnique({
            where: { signToken: token },
            include: { document: true },
        });

        if (!request) {
            return res.json({ valid: false, error: 'Ссылка недействительна' });
        }

        // Check if expired
        if (request.deadline && new Date() > request.deadline) {
            if (request.status !== 'expired') {
                await prisma.request.update({
                    where: { id: request.id },
                    data: { status: 'expired' },
                });
            }
            return res.json({ valid: false, error: 'Срок подписания истек' });
        }

        // Check if already signed
        if (request.status === 'signed') {
            return res.json({ valid: false, error: 'Документ уже подписан' });
        }

        // Check if canceled
        if (request.status === 'canceled') {
            return res.json({ valid: false, error: 'Заявка отменена' });
        }

        // Mark as viewed if first time
        if (request.status === 'sent') {
            await prisma.request.update({
                where: { id: request.id },
                data: {
                    status: 'viewed',
                    viewedAt: new Date(),
                    clientIp: req.ip,
                    clientUserAgent: req.headers['user-agent'],
                },
            });

            await createAuditLog({
                organizationId: request.organizationId,
                action: 'view_document',
                resourceType: 'request',
                resourceId: request.id,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { clientPhone: maskPhone(request.clientPhone) },
            });
        }

        res.json({
            valid: true,
            request: {
                id: request.id,
                displayId: request.displayId,
                documentName: request.documentName,
                clientName: request.clientName,
                status: request.status,
            },
            documentUrl: `/sign/${token}/document`,
        });
    } catch (error) {
        next(error);
    }
});

// GET /sign/:token/document - Serve PDF for viewing
signRouter.get('/:token/document', async (req, res, next) => {
    try {
        const request = await prisma.request.findUnique({
            where: { signToken: req.params.token },
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

// POST /sign/:token/send-code - Send OTP
signRouter.post('/:token/send-code', sendCodeLimiter, async (req, res, next) => {
    try {
        const { token } = req.params;

        const request = await prisma.request.findUnique({
            where: { signToken: token },
        });

        if (!request) {
            throw new AppError(404, 'Заявка не найдена');
        }

        if (!['sent', 'viewed', 'code_sent'].includes(request.status)) {
            throw new AppError(400, 'Невозможно отправить код для данной заявки');
        }

        // Deactivate previous OTPs
        await prisma.otpCode.updateMany({
            where: { requestId: request.id, isActive: true },
            data: { isActive: false },
        });

        // Generate 6-digit code
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const codeHash = await bcrypt.hash(code, 10);

        // Create OTP record
        await prisma.otpCode.create({
            data: {
                requestId: request.id,
                codeHash,
                expiresAt: new Date(Date.now() + config.otp.ttlMinutes * 60 * 1000),
            },
        });

        // Update request status
        await prisma.request.update({
            where: { id: request.id },
            data: { status: 'code_sent' },
        });

        // Get SMS template
        const settings = await prisma.settings.findFirst({
            where: { organizationId: request.organizationId },
        });

        const messageTemplate = settings?.smsCodeTemplate || 'Код подтверждения: {code}';
        const message = messageTemplate.replace('{code}', code);

        // Send SMS (code is sent, NOT logged!)
        const smsResult = await smsProvider.send(request.clientPhone, message);

        // Audit log (without code!)
        await createAuditLog({
            organizationId: request.organizationId,
            action: 'send_otp',
            resourceType: 'request',
            resourceId: request.id,
            ipAddress: req.ip,
            metadata: {
                clientPhone: maskPhone(request.clientPhone),
                smsSent: smsResult.success,
            },
        });

        res.json({
            success: smsResult.success,
            expiresIn: config.otp.ttlMinutes * 60,
        });
    } catch (error) {
        next(error);
    }
});

// POST /sign/:token/verify - Verify OTP and finalize signing
signRouter.post('/:token/verify', verifyCodeLimiter, async (req, res, next) => {
    try {
        const { token } = req.params;
        const { code } = req.body;

        if (!code || code.length !== 6) {
            throw new AppError(400, 'Неверный формат кода');
        }

        const request = await prisma.request.findUnique({
            where: { signToken: token },
            include: { document: true, organization: true },
        });

        if (!request) {
            throw new AppError(404, 'Заявка не найдена');
        }

        if (request.status !== 'code_sent') {
            throw new AppError(400, 'Сначала запросите код');
        }

        // Find active OTP
        const otp = await prisma.otpCode.findFirst({
            where: {
                requestId: request.id,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
        });

        if (!otp) {
            return res.json({
                success: false,
                error: 'Код истек, запросите новый',
                attemptsLeft: 0,
            });
        }

        // Check max attempts
        if (otp.attempts >= otp.maxAttempts) {
            await prisma.otpCode.update({
                where: { id: otp.id },
                data: { isActive: false },
            });
            return res.json({
                success: false,
                error: 'Превышено количество попыток',
                attemptsLeft: 0,
            });
        }

        // Verify code
        const isValid = await bcrypt.compare(code, otp.codeHash);

        if (!isValid) {
            await prisma.otpCode.update({
                where: { id: otp.id },
                data: { attempts: otp.attempts + 1 },
            });

            await createAuditLog({
                organizationId: request.organizationId,
                action: 'verify_otp_attempt',
                resourceType: 'request',
                resourceId: request.id,
                ipAddress: req.ip,
                metadata: { success: false, attempts: otp.attempts + 1 },
            });

            return res.json({
                success: false,
                error: 'Неверный код',
                attemptsLeft: otp.maxAttempts - otp.attempts - 1,
            });
        }

        // OTP is valid - finalize signing
        await prisma.otpCode.update({
            where: { id: otp.id },
            data: { isActive: false, verifiedAt: new Date() },
        });

        // Stamp PDF
        let signedPath: string | null = null;
        let signedHash: string | null = null;

        if (request.document) {
            try {
                const result = await stampPdf({
                    originalPath: request.document.originalPath,
                    displayId: request.displayId,
                    clientName: request.clientName,
                    clientPhone: request.clientPhone,
                    signedAt: new Date(),
                    organizationName: request.organization?.name,
                });
                signedPath = result.path;
                signedHash = result.hash;

                // Save signed version
                await prisma.documentVersion.create({
                    data: {
                        documentId: request.document.id,
                        versionType: 'signed',
                        storagePath: signedPath,
                        fileHash: signedHash,
                    },
                });
            } catch (err) {
                console.error('PDF stamping failed:', err);
                // Continue anyway - signing is still valid
            }
        }

        // Update request to signed
        await prisma.request.update({
            where: { id: request.id },
            data: {
                status: 'signed',
                signedAt: new Date(),
                clientIp: req.ip,
                clientUserAgent: req.headers['user-agent'],
            },
        });

        await createAuditLog({
            organizationId: request.organizationId,
            action: 'signed',
            resourceType: 'request',
            resourceId: request.id,
            ipAddress: req.ip,
            metadata: {
                clientPhone: maskPhone(request.clientPhone),
                pdfStamped: !!signedPath,
            },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /sign/:token/signed-document - Download signed PDF
signRouter.get('/:token/signed-document', async (req, res, next) => {
    try {
        const request = await prisma.request.findUnique({
            where: { signToken: req.params.token },
            include: { document: { include: { versions: true } } },
        });

        if (!request || request.status !== 'signed') {
            throw new AppError(404, 'Документ не найден');
        }

        const signedVersion = request.document?.versions.find((v) => v.versionType === 'signed');

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
