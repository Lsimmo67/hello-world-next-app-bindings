"use client";

import { useEffect, useState, type FormEvent } from "react";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type Booking = { id: number; name: string; slot: string; created_at: number };

async function apiMe(): Promise<string | null> {
  const res = await fetch(`${BASE}/api/auth/me`);
  if (!res.ok) return null;
  const d = (await res.json()) as { user?: { email: string } | null };
  return d.user?.email ?? null;
}

async function apiBookings(): Promise<Booking[]> {
  const res = await fetch(`${BASE}/api/bookings`);
  if (!res.ok) return [];
  const d = (await res.json()) as { bookings?: Booking[] };
  return d.bookings ?? [];
}

export default function BookPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [name, setName] = useState("");
  const [slot, setSlot] = useState("");
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  useEffect(() => {
    let active = true;
    apiMe().then((e) => {
      if (!active) return;
      setEmail(e);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!email) return;
    let active = true;
    apiBookings().then((b) => {
      if (active) setBookings(b);
    });
    return () => {
      active = false;
    };
  }, [email]);

  async function submitAuth(e: FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch(`${BASE}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
      };
      if (!res.ok) {
        setAuthError(d.error ?? "Erreur");
        return;
      }
      setAuthPassword("");
      setEmail(d.email ?? authEmail.trim().toLowerCase());
    } catch {
      setAuthError("Connexion impossible");
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    await fetch(`${BASE}/api/auth/logout`, { method: "POST" });
    setEmail(null);
    setBookings([]);
  }

  async function submitBooking(e: FormEvent) {
    e.preventDefault();
    setBookLoading(true);
    setBookError(null);
    try {
      const res = await fetch(`${BASE}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slot }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setBookError(d.error ?? "Erreur");
        return;
      }
      setName("");
      setSlot("");
      setBookings(await apiBookings());
    } catch {
      setBookError("Écriture impossible");
    } finally {
      setBookLoading(false);
    }
  }

  const wrap = {
    maxWidth: 560,
    margin: "0 auto",
    padding: 32,
    fontFamily: "system-ui, sans-serif",
  } as const;
  const input = { padding: 10, fontSize: 16 } as const;
  const btn = { padding: 12, fontSize: 16, cursor: "pointer" } as const;

  if (checking) {
    return (
      <main style={wrap}>
        <p>…</p>
      </main>
    );
  }

  if (!email) {
    return (
      <main style={wrap}>
        <h1>POC — Auth maison (Webflow Cloud)</h1>
        <p style={{ color: "#555" }}>
          {mode === "login" ? "Connecte-toi" : "Crée un compte"} pour accéder
          aux réservations.
        </p>
        <form
          onSubmit={submitAuth}
          style={{ display: "grid", gap: 12, margin: "24px 0" }}
        >
          <input
            style={input}
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            style={input}
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Mot de passe (min 6)"
            required
          />
          <button style={btn} disabled={authLoading} type="submit">
            {authLoading
              ? "…"
              : mode === "login"
                ? "Se connecter"
                : "Créer le compte"}
          </button>
        </form>
        {authError && <p style={{ color: "crimson" }}>{authError}</p>}
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setAuthError(null);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#2d62ff",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {mode === "login"
            ? "Pas de compte ? Créer un compte"
            : "Déjà un compte ? Se connecter"}
        </button>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Réservations</h1>
        <button
          onClick={logout}
          style={{ ...btn, padding: "6px 12px", fontSize: 14 }}
        >
          Déconnexion
        </button>
      </div>
      <p style={{ color: "#555" }}>
        Connecté : <strong>{email}</strong> — route protégée (session KV).
      </p>

      <form
        onSubmit={submitBooking}
        style={{ display: "grid", gap: 12, margin: "24px 0" }}
      >
        <input
          style={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom"
          required
        />
        <input
          style={input}
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          placeholder="Créneau (ex : 2026-06-25 14:00)"
          required
        />
        <button style={btn} disabled={bookLoading} type="submit">
          {bookLoading ? "…" : "Réserver"}
        </button>
      </form>
      {bookError && <p style={{ color: "crimson" }}>{bookError}</p>}

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
