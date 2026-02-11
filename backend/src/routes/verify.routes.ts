import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { maskPhone, maskName } from '../services/audit.service.js';
import { serveFile } from '../services/storage.service.js';

export const verifyRouter = Router();

// GET /verify/:token - Public verification page (secure token lookup)
verifyRouter.get('/:token', async (req, res, next) => {
    try {
        const { token } = req.params;

        // Only allow verification by secure token, not displayId
        // Token is 64 hex chars, displayId is like REQ-2026-001
        const isSecureToken = /^[a-f0-9]{64}$/i.test(token);

        if (!isSecureToken) {
            return res.json({
                valid: false,
                error: 'Неверный токен верификации',
            });
        }

        const request = await prisma.request.findUnique({
            where: { verifyToken: token },
            include: {
                document: {
                    include: { versions: true },
                },
            },
        });

        if (!request) {
            return res.json({
                valid: false,
                error: 'Документ не найден',
            });
        }

        // Only return data for signed documents
        if (request.status !== 'signed') {
            return res.json({
                valid: false,
                error: 'Документ еще не подписан',
            });
        }

        const signedVersion = request.document?.versions.find((v) => v.versionType === 'signed');

        res.json({
            valid: true,
            request: {
                displayId: request.displayId,
                documentName: request.documentName,
                clientName: maskName(request.clientName),
                clientPhone: maskPhone(request.clientPhone),
                status: request.status,
                signedAt: request.signedAt,
                createdAt: request.createdAt,
            },
            documentUrl: signedVersion ? `/api/public/verify/${token}/document` : null,
            fileHash: signedVersion?.fileHash || null,
            originalHash: request.document?.originalHash || null,
        });
    } catch (error) {
        next(error);
    }
});

// GET /verify/:token/document - Public signed PDF download
verifyRouter.get('/:token/document', async (req, res, next) => {
    try {
        const { token } = req.params;

        // Validate token format
        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(404).json({ error: 'Документ не найден' });
        }

        const request = await prisma.request.findUnique({
            where: { verifyToken: token },
            include: {
                document: {
                    include: { versions: true },
                },
            },
        });

        if (!request || request.status !== 'signed') {
            return res.status(404).json({ error: 'Документ не найден' });
        }

        const signedVersion = request.document?.versions.find((v) => v.versionType === 'signed');

        if (!signedVersion) {
            return res.status(404).json({ error: 'Подписанный документ не найден' });
        }

        await serveFile(res, signedVersion.storagePath, `${request.documentName}_signed.pdf`);
    } catch (error) {
        next(error);
    }
});
