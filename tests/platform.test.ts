import { describe, expect, it } from "vitest";
import { normalizeMac } from "@/server/shared/mac";
import { checkRedirectUrl } from "@/server/shared/redirect";
import { parseGuestQuery } from "@/server/portal/params";
import { renderGuestPage } from "@/server/portal/render";
import { resolveTenantByAp, type Directory, type ResolvedPortal } from "@/server/tenant/resolve";
import { authenticateGuest, evaluateVoucher, pendingDeadline, resolveGuestMethod, type GuestAuthDeps, type VoucherRecord } from "@/server/portal/authenticate";
import { postAuthRedirect } from "@/server/portal/success-url";
import { MockUniFiProvider } from "@/server/unifi/mock-provider";
import { canAccessTenant, requireTenantAccess, requireSuperAdmin, type AuthUser } from "@/server/authentication/guards";
import { completePasswordReset, requestPasswordReset, type ResetStore } from "@/server/authentication/reset";
import { hashPassword, verifyPassword } from "@/server/authentication/password";
import { sanitizeCustomCss } from "@/server/portal/css";

const query = "ap=d0:21:f9:bc:38:d4&id=e4:a7:a0:74:f9:b9&t=1790349699&url=http://www.msftconnecttest.com/redirect&ssid=Captive%20Portal%20Test%20SE";

function portal(partial: Partial<ResolvedPortal> & Pick<ResolvedPortal, "tenant">): ResolvedPortal {
  return {
    controller: { id: "c", mode: "MOCK", apiStyle: "UNIFI_OS", baseUrl: "", username: "", password: "", verifyTls: true },
    site: { id: "s", externalId: "default", name: "Site" },
    accessPoint: { id: "ap", mac: "d0:21:f9:bc:38:d4", name: "AP", enabled: true },
    ssidName: "Guest",
    portal: {
      companyName: partial.tenant.name,
      logoPath: "",
      faviconPath: "",
      backgroundPath: "",
      primaryColor: "#0B1F33",
      accentColor: "#C4A35A",
      backgroundColor: "#0B1F33",
      textColor: "#102033",
      mutedColor: "#526277",
      cardColor: "#FFFFFF",
      buttonColor: "#0B1F33",
      buttonTextColor: "#FFFFFF",
      welcomeTitle: partial.tenant.name,
      welcomeMessage: `Welcome ${partial.tenant.name}`,
      description: "",
      buttonText: "Connect",
      footerText: partial.tenant.name,
      supportText: "",
      termsVersion: "1.0",
      privacyVersion: "1.0",
      ssid: "",
      nameField: "OPTIONAL",
      emailField: "HIDDEN",
      phoneField: "HIDDEN",
      termsField: "REQUIRED",
      privacyField: "REQUIRED",
      marketingField: "OPTIONAL",
      methods: ["ACCEPT_TERMS"],
      sessionDurationMinutes: 60,
      redirectUrl: "https://example.com",
      uploadKbps: null,
      downloadKbps: null,
      dataLimitMb: null,
      termsText: "terms",
      privacyText: "privacy",
    },
    methods: [{ method: "ACCEPT_TERMS", enabled: true, sharedSecretHash: "", sortOrder: 0 }],
    ...partial,
  };
}

const wireless = portal({
  tenant: { id: "t-wc", name: "WirelessCom.Ca Inc.", slug: "wirelesscom", status: "ACTIVE" },
  accessPoint: { id: "ap-wc", mac: "d0:21:f9:bc:38:01", name: "WC", enabled: true },
  portal: {
    ...portal({ tenant: { id: "t-wc", name: "WirelessCom.Ca Inc.", slug: "wirelesscom", status: "ACTIVE" } }).portal,
    redirectUrl: "https://wirelesscom.ca",
    welcomeTitle: "Welcome online",
  },
});
const pinos = portal({
  tenant: { id: "t-pinos", name: "Pinos", slug: "pinos", status: "ACTIVE" },
  accessPoint: { id: "ap-pinos", mac: "d0:21:f9:bc:38:d4", name: "Pinos", enabled: true },
  ssidName: "Pinos-Guest",
  portal: {
    ...portal({ tenant: { id: "t-pinos", name: "Pinos", slug: "pinos", status: "ACTIVE" } }).portal,
    redirectUrl: "https://pinos.ca",
    welcomeTitle: "Welcome to Pinos",
    termsText: "Pinos terms only",
  },
});
const trinity = portal({
  tenant: { id: "t-trinity", name: "Trinity", slug: "trinity", status: "ACTIVE" },
  accessPoint: { id: "ap-trinity", mac: "aa:bb:cc:dd:ee:ff", name: "Trinity", enabled: true },
  ssidName: "Trinity-Guest",
  portal: {
    ...portal({ tenant: { id: "t-trinity", name: "Trinity", slug: "trinity", status: "ACTIVE" } }).portal,
    redirectUrl: "https://trinity.ca",
    welcomeTitle: "Welcome to Trinity",
    termsText: "Trinity terms only",
  },
});

