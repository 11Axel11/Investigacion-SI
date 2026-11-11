// E2E de los flujos críticos (ítem 4.4). Levanta todo en local: Overpass falso, backend (dist) contra la BD de
// pruebas y frontend en modo desarrollo. Necesita TEST_DATABASE_URL (scripts/pruebas/ambiente.sh up) y el backend
// compilado (`npm run build` en backend/). Sin ellos falla: una prueba que no corrió es INCOMPLETA.
const path = require('node:path');
const { defineConfig } = require('@playwright/test');

const RAIZ = path.resolve(__dirname, '..');
const URL_BD = process.env.TEST_DATABASE_URL;
if (!URL_BD) throw new Error('TEST_DATABASE_URL no está definida: ejecuta scripts/pruebas/ambiente.sh up. Prueba INCOMPLETA.');
const CLAVE_ADMIN = 'clave-ficticia-de-prueba-0123456789';

module.exports = defineConfig({
  testDir: './pruebas',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  globalSetup: require.resolve('./soporte/preparar.cjs'),
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'informe' }]],
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'es-CR' },
  webServer: [
    { command: 'node soporte/externos.cjs', cwd: __dirname, url: 'http://127.0.0.1:4010/salud', reuseExistingServer: false },
    {
      command: 'node dist/main.js',
      cwd: path.join(RAIZ, 'backend'),
      url: 'http://127.0.0.1:3101/health',
      reuseExistingServer: false,
      env: {
        DATABASE_URL: URL_BD, ADMIN_API_KEY: CLAVE_ADMIN, PORT: '3101',
        OVERPASS_URL: 'http://127.0.0.1:4010/api/interpreter',
        NODE_OPTIONS: `--require ${path.join(__dirname, 'soporte', 'precarga.cjs')}`,
      },
    },
    {
      command: 'npm run dev -- --port 3100 --hostname 127.0.0.1',
      cwd: path.join(RAIZ, 'frontend'),
      url: 'http://127.0.0.1:3100',
      reuseExistingServer: false,
      timeout: 120_000,
      env: { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3101', NEXT_TELEMETRY_DISABLED: '1' },
    },
  ],
});
