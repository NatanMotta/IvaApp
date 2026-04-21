// @ts-nocheck
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const target = (url.searchParams.get('target') || 'return').toLowerCase();

  const targetMap: Record<string, { appUrl: string }> = {
    success: {
      appUrl: 'ivaapp://billing/success',
    },
    cancel: {
      appUrl: 'ivaapp://billing/cancel',
    },
    return: {
      appUrl: 'ivaapp://billing/return',
    },
  };

  const selected = targetMap[target] || targetMap.return;

  return new Response(null, {
    status: 302,
    headers: {
      ...CORS_HEADERS,
      Location: selected.appUrl,
    },
  });
});
