import type { AuthUser, Session, LoginCredentials, RegisterData } from '../types/auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from './api';

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

let initPromise: Promise<void> | null = null;
let initialized = false;

export const initializeAuth = () => {
  if (initialized) return Promise.resolve();
  if (!initPromise) {
    initPromise = (async () => {
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
        initialized = true;
      }
    })().finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
};