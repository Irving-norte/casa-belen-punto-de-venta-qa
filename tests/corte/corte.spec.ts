import { FONDO_INICIAL, TEXTOS } from '@/constants'
import { CORTE } from '@/data'
import { corteEsperado } from '@/factories'
import { expect, test } from '@/fixtures'
import { registrarGastos, registrarVenta, registrarVentaPorBusqueda } from '@/flows'
import type { VentaEsperada } from '@/types'
import { formatear, sumar } from '@/utils'

/**
 * Nodo del día: todas las ventas (VG, VA, BU) y todos los gastos (GA) en una
 * sola sesión de navegador, y al final el corte. La limpieza automática borra
 * todo al terminar.
 */
test.describe('Corte de caja', () => {
  test(`${CORTE.id} · ${CORTE.nombre}`, async ({ app }) => {
    test.setTimeout(6 * 60_000)
    const ventas: VentaEsperada[] = []

    await test.step(`Abrir caja con fondo de ${formatear(FONDO_INICIAL)}`, async () => {
      await app.apertura.abrirCaja(FONDO_INICIAL)
      await expect(app.navegacion.cajaAbierta).toBeVisible()
    })

    await test.step(`Registrar las ${CORTE.esperado.ventas} ventas del día`, async () => {
      for (const caso of CORTE.ventas) {
        ventas.push(await registrarVenta(app, caso, null, { folio: ventas.length + 1, enviarTicket: false, revisarVentasDelDia: false }))
      }
      for (const caso of CORTE.busquedas) {
        ventas.push(
          await registrarVentaPorBusqueda(app, caso, null, { folio: ventas.length + 1, enviarTicket: false, revisarVentasDelDia: false }),
        )
      }
      // El ticket queda en pantalla; se vuelve a Vender para la siguiente.
      await app.navegacion.ir('Ventas del día')
      const total = sumar(ventas.map((v) => v.total))
      await expect(app.ventas.resumen).toContainText(`${ventas.length} ventas · ${formatear(total)}`)
      await expect(app.ventas.filas).toHaveCount(ventas.length)
    })

    await test.step('Registrar los gastos del día', async () => {
      await app.navegacion.ir('Gastos')
      await registrarGastos(app, [...CORTE.gastos], { id: CORTE.id })
    })

    const esperado = corteEsperado(ventas, [...CORTE.gastos])

    await test.step('Los datos de prueba cuadran con la tabla del Excel', async () => {
      expect(esperado).toEqual({ ...CORTE.esperado, fondo: FONDO_INICIAL })
    })

    await test.step('El corte muestra el balance por forma de pago', async () => {
      await app.navegacion.ir('Corte')
      const { corte } = app
      await expect(corte.renglon('ventas')).toHaveText(String(esperado.ventas))
      await expect(corte.renglon('totalVendido')).toHaveText(formatear(esperado.totalVendido))
      await expect(corte.renglon('efectivo')).toHaveText(formatear(esperado.efectivo))
      await expect(corte.renglon('tarjeta')).toHaveText(formatear(esperado.tarjeta))
      await expect(corte.renglon('transferencia')).toHaveText(formatear(esperado.transferencia))
      await expect(corte.renglon('fondo')).toHaveText(formatear(esperado.fondo))
      await expect(corte.renglon('masEfectivo')).toHaveText(formatear(esperado.efectivo))
      await expect(corte.renglon('gastos')).toHaveText(formatear(esperado.gastos))
      await expect(corte.renglon('esperado')).toHaveText(formatear(esperado.esperado))
    })

    await test.step('Conteo de efectivo: de menos, de más y exacto', async () => {
      const { corte } = app
      const { deMenos, deMas } = CORTE.conteos
      await corte.teclado.teclear(deMenos)
      await expect(corte.diferencia).toHaveText(`Faltan ${formatear(sumar([esperado.esperado, -deMenos]))}`)

      await corte.teclado.limpiar()
      await corte.teclado.teclear(deMas)
      await expect(corte.diferencia).toHaveText(`Sobran ${formatear(sumar([deMas, -esperado.esperado]))}`)

      await corte.teclado.limpiar()
      await corte.teclado.teclear(esperado.esperado)
      await expect(corte.diferencia).toHaveText(TEXTOS.corte.cuadra)
    })

    await test.step('Cerrar la caja y revisar el último corte', async () => {
      await app.corte.cerrarCaja()
      const { apertura } = app
      await expect(apertura.titulo).toBeVisible()
      await expect(apertura.ultimoCorte).toBeVisible()
      await expect(apertura.valorUltimoCorte('corte-ventas')).toHaveText(String(esperado.ventas))
      await expect(apertura.valorUltimoCorte('corte-total-vendido')).toHaveText(formatear(esperado.totalVendido))
      await expect(apertura.valorUltimoCorte('corte-esperado')).toHaveText(formatear(esperado.esperado))
      await expect(apertura.valorUltimoCorte('ultimo-corte-contado')).toHaveText(formatear(esperado.esperado))

      await app.apertura.titulo.page().reload()
      await expect(apertura.ultimoCorte).toBeVisible()
      await expect(app.navegacion.cajaAbierta).toBeHidden()
    })
  })
})
