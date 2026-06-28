import express from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { escapeHtml } from "../utils/escapeHtml.js";
import { sendEmailResend } from "../services/email/sendEmailResend.js";

export const approvalsRouter = express.Router();

const LEVEL_TO_ROLE = {
  supervisor: "supervisor",
  hr: "hr",
  management: "admin",
  governor: "admin",
};

const buildEmailHtml = ({ action, planTitle, reviewerName, level, comments }) => {
  const safeAction = escapeHtml(action);
  const safePlanTitle = escapeHtml(planTitle);
  const safeReviewerName = escapeHtml(reviewerName);
  const safeLevel = escapeHtml(level);
  const safeComments = comments ? escapeHtml(comments) : "";

  const headerColor = action === "approved" ? "#22c55e" : "#ef4444";
  const headerText = action === "approved" ? "✅ Approved" : "❌ Rejected";
  const approvedFooter = action === "approved" && level === "governor";
  const commentsBlock = comments ? `<p><strong>Comments:</strong> ${safeComments}</p>` : "";
  const footerBlock = approvedFooter
    ? '<p style="color: #22c55e; font-weight: bold;">🎉 Your training plan has been fully approved!</p>'
    : "";

  // Keep HTML minimal; email clients vary.
  return `
  <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background: #1a3a5c; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 20px;">CBS Staff LMS</h1>
      <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">Training Approval Notification</p>
    </div>
    <div style="background: white; border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 10px 10px;">
      <h2 style="margin: 0 0 12px; color: ${headerColor};">
        ${headerText}
      </h2>
      <p><strong>Training Plan:</strong> ${safePlanTitle}</p>
      <p><strong>Reviewed by:</strong> ${safeReviewerName}</p>
      <p><strong>Level:</strong> ${safeLevel}</p>
      ${commentsBlock}
      ${footerBlock}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #6b7280; font-size: 13px;">Log in to the CBS Staff LMS to view details.</p>
    </div>
  </div>`;
};

/**
 * @swagger
 * /api/approvals/{approvalRequestId}/notify:
 *   post:
 *     summary: Create in-app notification and optionally send approval email
 *     tags: [Approvals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: approvalRequestId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, level, reviewerName]
 *             properties:
 *               action: { type: string, enum: [approved, rejected] }
 *               level: { type: string, enum: [supervisor, hr, management, governor] }
 *               reviewerName: { type: string }
 *               comments: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
approvalsRouter.post("/:approvalRequestId/notify", requireAuth(), async (req, res) => {
  try {
    const approvalRequestId = Number(req.params.approvalRequestId);
    const { action, level, reviewerName, comments } = req.body || {};

    if (!["approved", "rejected"].includes(action)) return res.status(400).json({ error: "Invalid action" });
    if (!Object.keys(LEVEL_TO_ROLE).includes(level)) return res.status(400).json({ error: "Invalid level" });
    if (!reviewerName) return res.status(400).json({ error: "reviewerName is required" });

    const requiredRole = LEVEL_TO_ROLE[level];
    const roles = req.user.roles || [];
    const isAdmin = roles.includes("admin");
    if (!isAdmin && !roles.includes(requiredRole)) {
      return res.status(403).json({ error: "Forbidden for this approval level" });
    }

    const [approvalRows] = await pool.query(
      `
        SELECT
          ar.id,
          ar.requested_by,
          ar.training_plan_id,
          tp.title AS plan_title
        FROM approval_requests ar
        LEFT JOIN training_plans tp ON tp.id = ar.training_plan_id
        WHERE ar.id = ?
        LIMIT 1
      `,
      [approvalRequestId]
    );

    if (!approvalRows.length) return res.status(404).json({ error: "Approval request not found" });
    const approval = approvalRows[0];
    if (!approval.requested_by) return res.status(400).json({ error: "requested_by missing on approval request" });

    const [userRows] = await pool.query(
      `
        SELECT u.email, p.full_name, p.employee_id
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE u.id = ?
        LIMIT 1
      `,
      [approval.requested_by]
    );

    const user = userRows?.[0];

    // In-app notification
    const notificationTitle =
      action === "approved" ? `Training Plan Approved at ${level} level` : `Training Plan Rejected at ${level} level`;

    const notificationMessage =
      action === "approved"
        ? `Your training plan "${approval.plan_title}" has been approved by ${reviewerName} at the ${level} level.${level === "governor" ? " Fully approved!" : " Moving to the next review stage."}`
        : `Your training plan "${approval.plan_title}" has been rejected by ${reviewerName} at the ${level} level.${comments ? ` Reason: "${comments}"` : ""}`;

    await pool.query(
      `
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, ?, ?, ?, ?)
      `,
      [approval.requested_by, notificationTitle, notificationMessage, action, "/training-plans"]
    );

    // Optional email sending
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && user?.email) {
      const emailSubject =
        action === "approved"
          ? `Training Plan Approved: ${approval.plan_title}`
          : `Training Plan Rejected: ${approval.plan_title}`;

      const html = buildEmailHtml({
        action,
        planTitle: approval.plan_title,
        reviewerName,
        level,
        comments,
      });

      await sendEmailResend({
        apiKey: resendApiKey,
        from: process.env.EMAIL_FROM || "CBS LMS <notifications@cbs.gov.so>",
        to: user.email,
        subject: emailSubject,
        html,
      });
    }

    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[approvals notify] error:", err);
    return res.status(500).json({ error: "Failed to notify" });
  }
});

