export function renderInvitationEmail(input: {
  organizationName: string;
  inviteUrl: string;
  invitedEmail: string;
}): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111">
<h1 style="font-size:20px">You're invited to ${escapeHtml(input.organizationName)}</h1>
<p>Hello,</p>
<p><strong>${escapeHtml(input.invitedEmail)}</strong> has been invited to join ${escapeHtml(input.organizationName)} on blank-itsm.</p>
<p><a href="${escapeAttr(input.inviteUrl)}" style="color:#2563eb">Accept invitation</a></p>
<p style="font-size:12px;color:#666">This link expires in 7 days.</p>
</body></html>`;
}

export function renderSlaEscalationEmail(input: {
  ticketNumber: number;
  subject: string;
  slaStatus: string;
  ticketUrl: string;
}): string {
  const label =
    input.slaStatus === "breached"
      ? "SLA breached"
      : input.slaStatus === "resolution_due"
        ? "Resolution SLA at risk"
        : "Response SLA at risk";
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111">
<h1 style="font-size:18px">${escapeHtml(label)}</h1>
<p>Ticket #${input.ticketNumber}: <strong>${escapeHtml(input.subject)}</strong></p>
<p>Status: ${escapeHtml(input.slaStatus)}</p>
<p><a href="${escapeAttr(input.ticketUrl)}" style="color:#2563eb">Open in agent workspace</a></p>
</body></html>`;
}

export function renderAutomationNotifyEmail(input: {
  ticketNumber: number;
  subject: string;
  ruleName: string;
  ticketUrl: string;
}): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111">
<h1 style="font-size:18px">Automation notification</h1>
<p>Rule <strong>${escapeHtml(input.ruleName)}</strong> ran on ticket #${input.ticketNumber}: ${escapeHtml(input.subject)}</p>
<p><a href="${escapeAttr(input.ticketUrl)}" style="color:#2563eb">Open ticket</a></p>
</body></html>`;
}

export function renderTicketReplyEmail(input: {
  ticketNumber: number;
  subject: string;
  replyBody: string;
  ticketUrl: string;
}): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#111">
<h1 style="font-size:18px">Update on ticket #${input.ticketNumber}</h1>
<p style="font-weight:600">${escapeHtml(input.subject)}</p>
<div style="white-space:pre-wrap;padding:12px;background:#f4f4f5;border-radius:8px">${escapeHtml(input.replyBody)}</div>
<p><a href="${escapeAttr(input.ticketUrl)}" style="color:#2563eb">View ticket in portal</a></p>
</body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}
