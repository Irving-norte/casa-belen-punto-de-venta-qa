import { BUSQUEDAS } from '@/data'
import { test } from '@/fixtures'
import { registrarVentaPorBusqueda } from '@/flows'

test.describe('Ventas · desde la barra de búsqueda', () => {
  for (const caso of BUSQUEDAS) {
    test(`${caso.id} · ${caso.nombre}`, async ({ app, whatsapp, cajaAbierta }) => {
      void cajaAbierta
      await registrarVentaPorBusqueda(app, caso, whatsapp)
    })
  }
})
