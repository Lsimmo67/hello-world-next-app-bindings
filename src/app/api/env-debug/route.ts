import { NextResponse } from "next/server";

/**
 * GET /api/env-debug
 *
 * Reports the env vars + secrets visible to this app at runtime. Returns
 * ONLY names + heuristic classifications — values are never returned.
 *
 * Use this endpoint to verify, after deploying via Webflow Cloud, that
 * the env vars / secrets you configured in the dashboard are actually
 * landing in the deployed worker.
 *
 * Classifications:
 * - `likelySecret`  — name matches a known sensitive keyword (SECRET,
 *                     KEY, TOKEN, …). At runtime there is no first-class
 *                     way to distinguish a Cloudflare secret from a plain
 *                     `[vars]` entry — both arrive as strings in env —
 *                     so this is a best-effort name heuristic.
 * - `frontendPrefix` — name uses Next.js's `NEXT_PUBLIC_*` public-var
 *                     prefix, meaning it gets inlined into the client
 *                     bundle at build time. Anything else is backend-only.
 */

const SENSITIVE_KEYWORDS = [
  "SECRET",
  "KEY",
  "TOKEN",
  "PASSWORD",
  "CREDENTIAL",
  "PRIVATE",
  "AUTH",
  "API_KEY",
  "APIKEY",
  "ACCESS",
  "BEARER",
  "JWT",
  "CERT",
  "PEM",
  "RSA",
];

const FRONTEND_PREFIXES = ["NEXT_PUBLIC_"];

function isLikelySecret(name: string): boolean {
  const upper = name.toUpperCase();
  return SENSITIVE_KEYWORDS.some((k) => upper.includes(k));
}

function isFrontendExposed(name: string): boolean {
  return FRONTEND_PREFIXES.some((p) => name.startsWith(p));
}

interface EnvVarInfo {
  name: string;
  likelySecret: boolean;
  frontendPrefix: boolean;
}

interface EnvDebugResponse {
  framework: "nextjs";
  frontendPrefixes: string[];
  totalCount: number;
  envVars: EnvVarInfo[];
  timestamp: string;
  note: string;
}

export async function GET() {
  const envVars: EnvVarInfo[] = Object.entries(process.env)
    // Only string values — bindings (D1/KV/R2) come through
    // getCloudflareContext().env, not process.env, so this filter is a
    // belt-and-suspenders guard.
    .filter(([, value]) => typeof value === "string")
    .map(([name]) => ({
      name,
      likelySecret: isLikelySecret(name),
      frontendPrefix: isFrontendExposed(name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const body: EnvDebugResponse = {
    framework: "nextjs",
    frontendPrefixes: FRONTEND_PREFIXES,
    totalCount: envVars.length,
    envVars,
    timestamp: new Date().toISOString(),
    note: "Names only — values are never returned. `likelySecret` is a name heuristic; at runtime Cloudflare secrets and [vars] entries are indistinguishable.",
  };

  return NextResponse.json(body);
}
