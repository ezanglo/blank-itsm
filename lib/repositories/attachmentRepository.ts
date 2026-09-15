import { db } from "@/db";
import { ticket, ticketAttachment } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { RequestContext } from "@/lib/auth/context";
import { withTenantContext } from "@/lib/db/transaction";
import {
  MAX_ATTACHMENT_BYTES,
  readAttachmentFile,
  saveAttachmentFile,
} from "@/lib/storage/localAttachments";
import { TicketRepository } from "./ticketRepository";

export class AttachmentRepository {
  static async listForTicket(ctx: RequestContext, ticketId: string) {
    const visible = await TicketRepository.assertTicketVisible(ctx, ticketId);
    if (!visible) return [];

    return db.query.ticketAttachment.findMany({
      where: and(
        eq(ticketAttachment.organizationId, ctx.orgId),
        eq(ticketAttachment.ticketId, ticketId)
      ),
      orderBy: (a, { asc }) => [asc(a.createdAt)],
      with: { uploadedBy: true },
    });
  }

  static async addToTicket(
    ctx: RequestContext,
    ticketId: string,
    file: { name: string; mimeType: string; bytes: Buffer }
  ) {
    const visible = await TicketRepository.assertTicketVisible(ctx, ticketId);
    if (!visible) {
      throw new Error("Ticket not found");
    }

    if (file.bytes.length > MAX_ATTACHMENT_BYTES) {
      throw new Error("Attachment exceeds maximum size (5MB)");
    }

    const storageKey = await saveAttachmentFile(ctx.orgId, ticketId, file.name, file.bytes);

    return await withTenantContext(ctx, async (tx) => {
      const [row] = await tx
        .insert(ticketAttachment)
        .values({
          organizationId: ctx.orgId,
          ticketId,
          uploadedById: ctx.userId,
          fileName: file.name,
          mimeType: file.mimeType || "application/octet-stream",
          sizeBytes: file.bytes.length,
          storageKey,
        })
        .returning();
      return row;
    });
  }

  static async getForDownload(ctx: RequestContext, attachmentId: string) {
    const row = await db.query.ticketAttachment.findFirst({
      where: and(
        eq(ticketAttachment.id, attachmentId),
        eq(ticketAttachment.organizationId, ctx.orgId)
      ),
    });
    if (!row) return null;

    const visible = await TicketRepository.assertTicketVisible(ctx, row.ticketId);
    if (!visible) return null;

    const bytes = await readAttachmentFile(row.storageKey);
    return { meta: row, bytes };
  }
}
