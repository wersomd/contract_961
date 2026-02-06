import { apiClient } from '@/lib/api-client';

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'manager' | 'client';
}

export interface LoginResponse {
    user: User;
    token: string;
}

export const authService = {
    login: (data: any) => apiClient.post<LoginResponse>('/auth/login', data),
    register: (data: any) => apiClient.post<LoginResponse>('/auth/register', data),
    logout: () => apiClient.post('/auth/logout', {}),
    me: () => apiClient.get<User>('/auth/me'),
};
