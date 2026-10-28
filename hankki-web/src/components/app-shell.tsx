'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import type { IconType } from 'react-icons';
import {
  IoHome,
  IoHomeOutline,
  IoLocation,
  IoLocationOutline,
  IoReceipt,
  IoReceiptOutline,
  IoWallet,
  IoWalletOutline,
} from 'react-icons/io5';

import { ToastProvider } from '@/components/toast';
import { BudgetProvider } from '@/store/budget-store';
import styles from './app-shell.module.css';

const TABS: { href: string; title: string; icon: IconType; iconOn: IconType }[] = [
  { href: '/', title: '홈', icon: IoHomeOutline, iconOn: IoHome },
  { href: '/recommend', title: '추천', icon: IoLocationOutline, iconOn: IoLocation },
  { href: '/history', title: '기록', icon: IoReceiptOutline, iconOn: IoReceipt },
  { href: '/budget', title: '예산', icon: IoWalletOutline, iconOn: IoWallet },
];

function TabBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.tabs} aria-label="메인 메뉴">
      {TABS.map((t) => {
        const on = pathname === t.href;
        const Icon = on ? t.iconOn : t.icon;
        return (
          <Link key={t.href} href={t.href} className={`${styles.tab} ${on ? styles.tabOn : ''}`} aria-current={on ? 'page' : undefined}>
            <Icon size={22} aria-hidden />
            <span>{t.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** 모든 화면 공통: 상태 저장소, 토스트, 하단 탭 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <main className={styles.main}>
        <BudgetProvider>{children}</BudgetProvider>
      </main>
      <TabBar />
    </ToastProvider>
  );
}
