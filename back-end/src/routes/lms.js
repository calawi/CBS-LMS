import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/auditLog.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

export const lmsRouter = express.Router();

const isTableMissing = (err) =>
  err?.code === "ER_NO_SUCH_TABLE" || err?.code === "ER_BAD_FIELD_ERROR" || err?.code === "ER_NO_SUCH_COLUMN";
const ROLE_WHITELIST = new Set(["sysadmin", "instructor", "manager", "learner"]);
const normalizeOptionalString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const ensureCourseOwnerColumn = async (db = pool) => {
  const [columns] = await db.query("SHOW COLUMNS FROM courses LIKE 'created_by_user_id'");
  if (columns.length) return true;
  await db.query("ALTER TABLE courses ADD COLUMN created_by_user_id INT NULL AFTER thumbnail_url");
  return true;
};

const canEditCourse = (user, course) => {
  const roles = (user?.roles || []).map((role) => String(role).toLowerCase());
  if (roles.includes("sysadmin")) return true;
  if (!roles.includes("instructor")) return false;
  const ownerId = course?.created_by_user_id;
  return ownerId == null || Number(ownerId) === Number(user?.userId);
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_UPLOAD_MIME = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/octet-stream",
]);
const ALLOWED_UPLOAD_EXT = new Set([".gif", ".jpeg", ".jpg", ".mp4", ".pdf", ".png", ".ppt", ".pptx", ".webm", ".webp"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname || "").toLowerCase();
    const base = path.basename(file.originalname || "file", safeExt).replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${Date.now()}-${base}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ALLOWED_UPLOAD_MIME.has(file.mimetype) || ALLOWED_UPLOAD_EXT.has(ext)) return cb(null, true);
    return cb(new Error("Unsupported file type"));
  },
});

const awardPoints = async (userId, points, reason) => {
  try {
    await pool.query(
      `
        INSERT INTO user_points (user_id, points, reason)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          points = points + VALUES(points),
          reason = VALUES(reason)
      `,
      [
      userId,
      Number(points || 0),
      reason || null,
      ],
    );
  } catch (err) {
    if (!isTableMissing(err)) throw err;
  }
};

const upsertBadge = async (userId, badgeName, badgeIcon) => {
  try {
    await pool.query(
      `
        INSERT INTO user_badges (user_id, badge_name, badge_icon)
        SELECT ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1 FROM user_badges WHERE user_id = ? AND badge_name = ?
        )
      `,
      [userId, badgeName, badgeIcon, userId, badgeName],
    );
  } catch (err) {
    if (!isTableMissing(err)) throw err;
  }
};

const syncGamificationMilestones = async (userId) => {
  const [completedRows] = await pool.query(
    "SELECT COUNT(*) AS count FROM enrollments WHERE user_id = ? AND status = 'completed'",
    [userId],
  );
  const completedCount = Number(completedRows?.[0]?.count || 0);

  if (completedCount >= 1) await upsertBadge(userId, "First Steps", "rocket");
  if (completedCount >= 3) await upsertBadge(userId, "Quick Learner", "zap");
  if (completedCount >= 5) await upsertBadge(userId, "Knowledge Seeker", "book-open");
  if (completedCount >= 10) await upsertBadge(userId, "Master Scholar", "crown");
};

const createNotification = async ({ userId, type, title, message, link }) => {
  try {
    await pool.query(
      "INSERT INTO notifications (user_id, type, title, message, link, is_read) VALUES (?, ?, ?, ?, ?, 0)",
      [userId, type || "info", title || "", message || "", link || null],
    );
  } catch (err) {
    if (!isTableMissing(err)) throw err;
  }
};

const canAssignTrainingToUser = async (actorId, targetUserId, roles) => {
  if (roles?.includes("sysadmin") || roles?.includes("instructor")) return true;
  if (!roles?.includes("manager")) return false;
  const [rows] = await pool.query("SELECT manager_user_id FROM profiles WHERE user_id = ? LIMIT 1", [targetUserId]);
  return Number(rows[0]?.manager_user_id) === Number(actorId);
};

const ensureEnrollmentForUser = async (userId, courseId, db = pool) => {
  const [ex] = await db.query(
    "SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? ORDER BY id DESC LIMIT 1",
    [userId, courseId],
  );
  if (ex.length) return;
  await db.query(
    "INSERT INTO enrollments (user_id, course_id, progress, status) VALUES (?, ?, ?, ?)",
    [userId, courseId, 0, "not_started"],
  );
};

const enrollAllLearnersForCourse = async (courseId, db = pool) => {
  const [learners] = await db.query(
    `
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.is_active = 1
        AND (
          LOWER(COALESCE(u.role, '')) IN ('learner', 'employee')
          OR LOWER(COALESCE(ur.role, '')) IN ('learner', 'employee')
        )
    `,
  );
  for (const row of learners) {
    await ensureEnrollmentForUser(row.id, courseId, db);
  }
};

lmsRouter.get("/course-modules/:courseId", requireAuth(), async (req, res) => {
  const courseId = Number(req.params.courseId);
  try {
    const [modules] = await pool.query(
      "SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index ASC, id ASC",
      [courseId],
    );

    const [assessments] = await pool.query(
      "SELECT * FROM assessments WHERE course_id = ? AND module_id IS NOT NULL",
      [courseId],
    );

    const assessmentIds = assessments.map((a) => a.id);
    let questions = [];
    if (assessmentIds.length > 0) {
      const [questionRows] = await pool.query(
        "SELECT * FROM assessment_questions WHERE assessment_id IN (?) ORDER BY order_index ASC, id ASC",
        [assessmentIds],
      );
      questions = questionRows;
    }

    const assessmentsMap = new Map();
    for (const a of assessments) {
      a.questions = questions.filter((q) => q.assessment_id === a.id);
      assessmentsMap.set(a.module_id, a);
    }

    const data = modules.map((m) => {
      const assessment = assessmentsMap.get(m.id) || null;
      return {
        ...m,
        assessment,
      };
    });

    return res.json({ data });
  } catch (err) {
    console.error("[course-modules/get]", err);
    return res.status(500).json({ error: "Failed to fetch course modules" });
  }
});

lmsRouter.post("/uploads", requireAuth(["sysadmin", "instructor"]), (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const isTooLarge = err?.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        error: isTooLarge ? "File too large. Max allowed is 200MB." : err.message || "Upload failed",
      });
    }
    if (!req.file) return res.status(400).json({ error: "file is required" });

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    return res.status(201).json({
      data: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
      },
    });
  });
});

lmsRouter.put("/course-modules/:id", requireAuth(["sysadmin", "instructor"]), async (req, res) => {
  const moduleId = Number(req.params.id);
  const { title, content, duration_minutes, order_index, video_url, resource_url, resource_name } = req.body || {};
  const [rows] = await pool.query("SELECT * FROM course_modules WHERE id = ? LIMIT 1", [moduleId]);
  if (!rows.length) return res.status(404).json({ error: "Module not found" });
  const current = rows[0];

  await pool.query(
    `
      UPDATE course_modules
      SET title = ?, content = ?, duration_minutes = ?, order_index = ?, video_url = ?, resource_url = ?, resource_name = ?
      WHERE id = ?
    `,
    [
      title ?? current.title,
      content ?? current.content,
      Number(duration_minutes ?? current.duration_minutes ?? 0),
      Number(order_index ?? current.order_index ?? 0),
      video_url ?? current.video_url ?? null,
      resource_url ?? current.resource_url ?? null,
      resource_name ?? current.resource_name ?? null,
      moduleId,
    ],
  );
  const [updated] = await pool.query("SELECT * FROM course_modules WHERE id = ? LIMIT 1", [moduleId]);
  return res.json({ data: updated[0] });
});

