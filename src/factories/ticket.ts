import type { VentaEsperada } from '@/types'

/**
 * El ticket impreso que la app DEBE mandar a la impresora, renglón por
 * renglón, según el diseño de 80 mm (encabezado centrado, productos con
 * precio por pieza e importe, total grande, pagos y pie). Se arma aquí, sin
 * usar el código de la app, para que un error de formato en la app se vea.
 */

export interface FormatoTicket {
  /** Letras por renglón con la letra normal. */
  columnas: 48 | 42
  acentos: boolean
}

export const TICKET_NORMAL: FormatoTicket = { columnas: 48, acentos: true }

export interface RenglonEsperado {
  texto: string | RegExp
  grande?: boolean
  /** Tramos en negrita, sin espacios a los lados. */
  negritas?: string[]
}

const NEGOCIO = 'CERERÍA CASA BELÉN'

/** Siempre con centavos y separador de miles: 1234 → «$1,234.00». */
export function dineroTicket(pesos: number): string {
  const [enteros, centavos] = (Math.round(pesos * 100) / 100).toFixed(2).split('.')
  return `$${enteros!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${centavos}`
}

/** «Sin acentos»: solo letras básicas. */
function basico(texto: string): string {
  const cambios: Record<string, string> = { '×': 'x', '½': '1/2', '¼': '1/4', '¡': '', '¿': '', '·': '-', '«': '"', '»': '"' }
  return [...texto]
    .map((l) => cambios[l] ?? l.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .join('')
}

function centro(texto: string, ancho: number): string {
  return ' '.repeat(Math.floor((ancho - texto.length) / 2)) + texto
}

function lados(izquierda: string, derecha: string, ancho: number): string {
  return izquierda + ' '.repeat(Math.max(1, ancho - izquierda.length - derecha.length)) + derecha
}

/** Por palabras; los renglones que siguen van con sangría bajo el nombre. */
function partir(texto: string, ancho: number, sangria: number): string[] {
  const renglones: string[] = []
  let actual = ''
  for (const palabra of texto.split(' ')) {
    const prueba = actual ? `${actual} ${palabra}` : (renglones.length ? ' '.repeat(sangria) : '') + palabra
    if (prueba.length <= ancho) actual = prueba
    else {
      renglones.push(actual)
      actual = ' '.repeat(sangria) + palabra
    }
  }
  return [...renglones, actual]
}

function fechaDeHoy(): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Mexico_City' }).format(new Date())
}

export function ticketEsperado(venta: VentaEsperada, formato: FormatoTicket = TICKET_NORMAL): RenglonEsperado[] {
  const { columnas } = formato
  const t = (texto: string) => (formato.acentos ? texto : basico(texto))
  const raya = { texto: '-'.repeat(columnas) }
  const folio = `TICKET #${String(venta.folio).padStart(3, '0')}`
  const negocio = t(NEGOCIO)

  const productos = venta.lineas.flatMap((l) => {
    const nombre = l.variante ? `${l.nombre} (${l.variante})` : l.nombre
    const importe = dineroTicket(l.subtotal)
    const prefijo = t(`${l.cantidad} × `)
    const [primero, ...resto] = partir(prefijo + t(nombre), columnas - importe.length - 1, prefijo.length)
    return [
      { texto: lados(primero!, importe, columnas), negritas: [primero!.trim(), importe] },
      ...resto.map((r) => ({ texto: r, negritas: [r.trim()] })),
      { texto: t(`${l.cantidad} × ${dineroTicket(l.precio)} c/u`) },
    ]
  })

  // Pagos agrupados por forma, en el orden en que se cobraron. El efectivo
  // recibido incluye el cambio.
  const porForma = new Map<string, number>()
  for (const p of venta.pagos) porForma.set(p.forma, (porForma.get(p.forma) ?? 0) + p.abona)
  const pagos: RenglonEsperado[] = [...porForma].map(([forma, monto]) =>
    forma === 'Efectivo'
      ? { texto: lados('Efectivo recibido', dineroTicket(monto + venta.cambio), columnas) }
      : { texto: lados(forma, dineroTicket(monto), columnas) },
  )
  if (porForma.has('Efectivo')) {
    pagos.push({ texto: lados('Cambio', dineroTicket(venta.cambio), columnas), negritas: ['Cambio', dineroTicket(venta.cambio)] })
  }

  return [
    { texto: centro(negocio, columnas / 2), grande: true, negritas: [negocio] },
    { texto: centro(t('VELAS ARTESANALES · CERERÍA'), columnas) },
    { texto: centro('Gracias por preferirnos', columnas) },
    raya,
    { texto: lados(folio, fechaDeHoy(), columnas), negritas: [folio] },
    { texto: /^\d{1,2}:\d{2} [ap]\.m\.$/ },
    ...(venta.alumno ? [{ texto: 'Cliente: Alumno' }] : []),
    raya,
    { texto: t('CANT. DESCRIPCIÓN') },
    ...productos,
    raya,
    { texto: lados('TOTAL', dineroTicket(venta.total), columnas / 2), grande: true, negritas: ['TOTAL', dineroTicket(venta.total)] },
    raya,
    ...pagos,
    raya,
    { texto: centro(t('¡GRACIAS POR TU COMPRA!'), columnas), negritas: [t('¡GRACIAS POR TU COMPRA!')] },
    { texto: centro('Esperamos verte pronto', columnas) },
    { texto: centro(negocio, columnas) },
  ]
}
