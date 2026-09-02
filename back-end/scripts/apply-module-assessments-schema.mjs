import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(".env") });

const main = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "lms",
    multipleStatements: true,
  });

  try {
    const sqlPath = path.resolve("sql/add_module_assessments.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await conn.query(sql);
    console.log("Database schema updated successfully for module-level assessments!");
  } catch (error) {
    console.error("Failed to apply schema migration:", error);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
};

main();
