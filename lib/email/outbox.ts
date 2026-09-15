import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { withTenantContext } from "@/lib/db/transaction";
/**
 * TECH-009: React Email JSX sources live in lib/email/templates/*.tsx.
 * Runtime uses lib/email/templates/invitation.ts HTML builders (Next.js cannot import react-dom/server here).
 */
import { renderInvitationEmail, renderTicketReplyEmail } from "./templates/invitation";
import { MockEmailTransport } from "./transport/mock";
import { createResendTransportIfConfigured } from "./transport/resend";
import type { EmailTransport } from "./transport/types";

export type OutboxTemplateKey = "invitation" | "ticket_public_reply";

function getTransport(): EmailTransport {
  return createResendTransportIfConfigured() ?? new MockEmailTransport();
}

export async function enqueueEmail(
  ctx: RequestContext,
  input: {
    to: string;
    subject: string;
    templateKey: OutboxTemplateKey;
    payload: Record<string, unknown>;
  }
) {
  const [row] = await withTenantContext(ctx, async (tx) => {
    return tx
      .insert(emailOutbox)
      .values({
        organizationId: ctx.orgId,
        toAddress: input.to,
        subject: input.subject,
        templateKey: input.templateKey,
        payload: JSON.stringify(input.payload),
        status: "pending",
      })
      .returning();
  });

  await processOutboxEntry(ctx, row.id);
  return row;
}

export async function processOutboxEntry(ctx: RequestContext, outboxId: string) {
  const entry = await db.query.emailOutbox.findFirst({
    where: and(eq(emailOutbox.id, outboxId), eq(emailOutbox.organizationId, ctx.orgId)),
  });
  if (!entry || entry.status === "sent") return;

  const transport = getTransport();
  const payload = JSON.parse(entry.payload) as Record<string, string | number>;

  let html: string;
  switch (entry.templateKey as OutboxTemplateKey) {
    case "invitation":
      html = renderInvitationEmail({
        organizationName: String(payload.organizationName),
        inviteUrl: String(payload.inviteUrl),
        invitedEmail: String(payload.invitedEmail),
      });
      break;
    case "ticket_public_reply":
      html = renderTicketReplyEmail({
        ticketNumber: Number(payload.ticketNumber),
        subject: String(payload.subject),
        replyBody: String(payload.replyBody),
        ticketUrl: String(payload.ticketUrl),
      });
      break;
    default:
      throw new Error(`Unknown template: ${entry.templateKey}`);
  }

  try {
    await transport.send({
      to: entry.toAddress,
      subject: entry.subject,
      html,
    });
    await withTenantContext(ctx, async (tx) => {
      await tx
        .update(emailOutbox)
        .set({ status: "sent", sentAt: new Date(), lastError: null })
        .where(eq(emailOutbox.id, outboxId));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await withTenantContext(ctx, async (tx) => {
      await tx
        .update(emailOutbox)
        .set({ status: "failed", lastError: message })
        .where(eq(emailOutbox.id, outboxId));
    });
    throw err;
  }
}

export async function processPendingOutbox(ctx: RequestContext, limit = 20) {
  const pending = await db.query.emailOutbox.findMany({
    where: and(
      eq(emailOutbox.organizationId, ctx.orgId),
      inArray(emailOutbox.status, ["pending", "failed"])
    ),
    limit,
  });
  for (const row of pending) {
    await processOutboxEntry(ctx, row.id);
  }
}
