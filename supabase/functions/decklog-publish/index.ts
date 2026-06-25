// Deck Log 발행 프록시 (decklog-en 도메인의 /ja 로케일 = JP 카드 세트, hololive 타이틀 108).
// 브라우저는 CORS/Referer 검증 때문에 Deck Log를 직접 호출할 수 없어 서버에서 대행한다.
//
// 로그인 불필요(실측 확정 2026-06-26, 익명 발행 성공 deck 4BMBR).
//   익명으로도 발행되며, 계정/세션 쿠키가 필요 없다. 단 페이로드는
//   has_session:false 여야 하고(익명이므로), 덱이 데클로그 규칙상 유효해야 한다.
//
// 흐름(/ja 로케일이라 app-ja 프리픽스):
//   (1) POST /system/app-ja/api/create/  → { token_id, token } + Set-Cookie: CAKEPHP=...
//   (2) 그 토큰/쿠키로 POST /system/app-ja/api/publish/108 (덱 레시피 + token)
//       → { "status":"OK", "id":..., "deck_id":"XXXXX" }
//
// 클라이언트는 token 없이 덱 레시피만 보낸다. token_id/token은 여기서 주입한다.

const CREATE_URL = 'https://decklog-en.bushiroad.com/system/app-ja/api/create/';
const PUBLISH_URL = 'https://decklog-en.bushiroad.com/system/app-ja/api/publish/108';

const UPSTREAM_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json;charset=UTF-8',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://decklog-en.bushiroad.com',
  Referer: 'https://decklog-en.bushiroad.com/ja/create?c=108',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
};

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** 응답의 Set-Cookie들에서 CAKEPHP 세션 쿠키 한 줄(`CAKEPHP=...`)을 뽑는다. */
function extractCakephp(res: Response): string | null {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  const cookies =
    typeof h.getSetCookie === 'function'
      ? h.getSetCookie()
      : [res.headers.get('set-cookie') ?? ''];
  for (const c of cookies) {
    const m = /CAKEPHP=[^;]+/.exec(c);
    if (m) return m[0];
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  let recipe: Record<string, unknown>;
  try {
    recipe = await req.json();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  try {
    // (1) 토큰 + 세션 발급(익명)
    const createRes = await fetch(CREATE_URL, {
      method: 'POST',
      headers: UPSTREAM_HEADERS,
      body: JSON.stringify({}),
    });
    const cakephp = extractCakephp(createRes);
    const createData = (await createRes.json().catch(() => null)) as
      | { token_id?: string; token?: string }
      | null;
    const tokenId = createData?.token_id;
    const token = createData?.token;
    if (!cakephp || !tokenId || !token) {
      return json({ error: 'Deck Log 토큰 발급에 실패했습니다.' }, 502);
    }

    // (2) 발행 (레시피 + 토큰, 세션 쿠키 동봉)
    const pubRes = await fetch(PUBLISH_URL, {
      method: 'POST',
      headers: { ...UPSTREAM_HEADERS, Cookie: cakephp },
      body: JSON.stringify({ ...recipe, token_id: tokenId, token }),
    });
    const text = await pubRes.text();
    return new Response(text, {
      status: pubRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
