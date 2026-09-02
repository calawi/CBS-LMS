import "dotenv/config";
import { sendEmail } from "../src/services/email/sendEmail.js";
import { buildCbsEmailTemplate, emailButton, emailParagraph } from "../src/services/email/templates.js";

const to = process.argv[2] || process.env.SMTP_TEST_TO;

if (!to) {
  console.error("Usage: node scripts/test-email.mjs recipient@example.com");
  process.exit(1);
}

try {
  const info = await sendEmail({
    to,
    subject: "CBS LMS SMTP test",
    html: buildCbsEmailTemplate({
      title: "CBS LMS SMTP test",
      preview: "This test confirms the CBS Staff LMS SMTP configuration is working.",
      body: `
        ${emailParagraph("Hello,")}
        ${emailParagraph("This is a test email from CBS Staff LMS SMTP configuration.")}
        ${emailButton(process.env.CLIENT_ORIGIN || "http://localhost:5173", "Open CBS Staff LMS")}
        ${emailParagraph("If you received this message, SMTP is working and the branded email template is rendering.")}
      `,
    }),
    text: "This is a test email from CBS Staff LMS SMTP configuration. If you received this, SMTP is working.",
  });

  console.log("SMTP test accepted:", info?.messageId || "sent");
} catch (err) {
  console.error("SMTP test failed:", err?.message || err);
  process.exit(1);
}
