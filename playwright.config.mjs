import { defineConfig } from "@playwright/test"

export default defineConfig({
    testDir: "./tests",
    timeout: 45000,
    use: {
        baseURL: "http://127.0.0.1:4180",
        launchOptions: { executablePath: process.env.CHESS_TEST_CHROME },
    },
    webServer: {
        command: "npm start -- --ip 127.0.0.1 --port 4180",
        url: "http://127.0.0.1:4180",
        env: { WRANGLER_SEND_METRICS: "false" },
    },
})
