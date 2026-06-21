import { NextResponse } from "next/server";
import { getSession, readSessionToken } from "../../../../lib/auth";

export async function GET(request: Request) {
  const session = await getSession(readSessionToken(request));
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { email: session.email } });
}
