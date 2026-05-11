'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VStack } from '@/components/general/VStack';
import { HStack } from '@/components/general/HStack';
import Typo from '@/components/general/Typo';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/auth';
import s from './page.module.scss';

const API_BASE = 'http://localhost:3001';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('유저 목록 조회 실패');
      setUsers(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== 'admin') { router.replace('/'); return; }
      void fetchUsers();
    }
  }, [isLoading, user, router, fetchUsers]);

  if (isLoading || loading) return (
    <VStack gap={16} align="center" justify="center" fullWidth fullHeight>
      <div className={s.spinner} />
    </VStack>
  );

  return (
    <VStack gap={20} fullWidth className={s.page}>
      <HStack gap={0} align="center" justify="between" fullWidth>
        <VStack gap={4}>
          <Typo.BD size={20} color="primary">가입 유저 목록</Typo.BD>
          <Typo.TH size={12} color="secondary">총 {users.length}명</Typo.TH>
        </VStack>
        <button className={s.refreshBtn} onClick={fetchUsers}>새로고침</button>
      </HStack>

      {error && <div className={s.errorBox}><Typo.MD size={12} color="wrong">{error}</Typo.MD></div>}

      <div className={s.tableWrapper}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>이름</th>
              <th className={s.th}>이메일</th>
              <th className={s.th}>역할</th>
              <th className={s.th}>가입일</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className={s.td}>{u.name}</td>
                <td className={s.td}>{u.email}</td>
                <td className={s.td}>
                  <span className={u.role === 'admin' ? s.badgeAdmin : s.badgeUser}>{u.role}</span>
                </td>
                <td className={s.tdMeta}>{new Date(u.createdAt).toLocaleDateString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </VStack>
  );
}
