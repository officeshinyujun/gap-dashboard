'use client';

import { useState } from 'react';
import { VStack } from '@/components/general/VStack';
import { HStack } from '@/components/general/HStack';
import Typo from '@/components/general/Typo';
import { SPACING } from '@/constants/spacing';
import { BlankQuiz } from '@/components/study/BlankQuiz';
import { ConceptQuiz } from '@/components/study/ConceptQuiz';
import { fetchBlankQuestions, fetchConceptPairs, clearStudyQuizCache } from '@/lib/studyQuizApi';
import type { BlankQuestion, ConceptPair, QuizCount } from '@/types/studyQuiz';import s from './page.module.scss';

const SUBJECTS = [
  { value: 'success', label: '성공적인 직업생활' },
  { value: 'industry', label: '공업 일반' },
];

const UNITS = Array.from({ length: 20 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}단원`,
}));

const COUNTS: { value: QuizCount; label: string }[] = [
  { value: 10, label: '10문제' },
  { value: 20, label: '20문제' },
];

type QuizMode = 'blank' | 'concept';
type PageState = 'idle' | 'loading' | 'error' | 'quiz' | 'result';

export default function StudyQuizPage() {
  const [subject, setSubject] = useState('success');
  const [unit, setUnit] = useState(1);
  const [count, setCount] = useState<QuizCount>(10);
  const [mode, setMode] = useState<QuizMode>('blank');
  const [pageState, setPageState] = useState<PageState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [blankQuestions, setBlankQuestions] = useState<BlankQuestion[]>([]);
  const [conceptPairs, setConceptPairs] = useState<ConceptPair[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [cacheMsg, setCacheMsg] = useState('');

  async function handleStart(selectedMode: QuizMode) {
    setMode(selectedMode);
    setPageState('loading');
    setErrorMsg('');
    setCacheMsg('');
    try {
      if (selectedMode === 'blank') {
        const items = await fetchBlankQuestions(subject, unit, count);
        setBlankQuestions(items);
        setTotal(items.length);
      } else {
        const items = await fetchConceptPairs(subject, unit, count);
        setConceptPairs(items);
        setTotal(items.length);
      }
      setPageState('quiz');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '알 수 없는 오류');
      setPageState('error');
    }
  }

  async function handleClearCache(type?: 'blank' | 'concept', cacheCount?: QuizCount) {
    try {
      await clearStudyQuizCache(subject, unit, type, cacheCount);
      setCacheMsg(`캐시 삭제 완료 (${type ?? '전체'} / ${cacheCount ?? '전체'})`);
      handleReset();
    } catch {
      setCacheMsg('캐시 삭제 실패');
    }
  }

  function handleComplete(cnt: number) {
    setCorrectCount(cnt);
    setPageState('result');
  }

  function handleReset() {
    setPageState('idle');
    setBlankQuestions([]);
    setConceptPairs([]);
    setCorrectCount(0);
    setTotal(0);
  }

  const scorePercent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const subjectLabel = SUBJECTS.find((s) => s.value === subject)?.label ?? subject;
  const modeLabel = mode === 'blank' ? 'Level 2: 빈칸 문제' : 'Level 3: 양방향 개념';

  return (
    <VStack gap={SPACING.s24} fullWidth className={s.page}>
      {/* 헤더 */}
      <VStack gap={SPACING.s6}>
        <Typo.BD size={24} color="primary">Study Quiz 테스트</Typo.BD>
        <Typo.TH size={12} color="secondary">
          과목과 단원을 선택하고 Level 2 / Level 3 문제를 테스트합니다
        </Typo.TH>
      </VStack>

      {/* 선택 패널 */}
      <div className={s.controlPanel}>
        <VStack gap={SPACING.s16} fullWidth>
          <HStack gap={SPACING.s16} align="end" wrap="wrap" fullWidth>
            {/* 과목 선택 */}
            <VStack gap={SPACING.s6}>
              <Typo.MD size={12} color="secondary">과목</Typo.MD>
              <select
                className={s.select}
                value={subject}
                onChange={(e) => { setSubject(e.target.value); handleReset(); }}
              >
                {SUBJECTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </VStack>

            {/* 단원 선택 */}
            <VStack gap={SPACING.s6}>
              <Typo.MD size={12} color="secondary">단원</Typo.MD>
              <select
                className={s.select}
                value={unit}
                onChange={(e) => { setUnit(Number(e.target.value)); handleReset(); }}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </VStack>

            {/* 문제 수 선택 */}
            <VStack gap={SPACING.s6}>
              <Typo.MD size={12} color="secondary">문제 수</Typo.MD>
              <select
                className={s.select}
                value={count}
                onChange={(e) => { setCount(Number(e.target.value) as QuizCount); handleReset(); }}
              >
                {COUNTS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </VStack>

            {/* 시작 버튼 */}
            <HStack gap={SPACING.s10}>
              <button
                className={`${s.startButton} ${s.level2}`}
                onClick={() => handleStart('blank')}
                disabled={pageState === 'loading'}
              >
                <Typo.MD size={14} color="inverse" style={{ fontWeight: 600 }}>
                  Level 2: 빈칸 문제
                </Typo.MD>
              </button>
              <button
                className={`${s.startButton} ${s.level3}`}
                onClick={() => handleStart('concept')}
                disabled={pageState === 'loading'}
              >
                <Typo.MD size={14} color="inverse" style={{ fontWeight: 600 }}>
                  Level 3: 양방향 개념
                </Typo.MD>
              </button>
            </HStack>
          </HStack>

          {/* 캐시 삭제 */}
          <HStack gap={SPACING.s8} align="center" wrap="wrap">
            <Typo.MD size={12} color="secondary">캐시 삭제:</Typo.MD>
            <button className={s.cacheButton} onClick={() => handleClearCache('blank', 10)}>
              <Typo.MD size={12} color="secondary">빈칸 10개</Typo.MD>
            </button>
            <button className={s.cacheButton} onClick={() => handleClearCache('blank', 20)}>
              <Typo.MD size={12} color="secondary">빈칸 20개</Typo.MD>
            </button>
            <button className={s.cacheButton} onClick={() => handleClearCache('concept', 10)}>
              <Typo.MD size={12} color="secondary">개념 10개</Typo.MD>
            </button>
            <button className={s.cacheButton} onClick={() => handleClearCache('concept', 20)}>
              <Typo.MD size={12} color="secondary">개념 20개</Typo.MD>
            </button>
            <button className={`${s.cacheButton} ${s.cacheAll}`} onClick={() => handleClearCache()}>
              <Typo.MD size={12} color="wrong">전체 삭제</Typo.MD>
            </button>
            {cacheMsg && (
              <Typo.MD size={12} color="secondary">{cacheMsg}</Typo.MD>
            )}
          </HStack>
        </VStack>
      </div>

      {/* 구분선 */}
      {pageState !== 'idle' && <div className={s.divider} />}

      {/* 로딩 */}
      {pageState === 'loading' && (
        <VStack align="center" justify="center" fullWidth gap={SPACING.s12} style={{ minHeight: 200 }}>
          <div className={s.spinner} />
          <Typo.MD size={14} color="secondary">AI가 문제를 생성하는 중입니다... (최초 1회)</Typo.MD>
        </VStack>
      )}

      {/* 에러 */}
      {pageState === 'error' && (
        <VStack align="center" justify="center" fullWidth gap={SPACING.s12} style={{ minHeight: 200 }}>
          <Typo.MD size={16} color="wrong">{errorMsg}</Typo.MD>
          <button className={s.retryButton} onClick={() => handleStart(mode)}>
            <Typo.MD size={14} color="primary">다시 시도</Typo.MD>
          </button>
        </VStack>
      )}

      {/* 퀴즈 */}
      {pageState === 'quiz' && (
        <VStack gap={SPACING.s16} fullWidth>
          <HStack gap={SPACING.s8} align="center">
            <span className={s.modeBadge}>{modeLabel}</span>
            <Typo.MD size={12} color="secondary">{subjectLabel} · {unit}단원 · {count}문제</Typo.MD>
          </HStack>
          {mode === 'blank' && blankQuestions.length > 0 && (
            <BlankQuiz questions={blankQuestions} onComplete={handleComplete} />
          )}
          {mode === 'concept' && conceptPairs.length > 0 && (
            <ConceptQuiz pairs={conceptPairs} onComplete={handleComplete} />
          )}
        </VStack>
      )}

      {/* 결과 */}
      {pageState === 'result' && (
        <VStack align="center" gap={SPACING.s20} fullWidth>
          <div className={s.resultCard}>
            <VStack align="center" gap={SPACING.s16}>
              <span className={s.modeBadge}>{modeLabel}</span>
              <Typo.BD size={32} color="brand" style={{ fontWeight: 700 }}>
                {scorePercent}%
              </Typo.BD>
              <Typo.MD size={14} color="secondary">
                {total}문제 중 {correctCount}개 정답 · {subjectLabel} {unit}단원
              </Typo.MD>
            </VStack>
          </div>
          <HStack gap={SPACING.s10}>
            <button className={s.retryButton} onClick={() => handleStart(mode)}>
              <Typo.MD size={14} color="primary">같은 문제 다시 풀기</Typo.MD>
            </button>
            <button className={s.retryButton} onClick={handleReset}>
              <Typo.MD size={14} color="secondary">처음으로</Typo.MD>
            </button>
          </HStack>
        </VStack>
      )}
    </VStack>
  );
}
