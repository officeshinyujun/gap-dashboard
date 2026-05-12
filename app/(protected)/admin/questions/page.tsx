'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VStack } from '@/components/general/VStack';
import { HStack } from '@/components/general/HStack';
import Typo from '@/components/general/Typo';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessToken, API_BASE_URL } from '@/lib/auth';
import s from './page.module.scss';

const DIFF_LABEL: Record<string, string> = {
  LOW: '하', MIDDLE: '중', HIGH: '상', INTERGRATE: '통합',
};

const SUBJECTS = [
  { slug: 'success', label: '성공적인 직업생활' },
  { slug: 'industry', label: '공업 일반' },
];

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

interface SubjectInfo {
  id: string;
  slug: string;
  title: string;
}

export default function AdminQuestionsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 생성 모달 상태
  const [showCreate, setShowCreate] = useState(false);
  const [createSubjectSlug, setCreateSubjectSlug] = useState('success');
  const [createStartUnit, setCreateStartUnit] = useState(1);
  const [createEndUnit, setCreateEndUnit] = useState(1);
  const [createDifficulty, setCreateDifficulty] = useState('MIDDLE');
  const [createCount, setCreateCount] = useState(10);
  const [createPrompt, setCreatePrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [createMsg, setCreateMsg] = useState('');

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/admin/exams`, {
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

  async function handleDelete() {
    if (!confirmId) return;
    setDeleting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/admin/exams/${confirmId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('삭제 실패');
      setExams((prev) => prev.filter((e) => e.id !== confirmId));
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setDeleting(false);
      setConfirmId(null);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setCreateProgress(0);
    setCreateMsg('과목 정보를 불러오는 중...');
    try {
      const token = getAccessToken();

      // 1. subjectId 조회
      const subjectRes = await fetch(`${API_BASE_URL}/subjects/${createSubjectSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!subjectRes.ok) throw new Error('과목 정보 조회 실패');
      const subject: SubjectInfo = await subjectRes.json();

      // 2. job 생성
      setCreateMsg('시험 생성 job을 시작하는 중...');
      const jobRes = await fetch(`${API_BASE_URL}/exams/jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: subject.id,
          startUnitNum: createStartUnit,
          endUnitNum: createEndUnit,
          difficulty: createDifficulty,
          questionCount: createCount,
          customPrompt: createPrompt || undefined,
        }),
      });
      if (!jobRes.ok) throw new Error('시험 생성 실패');
      const { jobId } = await jobRes.json();

      // 3. 폴링
      const poll = async (): Promise<void> => {
        const pollRes = await fetch(`${API_BASE_URL}/exams/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const job = await pollRes.json();
        setCreateProgress(job.progress ?? 0);
        setCreateMsg(job.message || '생성 중...');

        if (job.status === 'completed') {
          setCreateMsg('완료!');
          setShowCreate(false);
          await fetchExams();
        } else if (job.status === 'failed') {
          throw new Error('시험 생성에 실패했습니다.');
        } else {
          await new Promise((r) => setTimeout(r, 2000));
          return poll();
        }
      };

      await poll();
    } catch (e) {
      setCreateMsg(`오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    } finally {
      setCreating(false);
    }
  }

  if (isLoading || loading) return (
    <VStack gap={16} align="center" justify="center" fullWidth fullHeight>
      <div className={s.spinner} />
    </VStack>
  );

  const confirmExam = exams.find((e) => e.id === confirmId);

  return (
    <VStack gap={20} fullWidth className={s.page}>
      <HStack gap={0} align="center" justify="between" fullWidth>
        <VStack gap={4}>
          <Typo.BD size={20} color="primary">문제 모음집 목록</Typo.BD>
          <Typo.TH size={12} color="secondary">총 {exams.length}개의 시험이 생성되었습니다.</Typo.TH>
        </VStack>
        <HStack gap={8}>
          <button className={s.refreshBtn} onClick={fetchExams}>새로고침</button>
          <button className={s.createBtn} onClick={() => { setShowCreate(true); setCreateMsg(''); setCreateProgress(0); }}>
            + 새 시험 생성
          </button>
        </HStack>
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
                <th className={s.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id} className={s.row}>
                  <td className={s.td} onClick={() => router.push(`/admin/questions/${exam.id}`)}>
                    <VStack gap={2}>
                      <span className={s.examTitle}>{exam.title}</span>
                      {exam.subject && <span className={s.examSubject}>{exam.subject.title}</span>}
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
                  <td className={s.td}>
                    <button
                      className={s.deleteBtn}
                      onClick={(e) => { e.stopPropagation(); setConfirmId(exam.id); }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 시험 생성 모달 */}
      {showCreate && (
        <div className={s.confirmOverlay} onClick={() => !creating && setShowCreate(false)}>
          <div className={s.createModal} onClick={(e) => e.stopPropagation()}>
            <VStack gap={20} fullWidth>
              <Typo.BD size={16} color="primary">새 시험 생성</Typo.BD>

              {!creating ? (
                <>
                  <VStack gap={12} fullWidth>
                    {/* 과목 */}
                    <VStack gap={6}>
                      <Typo.MD size={12} color="secondary">과목</Typo.MD>
                      <select className={s.select} value={createSubjectSlug} onChange={(e) => setCreateSubjectSlug(e.target.value)}>
                        {SUBJECTS.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
                      </select>
                    </VStack>

                    {/* 단원 범위 */}
                    <VStack gap={6}>
                      <Typo.MD size={12} color="secondary">단원 범위</Typo.MD>
                      <HStack gap={8} align="center">
                        <select className={s.selectSmall} value={createStartUnit} onChange={(e) => setCreateStartUnit(Number(e.target.value))}>
                          {Array.from({ length: 20 }, (_, i) => <option key={i+1} value={i+1}>{i+1}단원</option>)}
                        </select>
                        <Typo.MD size={12} color="secondary">~</Typo.MD>
                        <select className={s.selectSmall} value={createEndUnit} onChange={(e) => setCreateEndUnit(Number(e.target.value))}>
                          {Array.from({ length: 20 }, (_, i) => <option key={i+1} value={i+1} disabled={i+1 < createStartUnit}>{i+1}단원</option>)}
                        </select>
                      </HStack>
                    </VStack>

                    {/* 난이도 + 문항 수 */}
                    <HStack gap={12} fullWidth>
                      <VStack gap={6} style={{ flex: 1 }}>
                        <Typo.MD size={12} color="secondary">난이도</Typo.MD>
                        <select className={s.select} value={createDifficulty} onChange={(e) => setCreateDifficulty(e.target.value)}>
                          <option value="LOW">낮음 (LOW)</option>
                          <option value="MIDDLE">중간 (MIDDLE)</option>
                          <option value="HIGH">높음 (HIGH)</option>
                          <option value="INTERGRATE">통합 (INTERGRATE)</option>
                        </select>
                      </VStack>
                      <VStack gap={6} style={{ flex: 1 }}>
                        <Typo.MD size={12} color="secondary">문항 수</Typo.MD>
                        <input
                          type="number"
                          className={s.input}
                          value={createCount}
                          onChange={(e) => setCreateCount(Number(e.target.value))}
                          min={1} max={20}
                        />
                      </VStack>
                    </HStack>

                    {/* 추가 프롬프트 */}
                    <VStack gap={6}>
                      <Typo.MD size={12} color="secondary">추가 프롬프트 (선택)</Typo.MD>
                      <textarea
                        className={s.textarea}
                        placeholder="예: 수능 기출 스타일로 출제해줘"
                        value={createPrompt}
                        onChange={(e) => setCreatePrompt(e.target.value)}
                        rows={3}
                      />
                    </VStack>
                  </VStack>

                  <HStack gap={8} justify="end" fullWidth>
                    <button className={s.btnCancel} onClick={() => setShowCreate(false)}>취소</button>
                    <button className={s.btnCreate} onClick={handleCreate}>생성하기</button>
                  </HStack>
                </>
              ) : (
                <VStack gap={16} align="center" fullWidth style={{ padding: '20px 0' }}>
                  <div className={s.spinner} />
                  <Typo.MD size={14} color="primary">{createMsg}</Typo.MD>
                  {createProgress > 0 && (
                    <div className={s.progressBarWrap}>
                      <div className={s.progressBarFill} style={{ width: `${createProgress}%` }} />
                    </div>
                  )}
                  <Typo.MD size={12} color="secondary">{createProgress}%</Typo.MD>
                </VStack>
              )}
            </VStack>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {confirmId && (
        <div className={s.confirmOverlay} onClick={() => setConfirmId(null)}>
          <div className={s.confirmModal} onClick={(e) => e.stopPropagation()}>
            <VStack gap={8}>
              <Typo.BD size={16} color="primary">시험 삭제</Typo.BD>
              <Typo.MD size={12} color="secondary">
                <strong>{confirmExam?.title}</strong>을 삭제하시겠습니까?<br />
                이 작업은 되돌릴 수 없습니다.
              </Typo.MD>
            </VStack>
            <div className={s.confirmButtons}>
              <button className={s.btnCancel} onClick={() => setConfirmId(null)}>취소</button>
              <button className={s.btnDelete2} onClick={handleDelete} disabled={deleting}>
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </VStack>
  );
}
