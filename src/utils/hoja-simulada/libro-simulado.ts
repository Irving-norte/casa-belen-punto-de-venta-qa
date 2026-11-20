/**
 * Imitación mínima de una hoja de Google Sheets (SpreadsheetApp) para correr
 * el Apps Script real de la app sin Google.
 *
 * Es estricta en lo que la hoja real también es estricta (rangos fuera de la
 * pestaña, tamaños que no coinciden, métodos que no existen), para que un
 * error del script falle aquí y no hasta llegar a la hoja real.
 */

export type Valor = string | number | boolean | Date

const VACIO = ''

/** Columna A1 → número (A=1, AA=27). */
function columnaANumero(letras: string): number {
  return [...letras.toUpperCase()].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0)
}

export class PestanaSimulada {
  /** celdas[fila][columna], base 0. Las fórmulas se guardan como texto «=…». */
  private celdas: Valor[][] = []
  /** Celdas escritas con apóstrofo: texto aunque empiecen con «=». */
  private readonly comoTexto = new Set<string>()
  /** Fórmulas que la hoja no pudo interpretar (se ven como #ERROR!). */
  private readonly conError = new Set<string>()
  private maxFilas = 1000
  private readonly maxColumnas = 26
  filasCongeladas = 0
  readonly columnasOcultas = new Set<number>()
  readonly notas = new Map<string, string>()
  readonly formatos = new Map<string, string>()
  readonly validaciones = new Map<string, unknown>()
  readonly protecciones: ProteccionSimulada[] = []

  constructor(
    private nombre: string,
    readonly libro: LibroSimulado,
  ) {}

  getName(): string {
    return this.nombre
  }

  getLastRow(): number {
    for (let f = this.celdas.length - 1; f >= 0; f--) {
      if ((this.celdas[f] ?? []).some((v) => v !== VACIO && v !== undefined)) return f + 1
    }
    return 0
  }

  getLastColumn(): number {
    return Math.max(0, ...this.celdas.map((fila) => fila.length))
  }

  getMaxRows(): number {
    return this.maxFilas
  }

  insertRowsAfter(_despuesDe: number, cuantas: number): this {
    this.maxFilas += cuantas
    return this
  }

  getRange(filaOA1: number | string, columna?: number, numFilas = 1, numColumnas = 1): RangoSimulado {
    if (typeof filaOA1 === 'string') return this.rangoA1(filaOA1)
    if (columna == null) throw new Error('getRange: falta la columna')
    return new RangoSimulado(this, filaOA1, columna, numFilas, numColumnas)
  }

  setFrozenRows(n: number): this {
    this.filasCongeladas = n
    return this
  }

  hideColumns(columna: number, cuantas = 1): this {
    for (let i = 0; i < cuantas; i++) this.columnasOcultas.add(columna + i)
    return this
  }

  protect(): ProteccionSimulada {
    const p = new ProteccionSimulada('SHEET')
    this.protecciones.push(p)
    return p
  }

  getProtections(tipo: string): ProteccionSimulada[] {
    return this.protecciones.filter((p) => p.tipo === tipo)
  }

  // ---- Uso interno (rango) ----

  validar(fila: number, columna: number, numFilas: number, numColumnas: number): void {
    if (fila < 1 || columna < 1 || numFilas < 1 || numColumnas < 1) {
      throw new Error(`Rango inválido (${fila}, ${columna}, ${numFilas}, ${numColumnas})`)
    }
    if (fila + numFilas - 1 > this.maxFilas || columna + numColumnas - 1 > this.maxColumnas) {
      throw new Error(`Las coordenadas del rango están fuera de las dimensiones de la hoja «${this.nombre}»`)
    }
  }

  leer(fila: number, columna: number): Valor {
    return this.celdas[fila - 1]?.[columna - 1] ?? VACIO
  }

  esFormula(fila: number, columna: number): boolean {
    const v = this.leer(fila, columna)
    return typeof v === 'string' && v.startsWith('=') && !this.comoTexto.has(`${fila},${columna}`)
  }

  /** true si la celda tiene una fórmula que la hoja no pudo interpretar. */
  tieneErrorDeAnalisis(fila: number, columna: number): boolean {
    return this.conError.has(`${fila},${columna}`)
  }

  escribir(fila: number, columna: number, valor: Valor, forzarTexto = false, errorDeAnalisis = false): void {
    const f = (this.celdas[fila - 1] ??= [])
    while (f.length < columna - 1) f.push(VACIO)
    f[columna - 1] = valor
    const llave = `${fila},${columna}`
    if (forzarTexto) this.comoTexto.add(llave)
    else this.comoTexto.delete(llave)
    if (errorDeAnalisis) this.conError.add(llave)
    else this.conError.delete(llave)
  }

