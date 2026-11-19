import { expect, type Locator, type Page } from '@playwright/test'
import { Dialogo } from '@/components'

/** Pantalla que abre el enlace de la hoja (#/vincular?u=…&c=…). */
export class VincularPage {
  readonly titulo: Locator
  readonly estado: Locator
  readonly hoja: Locator
  readonly error: Locator
  readonly vincular: Locator

  constructor(page: Page) {
    const main = page.getByRole('main')
    this.titulo = main.getByRole('heading', { name: 'Vincular con la hoja de inventario' })
    this.estado = page.getByTestId('vincular-estado')
    this.hoja = page.getByTestId('vincular-hoja')
    this.error = page.getByTestId('vincular-error')
    this.vincular = main.getByRole('button', { name: 'Vincular esta tablet' })
  }
}

/** Pantalla «Hoja de inventario» (#/sincronizacion). */
export class SincronizacionPage {
  readonly titulo: Locator
  readonly hojaNombre: Locator
  readonly sinVincular: Locator
  readonly pendientes: Locator
  readonly ultima: Locator
  readonly error: Locator
  readonly rechazados: Locator
  readonly sincronizarAhora: Locator
  readonly catalogo: Locator
  readonly erroresCatalogo: Locator
  readonly desvincular: Locator
  readonly dialogo: Dialogo

  constructor(private readonly page: Page) {
    const main = page.getByRole('main')
    this.titulo = main.getByRole('heading', { name: 'Hoja de inventario' })
    this.hojaNombre = page.getByTestId('hoja-nombre')
    this.sinVincular = page.getByTestId('hoja-sin-vincular')
    this.pendientes = page.getByTestId('pendientes')
    this.ultima = page.getByTestId('ultima-sincronizacion')
    this.error = page.getByTestId('error-sincronizacion')
    this.rechazados = page.getByTestId('rechazados')
    this.sincronizarAhora = main.getByRole('button', { name: 'Sincronizar ahora' })
    this.catalogo = page.getByTestId('catalogo-origen')
    this.erroresCatalogo = page.getByTestId('errores-catalogo')
    this.desvincular = main.getByRole('button', { name: 'Desvincular esta tablet' })
    this.dialogo = new Dialogo(page)
  }

  async abrir(): Promise<void> {
    await this.page.getByTestId('estado-hoja').click()
    await expect(this.titulo).toBeVisible()
  }

  async confirmarDesvincular(): Promise<void> {
    await this.desvincular.click()
    await this.dialogo.boton('Sí, desvincular').click()
  }
}
