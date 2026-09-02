import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../src/db/pool.js";
import { generateCertificatePdf } from "../src/services/pdf/certificatePdf.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads/certificates");

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const certFilename = (cert) => `certificate-${String(cert.id).replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`;

const main = async () => {
  fs.mkdirSync(uploadDir, { recursive: true });

  const [rows] = await pool.query(`
    SELECT
      c.id,
      c.user_id,
      c.course_id,
      c.certificate_no,
      c.issued_at,
      co.title AS course_title,
      p.full_name,
      p.employee_id
    FROM certifications c
    LEFT JOIN courses co ON co.id = c.course_id
    LEFT JOIN profiles p ON p.user_id = c.user_id
    ORDER BY c.id ASC
  `);

  for (const cert of rows) {
    const pdf = await generateCertificatePdf({
      userName: cert.full_name || "",
      courseTitle: cert.course_title || "Course Completion",
      certTitle: cert.course_title || "Course Completion",
      issuedDate: formatDate(cert.issued_at),
      issuer: "CBS Staff LMS",
      employeeId: cert.employee_id || "",
      certId: cert.certificate_no || cert.id,
    });

    const filename = certFilename(cert);
    const publicPath = `/uploads/certificates/${filename}`;
    fs.writeFileSync(path.join(uploadDir, filename), pdf);
    await pool.query(
      "UPDATE certifications SET pdf_path = ?, pdf_generated_at = NOW() WHERE id = ?",
      [publicPath, cert.id],
    );

    console.log(`Regenerated ${filename}`);
  }

  console.log(`Done. Regenerated ${rows.length} certificate(s).`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
