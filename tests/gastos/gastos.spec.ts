import { GASTOS } from '@/data'
import { expect, test } from '@/fixtures'
import { registrarGastos, validarGastoIncompleto } from '@/flows'
import { formatear } from '@/utils'

test.describe('Gastos del día', () => {
  for (const caso of GASTOS) {
    test(`${caso.id} · ${caso.nombre}`, async ({ app, cajaAbierta }) => {
      void cajaAbierta
      await app.navegacion.ir('Gastos')
      await expect(app.gastos.titulo).toBeVisible()
      await expect(app.gastos.sinGastos).toBeVisible()

      if (caso.validaciones) await validarGastoIncompleto(app, caso)

      const total = await registrarGastos(app, caso.gastos, { id: caso.id })
      expect(total).toBe(caso.esperado.total)
      await expect(app.gastos.total).toHaveText(`Total ${formatear(caso.esperado.total)}`)
      await expect(app.gastos.filas).toHaveCount(caso.gastos.length)

      // El más reciente arriba: la lista va en orden inverso al registro.
      const conceptos = await app.gastos.filas.getByTestId('gasto-concepto').allInnerTexts()
      expect(conceptos).toEqual(caso.gastos.map((g) => g.concepto).reverse())
    })
  }
})
