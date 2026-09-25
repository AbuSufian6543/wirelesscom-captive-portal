import { escapeHtml, textToHtml } from "@/server/shared/html";
import { sanitizeCustomCss } from "./css";
import type { AuthMethodName, PortalView } from "@/server/tenant/resolve";

export type GuestPage = {
  portal: PortalView;
  sessionId?: string;
  error?: string;
  preview?: boolean;
  termsHref?: string;
  privacyHref?: string;
};

const METHOD_LABEL: Record<AuthMethodName, string> = {
  ACCEPT_TERMS: "Connect now",
  EMAIL: "Use my email",
  VOUCHER: "I have a code",
  PASSWORD: "I have a password",
};

export function renderGuestPage(page: GuestPage): string {
  const portal = page.portal;
  const method = portal.methods[0] ?? "ACCEPT_TERMS";
  const fields = [
    field(portal.nameField, "name", "Name", "text", "Your name"),
    field(portal.emailField, "email", "Email", "email", "you@example.com"),
    field(portal.phoneField, "phone", "Mobile number", "tel", "Mobile number"),
  ].join("");
  const legal =
    portal.termsField !== "HIDDEN" || portal.privacyField !== "HIDDEN"
      ? `<p class="legal">By tapping ${escapeHtml(portal.buttonText)}, you agree to the <a href="${escapeHtml(page.termsHref ?? "#")}">terms and conditions</a> and <a href="${escapeHtml(page.privacyHref ?? "#")}">privacy policy</a>.</p>`
      : "";
  const checks = [check(portal.marketingField, "marketingConsent", "Send me offers from this location. This is optional.")].join("");
  const methodFields = [
    portal.methods.includes("VOUCHER") ? field("OPTIONAL", "voucherCode", "Access code", "text", "Enter your code") : "",
    portal.methods.includes("PASSWORD") ? field("OPTIONAL", "password", "Wi-Fi password", "password", "Password") : "",
  ].join("");
  const methods = portal.methods
    .filter((item) => item !== "ACCEPT_TERMS")
    .map(
      (item, index) =>
        `<label class="choice"><input type="radio" name="method" value="${item}" ${index === 0 ? "checked" : ""} ${page.preview ? "disabled" : ""}> ${METHOD_LABEL[item]}</label>`,
    )
    .join("");
  const methodPicker = portal.methods.includes("ACCEPT_TERMS")
    ? `<input type="hidden" name="method" value="ACCEPT_TERMS">`
    : portal.methods.length > 1
      ? `<fieldset class="methods"><legend>Choose one way to get online</legend>${methods}</fieldset>`
      : `<input type="hidden" name="method" value="${method}">`;
  const bg = portal.backgroundPath ? `url('${escapeHtml(portal.backgroundPath)}')` : "none";
  const logo = portal.logoPath
    ? `<img class="logo" src="${escapeHtml(portal.logoPath)}" alt="${escapeHtml(portal.companyName)}">`
    : `<p class="wordmark">${escapeHtml(portal.companyName)}</p>`;
  const error = page.error ? `<p class="error" role="alert">${escapeHtml(page.error)}</p>` : "";
  const ssid = portal.ssid ? `<p class="network">${escapeHtml(portal.ssid)}</p>` : "";
  const form = page.preview
    ? `<div class="form">${methodPicker}${methodFields}${fields}${legal}${checks}<button type="button">${escapeHtml(portal.buttonText)}</button></div>`
    : `<form method="post" action="/guest/authenticate" novalidate accept-charset="UTF-8">${methodPicker}<input type="hidden" name="sessionId" value="${escapeHtml(page.sessionId ?? "")}">${methodFields}${fields}${legal}${checks}<button type="submit">${escapeHtml(portal.buttonText)}</button></form>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(portal.welcomeTitle)} · ${escapeHtml(portal.companyName)}</title>
${portal.faviconPath ? `<link rel="icon" href="${escapeHtml(portal.faviconPath)}">` : ""}
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{min-height:100vh;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:${escapeHtml(portal.backgroundColor)} ${bg} center/cover no-repeat;color:${escapeHtml(portal.textColor)};display:flex;align-items:center;justify-content:center;padding:16px}
.wrap{width:min(440px,100%)}
.card{background:${escapeHtml(portal.cardColor)};border-radius:18px;padding:28px 22px 22px;box-shadow:0 12px 40px rgba(0,0,0,.18)}
.logo{display:block;max-width:180px;max-height:64px;width:auto;margin:0 auto 12px}
.wordmark{margin:0 0 8px;text-align:center;font-weight:700;letter-spacing:.04em;color:${escapeHtml(portal.primaryColor)}}
.network{margin:0 0 8px;text-align:center;font-size:14px;font-weight:650;color:${escapeHtml(portal.accentColor)}}
h1{margin:0 0 8px;font-size:28px;line-height:1.2;text-align:center}
.lead,.desc,.support,.footer{margin:0 0 14px;text-align:center;line-height:1.45}
.lead{font-size:18px}
.desc,.support,.footer{font-size:15px;color:${escapeHtml(portal.mutedColor)}}
label{display:block;font-size:15px;font-weight:650;margin:12px 0 6px}
input[type=text],input[type=email],input[type=tel],input[type=password]{width:100%;min-height:52px;border:1px solid #d5dbe3;border-radius:12px;padding:12px 14px;font-size:16px}
.check{display:flex;gap:10px;align-items:flex-start;font-weight:500;font-size:15px;line-height:1.4}
.check input{width:22px;height:22px;margin-top:2px}
.methods{border:0;margin:0 0 8px;padding:0}
.methods legend{font-weight:700;margin-bottom:8px}
.choice{font-weight:600}
button{width:100%;min-height:54px;margin-top:18px;border:0;border-radius:12px;background:${escapeHtml(portal.buttonColor)};color:${escapeHtml(portal.buttonTextColor)};font-size:18px;font-weight:700}
a{color:${escapeHtml(portal.primaryColor)}}
.error{background:#fff1f2;color:#9f1239;border-radius:10px;padding:10px 12px;text-align:center}
.legal{margin:14px 0 0;font-size:13px;line-height:1.45;text-align:center;font-weight:500;color:${escapeHtml(portal.mutedColor)}}
</style>
${sanitizeCustomCss(portal.customCss ?? "") ? `<style>${sanitizeCustomCss(portal.customCss ?? "")}</style>` : ""}
</head>
<body>
<main class="wrap">
<section class="card" aria-label="${escapeHtml(portal.companyName)} Wi-Fi">
${logo}
${ssid}
<h1>${escapeHtml(portal.welcomeTitle)}</h1>
<p class="lead">${escapeHtml(portal.welcomeMessage)}</p>
${portal.description ? `<p class="desc">${escapeHtml(portal.description)}</p>` : ""}
${error}
${form}
${portal.supportText ? `<p class="support">${textToHtml(portal.supportText)}</p>` : ""}
${portal.footerText ? `<p class="footer">${escapeHtml(portal.footerText)}</p>` : ""}
</section>
</main>
</body>
</html>`;
}

