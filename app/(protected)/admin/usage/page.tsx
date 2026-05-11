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

interface OpenAIUsage {
  available: boolean;
  error?: string;
  data?: {
    data: {
      aggregation_timestamp: number;
      n_requests: number;
      operation: string;
      snapshot_id: string;
      n_context_tokens_total: number;
      n_generated_tokens_total: number;
    }[];
  };
}

export default function AdminUsagePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [usage, setUsage] = useState<OpenAIUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/admin/openai-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('사용량 조회 실패');
      setUsage(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== 'admin') { router.replace('/'); return; }
      void fetchUsage();
    }
  }, [isLoading, user, router, fetchUsage]);

  if (isLoading || loading) return (
    <VStack gap={16} align="center" justify="center" fullWidth fullHeight>
      <div className={s.spinner} />
    </VStack>
  );

  const rows = usage?.data?.data ?? [];
  const totalContext = rows.reduce((a, d) => a + (d.n_context_tokens_total ?? 0), 0);
  const totalGenerated = rows.reduce((a, d) => a + (d.n_generated_tokens_total ?? 0), 0);
  const totalRequests = rows.reduce((a, d) => a + (d.n_requests ?? 0), 0);

  return (
    <VStack gap={20} fullWidth className={s.page}>
      <HStack gap={0} align="center" justify="between" fullWidth>
        <VStack gap={4}>
          <Typo.BD size={20} color="primary">API 사용량</Typo.BD>
          <Typo.TH size={12} color="secondary">OpenAI API 오늘 사용량</Typo.TH>
        </VStack>
        <button className={s.refreshBtn} onClick={fetchUsage}>새로고침</button>
      </HStack>

      {error && <div className={s.errorBox}><Typo.MD size={12} color="wrong">{error}</Typo.MD></div>}

      {usage?.available === false ? (
        <div className={s.errorBox}>
          <Typo.TH size={12} color="secondary">{usage.error ?? 'Usage API를 사용할 수 없습니다.'}</Typo.TH>
        </div>
      ) : (
        <VStack gap={20} fullWidth>
          {/* 요약 카드 */}
          <HStack gap={12} fullWidth>
            <div className={s.summaryCard}>
              <Typo.TH size={12} color="secondary">총 요청 수</Typo.TH>
              <Typo.BD size={24} color="primary">{totalRequests.toLocaleString()}</Typo.BD>
            </div>
            <div className={s.summaryCard}>
              <Typo.TH size={12} color="secondary">입력 토큰</Typo.TH>
              <Typo.BD size={24} color="primary">{totalContext.toLocaleString()}</Typo.BD>
            </div>
            <div className={s.summaryCard}>
              <Typo.TH size={12} color="secondary">출력 토큰</Typo.TH>
              <Typo.BD size={24} color="primary">{totalGenerated.toLocaleString()}</Typo.BD>
            </div>
            <div className={s.summaryCard}>
              <Typo.TH size={12} color="secondary">총 토큰</Typo.TH>
              <Typo.BD size={24} color="primary">{(totalContext + totalGenerated).toLocaleString()}</Typo.BD>
            </div>
          </HStack>

          {/* 상세 테이블 */}
          {rows.length > 0 && (
            <VStack gap={12} fullWidth>
              <Typo.SM size={14} color="primary">모델별 상세</Typo.SM>
              <div className={s.tableWrapper}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th className={s.th}>모델</th>
                      <th className={s.th}>요청 수</th>
                      <th className={s.th}>입력 토큰</th>
                      <th className={s.th}>출력 토큰</th>
                      <th className={s.th}>합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d, i) => (
                      <tr key={i}>
                        <td className={s.td}>{d.snapshot_id}</td>
                        <td className={s.td}>{d.n_requests.toLocaleString()}</td>
                        <td className={s.td}>{d.n_context_tokens_total.toLocaleString()}</td>
                        <td className={s.td}>{d.n_generated_tokens_total.toLocaleString()}</td>
                        <td className={s.td}>
                          {(d.n_context_tokens_total + d.n_generated_tokens_total).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </VStack>
          )}
        </VStack>
      )}
    </VStack>
  );
}
