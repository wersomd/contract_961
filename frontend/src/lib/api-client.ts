const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type FetchOptions = RequestInit & {
    headers?: Record<string, string>;
    params?: Record<string, string>;
};

export class ApiError extends Error {
    status: number;
    data: any;

    constructor(status: number, data: any) {
        super(`API Error: ${status}`);
        this.status = status;
        this.data = data;
    }
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const token = localStorage.getItem('token');

    const { params, headers: customHeaders, ...restOptions } = options;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...customHeaders,
    };

    const config = {
        ...restOptions,
        headers,
    };

    let url = `${API_URL}${endpoint}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, config);

    if (!response.ok) {
        if (response.status === 401) {
            // Handle unauthorized access (e.g., clear token and redirect)
            localStorage.removeItem('token');
            // Ideally dispatch an event or use context to redirect
            window.location.href = '/'; // Simple redirect for now
        }
        const data = await response.json().catch(() => ({}));
        throw new ApiError(response.status, data);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

export const apiClient = {
    get: <T>(endpoint: string, options?: FetchOptions) =>
        request<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, body: any, options?: FetchOptions) =>
        request<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

    put: <T>(endpoint: string, body: any, options?: FetchOptions) =>
        request<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),

    patch: <T>(endpoint: string, body: any, options?: FetchOptions) =>
        request<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

    delete: <T>(endpoint: string, options?: FetchOptions) =>
        request<T>(endpoint, { ...options, method: 'DELETE' }),

    /**
     * Upload file with FormData (for PDF uploads)
     */
    uploadFile: async <T>(endpoint: string, formData: FormData): Promise<T> => {
        const token = localStorage.getItem('token');
        const url = `${API_URL}${endpoint}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
        });

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/';
            }
            const data = await response.json().catch(() => ({}));
            throw new ApiError(response.status, data);
        }

        return response.json();
    },
};
