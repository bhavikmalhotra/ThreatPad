import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { body, headers: customHeaders, ...rest } = options;
    const token = useAuthStore.getState().accessToken;

    const headers: Record<string, string> = {
      ...customHeaders as Record<string, string>,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...rest,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        const newToken = useAuthStore.getState().accessToken;
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          ...rest,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        });
        if (!retryResponse.ok) {
          throw await this.handleError(retryResponse);
        }
        return retryResponse.json();
      }
      useAuthStore.getState().logout();
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw await this.handleError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) return false;
      const data = await response.json();
      useAuthStore.getState().setToken(data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  private async handleError(response: Response): Promise<Error> {
    try {
      const data = await response.json();
      return new Error(data.message || `Request failed: ${response.status}`);
    } catch {
      return new Error(`Request failed: ${response.status}`);
    }
  }

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async upload<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${useAuthStore.getState().accessToken}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        });
      }
      if (!response.ok) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    if (!response.ok) throw await this.handleError(response);
    return response.json();
  }
}

export const api = new ApiClient(API_URL);
