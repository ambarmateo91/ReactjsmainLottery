import { supabase } from '../config/auth-config';
import type { AuthUser, Session, LoginCredentials, RegisterData, AuthState } from '../types/auth';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore extends AuthState {
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (data: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      error: null,

      signIn: async (credentials) => {
        set({ loading: true, error: null });
        const { data, error } = await supabase.auth.signInWithPassword(credentials);
        if (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
        if (data.user && data.session) {
          set({
            user: data.user as AuthUser,
            session: data.session as Session,
            loading: false,
          });
        }
      },

      signUp: async (data) => {
        set({ loading: true, error: null });
        const { data: authData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.full_name,
              phone: data.phone,
            },
          },
        });
        if (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
        if (authData.user && authData.session) {
          set({
            user: authData.user as AuthUser,
            session: authData.session as Session,
            loading: false,
          });
        }
      },

      signOut: async () => {
        set({ loading: true });
        const { error } = await supabase.auth.signOut();
        if (error) {
          set({ error: error.message, loading: false });
          throw error;
        }
        set({ user: null, session: null, loading: false });
      },

      refreshSession: async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          set({ error: error.message });
          return;
        }
        if (data.session) {
          set({
            user: data.session.user as AuthUser,
            session: data.session as Session,
          });
        } else {
          set({ user: null, session: null });
        }
        set({ loading: false });
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

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user as AuthUser | null;
};

export const getSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session as Session | null;
};

export const onAuthStateChange = (callback: (user: AuthUser | null, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user as AuthUser | null, session as Session | null);
  });
};