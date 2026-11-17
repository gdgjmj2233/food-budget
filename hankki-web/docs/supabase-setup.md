# 로그인·저장 연결하기 (Supabase + Google 로그인)

앱의 로그인과 "다른 기기에서도 이어보기"는 Supabase(무료)를 써요. Firebase에서 옮겨 온 것이라, **기존 Firebase 계정은 이어지지 않고 새로 가입해야 해요.**
이 문서대로 하기 전까지 앱은 로그인 없이 이 기기에만 저장해요(Log in 창에서 Google 버튼도 안 보여요).

## 1. Supabase 프로젝트 만들기

1. https://supabase.com 에서 가입하고 **New project**를 만들어요. 이름은 `hankki`, 지역은 `Northeast Asia (Seoul)`가 좋아요.
2. 데이터베이스 비밀번호를 정해서 **본인만 아는 곳에 적어 둬요.** (이 앱에는 필요 없고, 남에게 알려 주지 않아요.)
3. 프로젝트가 만들어지면 **Project Settings → API**에서 두 가지를 찾아요.
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon / publishable key** (공개 키)
   - ⚠️ `service_role` 키는 비밀이라 **절대 앱 코드나 채팅에 올리지 않아요.**

## 2. 저장 표 만들기

**SQL Editor**에 아래를 붙여 넣고 **Run**을 눌러요. 한 사람당 한 줄이고, 본인 줄만 읽고 쓸 수 있어요.

```sql
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  json text not null,
  updated_at bigint not null
);

alter table public.user_data enable row level security;

create policy "own row select" on public.user_data
  for select using (auth.uid() = user_id);
create policy "own row insert" on public.user_data
  for insert with check (auth.uid() = user_id);
create policy "own row update" on public.user_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row delete" on public.user_data
  for delete using (auth.uid() = user_id);
```

## 3. 이메일 가입 설정

**Authentication → Sign In / Providers → Email**에서
- **Confirm email**을 **끄면** 가입하자마자 바로 쓸 수 있어요. (켜 두면 메일의 확인 링크를 눌러야 해요.)

## 4. 사이트 주소 등록

**Authentication → URL Configuration**
- **Site URL**: 메인 주소 (예: `https://gdgjmj2233.github.io/food-budget/`)
- **Redirect URLs**에 쓰는 주소를 모두 추가해요. 끝에 `**`을 붙여요.
  - `https://gdgjmj2233.github.io/food-budget/**`
  - `https://hanjihoon11.github.io/food-budget/**`
  - `http://localhost:3000/**`

여기에 없는 주소에서는 로그인 뒤에 돌아오지 못해요.

## 5. Google 로그인 켜기

Google 쪽에서 "OAuth 클라이언트"를 하나 만들어야 해요. **이 단계는 계정 주인이 직접 해야 해요.**

1. https://console.cloud.google.com 에서 프로젝트를 만들거나 고르고, **API 및 서비스 → OAuth 동의 화면**을 설정해요(앱 이름 `한끼예산`, 이메일 입력).
2. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**, 유형은 **웹 애플리케이션**이에요.
3. **승인된 리디렉션 URI**에 Supabase의 콜백 주소를 넣어요. Supabase의 **Authentication → Sign In / Providers → Google**에 **Callback URL**이 나와 있어요 (`https://xxxx.supabase.co/auth/v1/callback`).
4. 만들면 나오는 **클라이언트 ID**와 **클라이언트 보안 비밀번호**를 Supabase의 **Google** 설정에 붙여 넣고 **Enable**을 켜요.
   - ⚠️ 보안 비밀번호는 Supabase 화면에만 넣어요. 앱 코드나 채팅에는 올리지 않아요.

## 6. 앱에 연결하기

`hankki-web/src/lib/supabase.ts` 맨 위의 두 줄에 1번에서 찾은 값을 넣어요.

```ts
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://xxxx.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '여기에 anon 공개 키';
```

내 컴퓨터에서만 시험할 때는 코드를 고치지 않고 `hankki-web/.env.local`에 적어도 돼요(git에 올라가지 않아요).

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에 anon 공개 키
```

## 7. 잘 되는지 확인하기

1. 앱의 **Log in**에서 이메일로 가입하고, 기록을 하나 남겨요.
2. 다른 브라우저(또는 시크릿 창)에서 같은 계정으로 로그인해서 기록이 보이는지 봐요.
3. **Google로 계속하기**를 눌러 구글 계정으로 들어와지는지 봐요.
4. Supabase의 **Table Editor → user_data**에 줄이 생겼는지 봐요.

## 알아 두세요

- **무료 요금제는 일주일쯤 접속이 없으면 프로젝트가 잠시 멈춰요.** 발표나 시연 전에 한 번 열어서 깨워 두세요.
- 공개 키는 브라우저에 그대로 보이는 값이에요. 대신 2번의 규칙(RLS) 때문에 **로그인한 본인의 줄만** 읽고 쓸 수 있어요. 규칙을 지우거나 끄면 모두가 볼 수 있으니 건드리지 마세요.
- 기록은 이 기기에 먼저 저장되고, 로그인하면 계정에도 저장돼요. 로그아웃하면 이 기기의 기록은 지워지고 다시 로그인하면 불러와요.
