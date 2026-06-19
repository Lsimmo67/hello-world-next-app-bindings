import { NextResponse } from "next/server";

/**
 * POST /api/env-check
 *
 * Body: { "name": "VAR_NAME", "value": "expected-value" }
 *
 * Returns: { name, exists, matches }
 *
 * Verifies that an env var / secret was wired up with the expected value,
 * without ever returning the stored value itself. Designed for end-to-end
 * deploy testing: the test provides the value it set in the Webflow Cloud
 * dashboard, and the endpoint confirms the worker sees the same value.
 *
 * Security:
 * - The stored value is never returned.
 * - Comparison is constant-time (after a length check) to avoid timing
 *   side-channels on secret values.
 * - Only string env entries are inspected (bindings like D1/KV/R2 are
 *   skipped — they're not env vars).
 */

interface CheckRequest {
  name?: unknown;
  value?: unknown;
}

interface CheckResponse {
  name: string;
  exists: boolean;
  matches: boolean;
}

/**
 * Constant-time string equality. Length check is intentionally non-constant —
 * leaking the length of a missing-vs-present env var is acceptable for this
 * use case (and matches Node's `crypto.timingSafeEqual` semantics, which also
 * requires equal-length buffers).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: Request) {
  let body: CheckRequest;
  try {
    body = (await request.json()) as CheckRequest;
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (typeof body.name !== "string" || body.name.length === 0) {
    return NextResponse.json(
      { error: "`name` must be a non-empty string" },
      { status: 400 }
    );
  }
  if (typeof body.value !== "string") {
    return NextResponse.json(
      { error: "`value` must be a string" },
      { status: 400 }
    );
  }

  const stored = process.env[body.name];
  const exists = typeof stored === "string";
  const matches = exists && timingSafeEqual(stored, body.value);

  const response: CheckResponse = {
    name: body.name,
    exists,
    matches,
  };

  return NextResponse.json(response);
}
