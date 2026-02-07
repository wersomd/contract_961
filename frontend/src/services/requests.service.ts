import { apiClient } from '@/lib/api-client';

export interface DashboardStats {
    pending: number;
    signed: number;
    expired: number;
    drafts: number;
    total: number;
}

export interface Request {
    id: string;
    displayId: string;
    clientName: string;
    clientPhone: string;
    documentName: string;
    status: 'draft' | 'sent' | 'viewed' | 'code_sent' | 'signed' | 'canceled' | 'expired';
    createdAt: string;
    deadline?: string;
    managerName: string;
}

export interface RequestsResponse {
    requests: Request[];
    total: number;
    page: number;
    totalPages: number;
}

export interface CreateRequestData {
    clientName: string;
    clientPhone: string;
    documentName: string;
    comment?: string;
    deadline?: string;
}

export const requestsService = {
    getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
        apiClient.get<RequestsResponse>('/requests', { params: params as Record<string, string> }),

    getById: (id: string) =>
        apiClient.get<{ request: Request; timeline: any[]; documentUrl: string; signedDocumentUrl: string | null; signLink: string }>(`/requests/${id}`),

    create: (formData: FormData) =>
        apiClient.uploadFile<{ request: Request; signLink: string; smsSent: boolean }>('/requests', formData),

    resend: (id: string) =>
        apiClient.post<{ success: boolean }>(`/requests/${id}/resend`, {}),

    cancel: (id: string, reason?: string) =>
        apiClient.put<{ success: boolean }>(`/requests/${id}/cancel`, { reason }),

    deleteRequest: (id: string) =>
        apiClient.delete<{ success: boolean }>(`/requests/${id}`),

    exportToExcel: async (params?: { search?: string; status?: string }): Promise<{ empty: boolean } | Blob> => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.status && params.status !== 'all') queryParams.append('status', params.status);

        const token = localStorage.getItem('token');
        const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/requests/export?${queryParams.toString()}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }
        );

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            // Empty result
            return response.json();
        }

        // Excel file
        return response.blob();
    },
};

export const dashboardService = {
    getStats: async () => {
        const [statsData, requestsData] = await Promise.all([
            apiClient.get<{ pending: number; signed: number; expired: number; drafts: number; totalRequests: number }>('/dashboard/stats'),
            apiClient.get<{ requests: Request[] }>('/dashboard/active-requests'),
        ]);
        return {
            stats: {
                pending: statsData.pending,
                signed: statsData.signed,
                expired: statsData.expired,
                drafts: statsData.drafts,
            },
            activeRequests: requestsData.requests,
        };
    },
};
