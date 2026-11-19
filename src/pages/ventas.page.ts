import type { Locator, Page } from '@playwright/test'

export class VentasPage {
  readonly titulo: Locator
  readonly resumen: Locator
  readonly filas: Locator

  constructor(page: Page) {
    this.titulo = page.getByRole('heading', { name: 'Ventas del día' })
    this.resumen = page.getByTestId('ventas-resumen')
    this.filas = page.getByTestId('venta-fila')
  }

  fila(folio: number): Locator {
    return this.filas.and(this.filas.page().locator(`[data-folio="${folio}"]`))
  }
}
