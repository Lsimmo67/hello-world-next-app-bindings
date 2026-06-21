import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

async function getDb(): Promise<D1Database | undefined> {
  const ctx = await getCloudflareContext();
  const env = ctx?.env as unknown as Record<string, unknown> | undefined;
  return env?.DB as D1Database | undefined;
}

// Defensive: create the table on first use so the POC does not depend on
// the production migration mechanism. Idempotent (IF NOT EXISTS).
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

export async function GET() {
  const db = await getDb();
  if (!db) {
    return NextResponse.json(
      { error: "DB binding not found" },
      { status: 500 },
    );
  }
  await ensureTable(db);
  const { results } = await db
    .prepare("SELECT id, name, slot, created_at FROM bookings ORDER BY id DESC")
    .all();
  return NextResponse.json({ bookings: results ?? [] });
}

export async function POST(request: Request) {
  const db = await getDb();
  if (!db) {
    return NextResponse.json(
      { error: "DB binding not found" },
      { status: 500 },
    );
  }
  await ensureTable(db);

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

  await db
    .prepare("INSERT INTO bookings (name, slot, created_at) VALUES (?, ?, ?)")
    .bind(name, slot, Date.now())
    .run();

  return NextResponse.json({ ok: true }, { status: 201 });
}
