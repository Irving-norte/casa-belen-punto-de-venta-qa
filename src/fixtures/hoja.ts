import { expect } from '@playwright/test'
import { URL_QA } from '@/constants'
import { HojaSimulada } from '@/utils/hoja-simulada'
import { test as base } from './pruebas'

/** Nombre del archivo de la hoja simulada (lo que la app muestra al vincular). */
export const NOMBRE_HOJA = 'Casa Belén · Inventario'

/**
 * El enlace de «Vincular tablet» apunta a la app de QA publicada. Las pruebas
 * abren la misma ruta (#/vincular?…) en la app que se está probando.
 */
export function rutaDeEnlace(enlace: string, urlApp = URL_QA): string {
  expect(enlace.startsWith(`${urlApp}#/vincular?`), `El enlace debe abrir ${urlApp}`).toBe(true)
  return `./${enlace.slice(urlApp.length)}`
}

interface FixturesHoja {
  /** Hoja de pruebas simulada, preparada como QA y publicada en un puerto local. */
  hoja: HojaSimulada
  /** Precondición «tablet vinculada con la hoja de pruebas y al día». */
  hojaVinculada: void
}

export const test = base.extend<FixturesHoja>({
  // eslint-disable-next-line no-empty-pattern
  hoja: async ({}, use) => {
    const hoja = new HojaSimulada()
    hoja.preparar('qa')
    await hoja.iniciar()
    await use(hoja)
    // La hoja simulada vive en memoria: al detenerla no queda nada.
    await hoja.detener()
  },

  hojaVinculada: async ({ app, hoja, page }, use) => {
    await test.step('Precondición: tablet vinculada con la hoja de pruebas', async () => {
      await page.goto(rutaDeEnlace(hoja.vincular('qa').enlace))
      await expect(app.vincular.hoja).toHaveText(NOMBRE_HOJA)
      await app.vincular.vincular.click()
      await expect(app.sincronizacion.hojaNombre).toHaveText(NOMBRE_HOJA)
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
      await page.goto('./#/')
    })
    await use()
  },
})

export { expect }
