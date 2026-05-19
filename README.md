# ContextBridge

> The moments work changes hands. Captures tacit knowledge that dies in
> transitions — leave, rotations, delegations, attrition — and makes it
> survivable, searchable, and trustworthy.

**Status: open-source POC.** Built to validate a product hypothesis, not
to be run unattended in front of strangers. Read [SECURITY.md](SECURITY.md)
before exposing it.

## What it does

- **AI Interrogator.** A 20–30 minute (or 5-minute stand-in) interview
  that probes vagueness — *"difficult how? give me the last example"* —
  instead of letting the outgoing person write generic notes.
- **Receiver Q&A with citations.** Months later, the incoming person can
  ask the handoff *"why did we go with Vendor X?"* and get an answer
  grounded in actual records, with a `[D2]`-style citation. The model
  says *"not captured"* instead of guessing.
- **Trust layer.** Politically honest notes stay private until the owner
  explicitly transfers them — per-receiver, with redaction-assist from
  the model. Once a receiver is transferred, the redaction set is
  frozen. No retroactive expansion.
- **Multi-receiver handoffs.** One package can go to a peer manager with
  the full political read and to a junior taking over execution with a
  sanitized view. Independent per-receiver status, Q&A, and reality
  checks.
- **Reality check.** Receivers mark each item as Confirmed / Unclear /
  Outdated as they learn ground truth.
- **Briefing tab.** One-page consolidated dossier (snapshot, decisions,
  stakeholders, process, open loops, watch-outs, honest notes, artifacts,
  interview history) with print-to-PDF and copy-as-markdown.
- **Continuity-risk dashboard.** Ranks contexts by how much
  un-handed-off knowledge they concentrate, weighted by importance.

## Stack

| Layer | Choice |
| --- | --- |
| Web | Next.js 14 (App Router), standalone output |
| Auth | Clerk |
| AI | Anthropic Claude (Sonnet 4.6 by default) |
| DB | Postgres 17 via Prisma |
| Storage | local filesystem or any S3-compatible (Hetzner Storage Box) |
| Email | Resend (optional — graceful no-op when unset) |
| Deploy | Docker Compose + Traefik (template provided for Coolify) |

## POC guard rails

This repo is wired for a *public* POC. Some of the things that matter
when senior people will see it:

- **No secrets in git.** `.env.local` is gitignored and was never
  committed. Verify with `git log --all -p -- .env.local`.
- **Daily per-user AI caps.** Five separate counters
  (`INTERVIEW_TURN`, `SYNTHESIZE`, `RECEIVER_QA`, `REDACTION_CHECK`,
  `ARTIFACT_EXTRACT`). Defaults are conservative; override via
  `USAGE_CAP_*` env vars. Surfaced on the Settings page.
- **Global AI kill-switch.** `AI_DISABLED=true` in the env makes every
  cost-bearing endpoint return 503 immediately.
- **Per-user / per-IP rate limiter.** Sliding window in-memory; trips
  before a hung loop can drain credit.
- **Super-admin bypass.** `SUPER_ADMIN_EMAILS=you@example.com` lets the
  configured email skip caps and see across tenants (reads only).
- **Tenant isolation on every Prisma query.** See
  `src/lib/auth-context.ts` and `src/lib/handoff-access.ts` — these are
  the single decision points; new code should route through them.
- **Trust-layer guarantees enforced at the API.** Honest notes are not
  reachable by anyone except the owner unless an explicit
  `HandoffReceiver.includedHonestNoteIds` row says so.

## Running locally

```bash
# 1. Get your own keys
cp .env.example .env.local
#    fill in:
#    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY (a Clerk free app)
#    - ANTHROPIC_API_KEY
#    - DATABASE_URL pointing at a local Postgres
#    - SUPER_ADMIN_EMAILS=your-clerk-login@example.com
#    - (optional) RESEND_API_KEY + EMAIL_FROM if you want real outbound mail

# 2. Install + generate Prisma client + push schema
npm install
npx prisma generate
npx prisma db push

# 3. Run
npm run dev          # http://localhost:3000
```

## Running in production

The included `docker-compose.yml` and `deploy/hetzner/deploy.sh` are
templates for a Hetzner + Coolify + Traefik setup. Adjust labels,
hostnames, and the repo URL for your own deploy:

```bash
# From the project root, after you've forked + pushed to your own remote:
CONTEXTHANDOFF_SSH_HOST=root@your-server-ip \
CONTEXTHANDOFF_REPO=https://github.com/<you>/<repo>.git \
PUBLIC_HOSTNAME=your.domain \
./deploy/hetzner/deploy.sh
```

The script clones your fork on the server, scp's `.env.local` as `.env`,
runs `docker compose up -d --build`, and `prisma db push`.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Dashboard (signed-in) or landing hero (signed-out) |
| `/contexts` | Your contexts |
| `/contexts/[id]` | Context detail — Briefing, Snapshot, Decisions, Stakeholders, Process, Open Loops, Watch-outs, Honest Notes, Artifacts |
| `/contexts/new?template=…` | Create, optionally pre-seeded by a template |
| `/templates` | Pre-shaped starting points |
| `/interviews` · `/interviews/[id]` | AI interview list + live transcript |
| `/handoffs` · `/handoffs/[id]` | Outgoing + incoming list, package detail with per-receiver tabs |
| `/incoming` | Receiver-only inbox |
| `/analytics` | Continuity-risk dashboard |
| `/settings` | Trust posture, today's AI usage, export & delete |

## What's deferred

Two genuinely larger swings are not in this POC:

- **External data ingestion** (Gmail / Calendar / Drive / Teams). OAuth
  per provider, intake pipeline, AI synthesis. Days of work for a real
  integration.
- **Drift detection** for standing contexts. Cheap to wire *once* you
  have an external signal stream (above). Without that, the model has
  nothing to compare against.

## Contributing

PRs welcome. Useful entry points:

- `src/lib/ai/interviewer.ts` — system prompts. The interrogator
  behaviour is the product; tightening the prompts is high leverage.
- `src/lib/handoff-access.ts` — the single auth-decision point on
  handoffs. New code reading honest notes / Q&A / reality-checks must
  route through this.
- `src/lib/usage.ts` — daily caps. Add a new `UsageKind` if you add a
  new AI-spending endpoint.

## License

MIT. See [LICENSE](LICENSE).
