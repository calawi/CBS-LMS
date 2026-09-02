import { pool } from "../db/pool.js";

const isTableMissing = (e) => e?.code === "ER_NO_SUCH_TABLE";

export async function writeAudit({ actorUserId, action, entityType, entityId, metadata }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        actorUserId ?? null,
        action,
        entityType ?? null,
        entityId != null ? String(entityId) : null,
        metadata != null ? JSON.stringify(metadata) : null,
      ],
    );
  } catch (e) {
    if (isTableMissing(e)) return;
    throw e;
  }
}
