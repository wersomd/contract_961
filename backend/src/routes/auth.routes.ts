import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/error-handler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/audit.service.js';

export const authRouter = Router();

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// POST /api/auth/login
authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
            include: { organization: true },
        });

        if (!user || !user.isActive) {
            throw new AppError(401, 'Неверный email или пароль');
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            throw new AppError(401, 'Неверный email или пароль');
        }

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            config.jwtSecret,
            { expiresIn: '7d' } // Fixed: use literal string instead of config value
        );

        // Audit log
        await createAuditLog({
            organizationId: user.organizationId,
            userId: user.id,
            userName: user.name,
            action: 'login',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
    try {
        await createAuditLog({
            organizationId: req.user!.organizationId,
            userId: req.user!.id,
            userName: req.user!.name,
            action: 'logout',
            ipAddress: req.ip,
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        res.json(user);
    } catch (error) {
        next(error);
    }
});
