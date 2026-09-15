/**
 * React Email design source for public ticket reply notifications.
 * Runtime rendering uses lib/email/templates/invitation.ts (HTML) for Next.js compatibility.
 */
import * as React from "react";

export type TicketReplyEmailProps = {
  ticketNumber: number;
  subject: string;
  replyBody: string;
  ticketUrl: string;
};

export function TicketReplyEmail({
  ticketNumber,
  subject,
  replyBody,
  ticketUrl,
}: TicketReplyEmailProps) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#111" }}>
        <h1 style={{ fontSize: "18px" }}>Update on ticket #{ticketNumber}</h1>
        <p style={{ fontWeight: 600 }}>{subject}</p>
        <div
          style={{
            whiteSpace: "pre-wrap",
            padding: "12px",
            background: "#f4f4f5",
            borderRadius: "8px",
          }}
        >
          {replyBody}
        </div>
        <p>
          <a href={ticketUrl} style={{ color: "#2563eb" }}>View ticket in portal</a>
        </p>
      </body>
    </html>
  );
}
