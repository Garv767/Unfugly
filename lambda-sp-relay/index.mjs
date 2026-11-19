/**
 * Unfugly AWS Lambda Edge Relay for SRMIST Student Portal
 * Region: ap-south-1 (Mumbai, India)
 * Runtime: Node.js 20.x or 22.x
 * Architecture: arm64 (Graviton2) or x86_64
 * Trigger: Lambda Function URL (Auth: NONE, Payload format: 2.0)
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
  'x-forwarded-server',
  'x-real-ip',
  'forwarded',
  'via'
]);

const STRIP_RESPONSE_HEADERS = new Set([
  'set-cookie',
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, HEAD, OPTIONS',
        'access-control-allow-headers': 'Content-Type, Cookie, Authorization, x-target-url, x-relay-secret',
        'access-control-max-age': '86400',
      },
    };
  }

  const headers = event.headers || {};
  // Headers in Lambda 2.0 are lowercase
  const targetUrl = headers['x-target-url'] || event.queryStringParameters?.url || '';

  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Missing x-target-url header or url query parameter' }),
    };
  }

  // Security: only allow proxying to SRMIST Student Portal
  const isAllowed = ALLOWED_ORIGIN_PREFIXES.some((prefix) => targetUrl.startsWith(prefix));
  if (!isAllowed) {
    return {
      statusCode: 403,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Access denied: Target URL not allowed' }),
    };
  }

  // Pre-shared secret check if SP_RELAY_SECRET is configured in Lambda environment variables
  const expectedSecret = process.env.SP_RELAY_SECRET;
  if (expectedSecret) {
    const providedSecret = headers['x-relay-secret'];
    if (providedSecret !== expectedSecret) {
      return {
        statusCode: 401,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized relay request' }),
      };
    }
  }

  // Prepare outbound headers for SRMIST
  const forwardHeaders = new Headers();
  for (const [key, val] of Object.entries(headers)) {
    const lk = key.toLowerCase();
    if (
      !STRIP_FORWARD_HEADERS.has(lk) &&
      !lk.startsWith('x-amzn-') &&
      !lk.startsWith('x-forwarded-')
    ) {
      forwardHeaders.set(key, val);
    }
  }

  // Explicitly handle cookies: support both headers['cookie'] and event.cookies array
  const incomingCookie = headers['cookie'] || (event.cookies && event.cookies.length > 0 ? event.cookies.join('; ') : '');
  if (incomingCookie) {
    forwardHeaders.set('cookie', incomingCookie);
  }

  if (!forwardHeaders.has('user-agent')) {
    forwardHeaders.set(
      'user-agent',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  // Prepare request body
  let body = null;
  if (method !== 'GET' && method !== 'HEAD' && event.body) {
    if (event.isBase64Encoded) {
      body = Buffer.from(event.body, 'base64');
    } else {
      body = Buffer.from(event.body, 'utf8');
    }
  }

  try {
    const originRes = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
      redirect: 'manual',
    });

    const resHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'Content-Type, Cookie, Authorization, x-target-url, x-relay-secret',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'x-final-url': originRes.url || targetUrl,
      'x-relay-runtime': 'aws-lambda-ap-south-1',
    };

    originRes.headers.forEach((val, key) => {
      const lk = key.toLowerCase();
      if (!STRIP_RESPONSE_HEADERS.has(lk)) {
        resHeaders[key] = val;
      }
    });

    // Extract Set-Cookie headers into Lambda's native cookies array
    let responseCookies = [];
    if (typeof originRes.headers.getSetCookie === 'function') {
      responseCookies = originRes.headers.getSetCookie();
    } else {
      const single = originRes.headers.get('set-cookie');
      if (single) responseCookies = [single];
    }

    const resBuffer = await originRes.arrayBuffer();
    const base64Body = Buffer.from(resBuffer).toString('base64');

    return {
      statusCode: originRes.status,
      headers: resHeaders,
      cookies: responseCookies,
      body: base64Body,
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: `AWS Lambda relay upstream failure: ${err.message}`,
        targetUrl,
      }),
    };
  }
};
