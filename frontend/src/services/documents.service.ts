import { apiClient } from '@/lib/api-client';

export interface DocumentRequest {
    id: string;
    title: string;
    status: 'draft' | 'pending' | 'signed' | 'expired';
    createdAt: string;
    clientName: string;
}

export const documentsService = {
    getAll: (params?: any) => apiClient.get<DocumentRequest[]>('/documents', { params }),
    getById: (id: string) => apiClient.get<DocumentRequest>(`/documents/${id}`),
    create: (data: any) => apiClient.post<DocumentRequest>('/documents', data),
    update: (id: string, data: any) => apiClient.patch<DocumentRequest>(`/documents/${id}`, data),
    delete: (id: string) => apiClient.delete(`/documents/${id}`),
    sign: (id: string, data: { code: string }) => apiClient.post(`/documents/${id}/sign`, data),
};
