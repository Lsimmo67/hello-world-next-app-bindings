import { getCloudflareContext } from "@opennextjs/cloudflare";

// Home-grown auth for the Webflow Cloud POC: no Better-Auth, no feature flag.
// Passwords hashed with PBKDF2 (Web Crypto), sessions stored in the KV binding.

const SESSION_COOKIE = "poc_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const ITERATIONS = 100_000;

type Env = { DB?: D1Database; SESSIONS?: KVNamespace };
type Session = { userId: number; email: string };

export async function getEnv(): Promise<Env> {
  const ctx = await getCloudflareContext();
  return (ctx?.env as unknown as Env) ?? {};
}

// Defensive: create the table on first use (POC does not depend on prod migrations).
export async function ensureUsersTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
    )
    .run();
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(n: number): string {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return toHex(a);
}

export function newSalt(): string {
  return randomHex(16);
}

export async function hashPassword(
  password: string,
  saltHex: string,
): Promise<string> {
  const pairs = saltHex.match(/.{2}/g) ?? [];
  const salt = Uint8Array.from(pairs.map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

export async function createSession(
  userId: number,
  email: string,
): Promise<string> {
  const { SESSIONS } = await getEnv();
  if (!SESSIONS) throw new Error("SESSIONS binding not found");
  const token = randomHex(32);
  await SESSIONS.put(`session:${token}`, JSON.stringify({ userId, email }), {
    expirationTtl: SESSION_TTL,
  });
  return token;
}

export async function getSession(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null;
  const { SESSIONS } = await getEnv();
  if (!SESSIONS) return null;
  const raw = await SESSIONS.get(`session:${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  const { SESSIONS } = await getEnv();
  await SESSIONS?.delete(`session:${token}`);
}

export function readSessionToken(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  const m = cookie.match(/(?:^|; )poc_session=([^;]+)/);
  return m ? m[1] : undefined;
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL}`;
}

export function clearCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
