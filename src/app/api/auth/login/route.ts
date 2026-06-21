import { NextResponse } from "next/server";
import {
  getEnv,
  ensureUsersTable,
  hashPassword,
  createSession,
  sessionCookie,
} from "../../../../lib/auth";

export async function POST(request: Request) {
  const { DB } = await getEnv();
  if (!DB)
    return NextResponse.json(
      { error: "DB binding not found" },
      { status: 500 },
    );
  await ensureUsersTable(DB);

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").toString().trim().toLowerCase();
  const password = (body.password ?? "").toString();
  if (!email || !password) {
    return NextResponse.json(
      { error: "email et password requis" },
      { status: 400 },
    );
  }

  const user = await DB.prepare(
    "SELECT id, email, password_hash, salt FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{
      id: number;
      email: string;
      password_hash: string;
      salt: string;
    }>();

  if (!user) {
    return NextResponse.json(
      { error: "identifiants invalides" },
      { status: 401 },
    );
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) {
    return NextResponse.json(
      { error: "identifiants invalides" },
      { status: 401 },
    );
  }

  const token = await createSession(user.id, user.email);
  return NextResponse.json(
    { ok: true, email: user.email },
    { headers: { "Set-Cookie": sessionCookie(token) } },
  );
}