  private rangoA1(a1: string): RangoSimulado {
    const m = /^([A-Z]+)(\d*)(?::([A-Z]+)(\d*))?$/i.exec(a1)
    if (!m) throw new Error(`Notación A1 no soportada: ${a1}`)
    const [, c1 = 'A', f1, c2, f2] = m
    const fila = f1 ? Number(f1) : 1
    const columna = columnaANumero(c1)
    const ultimaColumna = c2 ? columnaANumero(c2) : columna
    const ultimaFila = f2 ? Number(f2) : c2 || !f1 ? this.maxFilas : fila
    return new RangoSimulado(this, fila, columna, ultimaFila - fila + 1, ultimaColumna - columna + 1, a1)
  }
}

export class RangoSimulado {
  constructor(
    private readonly pestana: PestanaSimulada,
    private readonly fila: number,
    private readonly columna: number,
    private readonly numFilas: number,
    private readonly numColumnas: number,
    private readonly a1?: string,
  ) {
    pestana.validar(fila, columna, numFilas, numColumnas)
  }

  /** Como la hoja real: las fórmulas regresan su resultado, no el texto. */
  getValues(): Valor[][] {
    const filas: Valor[][] = []
    for (let f = 0; f < this.numFilas; f++) {
      const fila: Valor[] = []
      for (let c = 0; c < this.numColumnas; c++) {
        const v = this.pestana.leer(this.fila + f, this.columna + c)
        const formula = this.pestana.esFormula(this.fila + f, this.columna + c)
        fila.push(formula ? this.pestana.libro.evaluarCelda(this.pestana, this.fila + f, this.columna + c) : v)
      }
      filas.push(fila)
    }
    return filas
  }

  getFormulas(): string[][] {
    const filas: string[][] = []
    for (let f = 0; f < this.numFilas; f++) {
      const fila: string[] = []
      for (let c = 0; c < this.numColumnas; c++) {
        const formula = this.pestana.esFormula(this.fila + f, this.columna + c)
        fila.push(formula ? String(this.pestana.leer(this.fila + f, this.columna + c)) : '')
      }
      filas.push(fila)
    }
    return filas
  }

  setValues(valores: Valor[][]): this {
    if (valores.length !== this.numFilas || valores.some((f) => f.length !== this.numColumnas)) {
      throw new Error(
        `Los datos tienen ${valores.length}×${valores[0]?.length ?? 0} pero el rango es ${this.numFilas}×${this.numColumnas}`,
      )
    }
    valores.forEach((fila, f) =>
      fila.forEach((v, c) => {
        if (v === null || v === undefined) throw new Error('setValues: valor nulo')
        if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`setValues: número inválido ${v}`)
        // Un apóstrofo al inicio fuerza texto y no forma parte del valor.
        const forzado = typeof v === 'string' && v.startsWith("'")
        if (forzado) return this.pestana.escribir(this.fila + f, this.columna + c, v.slice(1), true)
        // Como al teclearla: la fórmula se interpreta con la configuración regional del libro.
        if (typeof v === 'string' && v.startsWith('=')) {
          const canonica = this.pestana.libro.interpretarFormula(v)
          return this.pestana.escribir(this.fila + f, this.columna + c, canonica ?? v, false, canonica === null)
        }
        this.pestana.escribir(this.fila + f, this.columna + c, v)
      }),
    )
    return this
  }

  setNumberFormat(formato: string): this {
    this.pestana.formatos.set(this.a1 ?? `${this.fila},${this.columna}`, formato)
    return this
  }

  setFontWeight(_peso: string): this {
    return this
  }

  setBackground(_color: string): this {
    return this
  }

  setNote(nota: string): this {
    this.pestana.notas.set(this.a1 ?? `${this.fila},${this.columna}`, nota)
    return this
  }

  setDataValidation(regla: unknown): this {
    this.pestana.validaciones.set(this.a1 ?? `${this.fila},${this.columna}`, regla)
    return this
  }

  protect(): ProteccionSimulada {
    const p = new ProteccionSimulada('RANGE')
    this.pestana.protecciones.push(p)
    return p
  }
}

export class ProteccionSimulada {
  descripcion = ''
  soloAdvertencia = false
  constructor(readonly tipo: 'SHEET' | 'RANGE') {}
  setDescription(d: string): this {
    this.descripcion = d
    return this
  }
  setWarningOnly(v: boolean): this {
    this.soloAdvertencia = v
    return this
  }
}

/**
 * Configuraciones regionales con coma decimal: ahí los argumentos de una
 * fórmula se separan con «;» y una «,» es error de análisis (#ERROR!).
 */
const CON_PUNTO_Y_COMA = new Set(['es_ES', 'es_AR', 'es_CO', 'es_CL', 'pt_BR', 'de_DE', 'fr_FR', 'it_IT'])

