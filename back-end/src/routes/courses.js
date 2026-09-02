import express from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const coursesRouter = express.Router();

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: List courses
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *         required: false
 *     responses:
 *       200:
 *         description: OK
 */
coursesRouter.get("/", requireAuth(), async (req, res) => {
  const roles = req.user?.roles || [];
  const isStaff = roles.some((r) => ["sysadmin", "instructor", "manager", "admin"].includes(String(r).toLowerCase()));
  const status = req.query.status;

  if (isStaff) {
    const sql = status
      ? "SELECT * FROM courses WHERE status = ? ORDER BY updated_at DESC"
      : "SELECT * FROM courses ORDER BY updated_at DESC";
    const params = status ? [status] : [];
    const [rows] = await pool.query(sql, params);
    return res.json({ data: rows });
  }

  const [rows] = await pool.query(
    "SELECT * FROM courses WHERE status = 'Published' ORDER BY updated_at DESC",
  );
  return res.json({ data: rows });
});

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by id
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OK
 */
coursesRouter.get("/:id", requireAuth(), async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await pool.query("SELECT * FROM courses WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) return res.status(404).json({ error: "Course not found" });
  res.json({ data: rows[0] });
});

