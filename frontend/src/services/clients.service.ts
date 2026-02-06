import { apiClient } from '@/lib/api-client';

export interface Client {
    id: string;
    name: string;
    phone: string;
    company?: string | null;
    requestsCount: number;
    lastRequestDate: string | null;
    createdAt: string;
}

export interface ClientsResponse {
    clients: Client[];
    total: number;
    page: number;
    totalPages: number;
}

export interface ClientDetails extends Client {
    requests: any[]; // Using any for simplicity here to avoid circular dependencies with Requests types, or verify later
}

export const clientsService = {
    getAll: (params?: { search?: string; page?: number; limit?: number }) =>
        apiClient.get<ClientsResponse>('/clients', { params: params as Record<string, string> }),

    getById: (id: string) =>
        apiClient.get<{ client: ClientDetails; requests: any[] }>(`/clients/${id}`),

    create: (data: { name: string; phone: string; company?: string }) =>
        apiClient.post<{ client: Client }>('/clients', data),
};
