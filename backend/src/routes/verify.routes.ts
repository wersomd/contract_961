import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { maskPhone, maskName } from '../services/audit.service.js';

export const verifyRouter = Router();

// GET /verify/:displayId - Public verification page
verifyRouter.get('/:displayId', async (req, res, next) => {
    try {
        const { displayId } = req.params;

        const request = await prisma.request.findUnique({
            where: { displayId },
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

        if (request.status !== 'signed') {
            return res.json({
                valid: false,
                error: 'Документ не подписан',
            });
        }

        const signedVersion = request.document?.versions.find((v) => v.versionType === 'signed');

        res.json({
            valid: true,
            documentName: request.documentName,
            signerName: maskName(request.clientName),
            signerPhone: maskPhone(request.clientPhone),
            signedAt: request.signedAt,
            requestId: request.displayId,
            fileHash: signedVersion?.fileHash || null,
            originalHash: request.document?.originalHash || null,
            documentUrl: `/api/verify/${displayId}/document`,
        });
    } catch (error) {
        next(error);
    }
});

// GET /verify/:displayId/document - Public signed PDF download
verifyRouter.get('/:displayId/document', async (req, res, next) => {
    try {
        const { displayId } = req.params;

        const request = await prisma.request.findUnique({
            where: { displayId },
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

        const encodedFilename = encodeURIComponent(`${request.documentName}_signed.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`);
        res.sendFile(signedVersion.storagePath);
    } catch (error) {
        next(error);
    }
});
