'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth } from './api';

interface User {
  _id: string;
  email: string;
  displayName: string;
  role: 'buyer' | 'seller' | 'admin';
  isEmailVerified: boolean;
  mfaEnabled: boolean;
}

export interface MFARequired {
  requiresMFA: true;
  userId: string;
}

export interface PasswordExpired {
  passwordExpired: true;
  userId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    totpCode?: string,
    captcha?: { id: string; answer: string },
  ) => Promise<MFARequired | PasswordExpired | void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { useRouter } from 'next/navigation';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const result = await auth.getMe();
      setUser(result.data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (
    email: string,
    password: string,
    totpCode?: string,
    captcha?: { id: string; answer: string },
  ): Promise<MFARequired | PasswordExpired | void> => {
    const body: {
      email: string;
      password: string;
      totpCode?: string;
      captchaId?: string;
      captchaAnswer?: string;
    } = { email, password };
    if (totpCode) body.totpCode = totpCode;
    if (captcha) {
      body.captchaId = captcha.id;
      body.captchaAnswer = captcha.answer;
    }

    const result = await auth.login(body);

    if (result.data?.requiresMFA) {
      return { requiresMFA: true, userId: result.data.userId };
    }
    if (result.data?.passwordExpired) {
      return { passwordExpired: true, userId: result.data.userId };
    }

    if (result.data?.user) {
      setUser(result.data.user);
    }
  };

  const register = async (data: any) => {
    const result = await auth.register(data);
    setUser(result.data.user);
    return result;
  };

  const logout = async () => {
    await auth.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
