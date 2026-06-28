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

const sql = fs.readFileSync(path.resolve("sql/fix_gamification_tables.sql"), "utf8");
await conn.query(sql);

const db = process.env.DB_NAME || "lms";
const [badgeCols] = await conn.query(
  "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_badges'",
  [db],
);
console.log("user_badges:", badgeCols.map((r) => r.COLUMN_NAME).join(", "));

await conn.query("SELECT user_id, badge_name, badge_icon FROM user_badges LIMIT 1");
console.log("leaderboard SQL: OK");

await conn.end();
