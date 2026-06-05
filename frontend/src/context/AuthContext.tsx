'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, token, isLoading, login, logout: zustandLogout, fetchMe } = useAuthStore();

  // Logout implementation
  const logout = useCallback(async () => {
    try {
      // Clear localStorage
      localStorage.removeItem('access_token');

      // Clear AuthContext state via Zustand
      zustandLogout();

      // Navigate to login
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear state and redirect
      localStorage.removeItem('access_token');
      zustandLogout();
      router.push('/login');
    }
  }, [zustandLogout, router]);

  // RefreshUser implementation
  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await authApi.me();
      const refreshedUser = res.data as User;

      // Update store with fresh user data
      useAuthStore.setState({ user: refreshedUser });

      return refreshedUser;
    } catch (error: any) {
      console.error('Refresh user error:', error);

      // Handle 401 Unauthorized - user session expired
      if (error.response?.status === 401) {
        await logout();
        return null;
      }

      throw error;
    }
  }, [logout]);

  // Initialize auth on mount
  React.useEffect(() => {
    if (!user && token) {
      fetchMe().catch(() => {
        logout();
      });
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
