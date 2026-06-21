import { NextResponse } from "next/server";
import {
  deleteSession,
  readSessionToken,
  clearCookie,
} from "../../../../lib/auth";

export async function POST(request: Request) {
  await deleteSession(readSessionToken(request));
  return NextResponse.json(
    { ok: true },
    { headers: { "Set-Cookie": clearCookie() } },
  );
}
