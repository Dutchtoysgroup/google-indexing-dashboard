import nodemailer, { type Transporter } from "nodemailer";

export type SendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let transporter: Transporter | null = null;

function configError(message: string) {
  return Object.assign(new Error(message), { code: "ESENDCONFIG" });
}

function getFromAddress() {
  const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim();
  if (!from) {
    throw configError("EMAIL_FROM (of SMTP_USER) env var is verplicht voor e-mail verzending.");
  }
  return from;
}

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    throw configError("SMTP_HOST env var is verplicht voor e-mail verzending.");
  }
  const port = Number(process.env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port <= 0) {
    throw configError(`SMTP_PORT "${process.env.SMTP_PORT}" is geen geldig poortnummer.`);
  }
  // Poort 465 gebruikt implicit TLS; andere poorten (587) STARTTLS.
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });
  return transporter;
}

export async function sendEmail(input: SendInput): Promise<void> {
  const fromEmail = getFromAddress();
  const t = getTransporter();
  const fromName =
    process.env.EMAIL_FROM_NAME ||
    process.env.NEXT_PUBLIC_BRAND_NAME ||
    "Indexing Dashboard";
  await t.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
