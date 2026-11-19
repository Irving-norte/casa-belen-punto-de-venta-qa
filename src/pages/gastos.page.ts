import type { Locator, Page } from '@playwright/test'
import { TecladoMonto } from '@/components'
import { TEXTOS } from '@/constants'
import type { GastoCaso } from '@/types'

export class GastosPage {
  readonly titulo: Locator
  readonly concepto: Locator
  readonly nota: Locator
  readonly teclado: TecladoMonto
  readonly guardar: Locator
  readonly error: Locator
  readonly total: Locator
  readonly filas: Locator
  readonly sinGastos: Locator

  constructor(private readonly page: Page) {
    const main = page.getByRole('main')
    this.titulo = main.getByRole('heading', { name: 'Registrar gasto' })
    this.concepto = main.getByLabel('Concepto')
    this.nota = main.getByLabel('Nota')
    this.teclado = new TecladoMonto(main)
    this.guardar = main.getByRole('button', { name: 'Guardar gasto' })
    this.error = main.getByRole('alert')
    this.total = page.getByTestId('gastos-total')
    this.filas = page.getByTestId('gasto-fila')
    this.sinGastos = page.getByText(TEXTOS.gastos.sinGastos)
  }

  atajo(concepto: string): Locator {
    return this.page.getByRole('main').getByRole('button', { name: concepto, exact: true })
  }

  async registrar(gasto: GastoCaso): Promise<void> {
    if (gasto.atajo) await this.atajo(gasto.concepto).click()
    else await this.concepto.fill(gasto.concepto)
    await this.teclado.teclear(gasto.monto)
    if (gasto.nota) await this.nota.fill(gasto.nota)
    await this.guardar.click()
  }
}
