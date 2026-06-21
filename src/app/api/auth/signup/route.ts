import { NextResponse } from "next/server";
import {
  getEnv,
  ensureUsersTable,
  hashPassword,
  newSalt,
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
  if (password.length < 6) {
    return NextResponse.json(
      { error: "mot de passe trop court (min 6)" },
      { status: 400 },
    );
  }

  const existing = await DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) {
    return NextResponse.json(
      { error: "compte déjà existant" },
      { status: 409 },
    );
  }

  const salt = newSalt();
  const hash = await hashPassword(password, salt);
  const res = await DB.prepare(
    "INSERT INTO users (email, password_hash, salt, created_at) VALUES (?, ?, ?, ?)",
  )
    .bind(email, hash, salt, Date.now())
    .run();

  const userId = Number(res.meta?.last_row_id ?? 0);
  const token = await createSession(userId, email);

  return NextResponse.json(
    { ok: true, email },
    { status: 201, headers: { "Set-Cookie": sessionCookie(token) } },
  );
}
