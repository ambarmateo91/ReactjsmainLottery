import { useAuthStore, getCurrentUser, getSession, onAuthStateChange } from '../lib/auth';
import { useEffect } from 'react';
import type { AuthUser, Session } from '../types/auth';

export function useAuth() {
  const { user, session, loading, error, signIn, signUp, signOut, refreshSession } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      const [currentUser, currentSession] = await Promise.all([
        getCurrentUser(),
        getSession(),
      ]);
      useAuthStore.getState().setUser(currentUser);
      useAuthStore.getState().setSession(currentSession);
      useAuthStore.setState({ loading: false });
    };

    initAuth();

    const { data: { subscription } } = onAuthStateChange((user, session) => {
      useAuthStore.getState().setUser(user);
      useAuthStore.getState().setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshSession,
    isAuthenticated: !!user,
    isAdmin: user?.user_metadata?.role === 'admin',
    isSeller: user?.user_metadata?.role === 'seller' || user?.user_metadata?.role === 'admin',
  };
}