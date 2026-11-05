import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_KR, Jua } from 'next/font/google';

import { AppShell } from '@/components/app-shell';
import './globals.css';

// 한글 글꼴은 파일이 많아서 미리 받지 않고(preload: false) 화면에 쓰이는 조각만 받는다
const jua = Jua({ weight: '400', subsets: ['latin'], preload: false, variable: '--font-jua' });
const plex = IBM_Plex_Sans_KR({ weight: ['400', '500', '600', '700'], subsets: ['latin'], preload: false, variable: '--font-plex' });

export const metadata: Metadata = {
  title: '한끼예산',
  description: '식비 예산에 맞춰 인하대 주변 식당을 추천하고, 먹은 만큼 하루 단위로 기록해 오늘 쓸 수 있는 금액을 알려 주는 앱',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F3F6FB',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${jua.variable} ${plex.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