export class LibroSimulado {
  readonly pestanas: PestanaSimulada[] = []
  zonaHoraria = 'America/Los_Angeles'
  /** Como una hoja nueva de una cuenta en inglés (EE. UU.). */
  configuracionRegional = 'en_US'
  activa?: PestanaSimulada

  constructor(private readonly nombre = 'Casa Belén · Inventario') {
    this.insertSheet('Hoja 1')
  }

  getName(): string {
    return this.nombre
  }

  getSheets(): PestanaSimulada[] {
    return [...this.pestanas]
  }

  getSheetByName(nombre: string): PestanaSimulada | null {
    return this.pestanas.find((p) => p.getName() === nombre) ?? null
  }

  insertSheet(nombre: string, indice?: number): PestanaSimulada {
    if (this.getSheetByName(nombre)) throw new Error(`Ya existe la pestaña «${nombre}»`)
    const p = new PestanaSimulada(nombre, this)
    this.pestanas.splice(indice ?? this.pestanas.length, 0, p)
    return p
  }

  deleteSheet(pestana: PestanaSimulada): void {
    const i = this.pestanas.indexOf(pestana)
    if (i === -1) throw new Error('La pestaña no es de este libro')
    if (this.pestanas.length === 1) throw new Error('No se puede borrar la única pestaña')
    this.pestanas.splice(i, 1)
  }

  setSpreadsheetTimeZone(zona: string): void {
    this.zonaHoraria = zona
  }

  getSpreadsheetLocale(): string {
    return this.configuracionRegional
  }

  setSpreadsheetLocale(configuracion: string): void {
    if (!/^[a-z]{2}_[A-Z]{2}$/.test(configuracion)) throw new Error(`Configuración regional inválida: ${configuracion}`)
    this.configuracionRegional = configuracion
  }

  /**
   * Como Google Sheets al recibir una fórmula: con coma decimal (p. ej.
   * es_ES) los argumentos van con «;» y una «,» no se entiende; con punto
   * decimal (en_US, es_MX) se aceptan «,» y «;» (la «;» la cambia a «,»).
   * Regresa la fórmula guardada (siempre con «,») o null si no se entiende.
   */
  interpretarFormula(formula: string): string | null {
    const puntoYComa = CON_PUNTO_Y_COMA.has(this.configuracionRegional)
    let entreComillas = false
    let canonica = ''
    for (const c of formula) {
      if (c === '"') entreComillas = !entreComillas
      if (!entreComillas && c === ',' && puntoYComa) return null
      canonica += !entreComillas && c === ';' ? ',' : c
    }
    return canonica
  }

  setActiveSheet(p: PestanaSimulada): PestanaSimulada {
    this.activa = p
    return p
  }

  /**
   * Evalúa solo las fórmulas que escribe el script (Existencias). Cualquier
   * otra regresa «#FÓRMULA» para que una prueba la note.
   */
  evaluar(pestana: PestanaSimulada, formula: string): Valor {
    const sumif = /^=SUMIF\((\w+)!([A-Z]+):\2,([A-Z]+)(\d+),\1!([A-Z]+):\5\)$/.exec(formula)
    if (sumif) {
      const [, nombreHoja = '', colCriterio = '', colRef = '', filaRef = '', colSuma = ''] = sumif
      const origen = this.getSheetByName(nombreHoja)
      if (!origen) return '#REF!'
      const criterio = String(pestana.leer(Number(filaRef), columnaANumero(colRef)))
      let suma = 0
      for (let f = 1; f <= origen.getLastRow(); f++) {
        if (String(origen.leer(f, columnaANumero(colCriterio))) !== criterio) continue
        const n = Number(origen.leer(f, columnaANumero(colSuma)))
        if (Number.isFinite(n)) suma += n
      }
      return Math.round(suma * 1000) / 1000
    }
    const estado = /^=IF\(([A-Z]+)(\d+)="","",IF\(([A-Z]+)\2<=\1\2,"Reabastecer",""\)\)$/.exec(formula)
    if (estado) {
      const [, colMin = '', fila = '', colEx = ''] = estado
      const minimo = pestana.leer(Number(fila), columnaANumero(colMin))
      if (minimo === VACIO) return ''
      const existencia = this.evaluarCelda(pestana, Number(fila), columnaANumero(colEx))
      if (typeof existencia === 'string' && existencia.startsWith('#')) return existencia
      return Number(existencia) <= Number(minimo) ? 'Reabastecer' : ''
    }
    return '#FÓRMULA'
  }

  evaluarCelda(pestana: PestanaSimulada, fila: number, columna: number): Valor {
    const v = pestana.leer(fila, columna)
    if (!pestana.esFormula(fila, columna)) return v
    if (pestana.tieneErrorDeAnalisis(fila, columna)) return '#ERROR!'
    return this.evaluar(pestana, String(v))
  }
}
