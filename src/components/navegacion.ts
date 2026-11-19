import type { Locator, Page } from '@playwright/test'

export type Seccion = 'Vender' | 'Ventas del día' | 'Gastos' | 'Corte'

/** Encabezado: pestañas, franja de QA, estado de la hoja y de la caja. */
export class Navegacion {
  readonly franjaQa: Locator
  readonly cajaAbierta: Locator
  /** «Hoja al día», «2 por subir», «Sin internet · …», «Hoja sin vincular»… */
  readonly estadoHoja: Locator

  constructor(private readonly page: Page) {
    this.franjaQa = page.getByTestId('franja-qa')
    this.cajaAbierta = page.getByTestId('caja-abierta')
    this.estadoHoja = page.getByTestId('estado-hoja')
  }

  pestana(seccion: Seccion): Locator {
    return this.page.getByRole('navigation').getByRole('link', { name: seccion, exact: true })
  }

  async ir(seccion: Seccion): Promise<void> {
    await this.pestana(seccion).click()
  }
}
