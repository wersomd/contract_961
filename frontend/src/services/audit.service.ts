import { apiClient } from '@/lib/api-client';

export interface AuditLog {
    id: string;
    userName: string;
    action: string;
    resourceType: string;
    resourceId: string;
    ipAddress: string | null;
    metadata: any;
    createdAt: string;
}

export interface AuditResponse {
    logs: AuditLog[];
    total: number;
    page: number;
    totalPages: number;
}

export const auditService = {
    getLogs: (params?: { search?: string; action?: string; date?: string; page?: number; limit?: number }) =>
        apiClient.get<AuditResponse>('/audit-logs', { params: params as Record<string, string> }),

    exportCsv: (params?: { action?: string; date?: string }) =>
        apiClient.get<string>('/audit-logs/export', {
            params: params as Record<string, string>,
            headers: { Accept: 'text/csv' }
        }),
};
