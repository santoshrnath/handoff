// Outbound email via Resend, with a graceful no-op when no API key is set.
// We don't want the transfer flow to be coupled to email being configured —
// if RESEND_API_KEY is missing, sendEmail logs to console and returns ok.

interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(opts: SendEmailOpts): Promise<{
  ok: boolean;
  skipped: boolean;
  detail?: string;
}> {
  const key = process.env.RESEND_API_KEY;
  const from = opts.from ?? process.env.EMAIL_FROM ?? "ContextBridge <noreply@handover.oneplaceplatform.com>";

  if (!key) {
    // No-op fallback: log so we can see in container logs that an email
    // would have gone out. Keeps the transfer flow useful pre-email-config.
    console.log("[email:noop]", {
      to: opts.to,
      subject: opts.subject,
      preview: (opts.text ?? opts.html).slice(0, 200),
    });
    return { ok: true, skipped: true, detail: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, skipped: false, detail: body.slice(0, 500) };
    }
    return { ok: true, skipped: false };
  } catch (err) {
    return {
      ok: false,
      skipped: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export function publicUrl(): string {
  return process.env.PUBLIC_URL ?? "https://handover.oneplaceplatform.com";
}

export function handoffEmailTemplate(opts: {
  fromName: string | null;
  fromEmail: string | null;
  contextTitle: string;
  contextType: string;
  handoffType: string;
  handoffId: string;
  packageNote: string | null;
  honestNoteCount: number;
}): { subject: string; html: string; text: string } {
  const url = `${publicUrl()}/handoffs/${opts.handoffId}`;
  const sender = opts.fromName ?? opts.fromEmail ?? "A colleague";
  const subject = `${sender} sent you a handoff: ${opts.contextTitle}`;

  const note = opts.packageNote
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #8b5cf6;background:#f5f3ff;color:#312e81;border-radius:6px;font-size:14px;">${escapeHtml(opts.packageNote)}</blockquote>`
    : "";

  const honestLine =
    opts.honestNoteCount > 0
      ? `<p style="margin:12px 0 0;font-size:13px;color:#5b21b6;">${opts.honestNoteCount} honest note${opts.honestNoteCount === 1 ? "" : "s"} attached — these stay private to you and aren't forwardable.</p>`
      : "";

  const html = `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
      <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a78bfa);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">CB</div>
          <span style="font-size:13px;color:#64748b;letter-spacing:0.1em;text-transform:uppercase;">ContextBridge · Handoff</span>
        </div>
        <h1 style="margin:24px 0 8px;font-size:22px;color:#0f172a;line-height:1.3;">${escapeHtml(sender)} sent you a handoff.</h1>
        <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;">
          <strong style="color:#0f172a;">${escapeHtml(opts.contextTitle)}</strong>
          · ${escapeHtml(opts.contextType)} · ${escapeHtml(opts.handoffType.replace("_", " "))}
        </p>
        ${note}
        ${honestLine}
        <a href="${url}" style="display:inline-block;margin-top:24px;padding:12px 20px;background:#7c3aed;color:#ffffff;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Open the handoff</a>
        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
          Sign in with this email to claim it. The package includes context,
          stakeholders, decisions, open loops and watch-outs. You can ask
          questions of it and mark items against ground truth as you learn.
        </p>
      </div>
      <p style="margin-top:16px;font-size:11px;color:#94a3b8;text-align:center;">
        Sent via ContextBridge · handover.oneplaceplatform.com
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `${sender} sent you a handoff: ${opts.contextTitle}`,
    `Type: ${opts.contextType} · ${opts.handoffType.replace("_", " ")}`,
    "",
    opts.packageNote ? `Note: ${opts.packageNote}` : "",
    opts.honestNoteCount > 0
      ? `${opts.honestNoteCount} honest note${opts.honestNoteCount === 1 ? "" : "s"} attached — private to you.`
      : "",
    "",
    `Open it: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
