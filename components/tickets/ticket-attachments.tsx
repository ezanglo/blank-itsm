import Link from "next/link";
import type { ticketAttachment } from "@/db/schema";
import type { user } from "@/db/schema";

type Row = typeof ticketAttachment.$inferSelect & {
  uploadedBy: typeof user.$inferSelect;
};

export function TicketAttachmentsList({ items }: { items: Row[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No attachments.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
          <Link
            href={`/api/attachments/${item.id}`}
            className="text-primary hover:underline truncate"
          >
            {item.fileName}
          </Link>
          <span className="text-muted-foreground shrink-0">
            {(item.sizeBytes / 1024).toFixed(1)} KB
          </span>
        </li>
      ))}
    </ul>
  );
}
