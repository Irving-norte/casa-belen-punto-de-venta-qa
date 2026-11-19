import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { createContext, runInContext, type Context } from 'node:vm'
import { LibroSimulado, type PestanaSimulada, type Valor } from './libro-simulado'

/**
 * La hoja de inventario sin Google: ejecuta el Apps Script REAL de la app
 * (apps-script/*.gs) sobre un libro simulado, y lo expone por HTTP igual que
 * una aplicación web de Apps Script (POST → 302 → GET con la respuesta).
 *
 * Así las pruebas ejercitan la app y el script juntos, sin escribir nunca en
 * una hoja real.
 */

export type EntornoHoja = 'produccion' | 'qa'

export interface PeticionRecibida {
  accion: string
  entorno: string
  datos: Record<string, unknown[]> | undefined
}

/** Fila de una pestaña como objeto { encabezado: valor }. */
export type Renglon = Record<string, Valor>

/** Respuesta del script (la forma completa vive en la app: src/lib/sincronizacion/protocolo.ts). */
export interface RespuestaHoja {
  ok: boolean
  version: number
  error?: string
  mensaje?: string
  entorno?: EntornoHoja
  hoja?: string
  aceptados?: { ventas: string[]; gastos: string[]; cajas: string[] }
  rechazados?: { tipo: string; id: string; motivo: string }[]
  catalogo?: {
    categorias: { id: string; nombre: string }[]
    productos: {
      id: string
      categoriaId: string
      nombre: string
      precio: Record<string, unknown>
      variantes?: string[]
      articulo?: string
      descuenta?: number
    }[]
    errores: { pestana: string; fila: number; mensaje: string }[]
  }
  existencias?: Record<string, { cantidad: number; unidad: string }>
}

interface ScriptCargado extends Context {
  doPost(e: { postData: { contents: string; type: string } }): { contenido: string }
  prepararHoja(entorno: EntornoHoja): { categorias: number; productos: number; existencias: number; errores: unknown[] }
  registrarEntradasYConteos(): { entradas: number; ajustes: number; sinDiferencia: number; errores: unknown[] }
  calcularExistencias(): Record<string, { cantidad: number; unidad: string }>
  claveDeLaTablet(crear: boolean): string
  enlaceDeVinculacion(entorno: EntornoHoja, url: string, clave: string): string
}

function candidatasAppsScript(): string[] {
  return [
    process.env.QA_APPS_SCRIPT,
    join(process.cwd(), '.sitio', 'apps-script'),
    join(process.cwd(), '..', 'casa-belen-punto-de-venta', 'apps-script'),
  ].filter((c): c is string => !!c)
}

/** true si se encuentra el Apps Script de la app (para saltar las pruebas que lo usan). */
export function hayAppsScript(): boolean {
  return candidatasAppsScript().some((c) => existsSync(join(c, 'Codigo.gs')))
}

/**
 * Las pruebas de sincronización llaman a la hoja simulada en 127.0.0.1: la
 * app debe servirse localmente (una página https no puede llamar a http).
 */
export function appServidaLocalmente(baseURL: string | undefined): boolean {
  return /^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(baseURL ?? '')
}

/** Carpeta del Apps Script: QA_APPS_SCRIPT, la copia de .sitio o el repo de la app al lado. */
export function carpetaAppsScript(): string {
  const candidatas = candidatasAppsScript()
  const carpeta = candidatas.find((c) => existsSync(join(c, 'Codigo.gs')))
  if (!carpeta) {
    throw new Error(
      `No encuentro el Apps Script de la app (Codigo.gs). Busqué en: ${candidatas.join(', ')}. ` +
        'Usa QA_APPS_SCRIPT=<carpeta> o npm run sitio:local.',
    )
  }
  return carpeta
}

