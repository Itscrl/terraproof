import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";
const port = process.env.TERRAPROOF_TEST_PORT ?? "8000";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    screenshot: "only-on-failure",
    launchOptions: process.env.CI ? {} : { channel: "chrome" },
  },
  webServer: {
    command: `"${resolve("..", ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python")}" -m uvicorn terraproof.api:app --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: { TERRAPROOF_DATA_DIR: "../artifacts/e2e-data" },
  },
});
