'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setTokens, removeTokens, getAccessToken, API_BASE_URL } from '@/lib/auth';

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
  // 토큰이 있으면 초기 로딩 상태를 true로, 없으면 false로 즉시 설정
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('gap_access_token');
  });
  const router = useRouter();

  // 앱 초기화 시 토큰으로 유저 정보 조회
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
        // API 실패해도 토큰은 유지 (백엔드 일시 오류 대응)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? '로그인에 실패했습니다.');
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    router.replace('/');
  }, [router]);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message ?? '회원가입에 실패했습니다.');
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    router.replace('/');
  }, [router]);

  const logout = useCallback(() => {
    removeTokens();
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
