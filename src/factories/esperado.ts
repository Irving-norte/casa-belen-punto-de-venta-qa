import { FONDO_INICIAL } from '@/constants'
import type {
  CasoBusqueda,
  CasoVenta,
  CorteEsperado,
  GastoCaso,
  PagoCaso,
  PagoEsperado,
  VentaEsperada,
} from '@/types'
import { sumar } from '@/utils'

/**
 * Construye lo que la app DEBE mostrar a partir de los datos de cada caso
 * (lo que en C# serían las instancias de los objetos). También verifica que
 * el total escrito a mano en los datos coincida con el calculado, para que
 * un error de captura en los datos no pase como error de la app.
 */

/** Cuánto abona cada pago: el efectivo de más es cambio, no venta. */
export function resolverPagos(pagos: PagoCaso[], total: number): { pagos: PagoEsperado[]; cambio: number } {
  let falta = total
  let cambio = 0
  const resueltos = pagos.map((p) => {
    const abona = p.entregado === undefined ? falta : Math.min(p.entregado, falta)
    if (p.forma === 'Efectivo' && p.entregado !== undefined) cambio = sumar([cambio, p.entregado, -abona])
    falta = sumar([falta, -abona])
    return { forma: p.forma, abona, entregado: p.entregado, referencia: p.referencia }
  })
  if (falta !== 0) throw new Error(`Los pagos no cubren el total (${total}); faltan ${falta}`)
  return { pagos: resueltos, cambio }
}

function formasEnOrden(pagos: PagoCaso[]): string {
  return [...new Set(pagos.map((p) => p.forma))].join(' + ')
}

function exigir(condicion: boolean, mensaje: string): void {
  if (!condicion) throw new Error(`Datos de prueba inconsistentes: ${mensaje}`)
}

export function ventaEsperada(caso: CasoVenta, folio = 1): VentaEsperada {
  const lineas = caso.productos
    .filter((p) => p.nombre !== caso.quitar)
    .map((p) => {
      const cantidad = p.nombre === caso.aumentar.producto ? caso.aumentar.cantidad : 1
      return { nombre: p.nombre, variante: p.variante, cantidad, precio: p.precio, subtotal: p.precio * cantidad }
    })
  const total = sumar(lineas.map((l) => l.subtotal))
  exigir(total === caso.esperado.total, `${caso.id}: total calculado ${total} ≠ ${caso.esperado.total}`)
  exigir(new Set(caso.productos.map((p) => p.categoria)).size >= 3, `${caso.id}: menos de 3 categorías`)

  const { pagos, cambio } = resolverPagos(caso.pagos, total)
  exigir(cambio === caso.esperado.cambio, `${caso.id}: cambio calculado ${cambio} ≠ ${caso.esperado.cambio}`)

  return {
    id: caso.id,
    folio,
    alumno: caso.tipoCliente === 'Alumno',
    lineas,
    total,
    pagos,
    cambio,
    formas: formasEnOrden(caso.pagos),
  }
}

export function busquedaEsperada(caso: CasoBusqueda, folio = 1): VentaEsperada {
  const lineas = caso.busquedas.map((b) => ({
    nombre: b.elegir.nombre,
    cantidad: 1,
    precio: b.elegir.precio,
    subtotal: b.elegir.precio,
  }))
  const total = sumar(lineas.map((l) => l.subtotal))
  exigir(total === caso.esperado.total, `${caso.id}: total calculado ${total} ≠ ${caso.esperado.total}`)
  const { pagos, cambio } = resolverPagos(caso.pagos, total)
  exigir(cambio === caso.esperado.cambio, `${caso.id}: cambio calculado ${cambio} ≠ ${caso.esperado.cambio}`)
  return { id: caso.id, folio, alumno: false, lineas, total, pagos, cambio, formas: formasEnOrden(caso.pagos) }
}

/** Total del carrito justo después de agregar los productos (antes de + y Quitar). */
export function totalAlAgregar(caso: CasoVenta, conTarifaFinal: boolean): number {
  return sumar(caso.productos.map((p) => (conTarifaFinal ? p.precio : (p.precioGeneral ?? p.precio))))
}

export function corteEsperado(ventas: VentaEsperada[], gastos: GastoCaso[], fondo = FONDO_INICIAL): CorteEsperado {
  const pagos = ventas.flatMap((v) => v.pagos)
  const porForma = (forma: PagoEsperado['forma']) => sumar(pagos.filter((p) => p.forma === forma).map((p) => p.abona))
  const efectivo = porForma('Efectivo')
  const tarjeta = porForma('Tarjeta')
  const transferencia = porForma('Transferencia')
  const totalGastos = sumar(gastos.map((g) => g.monto))
  return {
    ventas: ventas.length,
    totalVendido: sumar([efectivo, tarjeta, transferencia]),
    efectivo,
    tarjeta,
    transferencia,
    fondo,
    gastos: totalGastos,
    esperado: sumar([fondo, efectivo, -totalGastos]),
  }
}
