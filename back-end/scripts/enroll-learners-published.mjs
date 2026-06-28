import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const [courses] = await conn.query(
  "SELECT id, title FROM courses WHERE status = 'Published' OR status IS NULL",
);
const [learners] = await conn.query(`
  SELECT DISTINCT u.id
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE u.is_active = 1
    AND (
      LOWER(COALESCE(u.role, '')) IN ('learner', 'employee')
      OR LOWER(COALESCE(ur.role, '')) IN ('learner', 'employee')
    )
`);

let added = 0;
for (const course of courses) {
  for (const learner of learners) {
    const [existing] = await conn.query(
      "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? LIMIT 1",
      [learner.id, course.id],
    );
    if (!existing.length) {
      await conn.query(
        "INSERT INTO enrollments (user_id, course_id, progress, status) VALUES (?, ?, 0, 'in_progress')",
        [learner.id, course.id],
      );
      added += 1;
    }
  }
}

console.log(`Published courses: ${courses.length}, learners: ${learners.length}, new enrollments: ${added}`);
await conn.end();
