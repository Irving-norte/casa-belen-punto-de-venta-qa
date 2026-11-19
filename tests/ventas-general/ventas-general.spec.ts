import { FONDO_INICIAL, TEXTOS } from '@/constants'
import { VENTAS_GENERAL } from '@/data'
import { expect, test } from '@/fixtures'
import { registrarVenta } from '@/flows'
import { formatear } from '@/utils'

test.describe('Ventas · cliente General', () => {
  const [apertura, ...resto] = VENTAS_GENERAL

  test(`${apertura!.id} · ${apertura!.nombre}`, async ({ app, whatsapp }) => {
    await test.step('Abrir caja: valida el monto tecleado y su guardado', async () => {
      await expect(app.apertura.titulo).toBeVisible()
      await app.apertura.abrir.click()
      await expect(app.apertura.error).toHaveText(TEXTOS.apertura.errorSinMonto)
      await expect(app.navegacion.cajaAbierta).toBeHidden()

      await app.apertura.teclado.teclear(FONDO_INICIAL)
      await expect(app.apertura.teclado.visor).toHaveText(formatear(FONDO_INICIAL))
      await app.apertura.abrir.click()
      await expect(app.navegacion.cajaAbierta).toContainText('Caja abierta desde')

      await app.navegacion.ir('Corte')
      await expect(app.corte.renglon('fondo')).toHaveText(formatear(FONDO_INICIAL))
      await app.navegacion.ir('Vender')
      await expect(app.vender.carritoVacio).toBeVisible()
    })

    await registrarVenta(app, apertura!, whatsapp)
  })

  for (const caso of resto) {
    test(`${caso.id} · ${caso.nombre}`, async ({ app, whatsapp, cajaAbierta }) => {
      void cajaAbierta
      await registrarVenta(app, caso, whatsapp)
    })
  }
})
