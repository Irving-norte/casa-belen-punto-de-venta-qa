// Construye la app en modo QA y la deja en .sitio/ para `npm run test:local`,
// junto con su Apps Script (.sitio/apps-script, para la hoja simulada).
// Solo Node: funciona igual en Windows, macOS y Linux.
//   npm run sitio:local [-- <ruta-al-repo-de-la-app>]   (por defecto ../casa-belen-punto-de-venta)
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const app = resolve(process.argv[2] ?? '../casa-belen-punto-de-venta')
const sitio = resolve('.sitio')
const destino = join(sitio, 'casa-belen-punto-de-venta-qa')

if (!existsSync(join(app, 'package.json'))) {
  console.error(`No encuentro la app en ${app}. Uso: npm run sitio:local -- <ruta-al-repo-de-la-app>`)
  process.exit(1)
}

function correr(comando, opciones = {}) {
  console.log(`> ${comando}`)
  // shell: npm y npx son .cmd en Windows.
  const r = spawnSync(comando, { cwd: app, stdio: 'inherit', shell: true, ...opciones })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

// Si la app ya tiene dependencias no se reinstalan (en Windows, borrar
// node_modules falla mientras el servidor de desarrollo está abierto).
if (!existsSync(join(app, 'node_modules'))) correr('npm ci --no-audit --no-fund')

correr(`npx vite build --outDir "${destino}" --emptyOutDir`, {
  env: { ...process.env, VITE_ENTORNO: 'qa', VITE_BASE: '/casa-belen-punto-de-venta-qa/' },
})

rmSync(join(sitio, 'apps-script'), { recursive: true, force: true })
cpSync(join(app, 'apps-script'), join(sitio, 'apps-script'), { recursive: true })
console.log(`Sitio QA listo en ${destino} (Apps Script en .sitio/apps-script)`)