const directory: Directory = {
  async findByApMac(mac) {
    return [wireless, pinos, trinity].find((item) => item.accessPoint.mac === mac) ?? null;
  },
};

function user(partial: Partial<AuthUser>): AuthUser {
  return {
    id: "u",
    email: "user@example.com",
    name: "User",
    status: "ACTIVE",
    mustChangePassword: false,
    hasAllTenants: false,
    roles: ["TENANT_ADMIN"],
    permissions: ["portal.manage"],
    tenantIds: ["t-pinos"],
    ...partial,
  };
}

describe("UniFi query and MAC", () => {
  it("parses the captive portal redirect", () => {
    const parsed = parseGuestQuery(new URLSearchParams(query));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query.apMac).toBe("d0:21:f9:bc:38:d4");
    expect(parsed.query.clientMac).toBe("e4:a7:a0:74:f9:b9");
    expect(parsed.query.timestamp).toBe(1790349699);
    expect(parsed.query.ssid).toBe("Captive Portal Test SE");
    expect(parsed.query.originalUrl).toContain("msftconnecttest.com");
  });

  it("rejects invalid MAC addresses and javascript destinations", () => {
    expect(normalizeMac("not-a-mac")).toBeNull();
    expect(normalizeMac("00-00-00-00-00-00")).toBeNull();
    expect(parseGuestQuery(new URLSearchParams("ap=zz&id=e4:a7:a0:74:f9:b9&t=1790349699")).ok).toBe(false);
    expect(checkRedirectUrl("javascript:alert(1)").ok).toBe(false);
    expect(checkRedirectUrl("data:text/html,hi").ok).toBe(false);
    expect(checkRedirectUrl("file:///etc/passwd").ok).toBe(false);
    expect(checkRedirectUrl("//evil.example").ok).toBe(false);
    expect(checkRedirectUrl("https://user:pass@example.com").ok).toBe(false);
    expect(checkRedirectUrl("https://wirelesscom.ca/welcome").ok).toBe(true);
  });
});

describe("tenant resolution and three portals", () => {
  it("maps each AP to only that tenant's branding", async () => {
    const cases = [
      [wireless, "WirelessCom.Ca Inc.", "Pinos"],
      [pinos, "Pinos", "Trinity"],
      [trinity, "Trinity", "WirelessCom.Ca Inc."],
    ] as const;
    for (const [record, expected, forbidden] of cases) {
      const resolved = await resolveTenantByAp(directory, record.accessPoint.mac);
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) continue;
      expect(resolved.portal.tenant.name).toBe(expected);
      const html = renderGuestPage({
        portal: { ...resolved.portal.portal, ssid: record.ssidName, methods: ["ACCEPT_TERMS"] },
        sessionId: "session",
      });
      expect(html).toContain(expected);
      expect(html).not.toContain(forbidden);
      expect(html).not.toContain("<script");
      expect(html).toContain("novalidate");
      expect(html).toContain("By tapping");
      expect(html).not.toContain('name="acceptTerms"');
    }
  });

  it("does not authorize an unknown AP", async () => {
    const resolved = await resolveTenantByAp(directory, "de:ad:be:ef:00:00");
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.message).toBe("This Wi-Fi network is not registered.");
  });
});

