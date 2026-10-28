import type { Metadata, Viewport } from 'next';

import { AppShell } from '@/components/app-shell';
import './globals.css';

export const metadata: Metadata = {
  title: '한끼예산',
  description: '식비 예산에 맞춰 인하대 주변 식당을 추천하고, 먹을 때마다 다음 한 끼 금액을 다시 계산해 주는 앱',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2F4F6',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
