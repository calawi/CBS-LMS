import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../src/db/pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads/certificates");

const main = async () => {
  // 1. Clear files on disk
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    let deletedCount = 0;
    for (const file of files) {
      if (file.endsWith(".pdf")) {
        fs.unlinkSync(path.join(uploadDir, file));
        deletedCount++;
      }
    }
    console.log(`Deleted ${deletedCount} cached PDF certificate file(s) from disk.`);
  } else {
    console.log("Certificate upload directory does not exist.");
  }

  // 2. Clear database fields
  const [result] = await pool.query(
    "UPDATE certifications SET pdf_path = NULL, pdf_generated_at = NULL"
  );
  console.log(`Cleared certificate cache in database for ${result.affectedRows} record(s).`);
};

main()
  .catch((error) => {
    console.error("Error clearing certificate cache:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
