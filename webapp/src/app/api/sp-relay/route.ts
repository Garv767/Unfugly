import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const preferredRegion = 'bom1';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Hop-by-hop and proxy headers to strip before forwarding upstream to SRMIST
// Stripping all proxy and client-tracing headers ensures SRMIST's Apache/Tomcat/F5
// sees the request as originating purely from Vercel's Mumbai AWS (ap-south-1) node,
// preventing datacenter IP blocks and "Invalid credentials" rejections.
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
  'x-forwarded-server',
  'x-real-ip',
  'x-vercel-id',
  'x-vercel-forwarded-for',
  'x-vercel-proxied-for',
  'x-vercel-ip-country',
  'x-vercel-ip-country-region',
  'x-vercel-ip-city',
  'x-vercel-ip-latitude',
  'x-vercel-ip-longitude',
  'x-vercel-ip-timezone',
  'x-vercel-cache',
  'x-vercel-execution-region',
  'x-matched-path',
  'cf-connecting-ip',
  'cf-ray',
  'cf-visitor',
  'cf-ipcountry',
  'cdn-loop',
  'forwarded',
  'via',
  'rsc',
  'next-router-state-tree',
  'next-router-prefetch',
  'next-url',
  'purpose',
  'priority'
]);

// Headers to strip from upstream response before returning to client
// Node/Edge fetch() automatically decompresses the body, so forwarding content-encoding
// causes downstream clients (got-scraping/zlib) to fail with "incorrect header check"
const STRIP_RESPONSE_HEADERS = new Set([
  'set-cookie',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

const ALLOWED_ORIGIN_PREFIXES = [
  'https://sp.srmist.edu.in/',
  'https://sp.srmist.edu.in:443/',
];

async function handleRelay(req: NextRequest) {
  const targetUrl =
    req.headers.get('x-target-url') ||
    req.nextUrl.searchParams.get('url') ||
    '';

  console.log(`[SP_RELAY] Incoming ${req.method} request targeting: ${targetUrl || 'NONE'}`);

  if (!targetUrl) {
    return NextResponse.json(
      { error: 'Missing x-target-url header or url search param' },
      { status: 400 }
    );
  }

  // Security check: restrict proxying strictly to SRMIST Student Portal
  const isAllowed = ALLOWED_ORIGIN_PREFIXES.some((prefix) =>
    targetUrl.startsWith(prefix)
  );
  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Access denied: Target URL not allowed' },
      { status: 403 }
    );
  }

  // Optional pre-shared secret validation if configured
  const expectedSecret = process.env.SP_RELAY_SECRET;
  if (expectedSecret) {
    const providedSecret = req.headers.get('x-relay-secret');
    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized relay' }, { status: 401 });
    }
  }

  // Build outbound headers
  const forwardHeaders = new Headers();
  req.headers.forEach((val, key) => {
    const lk = key.toLowerCase();
    if (
      !STRIP_FORWARD_HEADERS.has(lk) &&
      !lk.startsWith('x-vercel-') &&
      !lk.startsWith('x-forwarded-') &&
      !lk.startsWith('cf-')
    ) {
      forwardHeaders.set(key, val);
    }
  });

  // Explicitly forward incoming cookies (NextRequest might not iterate over cookie in forEach)
  const incomingCookie = req.headers.get('cookie');
  if (incomingCookie) {
    forwardHeaders.set('cookie', incomingCookie);
  }

  // Ensure default browser headers if not provided
  if (!forwardHeaders.has('user-agent')) {
    forwardHeaders.set(
      'user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  console.log(
    `[SP_RELAY] Outbound ${req.method} to ${targetUrl} | Cookie: ${Boolean(incomingCookie)} (len=${incomingCookie?.length || 0})`
  );

  try {
    let body: BodyInit | null = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const buffer = await req.arrayBuffer();
      if (buffer.byteLength > 0) {
        body = buffer;
      }
    }

    const originRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    console.log(`[SP_RELAY] Upstream ${originRes.status} ${originRes.statusText} from ${targetUrl}`);

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
        resHeaders.append('set-cookie', cookie);
      }
    } else {
      const singleSetCookie = originRes.headers.get('set-cookie');
      if (singleSetCookie) {
        resHeaders.set('set-cookie', singleSetCookie);
      }
    }

    // Strict cache invalidation: prevent edge CDN, proxies, or browsers from caching captchas or portal responses
    resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    resHeaders.set('Pragma', 'no-cache');
    resHeaders.set('Expires', '0');

    // CORS & Diagnostic headers
    resHeaders.set('x-final-url', originRes.url || targetUrl);
    resHeaders.set('x-relay-runtime', 'vercel-bom1');
    resHeaders.set('access-control-allow-origin', '*');
    resHeaders.set('access-control-allow-credentials', 'true');
    resHeaders.set(
      'access-control-allow-headers',
      'Content-Type, Cookie, Authorization, x-target-url, x-relay-secret'
    );

    const resBody = await originRes.arrayBuffer();
    return new Response(resBody, {
      status: originRes.status,
      statusText: originRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: `Edge relay request failed: ${err.message}`,
        targetUrl,
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleRelay(req);
}

export async function POST(req: NextRequest) {
  return handleRelay(req);
}

export async function HEAD(req: NextRequest) {
  return handleRelay(req);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, HEAD, OPTIONS',
      'access-control-allow-headers':
        'Content-Type, Cookie, Authorization, x-target-url, x-relay-secret',
      'access-control-max-age': '86400',
    },
  });
}
