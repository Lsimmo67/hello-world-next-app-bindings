"use client";

import { useEffect, useState } from "react";

type Status = "ok" | "error" | "loading";

interface ServiceStatus {
  status: "ok" | "error";
  latency: number;
  error?: string;
}

interface HealthcheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    d1: ServiceStatus;
    kv_sessions: ServiceStatus;
    kv_flags: ServiceStatus;
    r2: ServiceStatus;
  };
}

const BINDINGS: {
  key: keyof HealthcheckResponse["services"];
  name: string;
  title: string;
  description: string;
  docs: string;
}[] = [
  {
    key: "d1",
    name: "D1",
    title: "SQL database",
    description:
      "Serverless SQLite at the edge. Great for user data, CMS content, app state.",
    docs: "https://developers.webflow.com/webflow-cloud/storing-data/sqlite",
  },
  {
    key: "r2",
    name: "R2",
    title: "Object storage",
    description:
      "S3-compatible object storage with zero egress fees. Ideal for uploads and assets.",
    docs: "https://developers.webflow.com/webflow-cloud/storing-data/object-storage",
  },
  {
    key: "kv_sessions",
    name: "KV · Sessions",
    title: "Session store",
    description:
      "Low-latency key-value store. Perfect for sessions, caches, and tokens.",
    docs: "https://developers.webflow.com/webflow-cloud/storing-data/key-value-store",
  },
  {
    key: "kv_flags",
    name: "KV · Flags",
    title: "Feature flags",
    description:
      "KV namespace dedicated to feature flags with instant global propagation.",
    docs: "https://developers.webflow.com/webflow-cloud/storing-data/key-value-store",
  },
];

export default function BindingsStatus() {
  const [data, setData] = useState<HealthcheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Prefix the mount path (exposed by next.config.ts via the `env`
        // config) so the fetch hits /<mount>/api/binding-status even when
        // the current page URL has no trailing slash. Next.js's `basePath`
        // only auto-prefixes <Link>/<Image>/router, not fetch().
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const res = await fetch(`${basePath}/api/binding-status`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as HealthcheckResponse;
        if (active) setData(json);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className="wf-section-title">
        <h2>Cloudflare bindings</h2>
        <p>
          {error
            ? `Unreachable · ${error}`
            : data
            ? `Last checked ${new Date(data.timestamp).toLocaleTimeString()}`
            : "Checking…"}
        </p>
      </div>

      <div className="wf-bindings">
        {BINDINGS.map((b) => {
          const svc = data?.services[b.key];
          const status: Status = error
            ? "error"
            : !svc
            ? "loading"
            : svc.status;
          return (
            <div key={b.key} className="wf-binding" data-status={status}>
              <div className="wf-binding-head">
                <span className="wf-binding-name">{b.name}</span>
                <span
                  className="wf-dot"
                  data-status={status === "loading" ? undefined : status}
                  title={svc?.error ?? status}
                />
              </div>
              <h3 className="wf-binding-title">{b.title}</h3>
              <p className="wf-binding-desc">{b.description}</p>
              <div className="wf-binding-meta">
                <span>
                  {svc
                    ? `${svc.latency}ms`
                    : status === "loading"
                    ? "…"
                    : "—"}
                </span>
                <a href={b.docs} target="_blank" rel="noreferrer">
                  Docs ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
