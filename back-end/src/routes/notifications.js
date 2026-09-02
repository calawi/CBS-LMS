import express from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = express.Router();

const isTableMissing = (err) => err?.code === "ER_NO_SUCH_TABLE";

notificationsRouter.get("/", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50",
      [userId],
    );
    return res.json({ data: rows });
  } catch (err) {
    if (isTableMissing(err)) return res.json({ data: [] });
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

notificationsRouter.put("/:id/read", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const id = Number(req.params.id);
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [id, userId]);
    return res.json({ ok: true });
  } catch (err) {
    if (isTableMissing(err)) return res.json({ ok: true });
    return res.status(500).json({ error: "Failed to update notification" });
  }
});

notificationsRouter.put("/read-all", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  try {
    await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [userId]);
    return res.json({ ok: true });
  } catch (err) {
    if (isTableMissing(err)) return res.json({ ok: true });
    return res.status(500).json({ error: "Failed to update notifications" });
  }
});

