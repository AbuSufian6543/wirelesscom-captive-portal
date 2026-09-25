-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantKind" AS ENUM ('PLATFORM_OWNER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FieldMode" AS ENUM ('HIDDEN', 'OPTIONAL', 'REQUIRED');

-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('ACCEPT_TERMS', 'EMAIL', 'VOUCHER', 'PASSWORD');

-- CreateEnum
CREATE TYPE "GuestSessionStatus" AS ENUM ('PENDING', 'AUTHENTICATED', 'EXPIRED', 'REVOKED', 'FAILED');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "UnifiMode" AS ENUM ('MOCK', 'REAL');

-- CreateEnum
CREATE TYPE "UnifiApiStyle" AS ENUM ('UNIFI_OS', 'CLASSIC');

-- CreateEnum
CREATE TYPE "SmtpEncryption" AS ENUM ('NONE', 'STARTTLS', 'TLS');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "hasAllTenants" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "UserTenant" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("userId","tenantId")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "TenantKind" NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiController" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "UnifiMode" NOT NULL DEFAULT 'MOCK',
    "apiStyle" "UnifiApiStyle" NOT NULL DEFAULT 'UNIFI_OS',
    "baseUrl" TEXT NOT NULL DEFAULT '',
    "username" TEXT NOT NULL DEFAULT '',
    "passwordEncrypted" TEXT NOT NULL DEFAULT '',
    "verifyTls" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiController_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiSite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "controllerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiSsid" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiSsid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnifiAccessPoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mac" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnifiAccessPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApSsid" (
    "accessPointId" TEXT NOT NULL,
    "ssidId" TEXT NOT NULL,

    CONSTRAINT "ApSsid_pkey" PRIMARY KEY ("accessPointId","ssidId")
);

-- CreateTable
CREATE TABLE "PortalConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "logoPath" TEXT NOT NULL DEFAULT '',
    "faviconPath" TEXT NOT NULL DEFAULT '',
    "backgroundPath" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT '#0B1F33',
    "accentColor" TEXT NOT NULL DEFAULT '#C4A35A',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0B1F33',
    "textColor" TEXT NOT NULL DEFAULT '#102033',
    "mutedColor" TEXT NOT NULL DEFAULT '#526277',
    "cardColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "buttonColor" TEXT NOT NULL DEFAULT '#0B1F33',
    "buttonTextColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "welcomeTitle" TEXT NOT NULL,
    "welcomeMessage" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "buttonText" TEXT NOT NULL DEFAULT 'Connect',
    "footerText" TEXT NOT NULL DEFAULT '',
    "termsText" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL DEFAULT '1.0',
    "privacyText" TEXT NOT NULL,
    "privacyVersion" TEXT NOT NULL DEFAULT '1.0',
    "supportText" TEXT NOT NULL DEFAULT '',
    "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 480,
    "redirectUrl" TEXT NOT NULL DEFAULT '',
    "uploadKbps" INTEGER,
    "downloadKbps" INTEGER,
    "dataLimitMb" INTEGER,
    "nameField" "FieldMode" NOT NULL DEFAULT 'OPTIONAL',
    "emailField" "FieldMode" NOT NULL DEFAULT 'REQUIRED',
    "phoneField" "FieldMode" NOT NULL DEFAULT 'HIDDEN',
    "termsField" "FieldMode" NOT NULL DEFAULT 'REQUIRED',
    "privacyField" "FieldMode" NOT NULL DEFAULT 'REQUIRED',
    "marketingField" "FieldMode" NOT NULL DEFAULT 'OPTIONAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthenticationMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "method" "AuthMethod" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sharedSecretHash" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AuthenticationMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mac" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "termsVersion" TEXT NOT NULL DEFAULT '',
    "termsAcceptedAt" TIMESTAMP(3),
    "privacyVersion" TEXT NOT NULL DEFAULT '',
    "privacyAcceptedAt" TIMESTAMP(3),
    "marketingConsentAt" TIMESTAMP(3),
    "emailUnsubscribedAt" TIMESTAMP(3),
    "smsUnsubscribedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT,
    "accessPointId" TEXT,
    "guestClientId" TEXT,
    "apMac" TEXT NOT NULL,
    "clientMac" TEXT NOT NULL,
    "ssid" TEXT NOT NULL DEFAULT '',
    "requestSiteKey" TEXT NOT NULL DEFAULT '',
    "method" "AuthMethod",
    "status" "GuestSessionStatus" NOT NULL DEFAULT 'PENDING',
    "originalUrl" TEXT NOT NULL DEFAULT '',
    "redirectUrl" TEXT NOT NULL DEFAULT '',
    "authenticatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "failureReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestAuthenticationEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "method" "AuthMethod",
    "result" "AuditResult" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestAuthenticationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 480,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherRedemption" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "guestClientId" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmtpConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT NOT NULL DEFAULT '',
    "passwordEncrypted" TEXT NOT NULL DEFAULT '',
    "encryption" "SmtpEncryption" NOT NULL DEFAULT 'STARTTLS',
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageApiConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "apiUrl" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL DEFAULT '',
    "apiSecretEncrypted" TEXT NOT NULL DEFAULT '',
    "senderId" TEXT NOT NULL DEFAULT '',
    "extraJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageApiConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "guestClientId" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EmailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "guestClientId" TEXT,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SmsRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "apMac" TEXT NOT NULL DEFAULT '',
    "ssid" TEXT NOT NULL DEFAULT '',
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "tenantId" TEXT,
    "action" TEXT NOT NULL,
    "result" "AuditResult" NOT NULL,
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "UserTenant_tenantId_idx" ON "UserTenant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminSession_userId_idx" ON "AdminSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "UnifiController_tenantId_idx" ON "UnifiController"("tenantId");

