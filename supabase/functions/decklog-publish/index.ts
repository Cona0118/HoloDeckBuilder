// Deck Log JP publish 프록시. Referer/Origin을 부착해 브라우저 CORS/검증을 우회한다.
const DECKLOG_PUBLISH_URL = 'https://decklog.bushiroad.com/system/app/api/publish/9'; // Task 1 확정값
const CONTENT_TYPE: 'json' | 'form' = 'json'; // Task 1 확정값

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function encodeBody(payload: unknown): { body: string; contentType: string } {
  if (CONTENT_TYPE === 'form') {
    const params = new URLSearchParams();
    params.set('deck', JSON.stringify(payload));
    return { body: params.toString(), contentType: 'application/x-www-form-urlencoded' };
  }
  return { body: JSON.stringify(payload), contentType: 'application/json' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }
  try {
    const payload = await req.json();
    const { body, contentType } = encodeBody(payload);
    const upstream = await fetch(DECKLOG_PUBLISH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Referer: 'https://decklog.bushiroad.com/',
        Origin: 'https://decklog.bushiroad.com',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
