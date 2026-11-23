import { VENTAS_ALUMNO } from '@/data'
import { test } from '@/fixtures'
import { registrarVenta } from '@/flows'

test.describe('Ventas · cliente Alumno', () => {
  for (const caso of VENTAS_ALUMNO) {
    test(`${caso.id} · ${caso.nombre}`, async ({ app, impresora, cajaAbierta }) => {
      void cajaAbierta
      await registrarVenta(app, caso, impresora)
    })
  }
})
