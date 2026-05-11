'use client';

import { useAuth } from '@/contexts/AuthContext';
import { VStack } from '@/components/general/VStack';
import Typo from '@/components/general/Typo';
import s from './page.module.scss';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <VStack gap={8} align="center" justify="center" fullWidth fullHeight className={s.page}>
      <Typo.BD size={24} color="primary">안녕하세요, {user?.name ?? ''}님</Typo.BD>
      <Typo.TH size={14} color="secondary">GAP 개발자 대시보드에 오신 것을 환영합니다.</Typo.TH>
      <Typo.TH size={12} color="secondary">왼쪽 사이드바에서 원하는 기능을 선택해 주세요.</Typo.TH>
    </VStack>
  );
}
