import type { AuthUser, Session, LoginCredentials, RegisterData } from '../types/auth';

function resolveApiBase(): string {
  const raw = ((import.meta.env.VITE_API_URL as string) || '/api').trim().replace(/\/+$/, '');
  if (!raw || raw === '/api') return '/api';
  // Acepta tanto el origen (https://back.onrender.com) como la base con /api
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

const API_BASE = resolveApiBase();

function getStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem('lottery-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // zustand/persist guarda { state: { user, session }, version }
    return (parsed?.state?.session || parsed?.session || null) as Session | null;
  } catch {
    return null;
  }
}

function buildHeaders(hasBody: boolean, extra?: HeadersInit, skipAuth = false): HeadersInit {
  const headers: Record<string, string> = { ...(extra as Record<string, string>) };
  if (hasBody && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (!skipAuth) {
    const session = getStoredSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    return fetchApi<{ user: AuthUser; session: Session }>(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, true);
  },
  async logout() {
    return fetchApi<void>(`${API_BASE}/auth/logout`, { method: 'POST' });
  },
  async register(data: RegisterData) {
    return fetchApi<{ user: AuthUser; session: Session }>(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, true);
  },
  async refresh() {
    const session = getStoredSession();
    if (!session?.refresh_token) throw new Error('Sin refresh_token en sesión local');
    return fetchApi<{ user: AuthUser; session: Session }>(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    }, true);
  },
  async getCurrentUser() {
    return fetchApi<AuthUser>(`${API_BASE}/auth/me`);
  },
};

async function fetchApi<T>(url: string, options: RequestInit = {}, skipAuth = false): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const hasBody = options.body !== undefined && options.body !== null;
    const response = await fetch(url, {
      ...options,
      headers: buildHeaders(hasBody, options.headers, skipAuth),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API ${response.status} ${url} - ${errText.slice(0, 200)}`);
    }
    if (response.status === 204) return null as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Timeout llamando ${url} (15s). Revisa que el backend esté encendido.`);
    }
    throw error;
  }
}

export const ticketApi = {
  async getAll() { return fetchApi<Array<any>>(`${API_BASE}/tickets`); },
  async getById(id: string) { return fetchApi<any>(`${API_BASE}/tickets/${id}`); },
  async sell(data: any) { return fetchApi<any>(`${API_BASE}/tickets`, { method: 'POST', body: JSON.stringify(data) }); },
  async verify(ticketNumber: string) { return fetchApi<any>(`${API_BASE}/tickets/verify/${ticketNumber}`); },
  async cancel(id: string) { return fetchApi<any>(`${API_BASE}/tickets/${id}`, { method: 'PATCH' }); },
  async update(id: string, data: any) { return fetchApi<any>(`${API_BASE}/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
};

export const lotteryApi = {
  async getAll() { return fetchApi<Array<any>>(`${API_BASE}/lotteries`); },
  async getById(id: string) { return fetchApi<any>(`${API_BASE}/lotteries/${id}`); },
  async create(data: any) { return fetchApi<any>(`${API_BASE}/lotteries`, { method: 'POST', body: JSON.stringify(data) }); },
  async update(id: string, data: any) { return fetchApi<any>(`${API_BASE}/lotteries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getSchedules(id: string) { return fetchApi<Array<any>>(`${API_BASE}/lotteries/${id}/schedules`); },
  async createSchedule(id: string, data: { draw_time: string; day_of_week?: string | number; is_active?: boolean }) {
    return fetchApi<any>(`${API_BASE}/lotteries/${id}/schedules`, { method: 'POST', body: JSON.stringify(data) });
  },
  async upsertSchedule(id: string, data: { draw_time: string; day_of_week?: string | number; is_active?: boolean }) {
    return fetchApi<any>(`${API_BASE}/lotteries/${id}/schedule`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async updateSchedule(id: string, scheduleId: string, data: { draw_time?: string; day_of_week?: string | number; is_active?: boolean }) {
    return fetchApi<any>(`${API_BASE}/lotteries/${id}/schedules/${scheduleId}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async deleteSchedule(id: string, scheduleId: string) {
    return fetchApi<any>(`${API_BASE}/lotteries/${id}/schedules/${scheduleId}`, { method: 'DELETE' });
  },
  async createPrizeConfig(lotteryId: string, data: any) { return fetchApi<any>(`${API_BASE}/lotteries/${lotteryId}/prizes`, { method: 'POST', body: JSON.stringify(data) }); },
  async updatePrizeConfig(id: string, data: any) { return fetchApi<any>(`${API_BASE}/lotteries/prize-configurations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
};

export const prizeApi = {
  async getByLottery(lotteryId: string) { return fetchApi<Array<any>>(`${API_BASE}/lotteries/${lotteryId}/prizes`); },
};

export const reportsApi = {
  async getSalesSummary() { return fetchApi<any>(`${API_BASE}/reports/sales-summary`); },
};

export const userApi = {
  async getAllSellers() { return fetchApi<Array<any>>(`${API_BASE}/users/sellers`); },
  async getAll() { return fetchApi<Array<any>>(`${API_BASE}/users`); },
  async create(data: any) { return fetchApi<any>(`${API_BASE}/users`, { method: 'POST', body: JSON.stringify(data) }); },
  async update(id: string, data: any) { return fetchApi<any>(`${API_BASE}/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
};

export const resultsApi = {
  async getAll(params?: { lottery_id?: string; draw_date?: string }) {
    const q = new URLSearchParams();
    if (params?.lottery_id) q.set('lottery_id', params.lottery_id);
    if (params?.draw_date) q.set('draw_date', params.draw_date);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return fetchApi<Array<any>>(`${API_BASE}/results${suffix}`);
  },
  async create(data: any) { return fetchApi<any>(`${API_BASE}/results`, { method: 'POST', body: JSON.stringify(data) }); },
  async update(id: string, data: any) { return fetchApi<any>(`${API_BASE}/results/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getWinners(id: string) { return fetchApi<any>(`${API_BASE}/results/${id}/winners`); },
  async sync(draw_date?: string) { return fetchApi<any>(`${API_BASE}/results/sync`, { method: 'POST', body: JSON.stringify({ draw_date }) }); },
};

export const prizesApi = {
  async getAll(status?: string) {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchApi<Array<any>>(`${API_BASE}/prizes${suffix}`);
  },
  async markPaid(id: string) { return fetchApi<any>(`${API_BASE}/prizes/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'paid' }) }); },
};
