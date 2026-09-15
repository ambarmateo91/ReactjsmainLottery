import { useAuthStore, initializeAuth } from '../lib/auth';
import { useEffect } from 'react';

export function useAuth() {
  const { user, session, loading, error, signIn, signUp, signOut, refreshSession } = useAuthStore();

  useEffect(() => {
    initializeAuth();
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