import type { EmailMessage, EmailTransport } from "./types";

/**
 * Resend adapter — not used in dev without RESEND_API_KEY.
 */
export class ResendEmailTransport implements EmailTransport {
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "noreply@example.com",
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend API error: ${res.status} ${err}`);
    }
  }
}

export function createResendTransportIfConfigured(): EmailTransport | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new ResendEmailTransport(key);
}
