import { Router } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { createAuditLog } from '../services/audit.service.js';
import { smsProvider } from '../services/sms.service.js';
import { AppError } from '../middleware/error-handler.js';

export const settingsRouter = Router();

settingsRouter.use(authenticate);

// GET /api/settings
settingsRouter.get('/', async (req: AuthRequest, res, next) => {
    try {
        const settings = await prisma.settings.findFirst({
            where: { organizationId: req.user!.organizationId },
        });

        if (!settings) {
            // Return defaults
            return res.json({
                sms: {
                    provider: 'smsc',
                    senderName: '961kz',
                    linkTemplate: 'Подпишите документ: {link}',
                    codeTemplate: 'Код подтверждения: {code}',
                },
                security: {
                    ipWhitelist: false,
                    auditLogging: true,
                    logRetentionDays: 90,
                },
            });
        }

        res.json({
            sms: {
                provider: settings.smsProvider,
                senderName: settings.smsSenderName,
                linkTemplate: settings.smsLinkTemplate,
                codeTemplate: settings.smsCodeTemplate,
            },
            security: {
                ipWhitelist: settings.ipWhitelistEnabled,
                auditLogging: settings.auditLoggingEnabled,
                logRetentionDays: settings.logRetentionDays,
            },
        });
    } catch (error) {
        next(error);
    }
});

// PUT /api/settings (admin only)
settingsRouter.put('/', requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { sms, security } = req.body;

        await prisma.settings.upsert({
            where: { organizationId: req.user!.organizationId },
            create: {
                organizationId: req.user!.organizationId,
                smsProvider: sms?.provider || 'smsc',
                smsSenderName: sms?.senderName || '961kz',
                smsLinkTemplate: sms?.linkTemplate || 'Подпишите документ: {link}',
                smsCodeTemplate: sms?.codeTemplate || 'Код подтверждения: {code}',
                ipWhitelistEnabled: security?.ipWhitelist || false,
                auditLoggingEnabled: security?.auditLogging ?? true,
                logRetentionDays: security?.logRetentionDays || 90,
            },
            update: {
                smsProvider: sms?.provider,
                smsSenderName: sms?.senderName,
                smsLinkTemplate: sms?.linkTemplate,
                smsCodeTemplate: sms?.codeTemplate,
                ipWhitelistEnabled: security?.ipWhitelist,
                auditLoggingEnabled: security?.auditLogging,
                logRetentionDays: security?.logRetentionDays,
            },
        });

        await createAuditLog({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            userName: req.user!.name,
            action: 'settings_update',
            ipAddress: req.ip,
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// POST /api/settings/sms/test
settingsRouter.post('/sms/test', requireAdmin, async (req: AuthRequest, res, next) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            throw new AppError(400, 'Номер телефона обязателен');
        }

        const result = await smsProvider.send(phone, 'Тестовое сообщение от 961.kz');

        res.json({
            success: result.success,
            message: result.success ? 'SMS отправлено' : result.error,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/users
settingsRouter.get('/users', async (req: AuthRequest, res, next) => {
    try {
        const users = await prisma.user.findMany({
            where: { organizationId: req.user!.organizationId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                lastLoginAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ users });
    } catch (error) {
        next(error);
    }
});
