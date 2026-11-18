import type { Locator, Page } from '@playwright/test'

export type Seccion = 'Vender' | 'Ventas del día' | 'Gastos' | 'Corte'

/** Encabezado: pestañas, franja de QA y estado de la caja. */
export class Navegacion {
  readonly franjaQa: Locator
  readonly cajaAbierta: Locator

  constructor(private readonly page: Page) {
    this.franjaQa = page.getByTestId('franja-qa')
    this.cajaAbierta = page.getByTestId('caja-abierta')
  }

  pestana(seccion: Seccion): Locator {
    return this.page.getByRole('navigation').getByRole('link', { name: seccion, exact: true })
  }

  async ir(seccion: Seccion): Promise<void> {
    await this.pestana(seccion).click()
  }
}
