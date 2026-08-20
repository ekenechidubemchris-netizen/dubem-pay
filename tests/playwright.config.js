// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * DubemPay test config.
 *
 * This spins up a plain static file server for the project folder (one
 * level up from tests/) and runs every spec against it. No build step,
 * no backend — it's testing the same static HTML/CSS/JS files you'd open
 * in a browser directly.
 *
 * 🔧 EDIT HERE: if port 8080 is already used by something else on your
 * machine, change the port number below (and in webServer.url) to
 * something free.
 */
module.exports = defineConfig({
  testDir: './specs',
  fullyParallel: true,
  retries: 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx http-server .. -p 8080 -c-1 --silent',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
