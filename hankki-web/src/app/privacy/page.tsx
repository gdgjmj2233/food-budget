import type { Metadata } from 'next';

import { Card, Screen, Sub, Title } from '@/components/ui';

export const metadata: Metadata = { title: '개인정보처리방침 · 한끼예산' };

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: '1. 모으는 정보',
    items: [
      '로그인할 때: Google 계정의 이메일 주소. 로그인은 Google 계정으로만 하고, 비밀번호는 이 앱이 받거나 저장하지 않아요.',
      '내 정보(선택): 닉네임, 학과, 학번, 캐릭터. 적지 않아도 앱을 쓸 수 있어요.',
      '앱을 쓰며 만든 기록: 예산 설정, 먹은 기록(가게·메뉴·가격·날짜), 식당 별점.',
      '위치(허용한 경우): 주변 식당을 찾는 데만 쓰고, 이 기기에서만 쓰며 서버에 저장하지 않아요.',
    ],
  },
  {
    title: '2. 쓰는 곳',
    items: [
      '로그인과 다른 기기에서 기록 이어보기',
      '예산 계산과 식당 추천 화면 제공',
    ],
  },
  {
    title: '3. 보관 장소와 맡기는 곳',
    items: [
      '기본은 이 기기의 브라우저에 저장돼요. 로그인하면 기록이 Supabase(로그인·데이터베이스 서비스)에 같이 저장되고, 내 줄은 내 계정으로만 읽고 쓸 수 있어요.',
      'Google 로그인은 Google이 처리해요. 이 앱은 이메일 주소만 받아서 써요.',
      '지도와 식당 검색은 카카오맵을 써요. 주변 식당을 찾을 때 위치 좌표가 카카오에 전달될 수 있어요.',
      '위에 적은 경우 말고는 정보를 다른 사람이나 회사에 팔거나 주지 않아요.',
    ],
  },
  {
    title: '4. 보관 기간과 지우기',
    items: [
      '로그인한 계정의 기록은 계정을 쓰는 동안 보관해요. 로그아웃하면 이 기기의 기록은 지워지고, 다시 로그인하면 불러와요.',
      '계정과 저장된 기록을 지우고 싶으면 아래 문의 방법으로 알려 주세요. 확인되는 대로 지워요.',
    ],
  },
  {
    title: '5. 문의',
    items: [
      '개인정보에 관한 문의와 요청은 한끼예산 GitHub 저장소의 Issues(https://github.com/gdgjmj2233/food-budget/issues)로 보내 주세요. 이메일 주소 같은 개인정보는 글에 적지 말고, 계정을 지워 달라는 요청에는 가입한 이메일의 앞부분만 적어 주세요.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Screen>
      <Title>개인정보처리방침</Title>
      <Sub>한끼예산은 서비스에 꼭 필요한 정보만 모아요. 시행일 2026년 11월 17일.</Sub>
      {SECTIONS.map((s) => (
        <Card key={s.title}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 8px' }}>{s.title}</h2>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.6 }}>
            {s.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
      ))}
    </Screen>
  );
}
