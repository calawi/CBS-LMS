import express from "express";
import fs from "fs";

export const brandingRouter = express.Router();

const LOGO_WIDE_PATH =
  "C:\\Users\\abdirahman.hanafi\\.cursor\\projects\\c-Users-abdirahman-hanafi-Desktop-CBS-LMS\\assets\\c__Users_abdirahman.hanafi_AppData_Roaming_Cursor_User_workspaceStorage_5dd90a2682dec83a1ed7dab910507762_images_logo-8f3b46c8-a336-413f-b1f6-78ab22251ab0.png";

const LOGO_ICON_PATH =
  "C:\\Users\\abdirahman.hanafi\\.cursor\\projects\\c-Users-abdirahman-hanafi-Desktop-CBS-LMS\\assets\\c__Users_abdirahman.hanafi_AppData_Roaming_Cursor_User_workspaceStorage_5dd90a2682dec83a1ed7dab910507762_images_cbs-logo-icon-ea582755-d2b4-499d-a6e8-190ca8f36b40.png";

const sendImage = (res, path) => {
  if (!fs.existsSync(path)) return res.status(404).json({ error: "Logo not found" });
  res.setHeader("Content-Type", "image/png");
  return res.sendFile(path);
};

brandingRouter.get("/logo-wide", (req, res) => sendImage(res, LOGO_WIDE_PATH));
brandingRouter.get("/logo-icon", (req, res) => sendImage(res, LOGO_ICON_PATH));

