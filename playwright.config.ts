import { defineConfig, devices } from '@playwright/test'
import { PUERTO_LOCAL, RUTA_BASE_QA, TABLET_HORIZONTAL, URL_QA } from './src/constants'

/**
 * A dónde apuntan las pruebas:
 *  - QA_URL=<url>               → cualquier URL (p. ej. la de QA publicada).
 *  - QA_SITIO_LOCAL=<carpeta>   → sirve una app ya construida desde esa carpeta
 *                                 (debe contener casa-belen-punto-de-venta-qa/).
 *  - Ninguna                    → el entorno QA publicado en GitHub Pages.
 */
const sitioLocal = process.env.QA_SITIO_LOCAL
const urlLocal = `http://127.0.0.1:${PUERTO_LOCAL}${RUTA_BASE_QA}`
const baseURL = process.env.QA_URL ?? (sitioLocal ? urlLocal : URL_QA)
const enCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  workers: enCI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    // Sin service worker: cada prueba carga la versión publicada, sin caché.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    // PW_SIN_VIDEO=1 para equipos sin el ffmpeg de Playwright.
    video: process.env.PW_SIN_VIDEO ? 'off' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'tablet-horizontal',
      use: {
        ...devices['Desktop Chrome'],
        viewport: TABLET_HORIZONTAL,
        hasTouch: true,
        // Chrome del sistema si se indica (p. ej. sin navegadores de Playwright instalados).
        launchOptions: process.env.PW_CHROME_PATH ? { executablePath: process.env.PW_CHROME_PATH } : {},
      },
    },
  ],

  webServer: sitioLocal
    ? {
        command: `python3 -m http.server ${PUERTO_LOCAL} --bind 127.0.0.1 --directory ${sitioLocal}`,
        url: urlLocal,
        reuseExistingServer: !enCI,
        timeout: 30_000,
      }
    : undefined,
})
