import { expect, test } from '@playwright/test'
import { TEXTOS } from '@/constants'
import type { Pantallas } from '@/fixtures'
import type { CasoGasto, GastoCaso } from '@/types'
import { formatear, sumar } from '@/utils'

/** Registra gastos verificando que lo guardado sea igual a lo tecleado. */
export async function registrarGastos(
  app: Pantallas,
  gastos: GastoCaso[],
  { totalPrevio = 0, id = '' }: { totalPrevio?: number; id?: string } = {},
): Promise<number> {
  const { gastos: pantalla } = app
  let total = totalPrevio
  for (const gasto of gastos) {
    await test.step(`${id} · gasto «${gasto.concepto}» de ${formatear(gasto.monto)}`, async () => {
      const filasAntes = await pantalla.filas.count()
      await pantalla.registrar(gasto)
      total = sumar([total, gasto.monto])

      // El formulario se limpia y el gasto aparece arriba de la lista.
      await expect(pantalla.concepto).toHaveValue('')
      await expect(pantalla.teclado.visor).toHaveText('$0')
      await expect(pantalla.filas).toHaveCount(filasAntes + 1)
      const nuevo = pantalla.filas.first()
      await expect(nuevo.getByTestId('gasto-concepto')).toHaveText(gasto.concepto)
      await expect(nuevo.getByTestId('gasto-monto')).toHaveText(formatear(gasto.monto))
      if (gasto.nota) await expect(nuevo.getByTestId('gasto-nota')).toHaveText(gasto.nota)
      else await expect(nuevo.getByTestId('gasto-nota')).toHaveCount(0)
      await expect(pantalla.total).toHaveText(`Total ${formatear(total)}`)
    })
  }
  return total
}

/** Concepto vacío y monto vacío no se guardan. */
export async function validarGastoIncompleto(app: Pantallas, caso: CasoGasto): Promise<void> {
  const { gastos } = app
  await test.step(`${caso.id} · validaciones de concepto y monto`, async () => {
    await gastos.teclado.teclear(20)
    await gastos.guardar.click()
    await expect(gastos.error).toHaveText(TEXTOS.gastos.errorConcepto)
    await expect(gastos.filas).toHaveCount(0)

    await gastos.concepto.fill(caso.gastos[0]!.concepto)
    await gastos.teclado.limpiar()
    await gastos.guardar.click()
    await expect(gastos.error).toHaveText(TEXTOS.gastos.errorMonto)
    await expect(gastos.filas).toHaveCount(0)
    await expect(gastos.sinGastos).toBeVisible()
  })
}
