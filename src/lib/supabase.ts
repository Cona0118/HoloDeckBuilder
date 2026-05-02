import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 빌드는 통과시키되 런타임에 명확한 메시지를 던진다.
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. ' +
      '게시판 기능이 동작하지 않습니다. .env.local.example을 참고하세요.',
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: false },
});
