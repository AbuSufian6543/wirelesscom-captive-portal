import { logInfo } from "@/server/shared/log";

export type MessageSettings = {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  senderId: string;
};

export type OutboundMessage = {
  to: string;
  body: string;
  purpose: "OTP" | "NOTIFICATION" | "ANNOUNCEMENT" | "MARKETING";
};

export class MessageService {
  constructor(private readonly settings: MessageSettings | null) {}

  configured(): boolean {
    return Boolean(this.settings?.apiUrl);
  }

  async send(message: OutboundMessage): Promise<void> {
    if (!this.settings || !this.configured()) {
      logInfo("message.skipped", { purpose: message.purpose });
      throw new Error("Messaging is not configured");
    }
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.settings.apiKey) headers.authorization = `Bearer ${this.settings.apiKey}`;
    if (this.settings.apiSecret) headers["x-api-secret"] = this.settings.apiSecret;
    const response = await fetch(this.settings.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: message.to,
        from: this.settings.senderId,
        body: message.body,
        purpose: message.purpose,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Messaging API rejected the message");
  }
}
