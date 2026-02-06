import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/error-handler.js';

export const clientsRouter = Router();

clientsRouter.use(authenticate);

const phoneRegex = /^\+7[0-9]{10}$/;

const createClientSchema = z.object({
    name: z.string().min(2, 'Имя должно быть не менее 2 символов'),
    phone: z.string().regex(phoneRegex, 'Формат: +77001234567'),
    company: z.string().optional().nullable(),
});

/**
 * Normalize Kazakhstan phone number
 * Accepts: +77070001234, 87070001234, 77070001234, 7 707 000 1234
 * Returns: +77070001234
 */
function normalizePhone(input: string): string {
    // Remove all non-digits
    let digits = input.replace(/\D/g, '');

    // Handle 8 -> 7 conversion for Kazakhstan
    if (digits.startsWith('8') && digits.length === 11) {
        digits = '7' + digits.slice(1);
    }

    // Ensure starts with 7
    if (!digits.startsWith('7')) {
        throw new AppError(400, 'Номер должен начинаться с 7 или 8');
    }

    // Should be exactly 11 digits (7 + 10)
    if (digits.length !== 11) {
        throw new AppError(400, 'Номер должен содержать 11 цифр');
    }

    return '+' + digits;
}

// GET /api/clients
clientsRouter.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { search, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const where: any = {
            organizationId: req.user!.organizationId,
        };

        if (search) {
            where.OR = [
                { name: { contains: search as string, mode: 'insensitive' } },
                { phone: { contains: search as string } },
                { company: { contains: search as string, mode: 'insensitive' } },
            ];
        }

        const [clients, total] = await Promise.all([
            prisma.client.findMany({
                where,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { requests: true } },
                    requests: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { createdAt: true },
                    },
                },
            }),
            prisma.client.count({ where }),
        ]);

        const clientsWithStats = clients.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            company: c.company,
            requestsCount: c._count.requests,
            lastRequestDate: c.requests[0]?.createdAt || null,
            createdAt: c.createdAt,
        }));

        res.json({
            clients: clientsWithStats,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/clients
clientsRouter.post('/', async (req: AuthRequest, res, next) => {
    try {
        const data = createClientSchema.parse(req.body);
        const phone = normalizePhone(data.phone);

        // Check for duplicate phone in organization
        const existing = await prisma.client.findFirst({
            where: {
                organizationId: req.user!.organizationId,
                phone,
            },
        });

        if (existing) {
            throw new AppError(409, 'Клиент с таким номером уже существует');
        }

        const client = await prisma.client.create({
            data: {
                organizationId: req.user!.organizationId,
                name: data.name,
                phone,
                company: data.company,
            },
        });

        res.status(201).json({ client });
    } catch (error) {
        next(error);
    }
});

// GET /api/clients/:id
clientsRouter.get('/:id', async (req: AuthRequest, res, next) => {
    try {
        const client = await prisma.client.findFirst({
            where: {
                id: req.params.id,
                organizationId: req.user!.organizationId,
            },
            include: {
                requests: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    select: {
                        id: true,
                        displayId: true,
                        documentName: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!client) {
            throw new AppError(404, 'Клиент не найден');
        }

        res.json({ client, requests: client.requests });
    } catch (error) {
        next(error);
    }
});
