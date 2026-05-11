'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { VStack } from '@/components/general/VStack';
import { HStack } from '@/components/general/HStack';
import Typo from '@/components/general/Typo';
import { QuestionRenderer } from '@/components/exam/QuestionStem/QuestionRenderer';
import { getTemplateLabel } from '@/utils/examParser';
import { getAccessToken } from '@/lib/auth';
import type { ExamQuestion } from '@/types/examQuestion';
import s from './page.module.scss';

const API_BASE = 'http://localhost:3001';

const DIFF_LABEL: Record<string, string> = {
  LOW: '하',
  MIDDLE: '중',
  HIGH: '상',
  SUPER: '극상',
};

const DIFF_CLASS: Record<string, string> = {
  LOW: s.diffLow,
  MIDDLE: s.diffMiddle,
  HIGH: s.diffHigh,
  SUPER: s.diffSuper,
};

interface ApiExamSummary {
  id: string;
  title: string;
  difficulty: string;
  questionCount: number;
  totalScore: number | null;
  createdAt: string;
}

interface ApiExamItem {
  id: string;
  orderIndex: number;
  question: {
    id: string;
    targetConcept: string;
    itemType: string;
    difficulty: string;
    recommendedTemplate: string;
    questionStem: string;
    stimulusData: unknown;
    optionsList: string[];
    explanation: unknown;
    correctAnswer?: number;
  };
}

function toExamQuestion(item: ApiExamItem): ExamQuestion {
  const q = item.question;
  return {
    metadata: {
      unit_name: '',
      target_concept: q.targetConcept,
      item_type: q.itemType,
      difficulty: q.difficulty,
      recommended_template: q.recommendedTemplate,
    },
    render_ready: {
      question_stem: q.questionStem,
      stimulus_data: q.stimulusData,
      options_list: q.optionsList,
    },
    explanation: q.explanation as any,
  };
}

