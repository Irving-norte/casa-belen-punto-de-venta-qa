import { expect, type Locator, type Page } from '@playwright/test'
import { Dialogo, TecladoMonto } from '@/components'

/** Identificadores de cada renglón del resumen del corte. */
export const RENGLONES_CORTE = {
  ventas: 'corte-ventas',
  totalVendido: 'corte-total-vendido',
  efectivo: 'corte-efectivo',
  tarjeta: 'corte-tarjeta',
  transferencia: 'corte-transferencia',
  fondo: 'corte-fondo',
  masEfectivo: 'corte-mas-efectivo',
  gastos: 'corte-gastos',
  esperado: 'corte-esperado',
} as const

export class CortePage {
  readonly titulo: Locator
  readonly teclado: TecladoMonto
  readonly diferencia: Locator
  readonly cerrar: Locator
  readonly dialogo: Dialogo

  constructor(private readonly page: Page) {
    const main = page.getByRole('main')
    this.titulo = main.getByRole('heading', { name: 'Corte de caja' })
    this.teclado = new TecladoMonto(main)
    this.diferencia = main.getByTestId('diferencia')
    this.cerrar = main.getByRole('button', { name: 'Cerrar caja', exact: true })
    this.dialogo = new Dialogo(page)
  }

  renglon(clave: keyof typeof RENGLONES_CORTE): Locator {
    return this.page.getByRole('main').getByTestId(RENGLONES_CORTE[clave])
  }

  async cerrarCaja(): Promise<void> {
    await this.cerrar.click()
    await expect(this.dialogo.raiz).toBeVisible()
    await this.dialogo.boton('Sí, cerrar').click()
  }
}
