/**
 * Lee lo que la app mandó a la impresora (bytes ESC/POS) como la impresora
 * lo imprimiría: renglones de texto con su negrita y su tamaño, y los
 * comandos que llegaron. Así las pruebas validan el papel, no el código.
 *
 * La tabla PC850 sale de la página de códigos estándar (Python «cp850»), no
 * de la app: si la app codificara mal un acento, aquí se vería.
 */
const PC850_ALTA =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´\u00ad±‗¾¶§÷¸°¨·¹³²■\u00a0'

export interface RenglonImpreso {
  texto: string
  /** Letras en negrita dentro del renglón (texto de cada tramo en negrita). */
  negritas: string[]
  grande: boolean
}

export interface TicketImpreso {
  renglones: RenglonImpreso[]
  /** Página de códigos elegida con ESC t (undefined = la de fábrica). */
  paginaDeCodigos?: number
  /** Se mandó FS . (sin modo chino). */
  sinModoChino: boolean
  cortado: boolean
  /** Algún byte de texto de 0x80 en adelante (acentos, ×, ½…). */
  usaBytesAltos: boolean
  comandosDesconocidos: string[]
}

const hex = (n: number) => n.toString(16).padStart(2, '0')

export function leerTicket(bytes: ArrayLike<number>): TicketImpreso {
  const b = Array.from(bytes)
  const ticket: TicketImpreso = {
    renglones: [],
    sinModoChino: false,
    cortado: false,
    usaBytesAltos: false,
    comandosDesconocidos: [],
  }
  let negrita = false
  let grande = false
  /** El renglón lleva letras en tamaño doble (GS ! se apaga antes del salto). */
  let renglonGrande = false
  let texto = ''
  let negritas: string[] = []
  let tramo = ''
  const cerrarTramo = () => {
    if (tramo) negritas.push(tramo)
    tramo = ''
  }

  for (let i = 0; i < b.length; i++) {
    const x = b[i]!
    if (x === 0x1b && b[i + 1] === 0x40) {
      i += 1 // ESC @
      negrita = false
      grande = false
    } else if (x === 0x1c && b[i + 1] === 0x2e) {
      i += 1 // FS .
      ticket.sinModoChino = true
    } else if (x === 0x1b && b[i + 1] === 0x74) {
      ticket.paginaDeCodigos = b[i + 2]
      i += 2 // ESC t n
    } else if (x === 0x1b && b[i + 1] === 0x45) {
      cerrarTramo()
      negrita = b[i + 2] === 1
      i += 2 // ESC E n
    } else if (x === 0x1d && b[i + 1] === 0x21) {
      grande = b[i + 2] === 0x11
      i += 2 // GS ! n
    } else if (x === 0x1b && b[i + 1] === 0x64) {
      i += 2 // ESC d n
    } else if (x === 0x1d && b[i + 1] === 0x56 && b[i + 2] === 0x42) {
      ticket.cortado = true
      i += 3 // GS V 66 n
    } else if (x === 0x0a) {
      cerrarTramo()
      ticket.renglones.push({ texto, negritas, grande: renglonGrande })
      texto = ''
      negritas = []
      renglonGrande = false
    } else if (x < 0x20) {
      ticket.comandosDesconocidos.push(b.slice(i, i + 3).map(hex).join(' '))
    } else {
      const letra = x < 0x80 ? String.fromCharCode(x) : PC850_ALTA[x - 0x80]!
      if (x >= 0x80) ticket.usaBytesAltos = true
      texto += letra
      if (negrita) tramo += letra
      if (grande) renglonGrande = true
    }
  }
  return ticket
}

/** Corta el flujo de bytes en tickets: cada uno empieza con ESC @. */
export function separarTrabajos(bytes: number[]): number[][] {
  const trabajos: number[][] = []
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x1b && bytes[i + 1] === 0x40) trabajos.push([])
    if (!trabajos.length) trabajos.push([])
    trabajos[trabajos.length - 1]!.push(bytes[i]!)
  }
  return trabajos
}
