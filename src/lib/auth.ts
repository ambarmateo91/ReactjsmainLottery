import type { AuthUser, Session, LoginCredentials, RegisterData } from '../types/auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const authApi = {
  async login(credentials: LoginCredentials) {
    return fetchApi<{ user: AuthUser; session: Session }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async register(data: RegisterData) {
    return fetchApi<{ user: AuthUser; session: Session }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout() {
    return fetchApi<void>('/auth/logout', { method: 'POST' });
  },

  async refresh() {
    return fetchApi<{ user: AuthUser; session: Session }>('/auth/refresh', { method: 'POST' });
  },

  async getCurrentUser() {
    return fetchApi<AuthUser>('/auth/me');
  },
};

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (data: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      loading: true,
      error: null,

      signIn: async (credentials) => {
        set({ loading: true, error: null });
        try {
          const { user, session } = await authApi.login(credentials);
          set({ user, session, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Error de autenticación', loading: false });
          throw error;
        }
      },

      signUp: async (data) => {
        set({ loading: true, error: null });
        try {
          const { user, session } = await authApi.register(data);
          set({ user, session, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Error de registro', loading: false });
          throw error;
        }
      },

      signOut: async () => {
        set({ loading: true });
        try {
          await authApi.logout();
          set({ user: null, session: null, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Error al cerrar sesión', loading: false });
          throw error;
        }
      },

      refreshSession: async () => {
        try {
          const { user, session } = await authApi.refresh();
          set({ user, session });
        } catch {
          set({ user: null, session: null });
        } finally {
          set({ loading: false });
        }
      },

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
    }),
    {
      name: 'lottery-auth',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);

export const initializeAuth = async () => {
  try {
    const user = await authApi.getCurrentUser();
    if (user) {
      const session = { access_token: '', refresh_token: '', expires_at: 0, user } as any;
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setSession(session);
    }
  } catch {
    // No session
  } finally {
    useAuthStore.setState({ loading: false });
  }
};