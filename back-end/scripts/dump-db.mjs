import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(".env") });

const dbName = process.env.DB_NAME || "lms";
const outPath = path.resolve("sql", "cbs_lms_recovery_dump.sql");

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: dbName,
});

let out = "";
out += "-- CBS LMS recovery dump\n";
out += `-- Generated: ${new Date().toISOString()}\n`;
out += `CREATE DATABASE IF NOT EXISTS \`${dbName}\`;\n`;
out += `USE \`${dbName}\`;\n\n`;

const [tablesRes] = await conn.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
const tableKey = Object.keys(tablesRes[0] || {}).find((k) => k.toLowerCase().startsWith("tables_in_"));
const tables = tablesRes.map((r) => r[tableKey]);

for (const tableName of tables) {
  const [createRows] = await conn.query(`SHOW CREATE TABLE \`${tableName}\``);
  const createSql = createRows[0]["Create Table"];

  out += "-- ----------------------------\n";
  out += `-- Table: \`${tableName}\`\n`;
  out += "-- ----------------------------\n";
  out += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
  out += `${createSql};\n\n`;

  const [rows] = await conn.query(`SELECT * FROM \`${tableName}\``);
  if (!rows.length) continue;

  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `\`${c}\``).join(", ");
  const valueRows = rows.map((row) => {
    const values = cols.map((c) => conn.escape(row[c])).join(", ");
    return `(${values})`;
  });

  out += `INSERT INTO \`${tableName}\` (${colList}) VALUES\n`;
  out += `${valueRows.join(",\n")};\n\n`;
}

await conn.end();
fs.writeFileSync(outPath, out, "utf8");

console.log(`Dump written: ${outPath}`);
console.log(`Tables dumped: ${tables.length}`);
