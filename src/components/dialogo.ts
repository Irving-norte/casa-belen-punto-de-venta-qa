import type { Locator, Page } from '@playwright/test'
import { TecladoMonto } from './teclado-monto'

/** Ventana modal (elegir color, capturar precio, confirmar). */
export class Dialogo {
  readonly raiz: Locator
  readonly teclado: TecladoMonto
  readonly alerta: Locator

  constructor(page: Page) {
    this.raiz = page.getByRole('dialog')
    this.teclado = new TecladoMonto(this.raiz)
    this.alerta = this.raiz.getByRole('alert')
  }

  boton(nombre: string): Locator {
    return this.raiz.getByRole('button', { name: nombre, exact: true })
  }
}
