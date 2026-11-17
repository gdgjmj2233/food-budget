import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 브라우저에 그대로 보이는 값이라 숨기지 않아도 된다(공개 키, anon key). 데이터는 테이블 규칙(RLS)으로 본인만 읽고 쓸 수 있다.
// 비밀 키(service_role)는 절대 여기에 넣지 않는다. 만드는 방법은 hankki-web/docs/supabase-setup.md 에 있다.
// 주소와 키는 여기에 직접 적어도 되고, 내 컴퓨터에서 시험할 때는 .env.local 에 적어도 된다(git 에 올라가지 않는다).
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** 주소와 키가 들어 있어야 로그인·저장을 쓸 수 있다. 비어 있으면 앱은 로그인 없이 이 기기에만 저장한다 */
export const supabaseReady = URL !== '' && ANON_KEY !== '';

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(URL, ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
