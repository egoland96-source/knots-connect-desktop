import type { User, AuthResponse, LoginRequest, RegisterRequest } from '../../types/auth.types';
import { API_BASE } from '../../config/apiEndpoint';

class AuthAPI {
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await window.knotsAuth?.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    // knots_ / guest_ are local zero-knowledge IDs — don't send to backend
    if (token && !token.startsWith('knots_') && !token.startsWith('guest_')) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  private async withHWID<T extends { hwid?: string }>(data: T): Promise<T> {
    try {
      const hwid = await (window as any).knots?.getHWID?.();
      if (hwid) return { ...data, hwid };
    } catch {}
    return data;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const body = await this.withHWID(credentials);
    return this.request<AuthResponse>('POST', '/api/v1/auth/login', body);
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const body = await this.withHWID(userData);
    return this.request<AuthResponse>('POST', '/api/v1/auth/register', body);
  }

  getProfile(): Promise<User> {
    return this.request<User>('GET', '/api/v1/auth/me');
  }

  refreshToken(refreshToken: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('POST', '/api/v1/auth/refresh', { refresh_token: refreshToken });
  }

  logout(): Promise<void> {
    return this.request<void>('POST', '/api/v1/auth/logout');
  }
}

export const authAPI = new AuthAPI();