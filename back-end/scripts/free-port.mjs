import { execSync } from "child_process";

const port = String(process.env.PORT || 5000);

const killOnWindows = () => {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      console.log(`Stopped process ${pid} on port ${port}`);
    }
    if (!pids.size) console.log(`Port ${port} is already free.`);
  } catch {
    console.log(`Port ${port} is already free.`);
  }
};

const killOnUnix = () => {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
    if (!out) {
      console.log(`Port ${port} is already free.`);
      return;
    }
    for (const pid of out.split(/\s+/)) {
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
      console.log(`Stopped process ${pid} on port ${port}`);
    }
  } catch {
    console.log(`Port ${port} is already free.`);
  }
};

if (process.platform === "win32") killOnWindows();
else killOnUnix();