lmsRouter.post("/courses", requireAuth(["sysadmin", "instructor"]), async (req, res) => {
  await ensureCourseOwnerColumn();
  const {
    title,
    description,
    category,
    level,
    duration_hours,
    modules_count,
    is_mandatory,
    is_prerequisite_for_overseas,
    status,
    thumbnail_url,
  } = req.body || {};

  if (!title) return res.status(400).json({ error: "title is required" });

  const [result] = await pool.query(
    `
      INSERT INTO courses
      (title, description, category, level, duration_hours, modules_count, is_mandatory, is_prerequisite_for_overseas, status, thumbnail_url, created_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      description || null,
      category || null,
      level || null,
      Number(duration_hours || 0),
      Number(modules_count || 0),
      Boolean(is_mandatory),
      Boolean(is_prerequisite_for_overseas),
      status || "Published",
      normalizeOptionalString(thumbnail_url),
      req.user.userId,
    ],
  );

  const [rows] = await pool.query("SELECT * FROM courses WHERE id = ? LIMIT 1", [result.insertId]);
  return res.status(201).json({ data: rows[0] });
});

const saveModuleAssessment = async (conn, courseId, moduleId, assessment) => {
  if (!assessment?.title) return;
  const [assessmentInsert] = await conn.query(
    `
      INSERT INTO assessments (course_id, module_id, title, description, passing_score, time_limit_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      courseId,
      moduleId,
      assessment.title,
      assessment.description || null,
      Number(assessment.passing_score || 70),
      Number(assessment.time_limit_minutes || 30),
    ],
  );
  const assessmentId = assessmentInsert.insertId;

  if (Array.isArray(assessment.questions) && assessment.questions.length > 0) {
    for (let j = 0; j < assessment.questions.length; j += 1) {
      const q = assessment.questions[j];
      await conn.query(
        `
          INSERT INTO assessment_questions (assessment_id, question, options, correct_answer, order_index, points)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          assessmentId,
          q.question,
          JSON.stringify(q.options || []),
          q.correct_answer,
          j,
          Math.max(1, Number(q.points ?? 5)),
        ],
      );
    }
  }
};

lmsRouter.post("/courses/full", requireAuth(["sysadmin", "instructor"]), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await ensureCourseOwnerColumn(conn);
    await conn.beginTransaction();
    const {
      title,
      description,
      category,
      level,
      duration_hours,
      modules_count,
      is_mandatory,
      is_prerequisite_for_overseas,
      status,
      thumbnail_url,
      modules,
      assessment,
      questions,
    } = req.body || {};

    if (!title) return res.status(400).json({ error: "title is required" });

    const [courseInsert] = await conn.query(
      `
        INSERT INTO courses
        (title, description, category, level, duration_hours, modules_count, is_mandatory, is_prerequisite_for_overseas, status, thumbnail_url, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description || null,
        category || null,
        level || null,
        Number(duration_hours || 0),
        Number(modules_count || modules?.length || 0),
        Boolean(is_mandatory),
        Boolean(is_prerequisite_for_overseas),
        status || "Published",
        normalizeOptionalString(thumbnail_url),
        req.user.userId,
      ],
    );
    const courseId = courseInsert.insertId;

    if (Array.isArray(modules) && modules.length > 0) {
      for (let i = 0; i < modules.length; i += 1) {
        const m = modules[i];
        const [moduleInsert] = await conn.query(
          `
            INSERT INTO course_modules
            (course_id, title, content, video_url, resource_url, resource_name, duration_minutes, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            courseId,
            m.title,
            m.content || null,
            m.video_url || null,
            m.resource_url || null,
            m.resource_name || null,
            Number(m.duration_minutes || 0),
            i,
          ],
        );
        const moduleId = moduleInsert.insertId;
        if (m.assessment) {
          await saveModuleAssessment(conn, courseId, moduleId, m.assessment);
        }
      }
    }

    if (assessment?.title) {
      const [assessmentInsert] = await conn.query(
        `
          INSERT INTO assessments (course_id, title, description, passing_score, time_limit_minutes)
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          courseId,
          assessment.title,
          assessment.description || null,
          Number(assessment.passing_score || 70),
          Number(assessment.time_limit_minutes || 30),
        ],
      );
      const assessmentId = assessmentInsert.insertId;

      if (Array.isArray(questions) && questions.length > 0) {
        for (let i = 0; i < questions.length; i += 1) {
          const q = questions[i];
          await conn.query(
            `
              INSERT INTO assessment_questions (assessment_id, question, options, correct_answer, order_index, points)
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [assessmentId, q.question, JSON.stringify(q.options || []), q.correct_answer, i, Math.max(1, Number(q.points ?? 5))],
          );
        }
      }
    }

    await conn.commit();
    const [rows] = await pool.query("SELECT * FROM courses WHERE id = ? LIMIT 1", [courseId]);
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    await conn.rollback();
    console.error("[courses/full]", err);
    return res.status(500).json({
      error: "Failed to create course",
      detail: err?.sqlMessage || err?.message,
    });
  } finally {
    conn.release();
  }
});

lmsRouter.put("/courses/full/:id", requireAuth(["sysadmin", "instructor"]), async (req, res) => {
  const courseId = Number(req.params.id);
  if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course id" });

  const conn = await pool.getConnection();
  try {
    await ensureCourseOwnerColumn(conn);
    await conn.beginTransaction();
    const {
      title,
      description,
      category,
      level,
      duration_hours,
      modules_count,
      is_mandatory,
      is_prerequisite_for_overseas,
      status,
      thumbnail_url,
      modules,
      assessment,
      questions,
    } = req.body || {};

    if (!title) {
      await conn.rollback();
      return res.status(400).json({ error: "title is required" });
    }

    const [existing] = await conn.query("SELECT * FROM courses WHERE id = ? LIMIT 1", [courseId]);
    if (!existing.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Course not found" });
    }
    if (!canEditCourse(req.user, existing[0])) {
      await conn.rollback();
      return res.status(403).json({ error: "You can only edit courses you created" });
    }

    await conn.query(
      `
        UPDATE courses
        SET title = ?,
            description = ?,
            category = ?,
            level = ?,
            duration_hours = ?,
            modules_count = ?,
            is_mandatory = ?,
            is_prerequisite_for_overseas = ?,
            status = ?,
            thumbnail_url = ?,
            created_by_user_id = COALESCE(created_by_user_id, ?)
        WHERE id = ?
      `,
      [
        title,
        description || null,
        category || null,
        level || null,
        Number(duration_hours || 0),
        Number(modules_count || modules?.length || 0),
        Boolean(is_mandatory),
        Boolean(is_prerequisite_for_overseas),
        status || existing[0].status || "Published",
        normalizeOptionalString(thumbnail_url) ?? existing[0].thumbnail_url ?? null,
        req.user.userId,
        courseId,
      ],
    );

    await conn.query("DELETE FROM course_modules WHERE course_id = ?", [courseId]);
    if (Array.isArray(modules) && modules.length > 0) {
      for (let i = 0; i < modules.length; i += 1) {
        const m = modules[i];
        const [moduleInsert] = await conn.query(
          `
            INSERT INTO course_modules
            (course_id, title, content, video_url, resource_url, resource_name, duration_minutes, order_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            courseId,
            m.title,
            m.content || null,
            m.video_url || null,
            m.resource_url || null,
            m.resource_name || null,
            Number(m.duration_minutes || 0),
            i,
          ],
        );
        const moduleId = moduleInsert.insertId;
        if (m.assessment) {
          await saveModuleAssessment(conn, courseId, moduleId, m.assessment);
        }
      }
    }

    const [assessmentRows] = await conn.query(
      "SELECT * FROM assessments WHERE course_id = ? AND module_id IS NULL ORDER BY id ASC LIMIT 1",
      [courseId],
    );

    if (assessment?.title) {
      let assessmentId = assessmentRows[0]?.id;
      if (assessmentId) {
        await conn.query(
          `
            UPDATE assessments
            SET title = ?, description = ?, passing_score = ?, time_limit_minutes = ?
            WHERE id = ?
          `,
          [
            assessment.title,
            assessment.description || null,
            Number(assessment.passing_score || 70),
            Number(assessment.time_limit_minutes || 30),
            assessmentId,
          ],
        );
      } else {
        const [assessmentInsert] = await conn.query(
          `
            INSERT INTO assessments (course_id, title, description, passing_score, time_limit_minutes)
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            courseId,
            assessment.title,
            assessment.description || null,
            Number(assessment.passing_score || 70),
            Number(assessment.time_limit_minutes || 30),
          ],
        );
        assessmentId = assessmentInsert.insertId;
      }

      await conn.query("DELETE FROM assessment_questions WHERE assessment_id = ?", [assessmentId]);
      if (Array.isArray(questions) && questions.length > 0) {
        for (let i = 0; i < questions.length; i += 1) {
          const q = questions[i];
          await conn.query(
            `
              INSERT INTO assessment_questions (assessment_id, question, options, correct_answer, order_index, points)
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            [assessmentId, q.question, JSON.stringify(q.options || []), q.correct_answer, i, Math.max(1, Number(q.points ?? 5))],
          );
        }
      }
    } else if (assessmentRows[0]?.id) {
      const assessmentId = assessmentRows[0].id;
      const [resultRows] = await conn.query("SELECT COUNT(*) AS count FROM assessment_results WHERE assessment_id = ?", [
        assessmentId,
      ]);
      if (Number(resultRows[0]?.count || 0) === 0) {
        await conn.query("DELETE FROM assessments WHERE id = ?", [assessmentId]);
      }
    }

    await conn.commit();
    const [rows] = await pool.query("SELECT * FROM courses WHERE id = ? LIMIT 1", [courseId]);
    return res.json({ data: rows[0] });
  } catch (err) {
    await conn.rollback();
    console.error("[courses/full/:id]", err);
    return res.status(500).json({
      error: "Failed to update course",
      detail: err?.sqlMessage || err?.message,
    });
  } finally {
    conn.release();
  }
});

lmsRouter.get("/enrollments/me", requireAuth(), async (req, res) => {
  const userId = req.user.userId;

  // Keep status aligned: courses with a final assessment stay in progress until it is passed.
  await pool.query(
    `
      UPDATE enrollments e
      INNER JOIN assessments a ON a.course_id = e.course_id AND a.module_id IS NULL
      LEFT JOIN assessment_results ar
        ON ar.assessment_id = a.id
       AND ar.user_id = e.user_id
       AND ar.passed = 1
      SET e.status = 'in_progress',
          e.completed_at = NULL
      WHERE e.user_id = ?
        AND e.status = 'completed'
        AND ar.id IS NULL
    `,
    [userId],
  );

  const [rows] = await pool.query(
    `
      SELECT
        e.*,
        (
          SELECT MAX(ar.score)
          FROM assessment_results ar
          INNER JOIN assessments a ON a.id = ar.assessment_id
          WHERE ar.user_id = e.user_id
            AND a.course_id = e.course_id
            AND a.module_id IS NULL
        ) AS score,
        c.id AS c_id,
        c.title AS c_title,
        c.description AS c_description,
        c.category AS c_category,
        c.level AS c_level,
        c.duration_hours AS c_duration_hours,
        c.modules_count AS c_modules_count,
        c.is_mandatory AS c_is_mandatory,
        c.is_prerequisite_for_overseas AS c_is_prerequisite_for_overseas
      FROM enrollments e
      LEFT JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ?
        AND COALESCE(e.status, '') <> 'not_started'
      ORDER BY e.id DESC
    `,
    [userId],
  );

  const data = rows.map((r) => ({
    ...r,
    courses: r.c_id
      ? {
          id: r.c_id,
          title: r.c_title,
          description: r.c_description,
          category: r.c_category,
          level: r.c_level,
          duration_hours: r.c_duration_hours,
          modules_count: r.c_modules_count,
              is_mandatory: Boolean(r.c_is_mandatory),
              is_prerequisite_for_overseas: Boolean(r.c_is_prerequisite_for_overseas),
        }
      : null,
  }));

  return res.json({ data });
});

lmsRouter.get("/enrollments/me/:courseId", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const courseId = Number(req.params.courseId);

  await pool.query(
    `
      UPDATE enrollments e
      INNER JOIN assessments a ON a.course_id = e.course_id AND a.module_id IS NULL
      LEFT JOIN assessment_results ar
        ON ar.assessment_id = a.id
       AND ar.user_id = e.user_id
       AND ar.passed = 1
      SET e.status = 'in_progress',
          e.completed_at = NULL
      WHERE e.user_id = ?
        AND e.course_id = ?
        AND e.status = 'completed'
        AND ar.id IS NULL
    `,
    [userId, courseId],
  );

  const [rows] = await pool.query(
    `
      SELECT *
      FROM enrollments e
      WHERE e.user_id = ?
        AND e.course_id = ?
        AND COALESCE(e.status, '') <> 'not_started'
      ORDER BY e.id DESC
      LIMIT 1
    `,
    [userId, courseId],
  );
  return res.json({ data: rows[0] || null });
});

