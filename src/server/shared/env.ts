import { z } from "zod";

const schema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_HOST: z.string().default("127.0.0.1"),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  APP_BIND_HOST: z.string().default("0.0.0.0"),
  APP_TRUST_PROXY: z.enum(["true", "false"]).default("true"),
  PORTAL_PUBLIC_IP: z.string().default(""),
  PORTAL_DOMAIN: z.string().default(""),
  PORTAL_FORCE_HTTPS: z.enum(["true", "false"]).default("false"),
  APP_PUBLIC_URL: z.string().default(""),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  APP_ENCRYPTION_KEY: z.string().min(1).optional(),
  INITIAL_ADMIN_EMAIL: z.string().email().default("abu@wirelesscom.ca"),
  INITIAL_ADMIN_PASSWORD: z.string().default(""),
  UNIFI_API_URL: z.string().default(""),
  UNIFI_API_USERNAME: z.string().default(""),
  UNIFI_API_PASSWORD: z.string().default(""),
  UNIFI_API_STYLE: z.enum(["UNIFI_OS", "CLASSIC"]).default("UNIFI_OS"),
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USERNAME: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_ENCRYPTION: z.enum(["NONE", "STARTTLS", "TLS"]).default("STARTTLS"),
  SMTP_FROM_EMAIL: z.string().default(""),
  SMTP_FROM_NAME: z.string().default("WirelessCom Captive Portal"),
  MESSAGE_API_URL: z.string().default(""),
  MESSAGE_API_KEY: z.string().default(""),
  MESSAGE_API_SECRET: z.string().default(""),
  MESSAGE_SENDER_ID: z.string().default(""),
  REDIS_URL: z.string().default(""),
});

export type AppEnv = z.infer<typeof schema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  cached = schema.parse(process.env);
  return cached;
}

export function requireSecret(name: "SESSION_SECRET" | "APP_ENCRYPTION_KEY" | "DATABASE_URL"): string {
  const value = getEnv()[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function resetEnvCache(): void {
  cached = null;
}
