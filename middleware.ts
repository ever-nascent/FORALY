/**
 * Vercel Edge Middleware. Nothing behind this — not the cards, not the data
 * file — is served without the password. The conversation is private and the
 * only person who should ever read it is the person it belongs to.
 *
 * Two environment variables:
 *   WRAPPED_PASSWORD  required. The password.
 *   WRAPPED_SECRET    optional. HMAC key for the session cookie; if it is not
 *                     set the password is used, which means changing the
 *                     password also invalidates every existing session.
 */

export const config = {
  // The fonts and the icon are public so the gate itself can be typeset.
  matcher: ['/((?!fonts/|mark\\.svg|favicon\\.ico).*)'],
};

/** The edge runtime exposes env this way; typed here so no Node types are pulled in. */
declare const process: { env: Record<string, string | undefined> };

const COOKIE = 'three_months';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
/** Failed attempts are slowed down; there is no shared store to count them in. */
const WRONG_PASSWORD_DELAY_MS = 700;

const encoder = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  // Compare a fixed-length digest so length alone reveals nothing.
  let diff = left.length ^ right.length;
  const len = Math.max(left.length, right.length);
  for (let i = 0; i < len; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function isValidCookie(header: string | null, secret: string): Promise<boolean> {
  const raw = header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return false;

  const [expiry, mac] = decodeURIComponent(raw).split('.');
  if (!expiry || !mac) return false;
  if (Number(expiry) < Date.now()) return false;

  return timingSafeEqual(mac, await sign(expiry, secret));
}

/**
 * The gate has to send you back to the address you asked for, query string and
 * all — `?motion=on` is the documented way to settle whether a still sequence
 * is still on purpose, and posting a password to `/` threw it away.
 */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function here(request: Request): string {
  const url = new URL(request.url);
  // Both halves come back percent-encoded from the parser; escaping is only
  // for the HTML attribute this lands in.
  return `${url.pathname}${url.search}`;
}

function page(wrong: boolean, action: string): Response {
  const body = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#17121c">
<title>Relationship Wrapped</title>
<link rel="icon" href="/mark.svg" type="image/svg+xml">
<style>
  @font-face{font-family:'Schibsted Grotesk';src:url(/fonts/text-latin.woff2) format('woff2');font-weight:400 900;font-display:swap}
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;display:grid;place-items:center;padding:2rem;
    background:radial-gradient(120% 92% at 50% 14%,#312c35,#17121c);color:#fff3e4;
    font-family:'Schibsted Grotesk',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  form{display:grid;gap:1rem;width:min(20rem,100%)}
  label{font-size:1.0625rem;font-weight:500;color:#c9bbd1}
  input{width:100%;padding:.75rem .9rem;border:1px solid #e8b84b;border-radius:999px;
    background:transparent;color:#fff3e4;font:inherit;font-size:1.0625rem}
  input:focus-visible{outline:2px solid #e8b84b;outline-offset:2px}
  button{padding:.75rem 1rem;border:0;border-radius:999px;background:#e8b84b;color:#17121c;
    font:inherit;font-size:1.0625rem;font-weight:600;cursor:pointer}
  button:focus-visible{outline:2px solid #fff3e4;outline-offset:2px}
  p{margin:0;font-size:0.8125rem;color:#c9bbd1}
</style>
</head><body>
<form method="POST" action="${escapeAttribute(action)}">
  <label for="p">Password</label>
  <input id="p" name="password" type="password" autocomplete="current-password" autofocus required>
  <button type="submit">Open</button>
  ${wrong ? '<p role="alert">That is not it. Try again.</p>' : ''}
</form>
</body></html>`;

  return new Response(body, {
    status: wrong ? 401 : 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const password = process.env.WRAPPED_PASSWORD;
  if (!password) {
    return new Response('WRAPPED_PASSWORD is not set.', {
      status: 500,
      headers: { 'cache-control': 'no-store' },
    });
  }
  const secret = process.env.WRAPPED_SECRET ?? password;

  if (await isValidCookie(request.headers.get('cookie'), secret)) return undefined;

  if (request.method === 'POST') {
    const form = await request.formData();
    const given = form.get('password');

    if (typeof given === 'string' && timingSafeEqual(given, password)) {
      const expiry = String(Date.now() + SESSION_SECONDS * 1000);
      const value = `${expiry}.${await sign(expiry, secret)}`;
      return new Response(null, {
        status: 303,
        headers: {
          location: here(request),
          'cache-control': 'no-store',
          'set-cookie':
            `${COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${SESSION_SECONDS}; ` +
            'HttpOnly; Secure; SameSite=Lax',
        },
      });
    }

    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSWORD_DELAY_MS));
    return page(true, here(request));
  }

  return page(false, here(request));
}
