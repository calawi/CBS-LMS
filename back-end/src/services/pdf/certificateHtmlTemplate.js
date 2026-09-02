import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, "../../../../front-end/public/logo.png");
const iconPath = path.resolve(__dirname, "../../../../front-end/public/cbs-logo-icon-pdf.png");

let logoBase64 = "";
try {
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[certificateHtmlTemplate] Failed to read logo.png:", err);
}

let iconBase64 = "";
try {
  if (fs.existsSync(iconPath)) {
    const iconBuffer = fs.readFileSync(iconPath);
    iconBase64 = `data:image/png;base64,${iconBuffer.toString("base64")}`;
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[certificateHtmlTemplate] Failed to read cbs-logo-icon-pdf.png:", err);
}

/**
 * HTML template for certificate that matches the React component design exactly
 */
export const generateCertificateHtml = ({
  userName,
  courseTitle,
  issuedDate,
  certId,
}) => {
  const escapeHtml = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4 landscape;
            margin: 0;
        }

        html, body {
            width: 297mm;
            height: 210mm;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            background: white;
            line-height: 1.2;
        }

        .certificate {
            width: 297mm;
            height: 210mm;
            display: flex;
            flex-direction: column;
            padding: 20mm 25mm 15mm 25mm;
            background: white;
            position: relative;
            box-sizing: border-box;
        }

        .certificate::before {
            content: '';
            position: absolute;
            top: 8mm;
            left: 8mm;
            right: 8mm;
            bottom: 8mm;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            pointer-events: none;
            z-index: 0;
        }

        .certificate::after {
            content: '';
            position: absolute;
            top: 10mm;
            left: 10mm;
            right: 10mm;
            bottom: 10mm;
            border: 0.5px solid #f1f5f9;
            border-radius: 4px;
            pointer-events: none;
            z-index: 0;
        }

        .certificate-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 0;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            gap: 20px;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo-icon {
            width: 32px;
            height: 32px;
            object-fit: contain;
            border-radius: 4px;
            flex-shrink: 0;
        }

        .logo-text {
            color: #0a2540;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.5px;
        }

        .badge {
            padding: 6px 16px;
            background-color: #f8fafc;
            border: 1px solid #f1f5f9;
            border-radius: 9999px;
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            white-space: nowrap;
        }

        main {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            max-width: 100%;
            margin: 0 auto;
            padding: 5px 0;
        }

        .date {
            font-size: 11px;
            font-weight: 500;
            color: #94a3b8;
            margin-bottom: 15px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .recipient-name {
            font-family: 'Times New Roman', Times, serif;
            font-size: 48px;
            color: #0f172a;
            margin-bottom: 15px;
            line-height: 1.1;
            font-weight: normal;
        }

        .completion-text {
            color: #64748b;
            font-style: italic;
            font-family: 'Times New Roman', Times, serif;
            font-size: 16px;
            margin-bottom: 15px;
        }

        .course-title {
            font-family: 'Times New Roman', Times, serif;
            font-size: 26px;
            color: #0a2540;
            font-weight: normal;
            margin-bottom: 15px;
        }

        .course-description {
            color: #64748b;
            font-size: 13px;
            max-width: 600px;
            line-height: 1.5;
            margin: 0 auto;
        }

        footer {
            margin-top: 15px;
            padding-top: 0;
            padding-bottom: 5px;
        }

        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 40px;
            margin-bottom: 12px;
            min-height: 80px;
            border-bottom: 0.5px solid #f1f5f9;
            padding-bottom: 12px;
        }

        .signature-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            flex: 0 0 auto;
            min-width: 180px;
        }

        .signature {
            width: 140px;
            height: 45px;
            display: flex;
            align-items: center;
            margin-bottom: 2px;
            overflow: visible;
        }

        .signature svg {
            width: 100%;
            height: 100%;
            stroke: #0f172a;
            stroke-width: 1.5;
        }

        .signature-line {
            width: 100%;
            height: 1px;
            background-color: #cbd5e1;
            margin-bottom: 6px;
        }

        .signer-name {
            color: #0f172a;
            font-weight: 500;
            font-size: 11px;
            line-height: 1.2;
            margin: 0;
        }

        .signer-title {
            color: #64748b;
            font-size: 10px;
            margin: 2px 0 0 0;
            line-height: 1.2;
        }

        .seal-container {
            display: flex;
            justify-content: center;
            align-items: flex-end;
            flex-shrink: 0;
        }

        .seal {
            width: 190px;
            height: auto;
            max-height: 60px;
            object-fit: contain;
        }

        .certificate-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 4px;
        }

        .cert-id {
            font-family: 'Courier New', Courier, monospace;
            font-size: 10px;
            color: #94a3b8;
            margin: 0;
            line-height: 1;
        }

        .cert-disclaimer {
            font-size: 9px;
            color: #94a3b8;
            max-width: 600px;
            line-height: 1.4;
            margin: 0;
        }

        .seal-circle-dashed {
            stroke: #0a2540;
            stroke-dasharray: 4, 4;
            opacity: 0.3;
        }

        .seal-circle-solid {
            stroke: #0a2540;
        }

        .seal-circle-fill {
            fill: #0a2540;
            opacity: 0.05;
        }

        .seal-star {
            fill: #0a2540;
        }

        .seal-text-cbs {
            font-family: 'Times New Roman', Times, serif;
            font-size: 22px;
            font-weight: bold;
            fill: #0a2540;
            letter-spacing: 1.5px;
            text-anchor: middle;
            dominant-baseline: middle;
        }

        .seal-text-authorized {
            font-size: 6px;
            fill: #0a2540;
            opacity: 0.7;
            font-weight: 500;
            letter-spacing: 1px;
            text-anchor: middle;
        }

        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="certificate-content">
            <header>
                <div class="logo-section">
                    <img src="${iconBase64}" class="logo-icon" alt="CBS Icon" />
                    <div class="logo-text">CBS Staff LMS</div>
                </div>
                <div class="badge">Course Certificate</div>
            </header>

            <main>
                <div class="date">${escapeHtml(issuedDate)}</div>
                <h2 class="recipient-name">${escapeHtml(userName)}</h2>
                <p class="completion-text">has successfully completed</p>
                <h3 class="course-title">${escapeHtml(courseTitle)}</h3>
                <p class="course-description">an online course authorized by CBS and offered through the CBS Staff LMS</p>
            </main>

            <footer>
                <div class="footer-content">
                    <div class="signature-section">
                        <div class="signature">
                            <svg viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 45C15 35 20 20 25 15C30 10 35 25 40 35C45 45 50 40 55 30C60 20 65 15 70 25C75 35 80 45 85 40C90 35 95 25 100 20C105 15 110 30 115 40C120 50 125 45 130 35C135 25 140 20 145 30C150 40 155 45 160 40C165 35 170 25 175 20C180 15 185 30 190 35" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="signature-line"></div>
                        <div class="signer-name">Ahmed Mohamed Roble</div>
                        <div class="signer-title">Head of Training and Development</div>
                    </div>
                    <div class="seal-container">
                        <img src="${logoBase64}" class="seal" alt="CBS Seal" />
                    </div>
                </div>
                <div class="certificate-info">
                    <p class="cert-id">Certificate ID: ${escapeHtml(certId)}</p>
                    <p class="cert-disclaimer">CBS Staff LMS has confirmed the identity of this individual and their participation in the course.</p>
                </div>
            </footer>
        </div>
    </div>
</body>
</html>`;
};