function field(mode: string, name: string, label: string, type: string, placeholder: string): string {
  if (mode === "HIDDEN") return "";
  return `<label for="${name}">${label}${mode === "OPTIONAL" ? " (optional)" : ""}</label><input id="${name}" name="${name}" type="${type}" autocomplete="${name}" placeholder="${placeholder}">`;
}

function check(mode: string, name: string, html: string): string {
  if (mode === "HIDDEN") return "";
  return `<label class="check"><input type="checkbox" name="${name}" value="yes"> <span>${html}</span></label>`;
}

export function renderMessage(title: string, message: string): string {
  return renderGuestPage({
    portal: {
      companyName: "Wi-Fi",
      logoPath: "",
      faviconPath: "",
      backgroundPath: "",
      primaryColor: "#0B1F33",
      accentColor: "#8AA0B8",
      backgroundColor: "#0B1F33",
      textColor: "#102033",
      mutedColor: "#526277",
      cardColor: "#ffffff",
      buttonColor: "#0B1F33",
      buttonTextColor: "#ffffff",
      welcomeTitle: title,
      welcomeMessage: message,
      description: "",
      buttonText: "Continue",
      footerText: "",
      supportText: "",
      termsVersion: "",
      privacyVersion: "",
      ssid: "",
      nameField: "HIDDEN",
      emailField: "HIDDEN",
      phoneField: "HIDDEN",
      termsField: "HIDDEN",
      privacyField: "HIDDEN",
      marketingField: "HIDDEN",
      methods: [],
    },
    preview: true,
  });
}

export function renderDocument(title: string, company: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;font-family:Segoe UI,Roboto,Arial,sans-serif;background:#0B1F33;color:#102033}main{max-width:640px;margin:16px auto;background:#fff;border-radius:16px;padding:22px}h1{font-size:24px}p{line-height:1.5;font-size:16px}</style></head><body><main><h1>${escapeHtml(company)}</h1><h2>${escapeHtml(title)}</h2><p>${textToHtml(body)}</p><p>Use your browser back button to return to the connection screen.</p></main></body></html>`;
}

export function renderConnected(company: string, href: string): string {
  const name = escapeHtml(company);
  const destination = escapeHtml(href);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="1;url=${destination}">
<title>You're online · ${name}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;padding:0}body{min-height:100vh;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0B1F33;color:#102033;display:flex;align-items:center;justify-content:center;padding:16px}.card{width:min(440px,100%);background:#fff;border-radius:18px;padding:28px 22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.18)}h1{margin:0 0 8px;font-size:28px}p{margin:0 0 14px;line-height:1.45;color:#526277}a{display:inline-block;min-height:48px;padding:12px 18px;border-radius:12px;background:#0B1F33;color:#fff;text-decoration:none;font-weight:700}
</style>
</head>
<body>
<main class="card">
<h1>You're online</h1>
<p>Connected to ${name} Wi-Fi. You can close this screen or continue below.</p>
<p><a href="${destination}">Continue</a></p>
</main>
</body>
</html>`;
}
