import { expect, type Locator, type Page } from '@playwright/test'
import { TecladoMonto } from '@/components'
import { TEXTOS } from '@/constants'
import type { FormaPago, PagoCaso } from '@/types'

export class CobrarPage {
  readonly titulo: Locator
  readonly total: Locator
  readonly falta: Locator
  readonly teclado: TecladoMonto
  readonly referencia: Locator
  readonly error: Locator
  readonly cambio: Locator
  readonly pagoCompleto: Locator
  readonly pagos: Locator
  readonly terminar: Locator

  constructor(private readonly page: Page) {
    const main = page.getByRole('main')
    this.titulo = main.getByRole('heading', { name: 'Cobrar' })
    this.total = page.getByTestId('cobro-total')
    this.falta = page.getByTestId('cobro-falta')
    this.teclado = new TecladoMonto(main)
    this.referencia = page.getByPlaceholder(/Referencia/)
    this.error = main.getByRole('alert')
    this.cambio = page.getByTestId('cambio')
    this.pagoCompleto = page.getByText(TEXTOS.cobro.pagoCompleto, { exact: true })
    this.pagos = page.getByTestId('pago-registrado')
    this.terminar = page.getByRole('button', { name: 'Terminar venta' })
  }

  forma(forma: FormaPago): Locator {
    return this.page.getByRole('radiogroup', { name: 'Forma de pago' }).getByRole('radio', { name: forma })
  }

  registrar(forma: FormaPago): Locator {
    return this.page.getByRole('button', { name: `Registrar pago en ${forma.toLowerCase()}` })
  }

  /** Elige la forma, teclea el monto (si lo hay), la referencia y registra el pago. */
  async pagar(pago: PagoCaso): Promise<void> {
    await this.forma(pago.forma).click()
    if (pago.entregado !== undefined) await this.teclado.teclear(pago.entregado)
    if (pago.referencia && pago.forma !== 'Efectivo') await this.referencia.fill(pago.referencia)
    await this.registrar(pago.forma).click()
  }

  async terminarVenta(): Promise<void> {
    await this.terminar.click()
    await expect(this.titulo).toBeHidden()
  }
}
