import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.resolve(__dirname, "../../../../front-end/public/logo.png");
const iconPath = path.resolve(__dirname, "../../../../front-end/public/cbs-logo-icon-pdf.png");

const sanitizeCertTitle = (value) => String(value || "").replace(/\s+quiz\s*$/i, "").trim();

const NAVY = "#0A2540";
const SLATE_900 = "#0f172a";
const SLATE_500 = "#64748b";
const SLATE_400 = "#94a3b8";
const SLATE_300 = "#cbd5e1";
const SLATE_200 = "#e2e8f0";
const SLATE_100 = "#f1f5f9";
const SLATE_50 = "#f8fafc";

const drawSignature = (doc, x, y, width) => {
  doc.save();
  doc.lineWidth(1.5).strokeColor(SLATE_900);
  const scale = width / 180;
  doc
    .moveTo(x, y + 26 * scale)
    .bezierCurveTo(x + 5 * scale, y + 16 * scale, x + 10 * scale, y + 1 * scale, x + 15 * scale, y - 4 * scale)
    .bezierCurveTo(x + 20 * scale, y - 9 * scale, x + 25 * scale, y + 6 * scale, x + 30 * scale, y + 16 * scale)
    .bezierCurveTo(x + 35 * scale, y + 26 * scale, x + 40 * scale, y + 21 * scale, x + 45 * scale, y + 11 * scale)
    .bezierCurveTo(x + 50 * scale, y + 1 * scale, x + 55 * scale, y - 4 * scale, x + 60 * scale, y + 6 * scale)
    .bezierCurveTo(x + 65 * scale, y + 16 * scale, x + 70 * scale, y + 26 * scale, x + 75 * scale, y + 21 * scale)
    .bezierCurveTo(x + 80 * scale, y + 16 * scale, x + 85 * scale, y + 6 * scale, x + 90 * scale, y + 1 * scale)
    .bezierCurveTo(x + 95 * scale, y - 4 * scale, x + 100 * scale, y + 11 * scale, x + 105 * scale, y + 21 * scale)
    .bezierCurveTo(x + 110 * scale, y + 31 * scale, x + 115 * scale, y + 26 * scale, x + 120 * scale, y + 16 * scale)
    .bezierCurveTo(x + 125 * scale, y + 6 * scale, x + 130 * scale, y + 1 * scale, x + 135 * scale, y + 11 * scale)
    .bezierCurveTo(x + 140 * scale, y + 21 * scale, x + 145 * scale, y + 26 * scale, x + 150 * scale, y + 21 * scale)
    .bezierCurveTo(x + 155 * scale, y + 16 * scale, x + 160 * scale, y + 6 * scale, x + 165 * scale, y + 1 * scale)
    .bezierCurveTo(x + 170 * scale, y - 4 * scale, x + 175 * scale, y + 11 * scale, x + 180 * scale, y + 16 * scale)
    .stroke();
  doc.restore();
};

const drawSeal = (doc, cx, cy, radius) => {
  doc.save();

  doc
    .lineWidth(0.8)
    .strokeColor(`${NAVY}4D`)
    .dash(3, { space: 3 })
    .circle(cx, cy, radius)
    .stroke()
    .undash();

  doc.lineWidth(1.2).strokeColor(NAVY).circle(cx, cy, radius * 0.86).stroke();

  doc.circle(cx, cy, radius * 0.79).fill(`${NAVY}0D`);

  const starR = radius * 0.12;
  const starY = cy - radius * 0.32;
  doc
    .fillColor(NAVY)
    .moveTo(cx, starY - starR)
    .lineTo(cx + starR * 0.31, starY - starR * 0.38)
    .lineTo(cx + starR * 0.95, starY - starR * 0.35)
    .lineTo(cx + starR * 0.4, starY + starR * 0.12)
    .lineTo(cx + starR * 0.55, starY + starR * 0.75)
    .lineTo(cx, starY + starR * 0.35)
    .lineTo(cx - starR * 0.55, starY + starR * 0.75)
    .lineTo(cx - starR * 0.4, starY + starR * 0.12)
    .lineTo(cx - starR * 0.95, starY - starR * 0.35)
    .lineTo(cx - starR * 0.31, starY - starR * 0.38)
    .closePath()
    .fill();

  doc
    .font("Times-Bold")
    .fontSize(radius * 0.42)
    .fillColor(NAVY)
    .text("CBS", cx - radius * 0.38, cy - radius * 0.02, {
      width: radius * 0.76,
      align: "center",
      characterSpacing: 1.5,
    });

  doc
    .font("Helvetica")
    .fontSize(radius * 0.11)
    .fillColor(`${NAVY}B3`)
    .text("AUTHORIZED", cx - radius * 0.55, cy + radius * 0.28, {
      width: radius * 1.1,
      align: "center",
      characterSpacing: 1.2,
    });

  doc.restore();
};

