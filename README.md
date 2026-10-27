# AuraSME

AI-assisted, compliance-first group-health **quoting at scale for UAE SMEs**. Upload a messy employee census spreadsheet and get an underwriting-ready quote in seconds — deterministic rating, DHA/DOH/MOHAP compliance checks, bilingual EN/AR documents, and version-and-compare workflows on a multi-tenant Supabase backend.

Built for the **Cigna / Ignyte "Quote in Seconds Challenge" — Theme 2: SME Quoting at Scale**.

> Every number, badge, and metric shown in the product traces back to real engine output or environment-derived facts. There is no fabricated data and no fake OCR — parsing, rating, and compliance checks run on the actual uploaded file.

## What it does

- **Census ingest** — Upload real `.xlsx`/`.csv` employee census files; the engine parses, maps columns, flags unmapped fields, and computes a data-quality score.
- **Deterministic rating** — A transparent rate engine applies plan/benefit configuration, tiering, and family math to produce premiums. Same input always yields the same output.
- **Compliance rules** — Automated DHA / DOH / MOHAP checks (e.g. waiting periods, pre-existing conditions, eligibility) run alongside every quote.
- **Budget-target plan search** — Given a budget, the solver searches plan configurations that fit it, surfaced both in the configurator and through the copilot chat.
- **Rules-based copilot** — A chat control surface that runs quoting, budget search, and workflow actions. Uses GROQ when `GROQ_API_KEY` is configured, otherwise falls back to a deterministic rule-based path.
- **Quote lifecycle** — Versions and comparisons, binding/confirmation, individual book support, and payment/issuance/renewal lifecycle states.
- **Multi-document bulk ingest** — Process several documents with a completeness register.
- **Conversion & funnel analytics** — Computed from real Supabase reads, not seeded numbers.
- **Governance & residency** — CBUAE-aware data governance and residency/privacy controls, plus an append-only audit trail.
- **Bilingual EN / AR** — Full Arabic support with right-to-left layout.
- **Durable, per-broker workspace** — Signed-in brokers get a server-side workspace keyed to their verified identity, so work survives refresh and cache clears (browser storage is only a fast local cache).

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- [Supabase](https://supabase.com) — auth, Postgres, multi-tenant persistence
- [next-intl](https://next-intl.dev) — EN/AR with RTL
- [Zustand](https://zustand.docs.pmnd.rs) v5 — client state with `sessionStorage` persistence
- [SheetJS (`xlsx`)](https://sheetjs.com) — census parsing
- Optional [GROQ](https://console.groq.com) — LLM copilot path

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy your values into `.env.local`. All keys are read from the environment; nothing is hardcoded.

```bash
# Supabase (required for auth + durable workspace)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-side only; never exposed to the client

# Optional: LLM copilot (rule-based fallback is used when unset)
GROQ_API_KEY=...
GROQ_MODEL=...
GROQ_MAX_TOKENS=...

# Auth enforcement for data routes (set to "0" for an open demo)
REQUIRE_API_AUTH=1

# Optional integration contracts (mock reporting the contract when unset)
SF_INSTANCE_URL=...
SF_ACCESS_TOKEN=...
PAYMENT_GATEWAY_URL=...
PAYMENT_API_KEY=...
POLICY_ADMIN_URL=...
POLICY_ADMIN_TOKEN=...
RATING_PLATFORM_URL=...
RATING_PLATFORM_TOKEN=...
```

> `.env*` files are git-ignored. The service-role key and database credentials must never be committed or exposed in the client bundle.

### 3. Apply the database schema

Run the SQL in `supabase_schema_v2.sql` against your Supabase project (creates `profiles`, `workspaces`, `audit_events`, auto-provisioning trigger, and owner-only RLS). The earlier tables in `supabase_schema.sql` back the census/quote domain.

### 4. Run

```bash
npm run dev      # http://localhost:3000
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint. |

## API

The app is API-first. Self-documenting OpenAPI is served at `GET /api/openapi.json`, and `/api/health` reports live subsystem status (including workspace persistence).

| Route | Purpose |
| --- | --- |
| `GET /api/health` | Liveness + subsystem/persistence status. |
| `GET /api/openapi.json` | Generated OpenAPI document. |
| `POST /api/census/parse` | Parse and map an uploaded census. |
| `POST /api/rating` | Rate a census against a plan configuration. |
| `POST /api/budget` | Budget-target plan search. |
| `POST /api/quotes` · `GET /api/quotes/status` | Quote creation and lifecycle status. |
| `POST /api/copilot` | Copilot chat actions (GROQ or rule-based). |
| `POST /api/documents` | Multi-document bulk ingest. |
| `GET/POST /api/session` | Durable per-user workspace load / sync. |
| `GET /api/metrics` · `GET /api/governance` | Funnel analytics and governance reads. |
| `GET /api/integrations/contracts` | Integration contract descriptors. |

Data routes are guarded by a config-gated bearer-auth + in-memory rate-limit middleware (`src/lib/apiGuard.ts`). When `REQUIRE_API_AUTH=0`, they run open for demo; when a signed-in session is present, the verified Supabase user identity is required.

## Integrations

Salesforce, payment gateway, policy-admin, and rating-platform integrations are **contract-first and environment-gated** (`src/lib/salesforce.ts`, `src/lib/payments.ts`, `src/lib/integrations/`). When the relevant env vars are configured the adapter makes the live call; otherwise it reports the exact contract it would use — without exposing or requiring secrets.

## Project structure

```
src/
  app/
    [locale]/        # EN/AR pages: home, login, company, census, configure, summary, lifecycle, dashboard
    api/             # API-first route handlers (see table above)
  components/        # UI, including WorkspaceSync (durable client/server reconciliation)
  i18n/              # next-intl config + en/ar message catalogs
  lib/
    census/          # census parse + map engine
    rating/          # rate engine + budget solver
    compliance/      # DHA/DOH/MOHAP rules
    integrations/    # policy-admin + rating-platform contracts
    demo/            # seeded scenario computed by the real engines
    apiGuard.ts      # bearer auth + rate limiting
    workspaceStore.ts# server-side durable workspace (Supabase / memory fallback)
    openapi.ts       # OpenAPI document
  store/             # Zustand client store (sessionStorage cache)
  types/             # shared domain types (WorkspaceSnapshot, AuditEntry, etc.)
```

## License

See [LICENSE](./LICENSE).
