import nodemailer from "nodemailer";

import { env } from "../../config/env";

function createTransporter() {
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });
}

export async function sendEmail(params: { to: string; subject: string; html: string; text: string }) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: env.smtpFrom,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text
  });
}

export async function sendMagicLinkEmail(params: { to: string; subject: string; html: string; text: string }) {
  await sendEmail(params);
}