export const generateCertificatePdf = ({
  userName,
  courseTitle,
  certTitle,
  issuedDate,
  certId,
}) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [842, 595], margin: 0 });
      const chunks = [];

      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const title = sanitizeCertTitle(certTitle || courseTitle || "Course Completion");
      const certificateNo = String(certId || "CBS-LMS").toUpperCase();
      const issued = issuedDate || "";
      const recipient = userName || "";

      const pageW = 842;
      const pageH = 595;
      const pad = 48;
      const innerPad = 28;

      doc.rect(0, 0, pageW, pageH).fill("#ffffff");

      doc
        .lineWidth(0.75)
        .strokeColor(SLATE_200)
        .roundedRect(pad, pad, pageW - pad * 2, pageH - pad * 2, 8)
        .stroke();

      doc
        .lineWidth(0.5)
        .strokeColor(SLATE_100)
        .roundedRect(pad + innerPad, pad + innerPad, pageW - (pad + innerPad) * 2, pageH - (pad + innerPad) * 2, 4)
        .stroke();

      const contentX = pad + innerPad + 24;
      const contentW = pageW - (pad + innerPad + 24) * 2;

      doc.roundedRect(contentX + contentW - 148, pad + innerPad + 18, 132, 26, 13).fill(SLATE_50);
      doc
        .lineWidth(0.5)
        .strokeColor(SLATE_100)
        .roundedRect(contentX + contentW - 148, pad + innerPad + 18, 132, 26, 13)
        .stroke();

      if (fs.existsSync(iconPath)) {
        try {
          doc.image(iconPath, contentX, pad + innerPad + 18, {
            width: 24,
            height: 24
          });
        } catch (err) {
          doc.roundedRect(contentX, pad + innerPad + 18, 24, 24, 4).fill(NAVY);
          doc
            .font("Times-Bold")
            .fontSize(12)
            .fillColor("#ffffff")
            .text("C", contentX + 7, pad + innerPad + 22);
        }
      } else {
        doc.roundedRect(contentX, pad + innerPad + 18, 24, 24, 4).fill(NAVY);
        doc
          .font("Times-Bold")
          .fontSize(12)
          .fillColor("#ffffff")
          .text("C", contentX + 7, pad + innerPad + 22);
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(NAVY)
        .text("CBS Staff LMS", contentX + 32, pad + innerPad + 24);

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor(SLATE_500)
        .text("COURSE CERTIFICATE", contentX + contentW - 148, pad + innerPad + 28, {
          width: 132,
          align: "center",
          characterSpacing: 2,
        });

      const mainTop = pad + innerPad + 100;
      const mainCenterX = pageW / 2;

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(SLATE_400)
        .text(issued.toUpperCase(), contentX, mainTop, { width: contentW, align: "center", characterSpacing: 1.5 });

      doc
        .font("Times-Bold")
        .fontSize(34)
        .fillColor(SLATE_900)
        .text(recipient, contentX, mainTop + 28, { width: contentW, align: "center", lineGap: 4 });

      doc
        .font("Times-Italic")
        .fontSize(16)
        .fillColor(SLATE_500)
        .text("has successfully completed", contentX, mainTop + 108, { width: contentW, align: "center" });

      doc
        .font("Times-Bold")
        .fontSize(24)
        .fillColor(NAVY)
        .text(title, contentX, mainTop + 140, { width: contentW, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(SLATE_500)
        .text(
          "an online course authorized by CBS and offered through the CBS Staff LMS",
          contentX + contentW * 0.12,
          mainTop + 182,
          { width: contentW * 0.76, align: "center", lineGap: 3 },
        );

      const footerY = pageH - pad - innerPad - 130;
      doc
        .lineWidth(0.5)
        .strokeColor(SLATE_100)
        .moveTo(contentX, footerY + 72)
        .lineTo(contentX + contentW, footerY + 72)
        .stroke();

      drawSignature(doc, contentX, footerY, 140);
      doc
        .lineWidth(0.75)
        .strokeColor(SLATE_300)
        .moveTo(contentX, footerY + 44)
        .lineTo(contentX + 150, footerY + 44)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(SLATE_900)
        .text("Ahmed Mohamed Roble", contentX, footerY + 50);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(SLATE_500)
        .text("Head of Training and Development", contentX, footerY + 62);

      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, contentX + contentW - 190, footerY - 10, {
            fit: [190, 60],
            align: "right",
            valign: "bottom"
          });
        } catch (err) {
          drawSeal(doc, contentX + contentW - 58, footerY + 18, 48);
        }
      } else {
        drawSeal(doc, contentX + contentW - 58, footerY + 18, 48);
      }

      doc
        .font("Courier")
        .fontSize(8)
        .fillColor(SLATE_400)
        .text(`Certificate ID: ${certificateNo}`, contentX, footerY + 92, {
          width: contentW,
          align: "center",
        });

      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(SLATE_400)
        .text(
          "CBS Staff LMS has confirmed the identity of this individual and their participation in the course.",
          contentX + contentW * 0.1,
          footerY + 106,
          { width: contentW * 0.8, align: "center", lineGap: 2 },
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
