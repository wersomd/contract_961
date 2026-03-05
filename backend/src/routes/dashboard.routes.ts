import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

// GET /api/dashboard/stats
dashboardRouter.get('/stats', async (req: AuthRequest, res, next) => {
    try {
        const orgId = req.user!.organizationId;
        const baseWhere: any = { organizationId: orgId };

        // Managers see only their own requests
        if (req.user!.role === 'manager') {
            baseWhere.managerId = req.user!.id;
        }

        const [pending, signed, expired, drafts, total] = await Promise.all([
            prisma.request.count({
                where: { ...baseWhere, status: { in: ['sent', 'viewed', 'code_sent'] } },
            }),
            prisma.request.count({
                where: { ...baseWhere, status: 'signed' },
            }),
            prisma.request.count({
                where: { ...baseWhere, status: 'expired' },
            }),
            prisma.request.count({
                where: { ...baseWhere, status: 'draft' },
            }),
            prisma.request.count({
                where: { ...baseWhere },
            }),
        ]);

        // Calculate average signing time (simplified)
        const signedRequests = await prisma.request.findMany({
            where: {
                ...baseWhere,
                status: 'signed',
                signedAt: { not: null },
            },
            select: { createdAt: true, signedAt: true },
            take: 100,
            orderBy: { signedAt: 'desc' },
        });

        let averageTime = 0;
        if (signedRequests.length > 0) {
            const totalHours = signedRequests.reduce((acc, r) => {
                const diff = r.signedAt!.getTime() - r.createdAt.getTime();
                return acc + diff / (1000 * 60 * 60);
            }, 0);
            averageTime = Math.round(totalHours / signedRequests.length);
        }

        res.json({
            totalRequests: total,
            pending,
            signed,
            expired,
            drafts,
            averageTime,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/dashboard/active-requests
dashboardRouter.get('/active-requests', async (req: AuthRequest, res, next) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;

        const activeWhere: any = {
            organizationId: req.user!.organizationId,
            status: { in: ['sent', 'viewed', 'code_sent'] },
        };

        // Managers see only their own requests
        if (req.user!.role === 'manager') {
            activeWhere.managerId = req.user!.id;
        }

        const requests = await prisma.request.findMany({
            where: activeWhere,
            orderBy: { createdAt: 'desc' },
            take: limit,
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
        });

        res.json({ requests });
    } catch (error) {
        next(error);
    }
});