export class HojaSimulada {
  readonly libro = new LibroSimulado()
  readonly peticiones: PeticionRecibida[] = []
  private readonly propiedades = new Map<string, string>()
  private readonly script: ScriptCargado
  private readonly respuestas = new Map<string, string>()
  private servidor?: Server
  private fallas: Array<'error-500' | 'perder-respuesta'> = []
  /** Pausa artificial antes de contestar (ms), para ver estados intermedios. */
  demora = 0
  url = ''

  constructor(carpeta = carpetaAppsScript()) {
    const archivos = readdirSync(carpeta)
      .filter((a) => a.endsWith('.gs'))
      .sort()
    const codigo = archivos.map((a) => readFileSync(join(carpeta, a), 'utf8')).join('\n;\n')
    this.script = createContext(this.globalesAppsScript()) as ScriptCargado
    runInContext(codigo, this.script, { filename: 'apps-script.gs' })
  }

  // ---------------------------------------------------------------------------
  // Lo que haría una persona en la hoja
  // ---------------------------------------------------------------------------

  /** Casa Belén → Preparar hoja. */
  preparar(entorno: EntornoHoja) {
    return this.script.prepararHoja(entorno)
  }

  /** Casa Belén → Vincular tablet: la clave y el enlace que se abriría en la tablet. */
  vincular(entorno: EntornoHoja): { clave: string; enlace: string } {
    const clave = this.script.claveDeLaTablet(true)
    return { clave, enlace: this.script.enlaceDeVinculacion(entorno, this.url, clave) }
  }

  /** Escribe en las columnas Entrada / Conteo de Existencias, como lo haría una persona. */
  capturar(clave: string, campos: { entrada?: number; conteo?: number; minimo?: number; nota?: string }): void {
    const pestana = this.pestana('Existencias')
    const fila = this.buscarFila(pestana, 'Clave', clave)
    const columnas = this.encabezados(pestana)
    const poner = (encabezado: string, valor: Valor | undefined) => {
      if (valor === undefined) return
      pestana.escribir(fila, columnas.indexOf(encabezado) + 1, valor)
    }
    poner('Entrada', campos.entrada)
    poner('Conteo', campos.conteo)
    poner('Mínimo', campos.minimo)
    poner('Nota', campos.nota)
  }

  /**
   * Escribe en cualquier columna de Existencias como si la persona lo
   * tecleara: una fórmula se interpreta con la configuración regional del
   * libro (en es_ES una «,» entre argumentos da #ERROR!).
   */
  teclearEnExistencias(clave: string, encabezado: string, valor: Valor): void {
    const pestana = this.pestana('Existencias')
    const fila = this.buscarFila(pestana, 'Clave', clave)
    pestana.getRange(fila, this.encabezados(pestana).indexOf(encabezado) + 1).setValues([[valor]])
  }

  /** Fórmula de una celda de Existencias (vacía si no tiene). */
  formulaEnExistencias(clave: string, encabezado: string): string {
    const pestana = this.pestana('Existencias')
    const fila = this.buscarFila(pestana, 'Clave', clave)
    return pestana.getRange(fila, this.encabezados(pestana).indexOf(encabezado) + 1).getFormulas()[0]![0]!
  }

  /** Casa Belén → Registrar entradas y conteos. */
  registrarEntradasYConteos() {
    return this.script.registrarEntradasYConteos()
  }

  /** Edita una celda de Productos (p. ej. un precio), buscando el producto por ID. */
  editarProducto(id: string, encabezado: string, valor: Valor): void {
    const pestana = this.pestana('Productos')
    const fila = this.buscarFila(pestana, 'ID', id)
    pestana.escribir(fila, this.encabezados(pestana).indexOf(encabezado) + 1, valor)
  }

  /** Agrega un renglón a Productos (ID vacío: lo completa el script). */
  agregarProducto(renglon: Partial<Record<string, Valor>>): void {
    const pestana = this.pestana('Productos')
    const columnas = this.encabezados(pestana)
    const fila = pestana.getLastRow() + 1
    columnas.forEach((c, i) => pestana.escribir(fila, i + 1, renglon[c] ?? ''))
  }

