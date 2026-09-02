import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { setupSwagger } from "./swagger.js";

import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { departmentsRouter } from "./routes/departments.js";
import { coursesRouter } from "./routes/courses.js";
import { certificatesRouter } from "./routes/certificates.js";
import { approvalsRouter } from "./routes/approvals.js";
import { lmsRouter } from "./routes/lms.js";
import { brandingRouter } from "./routes/branding.js";
import { notificationsRouter } from "./routes/notifications.js";

export const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  helmet({
    // Allow course media (video/PDF) to load from this API when the UI runs on another origin (e.g. :8080).
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.json({ ok: true, service: "cbs-lms-backend" });
});

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

setupSwagger(app);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/certificates", certificatesRouter);
app.use("/api/approvals", approvalsRouter);
app.use("/api/lms", lmsRouter);
app.use("/api/branding", brandingRouter);
app.use("/api/notifications", notificationsRouter);