lmsRouter.post("/enrollments", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const roles = (req.user.roles || []).map((role) => String(role).toLowerCase());
  const canSelfEnroll = roles.includes("learner") || roles.includes("employee");
  if (!canSelfEnroll) {
    return res.status(403).json({ error: "Only learner accounts can enroll in courses" });
  }
  const courseId = Number(req.body?.course_id);
  if (!courseId) return res.status(400).json({ error: "course_id is required" });

  const [existing] = await pool.query(
    "SELECT * FROM enrollments WHERE user_id = ? AND course_id = ? ORDER BY id DESC LIMIT 1",
    [userId, courseId],
  );
  if (existing.length) {
    const current = existing[0];
    const isZeroProgress = Number(current.progress || 0) === 0;
    const isOldAutoStatus = ["in_progress", "not_started", "pending"].includes(String(current.status || "in_progress"));
    if (isZeroProgress && isOldAutoStatus) {
      await pool.query("UPDATE enrollments SET status = ? WHERE id = ?", ["enrolled", current.id]);
      const [rows] = await pool.query("SELECT * FROM enrollments WHERE id = ? LIMIT 1", [current.id]);
      await awardPoints(userId, 25, "Enrolled in course");
      return res.json({ data: rows[0] });
    }
    return res.json({ data: current });
  }

  const [result] = await pool.query(
    "INSERT INTO enrollments (user_id, course_id, progress, status) VALUES (?, ?, ?, ?)",
    [userId, courseId, 0, "enrolled"],
  );
  await awardPoints(userId, 25, "Enrolled in course");
  const [rows] = await pool.query("SELECT * FROM enrollments WHERE id = ? LIMIT 1", [result.insertId]);
  return res.status(201).json({ data: rows[0] });
});

lmsRouter.put("/enrollments/:id/progress", requireAuth(), async (req, res) => {
  const enrollmentId = Number(req.params.id);
  const userId = req.user.userId;
  const progress = Number(req.body?.progress ?? 0);

  if (!Number.isFinite(enrollmentId)) {
    return res.status(400).json({ error: "Invalid enrollment id" });
  }

  const [enrollmentRows] = await pool.query(
    "SELECT * FROM enrollments WHERE id = ? AND user_id = ? LIMIT 1",
    [enrollmentId, userId],
  );
  if (!enrollmentRows.length) {
    return res.status(404).json({ error: "Enrollment not found" });
  }

  const courseId = Number(enrollmentRows[0].course_id);
  const [assessmentRows] = await pool.query(
    "SELECT id FROM assessments WHERE course_id = ? AND module_id IS NULL LIMIT 1",
    [courseId],
  );
  const hasAssessment = assessmentRows.length > 0;

  let nextStatus = req.body?.status;
  let completedAt;

  if (progress >= 100) {
    if (hasAssessment) {
      nextStatus = "in_progress";
      completedAt = null;
    } else {
      nextStatus = nextStatus || "completed";
      completedAt = new Date();
    }
  } else if (progress > 0) {
    nextStatus = nextStatus || "in_progress";
  }

  const setClauses = ["progress = ?"];
  const params = [progress];

  if (nextStatus) {
    setClauses.push("status = ?");
    params.push(nextStatus);
  }
  if (completedAt !== undefined) {
    setClauses.push("completed_at = ?");
    params.push(completedAt);
  }

  params.push(enrollmentId, userId);

  await pool.query(
    `
      UPDATE enrollments
      SET ${setClauses.join(", ")}
      WHERE id = ? AND user_id = ?
    `,
    params,
  );

  if (progress >= 100 && !hasAssessment) {
    try {
      await awardPoints(userId, 100, "Completed course");
      await syncGamificationMilestones(userId);
    } catch (err) {
      console.error("[enrollments/progress] gamification sync failed", err);
    }
  }

  const [rows] = await pool.query("SELECT * FROM enrollments WHERE id = ? AND user_id = ? LIMIT 1", [
    enrollmentId,
    userId,
  ]);
  return res.json({ data: rows[0] || null });
});

