// Sirve una carpeta por HTTP en 127.0.0.1 (lo usa playwright.config.ts con
// QA_SITIO_LOCAL). Solo Node: funciona igual en Windows, macOS y Linux.
//   node scripts/servidor-local.mjs <carpeta> [puerto]
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

const raiz = resolve(process.argv[2] ?? '.sitio')
const puerto = Number(process.argv[3] ?? 4173)
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

if (!existsSync(raiz)) {
  console.error(`No existe la carpeta ${raiz}. Corre primero: npm run sitio:local`)
  process.exit(1)
}

createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)
  let archivo = normalize(join(raiz, ruta))
  if (archivo !== raiz && !archivo.startsWith(raiz + sep)) {
    res.writeHead(403).end()
    return
  }
  if (existsSync(archivo) && statSync(archivo).isDirectory()) {
    if (!ruta.endsWith('/')) {
      res.writeHead(301, { Location: `${ruta}/` }).end()
      return
    }
    archivo = join(archivo, 'index.html')
  }
  if (!existsSync(archivo) || !statSync(archivo).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado')
    return
  }
  res.writeHead(200, { 'Content-Type': tipos[extname(archivo).toLowerCase()] ?? 'application/octet-stream' })
  createReadStream(archivo).pipe(res)
}).listen(puerto, '127.0.0.1', () => console.log(`Sirviendo ${raiz} en http://127.0.0.1:${puerto}/`))
