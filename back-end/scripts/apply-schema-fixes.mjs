import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(".env") });

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  multipleStatements: true,
});

const sql = fs.readFileSync(path.resolve("sql/fix_courses_missing_columns.sql"), "utf8");
await conn.query(sql);

const [cols] = await conn.query(
  "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'courses' AND COLUMN_NAME IN ('is_prerequisite_for_overseas', 'thumbnail_url')",
  [process.env.DB_NAME || "lms"],
);
console.log("columns:", cols.map((r) => r.COLUMN_NAME).join(", "));

const [enr] = await conn.query(
  `SELECT e.id, c.title, c.is_prerequisite_for_overseas
   FROM enrollments e
   LEFT JOIN courses c ON c.id = e.course_id
   WHERE e.user_id = 3
   LIMIT 3`,
);
console.log("enrollments sample:", enr);

await conn.end();