  // ---------------------------------------------------------------------------
  // Lectura para las pruebas
  // ---------------------------------------------------------------------------

  /** Renglones de una pestaña como objetos, con fórmulas ya evaluadas. */
  renglones(nombre: string): Renglon[] {
    const pestana = this.pestana(nombre)
    const columnas = this.encabezados(pestana)
    const n = pestana.getLastRow() - 1
    if (n <= 0) return []
    return pestana
      .getRange(2, 1, n, columnas.length)
      .getValues()
      .map((fila) => Object.fromEntries(columnas.map((c, i) => [c, fila[i] ?? ''])))
  }

  /** Existencia de una clave como la muestra la hoja (fórmula de la pestaña Existencias). */
  existencia(clave: string): number {
    const renglon = this.renglones('Existencias').find((r) => r.Clave === clave)
    if (!renglon) throw new Error(`No hay renglón de existencias para «${clave}»`)
    return Number(renglon.Existencia)
  }

  /** Existencias calculadas por el script (lo que recibe la tablet). */
  existenciasDelScript() {
    return this.script.calcularExistencias()
  }

  /** Llama a doPost directamente (sin HTTP), como lo haría la tablet. */
  llamar<T = RespuestaHoja>(peticion: unknown): T {
    const contenido = typeof peticion === 'string' ? peticion : JSON.stringify(peticion)
    this.registrar(contenido)
    return JSON.parse(this.script.doPost({ postData: { contents: contenido, type: 'text/plain' } }).contenido) as T
  }

  // ---------------------------------------------------------------------------
  // Fallas a propósito
  // ---------------------------------------------------------------------------

  /** La siguiente petición regresa la página de error de Google (HTML, 500). */
  fallarSiguiente(): void {
    this.fallas.push('error-500')
  }

  /** La siguiente petición SÍ se procesa, pero la respuesta nunca llega a la tablet. */
  perderSiguienteRespuesta(): void {
    this.fallas.push('perder-respuesta')
  }

  // ---------------------------------------------------------------------------
  // Servidor HTTP (aplicación web)
  // ---------------------------------------------------------------------------

  async iniciar(): Promise<string> {
    this.servidor = createServer((req, res) => void this.atender(req, res))
    await new Promise<void>((resolver) => this.servidor!.listen(0, '127.0.0.1', resolver))
    const { port } = this.servidor.address() as AddressInfo
    this.url = `http://127.0.0.1:${port}/macros/s/SIMULADA/exec`
    return this.url
  }

  async detener(): Promise<void> {
    if (!this.servidor) return
    this.servidor.closeAllConnections()
    await new Promise<void>((resolver) => this.servidor!.close(() => resolver()))
  }

