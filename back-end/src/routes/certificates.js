import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { generateCertificatePdf } from "../services/pdf/certificatePdf.js";
import { generateCertificatePdfPuppeteer } from "../services/pdf/certificatePuppeteer.js";

export const certificatesRouter = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certificateLogoPath = path.resolve(__dirname, "../../../front-end/public/cbs-logo-icon.png");
const certificatePdfLogoPath = path.resolve(__dirname, "../../../front-end/public/cbs-logo-icon-pdf.png");
const certificateFullLogoPath = path.resolve(__dirname, "../../../front-end/public/logo.png");
const certificateUploadDir = path.resolve(__dirname, "../../uploads/certificates");

const addLogoIfReadable = (doc, x, y, options) => {
  const logoCandidates = [certificatePdfLogoPath, certificateLogoPath, certificateFullLogoPath];
  for (const logoPath of logoCandidates) {
    if (!fs.existsSync(logoPath)) continue;
    try {
      doc.image(logoPath, x, y, options);
      return true;
    } catch (err) {
      // Try the next logo candidate if this file is unreadable by pdfkit.
    }
  }
  return false;
};

const formatDate = (d) => {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const certFilename = (cert) => `certificate-${String(cert.id).replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`;

const sendPdfBuffer = (res, cert, pdf) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${certFilename(cert)}"`);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  return res.send(pdf);
};

const saveCertificatePdf = async (cert, pdf) => {
  fs.mkdirSync(certificateUploadDir, { recursive: true });
  const filename = certFilename(cert);
  const absolutePath = path.join(certificateUploadDir, filename);
  const publicPath = `/uploads/certificates/${filename}`;

  fs.writeFileSync(absolutePath, pdf);
  await pool.query(
    "UPDATE certifications SET pdf_path = ?, pdf_generated_at = NOW() WHERE id = ?",
    [publicPath, cert.id],
  );

  return publicPath;
};

const generateFallbackPdf = ({ userName, courseTitle, issuedDate, issuer, certId }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (addLogoIfReadable(doc, 391, 45, { width: 60, height: 60 })) {
        doc.moveDown(3);
      }
      doc.font("Helvetica-Bold").fontSize(28).text("CERTIFICATE OF COMPLETION", { align: "center" });
      doc.moveDown(1.5);
      doc.font("Helvetica").fontSize(14).text("This is to certify that", { align: "center" });
      doc.moveDown(1);
      doc.font("Helvetica-Bold").fontSize(24).text(userName || "", { align: "center" });
      doc.moveDown(1);
      doc.font("Helvetica").fontSize(14).text("has successfully completed", { align: "center" });
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(18).text(courseTitle || "", { align: "center" });
      doc.moveDown(1.5);
      doc.font("Helvetica").fontSize(12).text(`Date: ${issuedDate || ""}`, { align: "center" });
      doc.font("Helvetica").fontSize(12).text(`Issued by: ${issuer || "CBS Staff LMS"}`, { align: "center" });
      doc.moveDown(1);
      doc.font("Helvetica").fontSize(10).text(`Certificate ID: ${String(certId || "").slice(0, 8).toUpperCase()}`, {
        align: "center",
      });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });

const sendCertificatePdf = async (res, cert) => {
  if (cert.pdf_path) {
    const storedPath = path.resolve(__dirname, "../..", `.${cert.pdf_path}`);
    if (storedPath.startsWith(path.resolve(__dirname, "../../uploads")) && fs.existsSync(storedPath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${certFilename(cert)}"`);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.sendFile(storedPath);
    }
  }

  let pdf;
  const payload = {
    userName: cert.full_name || "",
    courseTitle: cert.course_title || "Course Completion",
    certTitle: cert.course_title || "Course Completion",
    issuedDate: formatDate(cert.issued_at),
    issuer: "CBS Staff LMS",
    employeeId: cert.employee_id || "",
    certId: cert.certificate_no || cert.id,
  };

  try {
    // Try using Puppeteer first (renders the exact React design)
    pdf = await generateCertificatePdfPuppeteer(payload);
  } catch (puppeteerErr) {
    // eslint-disable-next-line no-console
    console.warn("[certificates/generate] Puppeteer failed, trying PDFKit:", puppeteerErr);
    try {
      pdf = await generateCertificatePdf(payload);
    } catch (styleErr) {
      // eslint-disable-next-line no-console
      console.error("[certificates/generate] PDFKit failed, using fallback:", styleErr);
      pdf = await generateFallbackPdf(payload);
    }
  }

  await saveCertificatePdf(cert, pdf);
  return sendPdfBuffer(res, cert, pdf);
};

certificatesRouter.post("/course/:courseId/generate", requireAuth(), async (req, res) => {
  const courseId = Number(req.params.courseId);
  const userId = req.user.userId;
  if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course id" });

  try {
    const [passedRows] = await pool.query(
      `
        SELECT ar.id
        FROM assessment_results ar
        INNER JOIN assessments a ON a.id = ar.assessment_id
        WHERE ar.user_id = ?
          AND a.course_id = ?
          AND ar.passed = 1
        LIMIT 1
      `,
      [userId, courseId],
    );

    if (!passedRows.length) {
      return res.status(403).json({ error: "Assessment has not been passed for this course" });
    }

    const validityMonths = Math.max(1, Number(process.env.CERT_VALIDITY_MONTHS || 12));
    const certificateNo = `CBS-${userId}-${courseId}-${Date.now()}`;
    await pool.query(
      `
        INSERT INTO certifications (user_id, course_id, issued_at, expires_at, certificate_no)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MONTH), ?)
        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
      `,
      [userId, courseId, validityMonths, certificateNo],
    );

    const [rows] = await pool.query(
      `
        SELECT
          c.id,
          c.user_id,
          c.course_id,
          c.certificate_no,
          c.issued_at,
          c.expires_at,
          c.pdf_path,
          c.pdf_generated_at,
          co.title AS course_title,
          p.full_name,
          p.employee_id
        FROM certifications c
        LEFT JOIN courses co ON co.id = c.course_id
        LEFT JOIN profiles p ON p.user_id = c.user_id
        WHERE c.user_id = ? AND c.course_id = ?
        LIMIT 1
      `,
      [userId, courseId],
    );

    if (!rows.length) return res.status(500).json({ error: "Certificate could not be created" });
    return sendCertificatePdf(res, rows[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[certificates/course/generate] error:", err);
    return res.status(500).json({ error: "Failed to generate certificate" });
  }
});

/**
 * @swagger
 * /api/certificates/{certificationId}/generate:
 *   post:
 *     summary: Generate certificate PDF for the current user
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificationId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: PDF bytes
 */
certificatesRouter.post("/:certificationId/generate", requireAuth(), async (req, res) => {
  const certificationId = Number(req.params.certificationId);
  const userId = req.user.userId;

  try {
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.user_id,
        c.course_id,
        c.certificate_no,
        c.issued_at,
        c.expires_at,
        c.pdf_path,
        c.pdf_generated_at,
        co.title AS course_title,
        p.full_name,
        p.employee_id
      FROM certifications c
      LEFT JOIN courses co ON co.id = c.course_id
      LEFT JOIN profiles p ON p.user_id = c.user_id
      WHERE c.id = ? AND c.user_id = ?
      LIMIT 1
    `,
      [certificationId, userId]
    );

    if (!rows.length) return res.status(404).json({ error: "Certificate not found" });

    return sendCertificatePdf(res, rows[0]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[certificates/generate] error:", err);
    return res.status(500).json({ error: "Failed to generate certificate" });
  }
});
