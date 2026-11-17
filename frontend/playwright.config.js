// Pruebas E2E  con Playwright contra el entorno de desarrollo: backend en 8080, Vite en 5173 y Mailpit en 8025,
// con los datos de demostración. Usa el Edge instalado en el equipo (no descarga navegadores). Ver e2e/README.md.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-informe' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    channel: process.env.E2E_NAVEGADOR || 'msedge',
    headless: true,
    locale: 'es-SV',
    timezoneId: 'America/El_Salvador',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
