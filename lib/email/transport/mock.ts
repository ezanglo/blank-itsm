import { appendFile, mkdir } from "fs/promises";
import path from "path";
import type { EmailMessage, EmailTransport } from "./types";

const LOG_DIR = process.env.EMAIL_MOCK_DIR ?? path.join(process.cwd(), ".data", "email-outbox");

export class MockEmailTransport implements EmailTransport {
  async send(message: EmailMessage): Promise<void> {
    await mkdir(LOG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeTo = message.to.replace(/[^a-zA-Z0-9@._-]/g, "_");
    const file = path.join(LOG_DIR, `${stamp}-${safeTo}.eml`);
    const body = [
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      message.html,
    ].join("\n");
    await appendFile(file, body, "utf8");
    console.log(`[email:mock] wrote ${file}`);
  }
}
