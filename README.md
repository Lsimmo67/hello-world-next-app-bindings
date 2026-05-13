# hello-world-next-app-bindings

A **Next.js** starter for [**Webflow Cloud**](https://webflow.com/cloud) with Cloudflare bindings (D1, R2, KV) wired in.

At deploy time, Webflow Cloud provisions the configured services and injects them into your app as typed bindings — no API keys, no connection strings.

> Looking for the plain vanilla variant (no bindings)?
> See [`hello-world-next-app`](https://github.com/Webflow-Examples/hello-world-next-app).

[![Deploy to Webflow](https://webflow.com/img/deploy-dark.svg)](https://webflow.com/dashboard/cloud/deploy?repo=https://github.com/Webflow-Examples/hello-world-next-app-bindings)

## What's included

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- `@opennextjs/cloudflare` for deploying Next.js to Cloudflare Workers via Webflow Cloud
- `wrangler.json` with **D1** (SQL), **R2** (object storage), **KV · Sessions**, and **KV · Flags** declared
- `/api/binding-status` — a live health check that pings every binding
- Branded landing page that renders real-time binding status

## Quickstart

```bash
npm install

# Run locally (no bindings)
npm run dev

# Run locally against real bindings (via wrangler)
npm run dev:cf
```

## Deploy to Webflow Cloud

1. Fork this repo.
2. In your Webflow site, open **Apps → Webflow Cloud → Create new app** and select this repo.
3. Webflow Cloud reads `wrangler.json` and provisions D1, R2, and KV automatically.
4. Pick a mount path (e.g. `/app`) and click **Deploy**.

Full walkthrough: <https://developers.webflow.com/webflow-cloud/quickstart>.

## Bindings map

| Binding        | Type | Where it's declared       | Learn more                                                                |
| -------------- | ---- | ------------------------- | ------------------------------------------------------------------------- |
| `DB`           | D1   | `wrangler.json`           | [D1 docs](https://developers.webflow.com/webflow-cloud/storing-data/sqlite)       |
| `MEDIA`        | R2   | `wrangler.json`           | [R2 docs](https://developers.webflow.com/webflow-cloud/storing-data/object-storage)       |
| `SESSIONS`     | KV   | `wrangler.json`           | [KV docs](https://developers.webflow.com/webflow-cloud/storing-data/key-value-store)       |
| `FLAGS`        | KV   | `wrangler.json`           | [Flags docs](https://developers.webflow.com/webflow-cloud/storing-data/key-value-store) |

Access them from any route handler via `getCloudflareContext()`:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const { env } = await getCloudflareContext();
  const rows = await env.DB.prepare("SELECT 1").first();
  return Response.json({ rows });
}
```

See `src/app/api/binding-status/route.ts` for a full working example that pings all four bindings.

## Customizing

The landing page lives in `src/app/page.tsx`. The binding status component is
`src/app/components/BindingsStatus.tsx`. Styles are in `src/app/globals.css`
under the `wf-*` prefix.

## Learn more

- [Webflow Cloud docs](https://developers.webflow.com/webflow-cloud)
- [Bindings guide](https://developers.webflow.com/webflow-cloud/storing-data/overview)
- [Next.js on Webflow Cloud](https://developers.webflow.com/webflow-cloud/frameworks/next-js)

---

Built with Next.js · Deployed on Webflow Cloud.
