'use client';

import { VStack } from '../general/VStack';
import { HStack } from '../general/HStack';
import Typo from '../general/Typo';
import { SPACING } from '../../constants/spacing';
import s from './style.module.scss';
import { LayoutDashboard, FlaskConical, List, BookOpen, Settings, Users, BarChart2, Zap, LogOut, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function SidebarItem({ icon: Icon, label, href, isActive }: { icon: any; label: string; href: string; isActive?: boolean }) {
  return (
    <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
      <HStack gap={SPACING.s8} align="center" className={`${s.menuItem} ${isActive ? s.menuItemActive : ''}`}>
        <Icon size={16} color={isActive ? '#101113' : '#5C6370'} />
        <Typo.MD size={14} color={isActive ? 'primary' : 'secondary'}>{label}</Typo.MD>
      </HStack>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <VStack justify="between" align="center" className={s.sidebar} fullHeight>
      <VStack gap={SPACING.s10} fullWidth>
        {/* 로고 */}
        <HStack gap={SPACING.s8} align="center" style={{ padding: SPACING.s12 }}>
          <div className={s.gapLogo} />
          <Typo.MD size={16} color="primary">GAP Dashboard</Typo.MD>
        </HStack>

        {/* General */}
        <VStack gap={SPACING.s8} style={{ padding: SPACING.s8 }}>
          <Typo.MD size={12} color="secondary">General</Typo.MD>
          <SidebarItem icon={LayoutDashboard} label="홈" href="/" isActive={isActive('/')} />
        </VStack>

        {/* 시험 도구 */}
        <VStack gap={SPACING.s8} style={{ padding: SPACING.s8 }}>
          <Typo.MD size={12} color="secondary">시험 도구</Typo.MD>
          <SidebarItem icon={FlaskConical} label="시험 생성" href="/exam-generate" isActive={isActive('/exam-generate')} />
          <SidebarItem icon={List} label="시험 목록" href="/exam-list" isActive={isActive('/exam-list')} />
          <SidebarItem icon={BookOpen} label="시험지 뷰어" href="/exam-viewer" isActive={isActive('/exam-viewer')} />
          <SidebarItem icon={Settings} label="QuestionStem 갤러리" href="/questionstem" isActive={isActive('/questionstem')} />
        </VStack>

        {/* 채팅 */}
        <VStack gap={SPACING.s8} style={{ padding: SPACING.s8 }}>
          <Typo.MD size={12} color="secondary">채팅</Typo.MD>
          <SidebarItem icon={MessageSquare} label="채팅 테스트" href="/chat" isActive={isActive('/chat')} />
        </VStack>

        {/* 어드민 */}
        {user?.role === 'admin' && (
          <VStack gap={SPACING.s8} style={{ padding: SPACING.s8 }}>
            <Typo.MD size={12} color="secondary">어드민</Typo.MD>
            <SidebarItem icon={Users} label="유저 목록" href="/admin/users" isActive={isActive('/admin/users')} />
            <SidebarItem icon={BarChart2} label="문제 리스트" href="/admin/questions" isActive={isActive('/admin/questions')} />
            <SidebarItem icon={Zap} label="API 사용량" href="/admin/usage" isActive={isActive('/admin/usage')} />
          </VStack>
        )}
      </VStack>

      {/* 유저 프로필 + 로그아웃 */}
      <VStack gap={SPACING.s8} fullWidth style={{ padding: SPACING.s8 }}>
        <HStack gap={SPACING.s8} align="center" className={s.userProfile} fullWidth>
          <div className={s.avatar} />
          <VStack gap={SPACING.s4}>
            <Typo.MD size={14} color="primary">{user?.name ?? ''}</Typo.MD>
            <Typo.MD size={12} color="secondary">{user?.email ?? ''}</Typo.MD>
          </VStack>
        </HStack>
        <button className={s.logoutBtn} onClick={handleLogout}>
          <HStack gap={SPACING.s8} align="center">
            <LogOut size={14} color="#5C6370" />
            <Typo.MD size={12} color="secondary">로그아웃</Typo.MD>
          </HStack>
        </button>
      </VStack>
    </VStack>
  );
}
