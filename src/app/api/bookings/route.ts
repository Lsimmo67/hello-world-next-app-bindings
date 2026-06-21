import { NextResponse } from "next/server";
import { getEnv, getSession, readSessionToken } from "../../../lib/auth";

async function ensureTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slot TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
    )
    .run();
}

export async function GET(request: Request) {
  const session = await getSession(readSessionToken(request));
  if (!session)
    return NextResponse.json({ error: "non authentifié" }, { status: 401 });

  const { DB } = await getEnv();
  if (!DB)
    return NextResponse.json(
      { error: "DB binding not found" },
      { status: 500 },
    );
  await ensureTable(DB);

  const { results } = await DB.prepare(
    "SELECT id, name, slot, created_at FROM bookings ORDER BY id DESC",
  ).all();
  return NextResponse.json({ bookings: results ?? [] });
}

export async function POST(request: Request) {
  const session = await getSession(readSessionToken(request));
  if (!session)
    return NextResponse.json({ error: "non authentifié" }, { status: 401 });

  const { DB } = await getEnv();
  if (!DB)
    return NextResponse.json(
      { error: "DB binding not found" },
      { status: 500 },
    );
  await ensureTable(DB);

  let body: { name?: string; slot?: string };
  try {
    body = (await request.json()) as { name?: string; slot?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").toString().trim();
  const slot = (body.slot ?? "").toString().trim();
  if (!name || !slot) {
    return NextResponse.json({ error: "name et slot requis" }, { status: 400 });
  }

  await DB.prepare(
    "INSERT INTO bookings (name, slot, created_at) VALUES (?, ?, ?)",
  )
    .bind(name, slot, Date.now())
    .run();
  return NextResponse.json({ ok: true }, { status: 201 });
}
