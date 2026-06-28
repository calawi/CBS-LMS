import { app } from "./app.js";

// Prefer PORT from environment; otherwise default to 5000
const port = process.env.PORT || 5000;

process.on("unhandledRejection", (err) => {
  // eslint-disable-next-line no-console
  console.error("[backend] unhandledRejection (server kept running):", err);
});

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${port}`);
});

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(`\nPort ${port} is already in use — the backend is probably already running.`);
    // eslint-disable-next-line no-console
    console.error("Options:");
    // eslint-disable-next-line no-console
    console.error("  1) Use the existing server (open http://localhost:5000 in the browser)");
    // eslint-disable-next-line no-console
    console.error("  2) Run: npm run restart");
    process.exit(1);
  }
  throw err;
});

