import nodemailer from "nodemailer";
import { sendEmailResend } from "./sendEmailResend.js";

const truthy = (value) => ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const smtpConfigured = () => Boolean(process.env.SMTP_HOST);
const resendConfigured = () => Boolean(process.env.RESEND_API_KEY);

export const isEmailConfigured = () => smtpConfigured() || resendConfigured();

const buildFromAddress = () => {
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;

  const user = process.env.SMTP_USER;
  const name = process.env.SMTP_FROM_NAME || "CBS LMS";
  return user ? `${name} <${user}>` : "CBS LMS <notifications@cbs.gov.so>";
};

const getSmtpTransport = () => {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE ? truthy(process.env.SMTP_SECURE) : port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: process.env.SMTP_USER || process.env.SMTP_PASS
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
};

export const sendEmail = async ({ to, subject, html, text, from }) => {
  if (smtpConfigured()) {
    const transport = getSmtpTransport();
    return transport.sendMail({
      from: from || buildFromAddress(),
      to,
      subject,
      html,
      text,
    });
  }

  if (resendConfigured()) {
    return sendEmailResend({
      apiKey: process.env.RESEND_API_KEY,
      from: from || process.env.EMAIL_FROM || buildFromAddress(),
      to,
      subject,
      html,
    });
  }

  throw new Error("No email provider configured. Set SMTP_HOST or RESEND_API_KEY.");
};
