# Security

This is an early-stage open-source POC. Bugs and security gaps are likely
and welcome. If you find something that could leak data or burn cost,
please flag it before opening a public issue.

## Reporting

Email the maintainer (see the GitHub profile of the repo owner) with:

- a short description of the issue,
- repro steps if you have them,
- the commit SHA you tested against.

Expect a reply within a few business days. We'll coordinate disclosure;
fixes ship on `main` and are tagged.

## What's in scope

- Authentication / authorisation bypass — anything that lets one tenant
  read another tenant's data.
- Honest-notes leakage — anything that reveals an honest note to a
  receiver who wasn't explicitly included on their `HandoffReceiver` row.
- Storage signed-URL escape — bucket key probing, cross-tenant artifact
  download.
- Prompt injection that bypasses the trust layer or the redaction rules
  (e.g. uploaded artifact that instructs the model to dump honest notes).
- Cost-amplification: anything that drives Anthropic spend without
  consent / past the per-user cap.

## What's out of scope

- Denial of service via raw request volume — single-instance POC; we
  rely on per-IP rate limits, not WAF-grade defence.
- Self-XSS, social engineering, physical access.
- Vulnerabilities in third-party services (Clerk, Anthropic, Resend,
  Hetzner) — report those upstream.

## Hardening already in place

- `auth-context.ts` resolves a tenant id from the Clerk user id; every
  Prisma query scopes by it.
- `lib/handoff-access.ts` is the single decision point for who can see
  what on a handoff. New code MUST go through it.
- `lib/usage.ts` caps each AI-spending endpoint per user per UTC day.
  `AI_DISABLED=true` is a global kill-switch.
- `lib/rate-limit.ts` enforces a per-user/per-IP sliding window on
  cost-bearing endpoints.
- Honest notes are private to the owner until they explicitly include a
  note id on a `HandoffReceiver` row. Once transferred, the redaction
  set on that receiver is frozen (the API returns 409 `frozen`).
- No telemetry beyond container logs. The email no-op writes the email
  payload to stdout in non-configured deployments — make sure your
  container logs are not public.

## What you should change before running this in front of real data

1. Rotate the Clerk keys, Anthropic key, Resend key into your own.
2. Pick your own super-admin email in `SUPER_ADMIN_EMAILS`.
3. Tighten the daily caps in `USAGE_CAP_*` env vars if your audience is
   external rather than internal.
4. Put Cloudflare (or any WAF) in front of the container.
5. Switch storage from `local` to `s3` and rotate the bucket keys.
6. Add a privacy policy if you are storing other people's data.