  private async atender(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ruta = new URL(req.url ?? '/', 'http://x')
    // Apps Script no contesta la consulta previa de CORS: si la app la
    // provoca (p. ej. con Content-Type: application/json), falla igual que allá.
    if (req.method === 'OPTIONS') {
      res.writeHead(405).end()
      return
    }

    if (req.method === 'GET' && ruta.pathname === '/macros/echo') {
      const contenido = this.respuestas.get(ruta.searchParams.get('user_content_key') ?? '')
      if (!contenido) {
        res.writeHead(404).end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
      res.end(contenido)
      return
    }

    if (req.method !== 'POST' || !ruta.pathname.endsWith('/exec')) {
      res.writeHead(404).end()
      return
    }

    const cuerpo = await leerCuerpo(req)
    if (this.demora) await new Promise((r) => setTimeout(r, this.demora))
    const falla = this.fallas.shift()
    if (falla === 'error-500') {
      res.writeHead(500, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' })
      res.end('<html><body>Error del servidor. Inténtalo de nuevo más tarde.</body></html>')
      return
    }

    this.registrar(cuerpo)
    const salida = this.script.doPost({ postData: { contents: cuerpo, type: req.headers['content-type'] ?? '' } })
    if (falla === 'perder-respuesta') {
      // Se corta a media respuesta (como si la tablet perdiera la señal). Si se
      // cortara antes de mandar nada, Chrome reintentaría el POST por su cuenta.
      req.socket.write('HTTP/1.1 200 OK\r\n')
      req.socket.destroy()
      return
    }
    // Como Apps Script: 302 a una URL de un solo uso con la respuesta.
    const llave = randomUUID()
    this.respuestas.set(llave, salida.contenido)
    res.writeHead(302, {
      Location: `/macros/echo?user_content_key=${llave}`,
      'Access-Control-Allow-Origin': '*',
    })
    res.end()
  }

  private registrar(cuerpo: string): void {
    try {
      const p = JSON.parse(cuerpo) as { accion?: string; entorno?: string; datos?: Record<string, unknown[]> }
      this.peticiones.push({ accion: p.accion ?? '', entorno: p.entorno ?? '', datos: p.datos })
    } catch {
      this.peticiones.push({ accion: '(no JSON)', entorno: '', datos: undefined })
    }
  }

  // ---------------------------------------------------------------------------
  // Globales de Apps Script que usa el script
  // ---------------------------------------------------------------------------

  private globalesAppsScript(): Record<string, unknown> {
    const libro = this.libro
    const propiedades = this.propiedades
    const constructorValidacion = () => {
      const regla: Record<string, unknown> = {}
      const b = {
        requireValueInRange: (_r: unknown, mostrar: boolean) => ((regla.rango = mostrar), b),
        requireValueInList: (lista: string[], mostrar: boolean) => ((regla.lista = lista), (regla.mostrar = mostrar), b),
        requireNumberGreaterThanOrEqualTo: (n: number) => ((regla.minimo = n), b),
        setAllowInvalid: (v: boolean) => ((regla.permitirInvalido = v), b),
        setHelpText: (t: string) => ((regla.ayuda = t), b),
        build: () => regla,
      }
      return b
    }
    return {
      console,
      SpreadsheetApp: {
        getActiveSpreadsheet: () => libro,
        getUi: () => {
          throw new Error('La hoja simulada no tiene interfaz: llama las funciones sin menú')
        },
        newDataValidation: constructorValidacion,
        ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' },
      },
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (k: string) => propiedades.get(k) ?? null,
          setProperty: (k: string, v: string) => {
            propiedades.set(k, String(v))
          },
        }),
      },
      LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
      ContentService: {
        MimeType: { JSON: 'application/json' },
        createTextOutput: (contenido: string) => {
          const salida = { contenido, tipo: 'text/plain', setMimeType: (t: string) => ((salida.tipo = t), salida) }
          return salida
        },
      },
      Utilities: { getUuid: () => randomUUID() },
      ScriptApp: { getService: () => ({ getUrl: () => this.url }) },
      HtmlService: {
        createHtmlOutput: () => {
          throw new Error('La hoja simulada no muestra diálogos')
        },
      },
    }
  }

  // ---------------------------------------------------------------------------

  pestana(nombre: string): PestanaSimulada {
    const p = this.libro.getSheetByName(nombre)
    if (!p) throw new Error(`La hoja simulada no tiene la pestaña «${nombre}»`)
    return p
  }

  private encabezados(p: PestanaSimulada): string[] {
    return p.getRange(1, 1, 1, Math.max(1, p.getLastColumn())).getValues()[0]!.map(String)
  }

  private buscarFila(p: PestanaSimulada, encabezado: string, valor: string): number {
    const col = this.encabezados(p).indexOf(encabezado) + 1
    for (let f = 2; f <= p.getLastRow(); f++) if (String(p.leer(f, col)) === valor) return f
    throw new Error(`No encontré «${valor}» en ${p.getName()}!${encabezado}`)
  }
}

function leerCuerpo(req: IncomingMessage): Promise<string> {
  return new Promise((resolver, rechazar) => {
    let datos = ''
    req.setEncoding('utf8')
    req.on('data', (parte: string) => (datos += parte))
    req.on('end', () => resolver(datos))
    req.on('error', rechazar)
  })
}
