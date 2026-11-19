/**
 * Unfugly Cloudflare Worker Edge Relay for SRMIST Student Portal
 * Configured with Smart Placement to execute natively in Chennai (MAA) / India.
 * Build: 2026-11-19T15:32:00+05:30 (Smart Placement Trigger)
 */

const ALLOWED_ORIGIN_PREFIXES = [
  'https://sp.srmist.edu.in/',
  'https://sp.srmist.edu.in:443/',
];

const STRIP_FORWARD_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'x-target-url',
  'x-relay-secret',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
  'x-real-ip',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cdn-loop',
  'forwarded',
  'via',
]);

const STRIP_RESPONSE_HEADERS = new Set([
  'set-cookie',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

export default {
  async fetch(request, env, ctx) {
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Cookie, Authorization, x-target-url, x-relay-secret',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const targetUrl = request.headers.get('x-target-url') || url.searchParams.get('url') || '';

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing x-target-url header or url query parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Security check: only proxy to SRMIST Student Portal
    const isAllowed = ALLOWED_ORIGIN_PREFIXES.some((prefix) => targetUrl.startsWith(prefix));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Access denied: Target URL not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Optional pre-shared secret validation if configured in Worker environment
    const expectedSecret = env.SP_RELAY_SECRET;
    if (expectedSecret) {
      const providedSecret = request.headers.get('x-relay-secret');
      if (providedSecret !== expectedSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized relay request' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // Build outbound headers
    const forwardHeaders = new Headers();
    request.headers.forEach((val, key) => {
      const lk = key.toLowerCase();
      if (
        !STRIP_FORWARD_HEADERS.has(lk) &&
        !lk.startsWith('cf-') &&
        !lk.startsWith('x-forwarded-')
      ) {
        forwardHeaders.set(key, val);
      }
    });

    const incomingCookie = request.headers.get('cookie');
    if (incomingCookie) {
      forwardHeaders.set('cookie', incomingCookie);
    }

    if (!forwardHeaders.has('user-agent')) {
      forwardHeaders.set(
        'user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    }

    // Prepare body
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength > 0) {
        body = buffer;
      }
    }

    try {
      const originRes = await fetch(targetUrl, {
        method,
        headers: forwardHeaders,
        body,
        redirect: 'manual',
      });

      const resHeaders = new Headers();
      originRes.headers.forEach((val, key) => {
        const lk = key.toLowerCase();
        if (!STRIP_RESPONSE_HEADERS.has(lk)) {
          resHeaders.set(key, val);
        }
      });

      // Preserve multiple Set-Cookie headers accurately
      if (typeof originRes.headers.getSetCookie === 'function') {
        for (const cookie of originRes.headers.getSetCookie()) {
          resHeaders.append('Set-Cookie', cookie);
        }
      } else {
        const single = originRes.headers.get('set-cookie');
        if (single) resHeaders.set('Set-Cookie', single);
      }

      // CORS & Diagnostic headers
      const colo = request.cf?.colo || 'UNKNOWN';
      resHeaders.set('Access-Control-Allow-Origin', '*');
      resHeaders.set('Access-Control-Allow-Credentials', 'true');
      resHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Cookie, Authorization, x-target-url, x-relay-secret');
      resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      resHeaders.set('x-final-url', originRes.url || targetUrl);
      resHeaders.set('x-colo', colo);
      resHeaders.set('x-relay-runtime', `cloudflare-worker-${colo}`);

      return new Response(originRes.body, {
        status: originRes.status,
        statusText: originRes.statusText,
        headers: resHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: `Cloudflare relay upstream failure: ${err.message}`,
          targetUrl,
        }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }
  },
};
