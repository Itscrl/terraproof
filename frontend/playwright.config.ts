import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:8000",
    headless: true,
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } :
      process.env.CI || process.env.PLAYWRIGHT_CHROMIUM
        ? {}
        : { channel: "chrome" },
  },
  webServer: {
    command: `"${resolve("..", ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python")}" -m uvicorn terraproof.api:app --host 127.0.0.1 --port 8000`,
    url: "http://127.0.0.1:8000/api/health",
    reuseExistingServer: !process.env.CI,
    env: { TERRAPROOF_DATA_DIR: "../artifacts/e2e-data" },
  },
});
