import express from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const departmentsRouter = express.Router();

/**
 * @swagger
 * /api/departments:
 *   get:
 *     summary: List departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
departmentsRouter.get("/", requireAuth(), async (req, res) => {
  const [rows] = await pool.query("SELECT id, name, created_at FROM departments ORDER BY name ASC");
  return res.json({ data: rows });
});

