import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(".env") });

const sql = fs.readFileSync(path.resolve("sql/clear_demo_data.sql"), "utf8");
const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

await conn.query(sql);

const db = process.env.DB_NAME || "lms";
const counts = {};
for (const table of ["courses", "enrollments", "announcements", "users", "departments"]) {
  const [rows] = await conn.query(`SELECT COUNT(*) AS n FROM \`${db}\`.\`${table}\``);
  counts[table] = rows[0].n;
}

console.log("Demo data cleared. Remaining rows:");
console.log(counts);
console.log("\nLogin accounts kept (password: 123456 unless you changed it):");
console.log("  admin@cbs.gov.so (sysadmin)");
console.log("  instructor@cbs.gov.so (instructor)");
console.log("  employee@cbs.gov.so (learner)");

await conn.end();
