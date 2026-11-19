import { expect, type Locator, type Page } from '@playwright/test'
import { TecladoMonto } from '@/components'

export class AperturaPage {
  readonly titulo: Locator
  readonly teclado: TecladoMonto
  readonly abrir: Locator
  readonly error: Locator
  readonly ultimoCorte: Locator

  constructor(page: Page) {
    const main = page.getByRole('main')
    this.titulo = main.getByRole('heading', { name: 'Abrir caja' })
    this.teclado = new TecladoMonto(main)
    this.abrir = main.getByRole('button', { name: 'Abrir caja', exact: true })
    this.error = main.getByRole('alert')
    this.ultimoCorte = page.getByTestId('ultimo-corte')
  }

  /** Dato del último corte (mismos identificadores que la pantalla Corte). */
  valorUltimoCorte(testId: string): Locator {
    return this.ultimoCorte.getByTestId(testId)
  }

  async abrirCaja(fondo: number): Promise<void> {
    await expect(this.titulo).toBeVisible()
    await this.teclado.teclear(fondo)
    await this.abrir.click()
  }
}
