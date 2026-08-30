const enc = new TextEncoder();

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const SESSION_COOKIE = "ba_session";
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export async function createSession(
  username: string,
  secret: string,
  now = Date.now(),
): Promise<string> {
  const payload = `${username}|${now + SESSION_TTL_MS}`;
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySession(
  cookie: string | null,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!cookie) return false;
  const dot = cookie.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);
  const expected = await hmac(payload, secret);
  if (!timingSafeEqual(sig, expected)) return false;
  const expiry = Number(payload.split("|")[1] ?? 0);
  if (!expiry || now >= expiry) return false;
  return true;
}

export function cookieHeader(cookie: string): string {
  return `${SESSION_COOKIE}=${cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    Math.floor(
      SESSION_TTL_MS / 1000,
    )
  }`;
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}
