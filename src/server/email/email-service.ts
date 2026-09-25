import nodemailer from "nodemailer";
import { logInfo } from "@/server/shared/log";

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type SmtpSettings = {
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: "NONE" | "STARTTLS" | "TLS";
  fromEmail: string;
  fromName: string;
};

export class EmailService {
  constructor(private readonly settings: SmtpSettings | null) {}

  configured(): boolean {
    return Boolean(this.settings?.host && this.settings.fromEmail);
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.settings || !this.configured()) {
      logInfo("email.skipped", { to: message.to, subject: message.subject });
      throw new Error("Email is not configured");
    }
    const transport = nodemailer.createTransport({
      host: this.settings.host,
      port: this.settings.port,
      secure: this.settings.encryption === "TLS",
      auth: this.settings.username ? { user: this.settings.username, pass: this.settings.password } : undefined,
      requireTLS: this.settings.encryption === "STARTTLS",
    });
    await transport.sendMail({
      from: `"${this.settings.fromName}" <${this.settings.fromEmail}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  }
}
