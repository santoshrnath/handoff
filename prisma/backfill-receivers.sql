-- One-time backfill: for every legacy Handoff that has a non-null toEmail
-- (or toUserId) but no HandoffReceiver row, create one mirroring the
-- legacy single-receiver fields.
INSERT INTO "HandoffReceiver" (
  id, "tenantId", "handoffId",
  "toUserId", "toEmail", "shareToken",
  status, "includedHonestNoteIds",
  "transferredAt", "acknowledgedAt", "createdAt"
)
SELECT
  'cm' || substr(md5(random()::text || h.id), 1, 22),
  h."tenantId",
  h.id,
  h."toUserId",
  h."toEmail",
  COALESCE(h."shareToken", 'tok_' || substr(md5(random()::text || h.id), 1, 21)),
  h.status,
  COALESCE(h."includedHonestNoteIds", '[]'::jsonb),
  h."transferredAt",
  h."acknowledgedAt",
  h."createdAt"
FROM "Handoff" h
WHERE (h."toEmail" IS NOT NULL OR h."toUserId" IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "HandoffReceiver" r WHERE r."handoffId" = h.id
  );
