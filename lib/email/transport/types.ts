export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}
