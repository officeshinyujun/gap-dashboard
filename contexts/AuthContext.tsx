'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken, removeAccessToken, getAccessToken, API_BASE_URL } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  profileImageUrl: string | null;
  studyStreakDays: number;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('gap_access_token');
  });
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUser(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? '로그인에 실패했습니다.');
    }

    const data = await res.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
    router.replace('/');
  }, [router]);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, name, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? '회원가입에 실패했습니다.');
    }

    const data = await res.json();
    setAccessToken(data.accessToken);
    setUser(data.user);
    router.replace('/');
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    removeAccessToken();
    setUser(null);
    router.replace('/landing');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
