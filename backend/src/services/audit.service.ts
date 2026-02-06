import { prisma } from '../lib/prisma.js';

type AuditAction =
    | 'create_request'
    | 'upload_document'
    | 'send_link'
    | 'view_document'
    | 'send_otp'
    | 'verify_otp_attempt'
    | 'signed'
    | 'cancel_request'
    | 'resend_sms'
    | 'login'
    | 'logout'
    | 'settings_update'
    | 'delete_request';

interface AuditLogParams {
    organizationId?: string;
    userId?: string;
    userName?: string;
    action: AuditAction;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                organizationId: params.organizationId,
                userId: params.userId,
                userName: params.userName,
                action: params.action,
                resourceType: params.resourceType,
                resourceId: params.resourceId,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                metadata: params.metadata || {},
            },
        });
    } catch (error) {
        console.error('[Audit] Failed to create log:', error);
        // Don't throw - audit logging should not break the main flow
    }
}

/**
 * Mask phone number for privacy in logs
 * +77070001234 -> +7***1234
 */
export function maskPhone(phone: string): string {
    if (phone.length < 8) return '***';
    return phone.slice(0, 2) + '***' + phone.slice(-4);
}

/**
 * Mask name for privacy
 * Иванов Иван -> И***в И***
 */
export function maskName(name: string): string {
    return name
        .split(' ')
        .map((part) => {
            if (part.length < 3) return '***';
            return part[0] + '***' + part[part.length - 1];
        })
        .join(' ');
}
