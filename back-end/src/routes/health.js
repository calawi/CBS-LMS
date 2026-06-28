import express from "express";

export const healthRouter = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: OK
 */
healthRouter.get("/", (req, res) => {
  res.json({ ok: true });
});