lmsRouter.get("/assessments/course/:courseId", requireAuth(), async (req, res) => {
  const courseId = Number(req.params.courseId);
  const [rows] = await pool.query("SELECT * FROM assessments WHERE course_id = ? AND module_id IS NULL ORDER BY id ASC LIMIT 1", [courseId]);
  return res.json({ data: rows[0] || null });
});

lmsRouter.get("/assessments/module/:moduleId", requireAuth(), async (req, res) => {
  const moduleId = Number(req.params.moduleId);
  try {
    const [assessments] = await pool.query(
      "SELECT * FROM assessments WHERE module_id = ? LIMIT 1",
      [moduleId]
    );
    if (!assessments.length) return res.json({ data: null });
    const assessment = assessments[0];
    const [questions] = await pool.query(
      "SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY order_index ASC, id ASC",
      [assessment.id]
    );
    assessment.questions = questions;
    return res.json({ data: assessment });
  } catch (err) {
    console.error("[assessments/module/get]", err);
    return res.status(500).json({ error: "Failed to fetch module assessment" });
  }
});

lmsRouter.get("/assessment-questions/:assessmentId", requireAuth(), async (req, res) => {
  const assessmentId = Number(req.params.assessmentId);
  const [rows] = await pool.query(
    "SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY order_index ASC, id ASC",
    [assessmentId],
  );
  return res.json({ data: rows });
});

lmsRouter.get("/assessment-results/me", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const assessmentId = req.query.assessmentId ? Number(req.query.assessmentId) : null;

  const params = assessmentId ? [userId, assessmentId] : [userId];
  const sql = assessmentId
    ? `
      SELECT ar.*, a.title AS assessment_title, a.course_id, c.title AS course_title
      FROM assessment_results ar
      LEFT JOIN assessments a ON a.id = ar.assessment_id
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE ar.user_id = ? AND ar.assessment_id = ?
      ORDER BY ar.completed_at DESC, ar.id DESC
    `
    : `
      SELECT ar.*, a.title AS assessment_title, a.course_id, c.title AS course_title
      FROM assessment_results ar
      LEFT JOIN assessments a ON a.id = ar.assessment_id
      LEFT JOIN courses c ON c.id = a.course_id
      WHERE ar.user_id = ?
      ORDER BY ar.completed_at DESC, ar.id DESC
    `;

  const [rows] = await pool.query(sql, params);
  const data = rows.map((r) => ({
    ...r,
    assessments: {
      title: r.assessment_title,
      course_id: r.course_id,
      courses: { title: r.course_title },
    },
  }));

  return res.json({ data });
});

lmsRouter.post("/assessment-results", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const { assessment_id, enrollment_id, score, passed, answers } = req.body || {};
  if (!assessment_id) return res.status(400).json({ error: "assessment_id is required" });
  if (!enrollment_id) return res.status(400).json({ error: "enrollment_id is required" });

  try {
    const [assessRows] = await pool.query(
      "SELECT * FROM assessments WHERE id = ? LIMIT 1",
      [Number(assessment_id)]
    );
    if (!assessRows.length) return res.status(404).json({ error: "Assessment not found" });
    const assessment = assessRows[0];

    const [enrollmentRows] = await pool.query("SELECT * FROM enrollments WHERE id = ? AND user_id = ? LIMIT 1", [
      Number(enrollment_id),
      userId,
    ]);
    if (!enrollmentRows.length) return res.status(404).json({ error: "Enrollment not found" });
    
    // Only require 100% progress for the final course assessment (where module_id is NULL)
    if (assessment.module_id === null && Number(enrollmentRows[0].progress || 0) < 100) {
      return res.status(400).json({ error: "Complete all modules before taking the final assessment" });
    }

    const [existingPass] = await pool.query(
      "SELECT id FROM assessment_results WHERE assessment_id = ? AND user_id = ? AND passed = 1 LIMIT 1",
      [Number(assessment_id), userId],
    );
    if (existingPass.length) {
      return res.status(409).json({ error: "You have already passed this assessment" });
    }

    const [result] = await pool.query(
      `
        INSERT INTO assessment_results (assessment_id, user_id, score, passed, answers)
        VALUES (?, ?, ?, ?, ?)
      `,
      [Number(assessment_id), userId, Number(score || 0), !!passed, JSON.stringify(answers || {})],
    );

    // If passed, handle certification and course completion if it's the final course assessment
    if (passed) {
      if (assessment.module_id === null) {
        const validityMonths = Math.max(1, Number(process.env.CERT_VALIDITY_MONTHS || 12));
        const certificateNo = `CBS-${userId}-${assessment.course_id}-${Date.now()}`;
        await pool.query(
          `
            INSERT INTO certifications (user_id, course_id, issued_at, expires_at, certificate_no)
            SELECT ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MONTH), ?
            WHERE NOT EXISTS (
              SELECT 1 FROM certifications WHERE user_id = ? AND course_id = ?
            )
          `,
          [userId, assessment.course_id, validityMonths, certificateNo, userId, assessment.course_id],
        );

        await pool.query(
          `
            UPDATE enrollments
            SET status = 'completed',
                completed_at = COALESCE(completed_at, NOW())
            WHERE id = ? AND user_id = ?
          `,
          [Number(enrollment_id), userId],
        );

        try {
          await awardPoints(userId, 100, "Completed course");
          await syncGamificationMilestones(userId);
        } catch (err) {
          console.error("[assessment-results] course completion gamification failed", err);
        }
      }

      await awardPoints(userId, 50, "Passed assessment");
      if (Number(score || 0) >= 100) {
        await upsertBadge(userId, "Perfect Score", "target");
      }
    } else {
      await awardPoints(userId, 10, "Attempted assessment");
    }

    const [rows] = await pool.query("SELECT * FROM assessment_results WHERE id = ? LIMIT 1", [result.insertId]);
    return res.status(201).json({ data: rows[0] });
  } catch (err) {
    console.error("[assessment-results] error:", err);
    return res.status(500).json({ error: "Failed to save assessment result" });
  }
});

lmsRouter.get("/certifications/me", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const validityMonths = Math.max(1, Number(process.env.CERT_VALIDITY_MONTHS || 12));
  await pool.query(
    `
      INSERT INTO certifications (user_id, course_id, issued_at, expires_at, certificate_no)
      SELECT
        ar.user_id,
        a.course_id,
        NOW(),
        DATE_ADD(NOW(), INTERVAL ? MONTH),
        CONCAT('CBS-', ar.user_id, '-', a.course_id, '-', UNIX_TIMESTAMP())
      FROM assessment_results ar
      INNER JOIN assessments a ON a.id = ar.assessment_id
      LEFT JOIN certifications cert
        ON cert.user_id = ar.user_id
       AND cert.course_id = a.course_id
      WHERE ar.user_id = ?
        AND ar.passed = 1
        AND a.course_id IS NOT NULL
        AND a.module_id IS NULL
        AND cert.id IS NULL
      GROUP BY ar.user_id, a.course_id
    `,
    [validityMonths, userId],
  );

  const [rows] = await pool.query(
    `
      SELECT cert.*, c.title AS course_title
      FROM certifications cert
      LEFT JOIN courses c ON c.id = cert.course_id
      WHERE cert.user_id = ?
      ORDER BY cert.issued_at DESC, cert.id DESC
    `,
    [userId],
  );

  const data = rows.map((r) => ({
    ...r,
    courses: r.course_id
      ? {
          id: r.course_id,
          title: r.course_title,
        }
      : null,
  }));

  return res.json({ data });
});

// -----------------------------
// Training Plans + Approvals
// -----------------------------