-- CreateIndex
CREATE INDEX "UnifiSite_tenantId_idx" ON "UnifiSite"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiSite_controllerId_externalId_key" ON "UnifiSite"("controllerId", "externalId");

-- CreateIndex
CREATE INDEX "UnifiSsid_tenantId_idx" ON "UnifiSsid"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiSsid_siteId_name_key" ON "UnifiSsid"("siteId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UnifiAccessPoint_mac_key" ON "UnifiAccessPoint"("mac");

-- CreateIndex
CREATE INDEX "UnifiAccessPoint_tenantId_idx" ON "UnifiAccessPoint"("tenantId");

-- CreateIndex
CREATE INDEX "UnifiAccessPoint_siteId_idx" ON "UnifiAccessPoint"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "PortalConfiguration_tenantId_key" ON "PortalConfiguration"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthenticationMethod_tenantId_method_key" ON "AuthenticationMethod"("tenantId", "method");

-- CreateIndex
CREATE INDEX "GuestClient_tenantId_email_idx" ON "GuestClient"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "GuestClient_tenantId_mac_key" ON "GuestClient"("tenantId", "mac");

-- CreateIndex
CREATE INDEX "GuestSession_tenantId_status_idx" ON "GuestSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GuestSession_tenantId_createdAt_idx" ON "GuestSession"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "GuestSession_clientMac_idx" ON "GuestSession"("clientMac");

-- CreateIndex
CREATE INDEX "GuestAuthenticationEvent_tenantId_createdAt_idx" ON "GuestAuthenticationEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Voucher_tenantId_idx" ON "Voucher"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_tenantId_code_key" ON "Voucher"("tenantId", "code");

-- CreateIndex
CREATE INDEX "VoucherRedemption_voucherId_idx" ON "VoucherRedemption"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "SmtpConfiguration_tenantId_key" ON "SmtpConfiguration"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageApiConfiguration_tenantId_key" ON "MessageApiConfiguration"("tenantId");

-- CreateIndex
CREATE INDEX "EmailCampaign_tenantId_idx" ON "EmailCampaign"("tenantId");

-- CreateIndex
CREATE INDEX "EmailRecipient_campaignId_idx" ON "EmailRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "SmsCampaign_tenantId_idx" ON "SmsCampaign"("tenantId");

-- CreateIndex
CREATE INDEX "SmsRecipient_campaignId_idx" ON "SmsRecipient"("campaignId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_createdAt_idx" ON "AnalyticsEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_type_idx" ON "AnalyticsEvent"("tenantId", "type");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiController" ADD CONSTRAINT "UnifiController_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiSite" ADD CONSTRAINT "UnifiSite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiSite" ADD CONSTRAINT "UnifiSite_controllerId_fkey" FOREIGN KEY ("controllerId") REFERENCES "UnifiController"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiSsid" ADD CONSTRAINT "UnifiSsid_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiSsid" ADD CONSTRAINT "UnifiSsid_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "UnifiSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiAccessPoint" ADD CONSTRAINT "UnifiAccessPoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnifiAccessPoint" ADD CONSTRAINT "UnifiAccessPoint_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "UnifiSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApSsid" ADD CONSTRAINT "ApSsid_accessPointId_fkey" FOREIGN KEY ("accessPointId") REFERENCES "UnifiAccessPoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApSsid" ADD CONSTRAINT "ApSsid_ssidId_fkey" FOREIGN KEY ("ssidId") REFERENCES "UnifiSsid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalConfiguration" ADD CONSTRAINT "PortalConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthenticationMethod" ADD CONSTRAINT "AuthenticationMethod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestClient" ADD CONSTRAINT "GuestClient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "UnifiSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_accessPointId_fkey" FOREIGN KEY ("accessPointId") REFERENCES "UnifiAccessPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_guestClientId_fkey" FOREIGN KEY ("guestClientId") REFERENCES "GuestClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestAuthenticationEvent" ADD CONSTRAINT "GuestAuthenticationEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestAuthenticationEvent" ADD CONSTRAINT "GuestAuthenticationEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_guestClientId_fkey" FOREIGN KEY ("guestClientId") REFERENCES "GuestClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmtpConfiguration" ADD CONSTRAINT "SmtpConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageApiConfiguration" ADD CONSTRAINT "MessageApiConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailCampaign" ADD CONSTRAINT "EmailCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRecipient" ADD CONSTRAINT "EmailRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCampaign" ADD CONSTRAINT "SmsCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsRecipient" ADD CONSTRAINT "SmsRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SmsCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
