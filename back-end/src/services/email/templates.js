const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const emailButton = (href, label) => `
  <p>
    <a href="${escapeHtml(href)}">${escapeHtml(label)}</a>
  </p>
`;

export const emailParagraph = (content) => `
  <p>
    ${content}
  </p>
`;

export const buildCbsEmailTemplate = ({ title, preview, body }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title || "CBS Staff LMS")}</title>
  </head>
  <body>
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
      ${escapeHtml(preview || title || "CBS Staff LMS notification")}
    </div>
    ${body}
  </body>
</html>`;

export { escapeHtml as escapeEmailHtml };
