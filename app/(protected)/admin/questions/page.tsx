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

const DIFF_LABEL: Record<string, string> = {
  LOW: '하', MIDDLE: '중', HIGH: '상', INTERGRATE: '통합',
};

interface ExamSummary {
  id: string;
  title: string;
  difficulty: string;
  questionCount: number;
  totalScore: number | null;
  createdAt: string;
  subject: { slug: string; title: string } | null;
  user: { id: string; email: string; name: string } | null;
}

export default function AdminQuestionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/admin/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('시험 목록 조회 실패');
      setExams(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role !== 'admin') { router.replace('/'); return; }
      void fetchExams();
    }
  }, [isLoading, user, router, fetchExams]);

  if (isLoading || loading) return (
    <VStack gap={16} align="center" justify="center" fullWidth fullHeight>
      <div className={s.spinner} />
    </VStack>
  );

  return (
    <VStack gap={20} fullWidth className={s.page}>
      <HStack gap={0} align="center" justify="between" fullWidth>
        <VStack gap={4}>
          <Typo.BD size={20} color="primary">문제 모음집 목록</Typo.BD>
          <Typo.TH size={12} color="secondary">총 {exams.length}개의 시험이 생성되었습니다.</Typo.TH>
        </VStack>
        <button className={s.refreshBtn} onClick={fetchExams}>새로고침</button>
      </HStack>

      {error && <div className={s.errorBox}><Typo.MD size={12} color="wrong">{error}</Typo.MD></div>}

      {!loading && exams.length === 0 && !error && (
        <VStack gap={8} align="center" justify="center" fullWidth style={{ padding: '48px 0' }}>
          <Typo.TH size={14} color="secondary">생성된 시험이 없습니다.</Typo.TH>
        </VStack>
      )}

      {exams.length > 0 && (
        <div className={s.tableWrapper}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>시험 제목</th>
                <th className={s.th}>난이도</th>
                <th className={s.th}>문항 수</th>
                <th className={s.th}>생성자</th>
                <th className={s.th}>생성일</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr
                  key={exam.id}
                  className={s.row}
                  onClick={() => router.push(`/admin/questions/${exam.id}`)}
                >
                  <td className={s.td}>
                    <VStack gap={2}>
                      <span className={s.examTitle}>{exam.title}</span>
                      {exam.subject && (
                        <span className={s.examSubject}>{exam.subject.title}</span>
                      )}
                    </VStack>
                  </td>
                  <td className={s.td}>
                    <span className={s.diffBadge} data-level={exam.difficulty}>
                      {DIFF_LABEL[exam.difficulty] ?? exam.difficulty}
                    </span>
                  </td>
                  <td className={s.td}>{exam.questionCount}문항</td>
                  <td className={s.td}>
                    <VStack gap={2}>
                      <span className={s.userName}>{exam.user?.name ?? '-'}</span>
                      <span className={s.userEmail}>{exam.user?.email ?? '-'}</span>
                    </VStack>
                  </td>
                  <td className={s.tdMeta}>
                    {new Date(exam.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </VStack>
  );
}
