import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from './error-handler.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        role: 'admin' | 'manager';
        organizationId: string;
    };
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError(401, 'Unauthorized');
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, config.jwtSecret) as {
            userId: string;
        };

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                organizationId: true,
                isActive: true,
            },
        });

        if (!user || !user.isActive) {
            throw new AppError(401, 'Unauthorized');
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new AppError(401, 'Invalid token'));
        }
        next(error);
    }
};

export const requireAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (req.user?.role !== 'admin') {
        return next(new AppError(403, 'Admin access required'));
    }
    next();
};
