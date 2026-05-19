# ContextBridge — Context Handoff App

The moments work changes hands. Captures tacit knowledge that dies in
transitions — leave, rotations, delegations, attrition — and makes it
survivable, searchable, and trustworthy.

Built on the same infra envelope as the CV Intelligence Agent (cvai):
Clerk for auth, Anthropic Claude for AI, Prisma + Postgres for data,
local/Hetzner Storage Box for artifacts.

Production hostname: **handover.oneplaceplatform.com** (configured in
Cloudflare; route to the container below).

## What's in the box

- **Contexts** — projects, clients, workstreams, processes, stakeholders, accounts.
- **AI Interrogator** — probing 20-30 minute interview (or 5-min stand-in).
  Forces better human input; never writes the handoff on its own.
- **Receiver Q&A** — cited answers from the actual records; says "not captured"
  rather than guessing.
- **Trust layer** — honest notes private until explicit transfer; per-receiver
  redaction; no retroactive expansion.
- **Artifacts** — upload emails / minutes / briefs; AI proposes structure.
- **Standing contexts** — long-running relationships maintained over time.
- **Handoffs** — bind a context to a transfer event; outgoing + incoming views.

## Local setup

```bash
npm install
cp .env.example .env.local   # then paste real keys; the dev .env.local
                             # already has Clerk + Anthropic from cvai
npx prisma generate
npx prisma db push           # against a local Postgres
npm run dev
```

Open http://localhost:3000.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Dashboard (or landing if signed-out) |
| `/contexts` | List + grid of your contexts |
| `/contexts/new` | Create a new context |
| `/contexts/[id]` | Detail with tabs (snapshot, decisions, stakeholders, process, open loops, watch-outs, honest notes, artifacts) |
| `/interviews` | All your interview sessions |
| `/interviews/[id]` | Live AI interview UI |
| `/handoffs` | Outgoing + incoming |
| `/handoffs/[id]` | The handoff package (with the receiver Q&A panel) |
| `/incoming` | Receiver-side inbox |
| `/templates` | Pre-shaped starting points |
| `/analytics` | Personal stats |
| `/settings` | Account + trust posture |

## Key API endpoints

| Endpoint | Use |
| --- | --- |
| `POST /api/contexts` | Create |
| `GET/PATCH/DELETE /api/contexts/[id]` | CRUD |
| `POST /api/contexts/[id]/{stakeholders,decisions,open-loops,watch-outs,honest-notes}` | Add child records |
| `POST /api/contexts/[id]/honest-notes/suggest-redaction` | AI risk check before saving |
| `POST /api/contexts/[id]/interviews` | Start an interview |
| `POST /api/interviews/[id]/turn` | One interview turn (user → AI) |
| `POST /api/interviews/[id]/synthesize` | Apply transcript → structured records |
| `POST /api/contexts/[id]/artifacts` | Upload + AI-summarize artifact |
| `POST /api/handoffs` | Create a handoff (DRAFT) |
| `POST /api/handoffs/[id]/transfer` | Confirm transfer → receiver can see |
| `POST /api/handoffs/[id]/acknowledge` | Receiver confirms receipt |
| `POST /api/handoffs/[id]/ask` | Receiver Q&A (cited) |
| `POST /api/handoffs/[id]/feedback` | 30/60/90 "I wish I'd known" |

## Design constraints

- **Mobile-first**: the stand-in flow, receiver Q&A, and drift notifications
  all need to work on a phone. The shell is responsive from day one.
- **AI forces better human input, not less**: every AI surface (interrogator,
  redaction, artifact extract, receiver Q&A) hands control back to the user.
- **No retroactive access on honest notes**: enforced at the API layer in
  `/api/handoffs/[id]` and `/api/handoffs/[id]/ask`.

## Notes on the env

- Re-uses Clerk dev keys from `cvai` (same publishable + secret).
- Re-uses the Anthropic key from `cvai` / OpenStudio.
- Default model: `claude-sonnet-4-6` (override with `ANTHROPIC_MODEL`).
- Storage starts in `local` mode (`./storage-local`). Swap `STORAGE_PROVIDER=s3`
  + the Hetzner Storage Box creds in prod.
- Postgres URL targets a `contexthandoff-db` container by default. For local
  dev, point it at any reachable Postgres.

## Production

This project ships the same standalone Next.js output as `cvai`, so it slots
into the same Hetzner / Coolify / Traefik setup with `PUBLIC_HOSTNAME=handover.oneplaceplatform.com`.
