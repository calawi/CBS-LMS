import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const brandingRouter = express.Router();

// Fix for ES module path resolution on Linux
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure these variables match the endpoint definitions at the bottom
const LOGO_WIDE_PATH = path.join(__dirname, '../../assets/logo.png');
const LOGO_ICON_PATH = path.join(__dirname, '../../assets/cbs-logo-icon.png');

const sendImage = (res, imagePath) => {
  if (!fs.existsSync(imagePath)) return res.status(404).json({ error: "Logo not found" });
  res.setHeader("Content-Type", "image/png");
  return res.sendFile(imagePath);
};

brandingRouter.get("/logo-wide", (req, res) => sendImage(res, LOGO_WIDE_PATH));
brandingRouter.get("/logo-icon", (req, res) => sendImage(res, LOGO_ICON_PATH));
