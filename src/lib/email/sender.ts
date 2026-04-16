import nodemailer from "nodemailer";

export type SendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER en GMAIL_APP_PASSWORD env vars zijn verplicht voor e-mail verzending."
    );
  }
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendEmail(input: SendInput): Promise<void> {
  const t = getTransporter();
  const fromName = process.env.EMAIL_FROM_NAME || "EXIT Toys Indexing";
  const fromEmail = process.env.GMAIL_USER!;
  await t.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
