import axios, { AxiosError } from 'axios';
import { API_BASE } from '../../config/apiEndpoint';

interface ApiEnvelope {
  success: boolean;
  message: string | null;
  data: any;
  error: { code: string; message: string } | null;
}

async function getToken(): Promise<string | null> {
  try {
    if (typeof window !== 'undefined' && (window as any).knotsAuth) {
      return await (window as any).knotsAuth.getToken();
    }
  } catch {
    /* ignore */
  }
  return null;
}

const client = axios.create({ baseURL: API_BASE, timeout: 30000 });

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  // knots_ / guest_ are local zero-knowledge IDs — don't send to backend
  if (token && !token.startsWith('knots_') && !token.startsWith('guest_')) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function fullUrl(cfg: any): string {
  return `${cfg?.baseURL ?? ''}${cfg?.url ?? ''}`;
}

function unwrap<T = any>(res: { data: ApiEnvelope }): T {
  const env = res.data;
  if (!env.success) {
    const url = fullUrl((res as any).config);
    throw new Error(`[${url}] ${env.error?.message || env.message || 'Request failed'}`);
  }
  return env.data as T;
}

function toError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<ApiEnvelope>;
    const url = fullUrl(e.config);
    const status = e.response?.status ?? 'NET';
    const detail = e.response?.data?.error?.message || e.response?.data?.message || e.message;
    return new Error(`[${status} ${url}] ${detail}`);
  }
  return err instanceof Error ? err : new Error('Unknown error');
}

const wrap = <T>(p: Promise<{ data: ApiEnvelope }>): Promise<T> =>
  p.then(unwrap).catch((e) => { throw toError(e); });

// ---- Admin: Users ----
export const adminUsers = () => wrap<any[]>(client.get('/api/v1/admin/users'));
export const adminPayments = () => wrap<any[]>(client.get('/api/v1/admin/payments'));

// ---- Admin: Raw DB ----
export const adminDbQuery = (sql: string) =>
  wrap(client.post('/api/v1/admin/db/query', { sql }));

// ---- Admin: Render ----
export const renderRestart = () => wrap(client.post('/api/v1/admin/render/restart'));
export const renderDeploys = () => wrap(client.get('/api/v1/admin/render/deploys'));
export const renderEnv = () => wrap(client.get('/api/v1/admin/render/env'));
export const renderUpdateEnv = (vars: { key: string; value: string }[]) =>
  wrap(client.put('/api/v1/admin/render/env', vars));

// ---- Admin: Announcements ----
export const adminAnnouncements = () => wrap<any[]>(client.get('/api/v1/admin/announcements'));
export const adminCreateAnnouncement = (body: { title: string; body: string; severity?: string; active?: boolean }) =>
  wrap(client.post('/api/v1/admin/announcements', body));
export const adminUpdateAnnouncement = (id: string, body: { title?: string; body?: string; severity?: string; active?: boolean }) =>
  wrap(client.put(`/api/v1/admin/announcements/${id}`, body));
export const adminDeleteAnnouncement = (id: string) =>
  wrap(client.delete(`/api/v1/admin/announcements/${id}`));

// ---- Self: 2FA ----
export const totpSetup = () => wrap(client.post('/api/v1/auth/2fa/setup'));
export const totpEnable = (code: string) => wrap(client.post('/api/v1/auth/2fa/enable', { code }));
export const totpDisable = (code: string) => wrap(client.post('/api/v1/auth/2fa/disable', { code }));

// ---- Self: Devices ----
export const listDevices = () => wrap<any[]>(client.get('/api/v1/auth/devices'));
export const revokeDevice = (id: string) => wrap(client.delete(`/api/v1/auth/devices/${id}`));

// ---- Self: Referral ----
export const getReferral = () => wrap(client.get('/api/v1/user/referral'));

// ---- Public ----
export const apiVersion = () => wrap<{ build: string; ok: boolean }>(client.get('/api/v1/version'));
export const publicAnnouncements = () => wrap<any[]>(client.get('/api/v1/announcements'));
export const serverHealth = () => wrap(client.get('/api/v1/servers/health'));
export const paymentPlans = () => wrap(client.get('/api/v1/payments/plans'));
