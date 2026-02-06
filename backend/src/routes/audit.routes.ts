import { Router } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const auditRouter = Router();

auditRouter.use(authenticate);

// GET /api/audit-logs
auditRouter.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { search, action, date, page = '1', limit = '50' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {
            organizationId: req.user!.organizationId,
        };

        if (action && action !== 'all') {
            where.action = action;
        }

        if (date) {
            const d = new Date(date as string);
            where.createdAt = {
                gte: d,
                lt: new Date(d.getTime() + 24 * 60 * 60 * 1000),
            };
        }

        if (search) {
            where.OR = [
                { userName: { contains: search as string, mode: 'insensitive' } },
                { resourceId: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    userName: true,
                    action: true,
                    resourceType: true,
                    resourceId: true,
                    ipAddress: true,
                    metadata: true,
                    createdAt: true,
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        res.json({
            logs,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/audit-logs/export - CSV export
auditRouter.get('/export', async (req: AuthRequest, res, next) => {
    try {
        const { action, date } = req.query;

        const where: any = {
            organizationId: req.user!.organizationId,
        };

        if (action && action !== 'all') {
            where.action = action;
        }

        if (date) {
            const d = new Date(date as string);
            where.createdAt = {
                gte: d,
                lt: new Date(d.getTime() + 24 * 60 * 60 * 1000),
            };
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });

        // Generate CSV
        const header = 'Timestamp,User,Action,Resource,IP Address\n';
        const rows = logs.map((l) =>
            `"${l.createdAt.toISOString()}","${l.userName || ''}","${l.action}","${l.resourceId || ''}","${l.ipAddress || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
        res.send(header + rows);
    } catch (error) {
        next(error);
    }
});