lmsRouter.get("/training-plans", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const roles = req.user.roles || [];
  const isPrivileged = roles.includes("sysadmin") || roles.includes("instructor");

  const [rows] = await pool.query(
    `
      SELECT
        tp.*,
        p.id AS p_id,
        p.user_id AS p_user_id,
        p.full_name AS p_full_name,
        p.department_id AS p_department_id,
        d.id AS d_id,
        d.name AS d_name
      FROM training_plans tp
      LEFT JOIN profiles p ON p.user_id = tp.user_id
      LEFT JOIN departments d ON d.id = p.department_id
      WHERE (? = 1 OR tp.user_id = ?)
      ORDER BY tp.created_at DESC, tp.id DESC
    `,
    [isPrivileged ? 1 : 0, userId],
  );

  const data = rows.map((r) => ({
    ...r,
    profiles: r.p_id
      ? {
          id: r.p_id,
          user_id: r.p_user_id,
          full_name: r.p_full_name,
          department_id: r.p_department_id,
          departments: r.d_id ? { id: r.d_id, name: r.d_name } : null,
        }
      : null,
  }));

  return res.json({ data });
});

lmsRouter.post("/training-plans", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const {
    year,
    title,
    learning_outcome,
    justification,
    provider,
    method,
    estimated_cost,
    status,
  } = req.body || {};

  if (!title) return res.status(400).json({ error: "title is required" });

  const [result] = await pool.query(
    `
      INSERT INTO training_plans
      (user_id, year, title, learning_outcome, justification, provider, method, estimated_cost, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      Number(year || new Date().getFullYear()),
      title,
      learning_outcome || null,
      justification || null,
      provider || null,
      method || null,
      Number(estimated_cost || 0),
      status || "draft",
    ],
  );

  const [rows] = await pool.query("SELECT * FROM training_plans WHERE id = ? LIMIT 1", [result.insertId]);
  return res.status(201).json({ data: rows[0] });
});

lmsRouter.put("/training-plans/:id", requireAuth(), async (req, res) => {
  const planId = Number(req.params.id);
  const userId = req.user.userId;
  const roles = req.user.roles || [];
  const isPrivileged = roles.includes("sysadmin") || roles.includes("instructor");

  const [rows] = await pool.query("SELECT * FROM training_plans WHERE id = ? LIMIT 1", [planId]);
  if (!rows.length) return res.status(404).json({ error: "Training plan not found" });
  const existing = rows[0];
  if (!isPrivileged && Number(existing.user_id) !== Number(userId)) return res.status(403).json({ error: "Forbidden" });
  if (existing.status !== "draft" && !isPrivileged) {
    return res.status(400).json({ error: "Only draft plans can be edited" });
  }

  const {
    year,
    title,
    learning_outcome,
    justification,
    provider,
    method,
    estimated_cost,
  } = req.body || {};

  await pool.query(
    `
      UPDATE training_plans
      SET year = ?, title = ?, learning_outcome = ?, justification = ?, provider = ?, method = ?, estimated_cost = ?
      WHERE id = ?
    `,
    [
      Number(year || existing.year || new Date().getFullYear()),
      title ?? existing.title,
      learning_outcome ?? existing.learning_outcome,
      justification ?? existing.justification,
      provider ?? existing.provider,
      method ?? existing.method,
      Number(estimated_cost ?? existing.estimated_cost ?? 0),
      planId,
    ],
  );

  const [updated] = await pool.query("SELECT * FROM training_plans WHERE id = ? LIMIT 1", [planId]);
  return res.json({ data: updated[0] });
});

lmsRouter.delete("/training-plans/:id", requireAuth(), async (req, res) => {
  const planId = Number(req.params.id);
  const userId = req.user.userId;
  const roles = req.user.roles || [];
  const isPrivileged = roles.includes("sysadmin") || roles.includes("instructor");

  const [rows] = await pool.query("SELECT * FROM training_plans WHERE id = ? LIMIT 1", [planId]);
  if (!rows.length) return res.status(404).json({ error: "Training plan not found" });
  const existing = rows[0];
  if (!isPrivileged && Number(existing.user_id) !== Number(userId)) return res.status(403).json({ error: "Forbidden" });
  if (existing.status !== "draft" && !isPrivileged) {
    return res.status(400).json({ error: "Only draft plans can be deleted" });
  }

  await pool.query("DELETE FROM approval_requests WHERE training_plan_id = ?", [planId]);
  await pool.query("DELETE FROM training_plans WHERE id = ?", [planId]);
  return res.json({ ok: true });
});

lmsRouter.get("/approval-requests", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const roles = req.user.roles || [];
  const isPrivileged = roles.includes("sysadmin") || roles.includes("instructor");

  const [rows] = await pool.query(
    `
      SELECT
        ar.*,
        tp.id AS tp_id,
        tp.user_id AS tp_user_id,
        tp.title AS tp_title,
        tp.learning_outcome AS tp_learning_outcome,
        tp.justification AS tp_justification,
        tp.provider AS tp_provider,
        tp.method AS tp_method,
        tp.estimated_cost AS tp_estimated_cost,
        tp.status AS tp_status,
        p.id AS p_id,
        p.user_id AS p_user_id,
        p.full_name AS p_full_name,
        p.department_id AS p_department_id,
        d.id AS d_id,
        d.name AS d_name
      FROM approval_requests ar
      LEFT JOIN training_plans tp ON tp.id = ar.training_plan_id
      LEFT JOIN profiles p ON p.user_id = tp.user_id
      LEFT JOIN departments d ON d.id = p.department_id
      WHERE (? = 1 OR tp.user_id = ? OR ar.requested_by = ?)
      ORDER BY ar.created_at DESC, ar.id DESC
    `,
    [isPrivileged ? 1 : 0, userId, userId],
  );

  const data = rows.map((r) => ({
    ...r,
    training_plans: r.tp_id
      ? {
          id: r.tp_id,
          user_id: r.tp_user_id,
          title: r.tp_title,
          learning_outcome: r.tp_learning_outcome,
          justification: r.tp_justification,
          provider: r.tp_provider,
          method: r.tp_method,
          estimated_cost: r.tp_estimated_cost,
          status: r.tp_status,
          profiles: r.p_id
            ? {
                id: r.p_id,
                user_id: r.p_user_id,
                full_name: r.p_full_name,
                department_id: r.p_department_id,
                departments: r.d_id ? { id: r.d_id, name: r.d_name } : null,
              }
            : null,
        }
      : null,
  }));

  return res.json({ data });
});

lmsRouter.post("/approval-requests/submit", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const trainingPlanId = Number(req.body?.trainingPlanId);
  if (!trainingPlanId) return res.status(400).json({ error: "trainingPlanId is required" });

  const [planRows] = await pool.query("SELECT * FROM training_plans WHERE id = ? LIMIT 1", [trainingPlanId]);
  if (!planRows.length) return res.status(404).json({ error: "Training plan not found" });
  if (Number(planRows[0].user_id) !== Number(userId)) return res.status(403).json({ error: "Forbidden" });

  // Reuse existing pending request if present
  const [existing] = await pool.query(
    "SELECT * FROM approval_requests WHERE training_plan_id = ? AND overall_status = 'pending' LIMIT 1",
    [trainingPlanId],
  );
  if (existing.length) return res.json({ data: existing[0] });

  await pool.query("UPDATE training_plans SET status = 'pending' WHERE id = ?", [trainingPlanId]);

  const [result] = await pool.query(
    `
      INSERT INTO approval_requests
      (training_plan_id, requested_by, current_level, overall_status)
      VALUES (?, ?, 'supervisor', 'pending')
    `,
    [trainingPlanId, userId],
  );

  const [rows] = await pool.query("SELECT * FROM approval_requests WHERE id = ? LIMIT 1", [result.insertId]);

  await createNotification({
    userId,
    type: "pending",
    title: "Training plan submitted",
    message: "Your training plan has been submitted for approval.",
    link: "/training-plans",
  });

  return res.status(201).json({ data: rows[0] });
});

lmsRouter.post("/approval-requests/:id/process", requireAuth(), async (req, res) => {
  const approvalId = Number(req.params.id);
  const userId = req.user.userId;
  const roles = req.user.roles || [];
  const { level, action, comments } = req.body || {};

  const allowedLevels = ["supervisor", "hr", "management", "governor"];
  if (!allowedLevels.includes(level)) return res.status(400).json({ error: "Invalid level" });
  if (!["approved", "rejected"].includes(action)) return res.status(400).json({ error: "Invalid action" });

  // Basic level-role gating
  const levelToRoles = {
    supervisor: ["instructor", "sysadmin"],
    hr: ["instructor", "sysadmin"],
    management: ["sysadmin"],
    governor: ["sysadmin"],
  };
  const roleAllowed = (levelToRoles[level] || []).some((r) => roles.includes(r));
  if (!roleAllowed) return res.status(403).json({ error: "Forbidden" });

  const [rows] = await pool.query("SELECT * FROM approval_requests WHERE id = ? LIMIT 1", [approvalId]);
  if (!rows.length) return res.status(404).json({ error: "Approval request not found" });
  const approval = rows[0];

  if (approval.overall_status !== "pending") {
    return res.status(400).json({ error: "Request already processed" });
  }
  if (approval.current_level !== level) {
    return res.status(400).json({ error: `Current level is ${approval.current_level}` });
  }

  const now = new Date();
  const nextLevels = {
    supervisor: "hr",
    hr: "management",
    management: "governor",
    governor: "governor",
  };

  const update = {
    [`${level}_status`]: action,
    [`${level}_reviewed_by`]: userId,
    [`${level}_reviewed_at`]: now,
  };

  if (action === "rejected") {
    update.overall_status = "rejected";
  } else if (level === "governor") {
    update.overall_status = "approved";
  } else {
    update.current_level = nextLevels[level];
  }
  if (comments !== undefined) update.comments = comments;

  await pool.query("UPDATE approval_requests SET ? WHERE id = ?", [update, approvalId]);

  // Sync training plan status + history
  if (action === "rejected") {
    await pool.query("UPDATE training_plans SET status = 'rejected' WHERE id = ?", [approval.training_plan_id]);

    const [tpRows] = await pool.query("SELECT * FROM training_plans WHERE id = ? LIMIT 1", [approval.training_plan_id]);
    if (tpRows.length) {
      await createNotification({
        userId: tpRows[0].user_id,
        type: "rejected",
        title: "Training request rejected",
        message: "Your training request was rejected. Please review comments and update your plan.",
        link: "/approvals",
      });
    }
  } else if (level === "governor") {
    await pool.query("UPDATE training_plans SET status = 'approved' WHERE id = ?", [approval.training_plan_id]);

    // Create a basic training history row once fully approved if not present
    const [tpRows] = await pool.query("SELECT * FROM training_plans WHERE id = ? LIMIT 1", [approval.training_plan_id]);
    if (tpRows.length) {
      const tp = tpRows[0];
      await pool.query(
        `
          INSERT INTO training_history
          (user_id, training_title, training_type, provider, start_date, end_date, attendance_status, cost, feedback)
          SELECT ?, ?, 'planned', ?, CURDATE(), CURDATE(), 'attended', ?, ?
          WHERE NOT EXISTS (
            SELECT 1 FROM training_history WHERE user_id = ? AND training_title = ?
          )
        `,
        [
          tp.user_id,
          tp.title,
          tp.provider || null,
          Number(tp.estimated_cost || 0),
          tp.justification || null,
          tp.user_id,
          tp.title,
        ],
      );

      await createNotification({
        userId: tp.user_id,
        type: "approved",
        title: "Training request approved",
        message: "Your training request was fully approved.",
        link: "/training-history",
      });
    }
  }

  const [updatedRows] = await pool.query("SELECT * FROM approval_requests WHERE id = ? LIMIT 1", [approvalId]);
  return res.json({ data: updatedRows[0] });
});

// -----------------------------
// Training History
// -----------------------------
lmsRouter.get("/training-history/me", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const [rows] = await pool.query("SELECT * FROM training_history WHERE user_id = ? ORDER BY id DESC", [userId]);
  return res.json({ data: rows });
});

lmsRouter.get("/training-history", requireAuth(["sysadmin", "instructor", "manager"]), async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM training_history ORDER BY id DESC");
  return res.json({ data: rows });
});

// -----------------------------
// Profiles
// -----------------------------
lmsRouter.get("/profiles", requireAuth(), async (req, res) => {
  const [rows] = await pool.query(
    `
      SELECT
        p.*,
        d.id AS d_id,
        d.name AS d_name,
        u.email AS user_email
      FROM profiles p
      LEFT JOIN departments d ON d.id = p.department_id
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.full_name ASC
    `,
  );

  const data = rows.map((r) => {
    const { d_id, d_name, user_email, ...profile } = r;
    return {
      ...profile,
      departments: d_id ? { id: d_id, name: d_name } : null,
      user_email: user_email || null,
    };
  });
  return res.json({ data });
});

lmsRouter.get("/profiles/me", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const [rows] = await pool.query("SELECT * FROM profiles WHERE user_id = ? LIMIT 1", [userId]);
  if (!rows.length) return res.json({ data: null });
  return res.json({ data: rows[0] });
});

lmsRouter.put("/profiles/me", requireAuth(), async (req, res) => {
  const userId = req.user.userId;
  const {
    full_name,
    job_title,
    employee_id,
    department_id,
    location,
    phone,
    date_of_joining,
    manager_user_id,
  } = req.body || {};

  if (!full_name) return res.status(400).json({ error: "full_name is required" });
  const mgrRaw = manager_user_id;
  const mgr =
    mgrRaw === "" || mgrRaw === undefined || mgrRaw === null
      ? null
      : Number(mgrRaw);
  const doj =
    date_of_joining === "" || date_of_joining === undefined || date_of_joining === null
      ? null
      : String(date_of_joining);

  try {
    await pool.query(
      `
      INSERT INTO profiles (
        user_id, full_name, job_title, employee_id, department_id,
        location, phone, date_of_joining, manager_user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        job_title = VALUES(job_title),
        employee_id = VALUES(employee_id),
        department_id = VALUES(department_id),
        location = VALUES(location),
        phone = VALUES(phone),
        date_of_joining = VALUES(date_of_joining),
        manager_user_id = VALUES(manager_user_id)
    `,
      [
        userId,
        full_name,
        job_title || null,
        employee_id || null,
        department_id || null,
        location || null,
        phone || null,
        doj,
        Number.isFinite(mgr) ? mgr : null,
      ],
    );
  } catch (err) {
    if (err?.code === "ER_BAD_FIELD_ERROR") {
      return res.status(503).json({
        error:
          "Profile columns missing. Run back-end/sql/brd_extended_schema.sql (location, phone, date_of_joining, manager_user_id).",
      });
    }
    throw err;
  }

  await writeAudit({ actorUserId: userId, action: "profile_updated", entityType: "profile", entityId: userId });

  const [rows] = await pool.query("SELECT * FROM profiles WHERE user_id = ? LIMIT 1", [userId]);
  return res.json({ data: rows[0] });
});

// -----------------------------
// Training assignments (manager / HR assign with due dates)
// -----------------------------
lmsRouter.get("/training-assignments/me", requireAuth(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query(
      `
        SELECT
          ta.*,
          c.id AS c_id,
          c.title AS c_title,
          c.category AS c_category,
          c.duration_hours AS c_duration_hours
        FROM training_assignments ta
        LEFT JOIN courses c ON c.id = ta.course_id
        WHERE ta.user_id = ?
        ORDER BY ta.due_at ASC, ta.id DESC
      `,
      [userId],
    );
    const data = rows.map((r) => ({
      ...r,
      courses: r.c_id
        ? {
            id: r.c_id,
            title: r.c_title,
            category: r.c_category,
            duration_hours: r.c_duration_hours,
          }
        : null,
    }));
    return res.json({ data });
  } catch (e) {
    if (isTableMissing(e)) return res.json({ data: [] });
    throw e;
  }
});

lmsRouter.post("/training-assignments", requireAuth(["sysadmin", "instructor", "manager"]), async (req, res) => {
  try {
    const actorId = req.user.userId;
    const roles = req.user.roles || [];
    const { user_id, course_id, due_at, is_required } = req.body || {};
    const targetUserId = Number(user_id);
    const courseId = Number(course_id);
    if (!Number.isFinite(targetUserId) || !Number.isFinite(courseId)) {
      return res.status(400).json({ error: "user_id and course_id are required" });
    }

    const allowed = await canAssignTrainingToUser(actorId, targetUserId, roles);
    if (!allowed) return res.status(403).json({ error: "Not allowed to assign training for this user" });

    await ensureEnrollmentForUser(targetUserId, courseId);

    await pool.query(
      `
        INSERT INTO training_assignments (user_id, course_id, assigned_by_user_id, due_at, is_required, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        ON DUPLICATE KEY UPDATE
          assigned_by_user_id = VALUES(assigned_by_user_id),
          due_at = VALUES(due_at),
          is_required = VALUES(is_required),
          updated_at = CURRENT_TIMESTAMP
      `,
      [targetUserId, courseId, actorId, due_at || null, is_required === false ? 0 : 1],
    );

    const [created] = await pool.query(
      "SELECT * FROM training_assignments WHERE user_id = ? AND course_id = ? LIMIT 1",
      [targetUserId, courseId],
    );

    await createNotification({
      userId: targetUserId,
      type: "assignment",
      title: "New training assigned",
      message: "You have a new assigned course to complete.",
      link: `/courses/${courseId}`,
    });

    await writeAudit({
      actorUserId: actorId,
      action: "training_assigned",
      entityType: "training_assignment",
      entityId: String(created[0]?.id || ""),
      metadata: { course_id: courseId, target_user_id: targetUserId },
    });

    return res.status(201).json({ data: created[0] });
  } catch (e) {
    if (isTableMissing(e)) {
      return res.status(503).json({ error: "training_assignments table missing. Run brd_extended_schema.sql." });
    }
    throw e;
  }
});

// -----------------------------
// Announcements
// -----------------------------
lmsRouter.get("/announcements/active", requireAuth(), async (req, res) => {
  try {
    const roles = new Set(req.user.roles || []);
    const audiences = ["all", "learners"];
    if (roles.has("manager") || roles.has("instructor") || roles.has("sysadmin")) {
      audiences.push("managers");
    }
    const placeholders = audiences.map(() => "?").join(",");
    const [rows] = await pool.query(
      `
        SELECT id, title, body, audience, starts_at, ends_at, created_at
        FROM announcements
        WHERE is_active = 1
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at >= NOW())
          AND audience IN (${placeholders})
        ORDER BY id DESC
        LIMIT 50
      `,
      audiences,
    );
    return res.json({ data: rows });
  } catch (e) {
    if (isTableMissing(e)) return res.json({ data: [] });
    throw e;
  }
});

lmsRouter.post("/announcements", requireAuth(["sysadmin"]), async (req, res) => {
  try {
    const actorId = req.user.userId;
    const { title, body, audience, starts_at, ends_at, is_active } = req.body || {};
    if (!title || !body) return res.status(400).json({ error: "title and body are required" });
    const aud = ["all", "learners", "managers"].includes(audience) ? audience : "all";
    const [result] = await pool.query(
      `
        INSERT INTO announcements (title, body, audience, starts_at, ends_at, created_by_user_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(title),
        String(body),
        aud,
        starts_at || null,
        ends_at || null,
        actorId,
        is_active === false ? 0 : 1,
      ],
    );
    const [rows] = await pool.query("SELECT * FROM announcements WHERE id = ? LIMIT 1", [result.insertId]);
    await writeAudit({
      actorUserId: actorId,
      action: "announcement_created",
      entityType: "announcement",
      entityId: String(result.insertId),
    });
    return res.status(201).json({ data: rows[0] });
  } catch (e) {
    if (isTableMissing(e)) {
      return res.status(503).json({ error: "announcements table missing. Run brd_extended_schema.sql." });
    }
    throw e;
  }
});

