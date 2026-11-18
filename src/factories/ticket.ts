import { TEXTOS } from '@/constants'
import type { VentaEsperada } from '@/types'
import { formatear } from '@/utils'

/**
 * Renglones que el ticket de WhatsApp debe contener, en el formato de la app
 * (src/lib/dominio/ticket.ts del repo de la app).
 */
export function renglonesTicket(venta: VentaEsperada): string[] {
  const lineas = venta.lineas.map((l) => {
    const nombre = l.variante ? `${l.nombre} (${l.variante})` : l.nombre
    return `${l.cantidad} × ${nombre} — ${formatear(l.precio)} c/u — ${formatear(l.subtotal)}`
  })
  const pagos = venta.pagos.map((p) => `${p.forma}: ${formatear(p.abona)}`)
  if (venta.cambio > 0) pagos.push(`Cambio: ${formatear(venta.cambio)}`)
  return [
    TEXTOS.ticket.encabezado,
    `Ticket #${venta.folio} · `,
    ...(venta.alumno ? [TEXTOS.ticket.clienteAlumno] : []),
    ...lineas,
    `TOTAL: ${formatear(venta.total)}`,
    ...pagos,
    TEXTOS.ticket.despedida,
  ]
}
