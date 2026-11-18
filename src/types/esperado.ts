import type { FormaPago } from './caso'

/** Un pago ya resuelto: cuánto abona a la venta (sin el cambio). */
export interface PagoEsperado {
  forma: FormaPago
  abona: number
  entregado?: number
  referencia?: string
}

/** Lo que la venta debe mostrar al terminar (lo que en C# sería la instancia). */
export interface VentaEsperada {
  id: string
  folio: number
  alumno: boolean
  lineas: { nombre: string; variante?: string; cantidad: number; precio: number; subtotal: number }[]
  total: number
  pagos: PagoEsperado[]
  cambio: number
  /** «Tarjeta + Efectivo», en el orden en que se registraron. */
  formas: string
}

export interface CorteEsperado {
  ventas: number
  totalVendido: number
  efectivo: number
  tarjeta: number
  transferencia: number
  fondo: number
  gastos: number
  esperado: number
}
