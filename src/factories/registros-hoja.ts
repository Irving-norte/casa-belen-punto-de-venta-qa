import { randomUUID } from 'node:crypto'
import { aCentavos } from '@/utils/dinero'

/**
 * Registros con la forma exacta en que la tablet los sube a la hoja
 * (dinero en centavos). Para probar el Apps Script sin pasar por la app.
 */

export interface LineaRegistro {
  productoId: string
  nombre: string
  categoriaId: string
  cantidad: number
  /** Pesos */
  precio: number
  variante?: string
}

export interface VentaRegistro {
  id: string
  folio: number
  cajaId: string
  creadaEn: number
  tipoCliente: 'general' | 'alumno'
  lineas: {
    productoId: string
    nombre: string
    categoriaId: string
    variante?: string
    cantidad: number
    precioUnitario: number
    precioCapturado: boolean
  }[]
  total: number
  pagos: { forma: 'efectivo' | 'tarjeta' | 'transferencia'; monto: number; referencia?: string }[]
  cambio: number
}

export const CAJA_DE_PRUEBA = 'caja-prueba-1'
/** 2026-11-19 11:00 hora de la tienda. */
export const MOMENTO_DE_PRUEBA = Date.UTC(2026, 10, 19, 17, 0, 0)

export function ventaRegistro(datos: {
  folio: number
  lineas: LineaRegistro[]
  pagos?: { forma: 'efectivo' | 'tarjeta' | 'transferencia'; monto: number; referencia?: string }[]
  tipoCliente?: 'general' | 'alumno'
  cambio?: number
  cajaId?: string
}): VentaRegistro {
  const lineas = datos.lineas.map((l) => ({
    productoId: l.productoId,
    nombre: l.nombre,
    categoriaId: l.categoriaId,
    ...(l.variante ? { variante: l.variante } : {}),
    cantidad: l.cantidad,
    precioUnitario: aCentavos(l.precio),
    precioCapturado: false,
  }))
  const total = lineas.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0)
  const pagos = (datos.pagos ?? [{ forma: 'efectivo' as const, monto: total / 100 }]).map((p) => ({
    forma: p.forma,
    monto: aCentavos(p.monto),
    ...(p.referencia ? { referencia: p.referencia } : {}),
  }))
  return {
    id: randomUUID(),
    folio: datos.folio,
    cajaId: datos.cajaId ?? CAJA_DE_PRUEBA,
    creadaEn: MOMENTO_DE_PRUEBA + datos.folio * 60_000,
    tipoCliente: datos.tipoCliente ?? 'general',
    lineas,
    total,
    pagos,
    cambio: aCentavos(datos.cambio ?? 0),
  }
}

export function gastoRegistro(concepto: string, monto: number, nota?: string) {
  return {
    id: randomUUID(),
    cajaId: CAJA_DE_PRUEBA,
    creadoEn: MOMENTO_DE_PRUEBA + 30 * 60_000,
    concepto,
    monto: aCentavos(monto),
    ...(nota ? { nota } : {}),
  }
}

/** Caja cerrada con su corte (montos en pesos). */
export function cajaCerradaRegistro(corte: {
  fondo: number
  ventas: number
  efectivo: number
  tarjeta: number
  transferencia: number
  gastos: number
  contado: number
}) {
  const esperado = corte.fondo + corte.efectivo - corte.gastos
  return {
    id: CAJA_DE_PRUEBA,
    abiertaEn: MOMENTO_DE_PRUEBA,
    cerradaEn: MOMENTO_DE_PRUEBA + 8 * 3_600_000,
    fondoInicial: aCentavos(corte.fondo),
    corte: {
      numeroVentas: corte.ventas,
      ventasEfectivo: aCentavos(corte.efectivo),
      ventasTarjeta: aCentavos(corte.tarjeta),
      ventasTransferencia: aCentavos(corte.transferencia),
      totalVentas: aCentavos(corte.efectivo + corte.tarjeta + corte.transferencia),
      gastos: aCentavos(corte.gastos),
      efectivoEsperado: aCentavos(esperado),
      efectivoContado: aCentavos(corte.contado),
      diferencia: aCentavos(corte.contado - esperado),
    },
  }
}
