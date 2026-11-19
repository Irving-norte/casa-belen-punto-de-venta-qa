import { test as base, expect } from '@playwright/test'
import { Navegacion } from '@/components'
import { FONDO_INICIAL } from '@/constants'
import {
  AperturaPage,
  CobrarPage,
  CortePage,
  GastosPage,
  SincronizacionPage,
  TicketPage,
  VenderPage,
  VentasPage,
  VincularPage,
} from '@/pages'
import { borrarDatosApp } from '@/utils'
import { CapturaWhatsApp } from './whatsapp'

/** Todas las pantallas de la app, listas para cada prueba. */
export interface Pantallas {
  navegacion: Navegacion
  apertura: AperturaPage
  vender: VenderPage
  cobrar: CobrarPage
  ticket: TicketPage
  ventas: VentasPage
  gastos: GastosPage
  corte: CortePage
  vincular: VincularPage
  sincronizacion: SincronizacionPage
}

interface Fixtures {
  app: Pantallas
  whatsapp: CapturaWhatsApp
  /** Precondición «Caja abierta con fondo de $500». Solo corre si la prueba la pide. */
  cajaAbierta: void
  /** Automática: abre la app al empezar y borra sus datos al terminar. */
  datosLimpios: void
}

export const test = base.extend<Fixtures>({
  datosLimpios: [
    async ({ page }, use, testInfo) => {
      await page.goto('./')
      await expect(page.getByTestId('franja-qa'), 'La app debe ser la de QA, nunca la de producción').toBeVisible()

      await use()

      // Limpieza: no dejar datos de prueba en el navegador, pase o falle la prueba.
      const restante = await borrarDatosApp(page)
      testInfo.annotations.push({
        type: 'limpieza',
        description:
          restante.bases.length === 0 && restante.claves.length === 0
            ? 'Base de datos y almacenamiento de la app borrados'
            : `Quedaron datos: ${JSON.stringify(restante)}`,
      })
      expect(restante, 'Los datos de la prueba deben quedar borrados').toEqual({ bases: [], claves: [] })
    },
    { auto: true },
  ],

  // Depende de datosLimpios para que la app ya esté abierta al entregarse.
  app: async ({ page, datosLimpios }, use) => {
    void datosLimpios
    await use({
      navegacion: new Navegacion(page),
      apertura: new AperturaPage(page),
      vender: new VenderPage(page),
      cobrar: new CobrarPage(page),
      ticket: new TicketPage(page),
      ventas: new VentasPage(page),
      gastos: new GastosPage(page),
      corte: new CortePage(page),
      vincular: new VincularPage(page),
      sincronizacion: new SincronizacionPage(page),
    })
  },

  whatsapp: async ({ context }, use) => {
    await use(await CapturaWhatsApp.activar(context))
  },

  cajaAbierta: async ({ app }, use) => {
    await test.step(`Precondición: caja abierta con fondo de $${FONDO_INICIAL}`, async () => {
      await app.apertura.abrirCaja(FONDO_INICIAL)
      await expect(app.navegacion.cajaAbierta).toBeVisible()
    })
    await use()
  },
})

export { expect }