export default function DevExamListPage() {
  const [exams, setExams] = useState<ApiExamSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[] | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const getToken = () => {
    const token = getAccessToken();
    if (!token) throw new Error('로그인이 필요합니다.');
    return token;
  };

  const loadExams = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`시험 목록 조회 실패 (${res.status})`);
      const data: ApiExamSummary[] = await res.json();
      setExams(data);
    } catch (e: unknown) {
      setListError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadExamDetail = useCallback(async (examId: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    setQuestions(null);
    setCurrentIndex(0);
    setSelectedExamId(examId);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`시험 상세 조회 실패 (${res.status})`);
      const data = await res.json();
      const items: ApiExamItem[] = data.items ?? [];
      setExamTitle(data.title ?? '');
      setQuestions(items.map(toExamQuestion));
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const goTo = (index: number) => {
    if (questions && index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <VStack gap={0} fullWidth fullHeight className={s.page}>
      {/* 헤더 */}
      <HStack gap={0} align="center" justify="between" fullWidth className={s.header}>
        <VStack gap={4}>
          <Typo.BD size={16} color="primary">생성된 시험 목록</Typo.BD>
          <Typo.TH size={12} color="secondary">
            DB에 저장된 시험을 선택하면 문항을 확인할 수 있습니다
          </Typo.TH>
        </VStack>
        <button className={s.refreshBtn} onClick={loadExams} disabled={loadingList}>
          {loadingList ? '불러오는 중...' : '새로고침'}
        </button>
      </HStack>

      {/* 본문 */}
      <HStack gap={0} align="start" fullWidth fullHeight className={s.body}>
        {/* 좌측: 시험 목록 */}
        <VStack gap={0} className={s.examList}>
          {loadingList && (
            <VStack gap={8} align="center" justify="center" fullWidth style={{ padding: '24px 0' }}>
              <div className={s.spinner} />
            </VStack>
          )}
          {listError && (
            <div className={s.errorBox}>
              <Typo.MD size={12} color="wrong">{listError}</Typo.MD>
            </div>
          )}
          {!loadingList && exams.length === 0 && !listError && (
            <VStack gap={4} align="center" justify="center" fullWidth style={{ padding: '24px 0' }}>
              <Typo.TH size={12} color="secondary">생성된 시험이 없습니다</Typo.TH>
            </VStack>
          )}
          {exams.map((exam) => (
            <button
              key={exam.id}
              className={`${s.examItem} ${selectedExamId === exam.id ? s.examItemActive : ''}`}
              onClick={() => loadExamDetail(exam.id)}
            >
              <span className={s.examItemTitle}>{exam.title}</span>
              <HStack gap={6} align="center">
                <span className={`${s.diffBadge} ${DIFF_CLASS[exam.difficulty] ?? s.diffMiddle}`}>
                  {DIFF_LABEL[exam.difficulty] ?? exam.difficulty}
                </span>
                <span className={s.examItemMeta}>
                  {exam.questionCount}문항 · {new Date(exam.createdAt).toLocaleDateString('ko-KR', {
                    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </HStack>
            </button>
          ))}
        </VStack>

        {/* 우측: 문항 뷰어 */}
        <VStack gap={0} fullWidth fullHeight className={s.main}>
          {!selectedExamId && (
            <VStack gap={8} align="center" justify="center" fullWidth fullHeight className={s.emptyState}>
              <Typo.MD size={14} color="secondary">좌측에서 시험을 선택하세요</Typo.MD>
            </VStack>
          )}

          {loadingDetail && (
            <VStack gap={12} align="center" justify="center" fullWidth fullHeight className={s.loadingBox}>
              <div className={s.spinner} />
              <Typo.TH size={12} color="secondary">문항을 불러오는 중...</Typo.TH>
            </VStack>
          )}

          {detailError && (
            <div className={s.errorBox}>
              <Typo.MD size={12} color="wrong">{detailError}</Typo.MD>
            </div>
          )}

          {!loadingDetail && questions && questions.length > 0 && (
            <VStack gap={0} fullWidth fullHeight>
              {/* 시험 제목 + 네비 */}
              <HStack gap={0} align="center" justify="between" fullWidth className={s.examHeader}>
                <VStack gap={2}>
                  <Typo.SM size={14} color="primary">{examTitle}</Typo.SM>
                  <Typo.TH size={12} color="secondary">총 {questions.length}문항</Typo.TH>
                </VStack>
                <HStack gap={8} align="center">
                  <button
                    className={s.questionNavBtn}
                    onClick={() => goTo(currentIndex - 1)}
                    disabled={currentIndex === 0}
                  >
                    ← 이전
                  </button>
                  <Typo.TH size={12} color="secondary">
                    {currentIndex + 1} / {questions.length}
                  </Typo.TH>
                  <button
                    className={s.questionNavBtn}
                    onClick={() => goTo(currentIndex + 1)}
                    disabled={currentIndex === questions.length - 1}
                  >
                    다음 →
                  </button>
                </HStack>
              </HStack>

              {/* 문항 탭 */}
              <HStack gap={0} fullWidth className={s.questionNav} wrap="wrap">
                {questions.map((q, idx) => (
                  <button
                    key={idx}
                    className={`${s.questionNavBtn} ${currentIndex === idx ? s.examItemActive : ''}`}
                    onClick={() => goTo(idx)}
                    style={{ marginRight: 4, marginBottom: 4 }}
                  >
                    <VStack gap={2} align="center">
                      <span>{idx + 1}</span>
                      <span style={{ fontSize: 9, fontFamily: 'Courier New', color: 'inherit' }}>
                        {getTemplateLabel(q.metadata.recommended_template ?? '').slice(0, 8)}
                      </span>
                    </VStack>
                  </button>
                ))}
              </HStack>

              {/* 문항 렌더러 */}
              <VStack gap={0} fullWidth fullHeight className={s.questionArea}>
                <QuestionRenderer
                  key={`${selectedExamId}-${currentIndex}`}
                  question={questions[currentIndex]}
                  questionNumber={currentIndex + 1}
                />
              </VStack>
            </VStack>
          )}
        </VStack>
      </HStack>
    </VStack>
  );
}