// -----------------------------
// Course ratings
// -----------------------------
lmsRouter.get("/courses/:courseId/ratings/summary", requireAuth(), async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course id" });
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS n, COALESCE(AVG(rating), 0) AS avg_rating FROM course_ratings WHERE course_id = ?`,
      [courseId],
    );
    return res.json({
      data: { count: Number(rows[0]?.n || 0), avg_rating: Number(rows[0]?.avg_rating || 0) },
    });
  } catch (e) {
    if (isTableMissing(e)) return res.json({ data: { count: 0, avg_rating: 0 } });
    throw e;
  }
});

lmsRouter.get("/courses/:courseId/ratings/me", requireAuth(), async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const userId = req.user.userId;
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course id" });
    const [rows] = await pool.query(
      `SELECT * FROM course_ratings WHERE course_id = ? AND user_id = ? LIMIT 1`,
      [courseId, userId],
    );
    return res.json({ data: rows[0] || null });
  } catch (e) {
    if (isTableMissing(e)) return res.json({ data: null });
    throw e;
  }
});

lmsRouter.post("/courses/:courseId/ratings", requireAuth(), async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const userId = req.user.userId;
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course id" });
    const { rating, comment } = req.body || {};
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: "rating must be between 1 and 5" });
    await pool.query(
      `
        INSERT INTO course_ratings (user_id, course_id, rating, comment)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP
      `,
      [userId, courseId, Math.round(r), comment || null],
    );
    const [rows] = await pool.query(
      `SELECT * FROM course_ratings WHERE user_id = ? AND course_id = ? LIMIT 1`,
      [userId, courseId],
    );
    return res.json({ data: rows[0] });
  } catch (e) {
    if (isTableMissing(e)) {
      return res.status(503).json({ error: "course_ratings table missing. Run brd_extended_schema.sql." });
    }
    throw e;
  }
});

// -----------------------------
// Team (direct reports + enrollments for managers)
// -----------------------------
lmsRouter.get("/profiles/my-team", requireAuth(["manager", "sysadmin", "instructor"]), async (req, res) => {
  const actorId = req.user.userId;
  const roles = req.user.roles || [];
  const broad = roles.includes("sysadmin") || roles.includes("instructor");

  const mapRow = (r) => {
    const { d_id, d_name, user_email, ...profile } = r;
    return {
      ...profile,
      departments: d_id ? { id: d_id, name: d_name } : null,
      user_email: user_email || null,
    };
  };

  try {
    if (broad) {
      const [rows] = await pool.query(
        `
          SELECT p.*, d.id AS d_id, d.name AS d_name, u.email AS user_email
          FROM profiles p
          LEFT JOIN departments d ON d.id = p.department_id
          LEFT JOIN users u ON u.id = p.user_id
          WHERE p.user_id <> ?
          ORDER BY p.full_name ASC
        `,
        [actorId],
      );
      return res.json({ data: rows.map(mapRow) });
    }
    const [rows] = await pool.query(
      `
        SELECT p.*, d.id AS d_id, d.name AS d_name, u.email AS user_email
        FROM profiles p
        LEFT JOIN departments d ON d.id = p.department_id
        LEFT JOIN users u ON u.id = p.user_id
        WHERE p.manager_user_id = ?
        ORDER BY p.full_name ASC
      `,
      [actorId],
    );
    return res.json({ data: rows.map(mapRow) });
  } catch (e) {
    console.error("[profiles/my-team]", e);
    return res.status(500).json({ error: "Failed to load team" });
  }
});

lmsRouter.get("/enrollments/team", requireAuth(["manager", "sysadmin", "instructor"]), async (req, res) => {
  const actorId = req.user.userId;
  const roles = req.user.roles || [];
  const broad = roles.includes("sysadmin") || roles.includes("instructor");

  try {
    const where = broad ? "" : "WHERE p.manager_user_id = ?";
    const params = broad ? [] : [actorId];
    const [rows] = await pool.query(
      `
        SELECT
          e.*,
          c.id AS c_id,
          c.title AS c_title,
          c.category AS c_category,
          c.is_mandatory AS c_is_mandatory,
          p.full_name AS learner_name,
          p.user_id AS learner_user_id
        FROM enrollments e
        LEFT JOIN courses c ON c.id = e.course_id
        LEFT JOIN profiles p ON p.user_id = e.user_id
        ${where}
        ORDER BY e.id DESC
        LIMIT 500
      `,
      params,
    );
    const data = rows.map((r) => ({
      ...r,
      courses: r.c_id
        ? {
            id: r.c_id,
            title: r.c_title,
            category: r.c_category,
            is_mandatory: Boolean(r.c_is_mandatory),
          }
        : null,
    }));
    return res.json({ data });
  } catch (e) {
    console.error("[enrollments/team]", e);
    return res.status(500).json({ error: "Failed to load team enrollments" });
  }
});

// -----------------------------
// Audit logs (compliance / sysadmin)
// -----------------------------
const csvEscape = (val) => {
  const s = val == null ? "" : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

lmsRouter.get("/audit-logs", requireAuth(["sysadmin"]), async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const [rows] = await pool.query(
      `SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    );
    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM audit_logs`);
    return res.json({ data: rows, total: Number(countRow?.total || 0) });
  } catch (e) {
    if (isTableMissing(e)) return res.json({ data: [], total: 0 });
    throw e;
  }
});

lmsRouter.get("/audit-logs/export.csv", requireAuth(["sysadmin"]), async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10000`);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
    const header = ["id", "actor_user_id", "action", "entity_type", "entity_id", "metadata", "created_at"];
    res.write(`${header.map(csvEscape).join(",")}\r\n`);
    for (const r of rows) {
      const line = [
        r.id,
        r.actor_user_id,
        r.action,
        r.entity_type,
        r.entity_id,
        r.metadata != null ? JSON.stringify(r.metadata) : "",
        r.created_at,
      ].map(csvEscape);
      res.write(`${line.join(",")}\r\n`);
    }
    return res.end();
  } catch (e) {
    if (isTableMissing(e)) {
      res.setHeader("Content-Type", "text/plain");
      return res.status(503).send("audit_logs table missing");
    }
    throw e;
  }
});