describe("guest authorization", () => {
  it("authorizes the client on the resolved controller and redirects to that tenant", async () => {
    const provider = new MockUniFiProvider();
    const deps: GuestAuthDeps = {
      async loadSession() {
        return {
          session: {
            id: "sess",
            tenantId: pinos.tenant.id,
            status: "PENDING",
            createdAt: new Date(),
            expiresAt: null,
            clientMac: "e4:a7:a0:74:f9:b9",
            apMac: pinos.accessPoint.mac,
            originalUrl: "http://www.msftconnecttest.com/redirect",
            siteExternalId: "default",
          },
          portal: pinos,
        };
      },
      async findVoucher() { return null; },
      async redeemVoucher() { return null; },
      async saveGuest() { return { id: "guest" }; },
      async markSession() { return undefined; },
      async recordEvent() { return undefined; },
      providerFor() { return provider; },
    };
    const result = await authenticateGuest(deps, {
      sessionId: "sess",
      method: "ACCEPT_TERMS",
      name: "",
      email: "",
      phone: "",
      acceptTerms: true,
      acceptPrivacy: true,
      marketingConsent: false,
      voucherCode: "",
      password: "",
      now: new Date(),
    }, "203.0.113.5");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redirectUrl).toBe("https://pinos.ca/");
    expect(result.successUrl).toBe("http://www.msftconnecttest.com/redirect");
    expect(result.companyName).toBe("Pinos");
    expect(provider.authorizations).toHaveLength(1);
    expect(provider.authorizations[0]?.mac).toBe("e4:a7:a0:74:f9:b9");
    expect(provider.authorizations[0]?.options.minutes).toBe(60);
    const client = await provider.findClientByMac("default", "e4:a7:a0:74:f9:b9");
    expect(client?.authorized).toBe(true);
  });

  it("expires a pending session", async () => {
    const created = new Date(Date.now() - 21 * 60 * 1000);
    expect(pendingDeadline(created).getTime()).toBeLessThan(Date.now());
    const deps: GuestAuthDeps = {
      async loadSession() {
        return {
          session: {
            id: "old",
            tenantId: wireless.tenant.id,
            status: "PENDING",
            createdAt: created,
            expiresAt: null,
            clientMac: "e4:a7:a0:74:f9:b9",
            apMac: wireless.accessPoint.mac,
            originalUrl: "",
            siteExternalId: "default",
          },
          portal: wireless,
        };
      },
      async findVoucher() { return null; },
      async redeemVoucher() { return null; },
      async saveGuest() { return { id: "g" }; },
      async markSession(input) { expect(input.status).toBe("EXPIRED"); },
      async recordEvent() { return undefined; },
      providerFor() { return new MockUniFiProvider(); },
    };
    const result = await authenticateGuest(deps, {
      sessionId: "old", method: "ACCEPT_TERMS", name: "", email: "", phone: "", acceptTerms: true, acceptPrivacy: true, marketingConsent: false, voucherCode: "", password: "", now: new Date(),
    }, "127.0.0.1");
    expect(result.ok).toBe(false);
  });

  it("treats tapping Join as consent and prefers the OS connectivity check", async () => {
    const provider = new MockUniFiProvider();
    const deps: GuestAuthDeps = {
      async loadSession() {
        return {
          session: {
            id: "sess",
            tenantId: pinos.tenant.id,
            status: "PENDING",
            createdAt: new Date(),
            expiresAt: null,
            clientMac: "e4:a7:a0:74:f9:b9",
            apMac: pinos.accessPoint.mac,
            originalUrl: "http://www.msftconnecttest.com/redirect",
            siteExternalId: "default",
          },
          portal: {
            ...pinos,
            portal: { ...pinos.portal, emailField: "REQUIRED" },
            methods: [
              { method: "ACCEPT_TERMS", enabled: true, sharedSecretHash: "", sortOrder: 0 },
              { method: "EMAIL", enabled: true, sharedSecretHash: "", sortOrder: 1 },
            ],
          },
        };
      },
      async findVoucher() { return null; },
      async redeemVoucher() { return null; },
      async saveGuest() { return { id: "guest" }; },
      async markSession() { return undefined; },
      async recordEvent() { return undefined; },
      providerFor() { return provider; },
    };
    expect(resolveGuestMethod(pinos, {
      sessionId: "sess", method: "", name: "", email: "", phone: "", acceptTerms: false, acceptPrivacy: false, marketingConsent: false, voucherCode: "", password: "", now: new Date(),
    })).toBe("ACCEPT_TERMS");
    const result = await authenticateGuest(deps, {
      sessionId: "sess",
      method: "",
      name: "",
      email: "",
      phone: "",
      acceptTerms: false,
      acceptPrivacy: false,
      marketingConsent: false,
      voucherCode: "",
      password: "",
      now: new Date(),
    }, "203.0.113.5");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.successUrl).toBe("http://www.msftconnecttest.com/redirect");
    expect(provider.authorizations).toHaveLength(1);
    expect(postAuthRedirect("http://captive.apple.com/hotspot-detect.html", "https://pinos.ca/")).toContain("captive.apple.com");
    expect(postAuthRedirect("", "https://pinos.ca/")).toBe("https://pinos.ca/");
  });
});

