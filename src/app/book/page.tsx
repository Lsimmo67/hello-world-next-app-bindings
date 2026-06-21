"use client";

import { useEffect, useState, type FormEvent } from "react";

// Webflow Cloud serves the app under a mount path; fetch() is not auto-prefixed
// by Next's basePath, so we prefix manually.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Booking = { id: number; name: string; slot: string; created_at: number };

async function fetchBookings(): Promise<Booking[]> {
  const res = await fetch(`${BASE}/api/bookings`);
  const data = (await res.json()) as { bookings?: Booking[] };
  return data.bookings ?? [];
}

export default function BookPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [name, setName] = useState("");
  const [slot, setSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchBookings()
      .then((b) => {
        if (active) setBookings(b);
      })
      .catch(() => {
        if (active) setError("Lecture impossible");
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slot }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Erreur");
        return;
      }
      setName("");
      setSlot("");
      setBookings(await fetchBookings());
    } catch {
      setError("Écriture impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: 32,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>POC Booking — D1</h1>
      <p style={{ color: "#555" }}>
        Test d&apos;écriture et de lecture réelles dans la base D1 de Webflow
        Cloud.
      </p>

      <form
        onSubmit={submit}
        style={{ display: "grid", gap: 12, margin: "24px 0" }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
          required
          style={{ padding: 10, fontSize: 16 }}
        />
        <input
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          placeholder="Créneau (ex : 2026-06-25 14:00)"
          required
          style={{ padding: 10, fontSize: 16 }}
        />
        <button
          disabled={loading}
          type="submit"
          style={{ padding: 12, fontSize: 16, cursor: "pointer" }}
        >
          {loading ? "…" : "Réserver"}
        </button>
      </form>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h2>Réservations ({bookings.length})</h2>
      <ul>
        {bookings.map((b) => (
          <li key={b.id}>
            {b.name} — {b.slot}
          </li>
        ))}
      </ul>
    </main>
  );
}