// -----------------------------
// Roles
// -----------------------------
lmsRouter.post("/users", requireAuth(["sysadmin"]), async (req, res) => {
  const {
    email,
    password,
    full_name,
    role = "learner",
    employee_id,
    job_title,
    department_id,
    location,
    phone,
    date_of_joining,
  } = req.body || {};

  if (!email || !password || !full_name) {
    return res.status(400).json({ error: "email, password, and full_name are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedRole = role === "admin" ? "sysadmin" : role === "employee" ? "learner" : String(role || "").trim();
  if (!ROLE_WHITELIST.has(normalizedRole)) {
    return res.status(400).json({ error: "Invalid role. Allowed: sysadmin, instructor, manager, learner" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const [userResult] = await conn.query(
      "INSERT INTO users (email, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)",
      [normalizedEmail, passwordHash, String(full_name).trim(), normalizedRole, 1],
    );
    const userId = userResult.insertId;

    await conn.query(
      `
        INSERT INTO profiles (
          user_id, full_name, job_title, employee_id, department_id,
          location, phone, date_of_joining
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        String(full_name).trim(),
        normalizeOptionalString(job_title),
        normalizeOptionalString(employee_id),
        department_id || null,
        normalizeOptionalString(location),
        normalizeOptionalString(phone),
        date_of_joining || null,
      ],
    );

    const [roleResult] = await conn.query("INSERT INTO user_roles (user_id, role) VALUES (?, ?)", [userId, normalizedRole]);

    await conn.commit();

    await writeAudit({
      actorUserId: req.user.userId,
      action: "user_created",
      entityType: "user",
      entityId: String(userId),
      metadata: { email: normalizedEmail, role: normalizedRole },
    });

    return res.status(201).json({
      data: {
        id: userId,
        email: normalizedEmail,
        full_name: String(full_name).trim(),
        role: normalizedRole,
        role_id: roleResult.insertId,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error("[lms/users:create]", err);
    return res.status(500).json({ error: "User creation failed" });
  } finally {
    conn.release();
  }
});

lmsRouter.get("/user-roles", requireAuth(["sysadmin", "manager"]), async (req, res) => {
  const [rows] = await pool.query("SELECT id, user_id, role, created_at FROM user_roles ORDER BY id DESC");
  const data = rows.map((r) => ({
    ...r,
    role: r.role === "admin" ? "sysadmin" : r.role === "employee" ? "learner" : r.role,
  }));
  return res.json({ data });
});

lmsRouter.post("/user-roles", requireAuth(["sysadmin"]), async (req, res) => {
  const { userId, role } = req.body || {};
  if (!userId || !role) return res.status(400).json({ error: "userId and role are required" });
  const normalizedRole = role === "admin" ? "sysadmin" : role === "employee" ? "learner" : role;
  if (!ROLE_WHITELIST.has(normalizedRole)) {
    return res.status(400).json({ error: "Invalid role. Allowed: sysadmin, instructor, manager, learner" });
  }
  // Single-role policy: replace any existing roles for this user.
  await pool.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
  const [result] = await pool.query("INSERT INTO user_roles (user_id, role) VALUES (?, ?)", [userId, normalizedRole]);
  await pool.query("UPDATE users SET role = ? WHERE id = ?", [normalizedRole, userId]);
  const [rows] = await pool.query("SELECT id, user_id, role, created_at FROM user_roles WHERE id = ? LIMIT 1", [
    result.insertId,
  ]);
  await writeAudit({
    actorUserId: req.user.userId,
    action: "user_role_assigned",
    entityType: "user",
    entityId: String(userId),
    metadata: { role: normalizedRole },
  });
  return res.status(201).json({ data: rows[0] });
});

lmsRouter.delete("/user-roles/:id", requireAuth(["sysadmin"]), async (req, res) => {
  const roleId = Number(req.params.id);
  await pool.query("DELETE FROM user_roles WHERE id = ?", [roleId]);
  return res.json({ ok: true });
});

// -----------------------------
// Reports data endpoints
// -----------------------------
lmsRouter.get("/enrollments", requireAuth(["sysadmin", "instructor", "manager"]), async (req, res) => {
  const [rows] = await pool.query(
    `
      SELECT
        e.*,
        c.id AS c_id,
        c.title AS c_title,
        c.category AS c_category
      FROM enrollments e
      LEFT JOIN courses c ON c.id = e.course_id
      ORDER BY e.id DESC
    `,
  );

  const data = rows.map((r) => ({
    ...r,
    courses: r.c_id ? { id: r.c_id, title: r.c_title, category: r.c_category } : null,
  }));
  return res.json({ data });
});

lmsRouter.get("/assessment-results", requireAuth(["sysadmin", "instructor", "manager"]), async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM assessment_results ORDER BY id DESC");
  return res.json({ data: rows });
});

// -----------------------------
// Gamification
// -----------------------------
lmsRouter.get("/gamification/my-points", requireAuth(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query("SELECT * FROM user_points WHERE user_id = ? ORDER BY id DESC", [userId]);
    return res.json({ data: rows });
  } catch (err) {
    if (isTableMissing(err)) return res.json({ data: [] });
    return res.status(500).json({ error: "Failed to fetch points" });
  }
});

lmsRouter.get("/gamification/my-badges", requireAuth(), async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query("SELECT * FROM user_badges WHERE user_id = ? ORDER BY id DESC", [userId]);
    return res.json({ data: rows });
  } catch (err) {
    if (isTableMissing(err)) return res.json({ data: [] });
    return res.status(500).json({ error: "Failed to fetch badges" });
  }
});

lmsRouter.get("/gamification/all-badges", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM user_badges ORDER BY id DESC");
    return res.json({ data: rows });
  } catch (err) {
    if (isTableMissing(err)) return res.json({ data: [] });
    return res.status(500).json({ error: "Failed to fetch badges" });
  }
});

lmsRouter.get("/gamification/leaderboard", requireAuth(), async (req, res) => {
  try {
    const [points] = await pool.query(
      "SELECT user_id, COALESCE(SUM(points), 0) AS total_points FROM user_points GROUP BY user_id",
    );
    const [profiles] = await pool.query("SELECT user_id, full_name FROM profiles");
    const [badges] = await pool.query("SELECT user_id, badge_name, badge_icon FROM user_badges");

    const profileMap = new Map(profiles.map((p) => [String(p.user_id), p.full_name]));
    const badgeMap = new Map();
    badges.forEach((b) => {
      const key = String(b.user_id);
      const current = badgeMap.get(key) || [];
      current.push({ badge_name: b.badge_name, badge_icon: b.badge_icon });
      badgeMap.set(key, current);
    });

    const data = points
      .map((p) => ({
        user_id: p.user_id,
        full_name: profileMap.get(String(p.user_id)) || "Unknown",
        total_points: Number(p.total_points || 0),
        badges: badgeMap.get(String(p.user_id)) || [],
      }))
      .sort((a, b) => b.total_points - a.total_points);

    return res.json({ data });
  } catch (err) {
    if (isTableMissing(err)) return res.json({ data: [] });
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});