describe("vouchers", () => {
  const base: VoucherRecord = { id: "v", code: "PINOS1", status: "ACTIVE", expiresAt: null, maxUses: 1, useCount: 0, sessionDurationMinutes: 30 };
  it("rejects expired, exhausted, and revoked vouchers", () => {
    expect(evaluateVoucher({ ...base, status: "REVOKED" }, new Date()).ok).toBe(false);
    expect(evaluateVoucher({ ...base, useCount: 1 }, new Date()).ok).toBe(false);
    expect(evaluateVoucher({ ...base, expiresAt: new Date(Date.now() - 1000) }, new Date()).ok).toBe(false);
    expect(evaluateVoucher(base, new Date()).ok).toBe(true);
  });

  it("redeems a voucher once for the owning tenant", async () => {
    let uses = 0;
    const provider = new MockUniFiProvider();
    const deps: GuestAuthDeps = {
      async loadSession() {
        return {
          session: { id: "sess", tenantId: pinos.tenant.id, status: "PENDING", createdAt: new Date(), expiresAt: null, clientMac: "11:22:33:44:55:66", apMac: pinos.accessPoint.mac, originalUrl: "", siteExternalId: "default" },
          portal: { ...pinos, methods: [{ method: "VOUCHER", enabled: true, sharedSecretHash: "", sortOrder: 0 }] },
        };
      },
      async findVoucher(tenantId, code) {
        expect(tenantId).toBe("t-pinos");
        expect(code).toBe("PINOS1");
        return { ...base, useCount: uses };
      },
      async redeemVoucher() {
        if (uses >= 1) return null;
        uses += 1;
        return { ...base, useCount: uses, sessionDurationMinutes: 30 };
      },
      async saveGuest() { return { id: "g" }; },
      async markSession() { return undefined; },
      async recordEvent() { return undefined; },
      providerFor() { return provider; },
    };
    const input = { sessionId: "sess", method: "VOUCHER", name: "", email: "", phone: "", acceptTerms: true, acceptPrivacy: true, marketingConsent: false, voucherCode: "pinos1", password: "", now: new Date() };
    const first = await authenticateGuest(deps, input, "127.0.0.1");
    expect(first.ok).toBe(true);
    expect(provider.authorizations[0]?.options.minutes).toBe(30);
    const second = await authenticateGuest(deps, input, "127.0.0.1");
    expect(second.ok).toBe(false);
  });
});

describe("staff authorization", () => {
  it("blocks cross-tenant access and anonymous API-style checks", () => {
    const pinosAdmin = user({});
    expect(canAccessTenant(pinosAdmin, "t-pinos")).toBe(true);
    expect(canAccessTenant(pinosAdmin, "t-trinity")).toBe(false);
    expect(() => requireTenantAccess(pinosAdmin, "t-trinity")).toThrow(/do not have access/);
    expect(() => requireSuperAdmin(pinosAdmin)).toThrow(/Super Admin/);
    expect(() => requireTenantAccess(null, "t-pinos")).toThrow(/Authentication required/);
    const platform = user({ roles: ["SUPER_ADMIN"], tenantIds: [], hasAllTenants: true });
    expect(canAccessTenant(platform, "t-trinity")).toBe(true);
  });
});

describe("password reset", () => {
  it("issues one token and refuses a second use", async () => {
    const tokens = new Map<string, { id: string; userId: string; expiresAt: Date; usedAt: Date | null }>();
    let hashed = "";
    let link = "";
    const store: ResetStore = {
      async findUserByEmail() { return { id: "admin", email: "abu@wirelesscom.ca", name: "Abu", status: "ACTIVE" }; },
      async saveToken(input) { tokens.set(input.tokenHash, { id: "tok", userId: input.userId, expiresAt: input.expiresAt, usedAt: null }); },
      async findToken(hash) { return tokens.get(hash) ?? null; },
      async markUsed(id, usedAt) {
        for (const token of tokens.values()) if (token.id === id) token.usedAt = usedAt;
      },
      async updatePassword(_id, passwordHash) { hashed = passwordHash; },
      async revokeSessions() { return undefined; },
      async send(input) { link = input.link; },
    };
    await requestPasswordReset(store, "abu@wirelesscom.ca", "https://captive.example.com");
    const token = new URL(link).searchParams.get("token") ?? "";
    const first = await completePasswordReset(store, token, "correct-horse-1");
    expect(first.ok).toBe(true);
    expect(await verifyPassword(hashed, "correct-horse-1")).toBe(true);
    const second = await completePasswordReset(store, token, "correct-horse-2");
    expect(second.ok).toBe(false);
  });
});

describe("custom portal css", () => {
  it("drops active content and remote urls", () => {
    const css = sanitizeCustomCss(".card{color:red}\nbody{background:url(https://evil.example)}\n@import 'x';\n.x{color:blue}");
    expect(css).toContain(".card{color:red}");
    expect(css).not.toContain("url(");
    expect(css).not.toContain("@import");
  });
});

describe("password hashing", () => {
  it("does not keep the plaintext", async () => {
    const hashed = await hashPassword("temporary-pass-1");
    expect(hashed).not.toContain("temporary-pass-1");
    expect(await verifyPassword(hashed, "temporary-pass-1")).toBe(true);
  });
});
