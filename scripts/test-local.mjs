// Corre Playwright contra la app de .sitio/ (npm run sitio:local).
// Pasa los argumentos tal cual:  npm run test:local -- --headed --workers=1
// Solo Node: funciona igual en Windows, macOS y Linux.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')
const r = spawnSync(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, QA_SITIO_LOCAL: process.env.QA_SITIO_LOCAL || '.sitio' },
})
process.exit(r.status ?? 1)
