/**
 * React Email design source for invitation messages.
 * Runtime rendering uses lib/email/templates/invitation.ts (HTML) for Next.js compatibility.
 */
import * as React from "react";

export type InvitationEmailProps = {
  organizationName: string;
  inviteUrl: string;
  invitedEmail: string;
};

export function InvitationEmail({
  organizationName,
  inviteUrl,
  invitedEmail,
}: InvitationEmailProps) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#111" }}>
        <h1 style={{ fontSize: "20px" }}>You&apos;re invited to {organizationName}</h1>
        <p>Hello,</p>
        <p>
          <strong>{invitedEmail}</strong> has been invited to join {organizationName} on
          blank-itsm.
        </p>
        <p>
          <a href={inviteUrl} style={{ color: "#2563eb" }}>Accept invitation</a>
        </p>
        <p style={{ fontSize: "12px", color: "#666" }}>This link expires in 7 days.</p>
      </body>
    </html>
  );
}
