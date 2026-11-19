import type { Locator } from '@playwright/test'
import { paraTeclado } from '@/utils'

/** Teclado numérico en pantalla (apertura, cobro, gastos, corte y precio capturado). */
export class TecladoMonto {
  readonly visor: Locator
  readonly borrar: Locator

  constructor(private readonly contenedor: Locator) {
    this.visor = contenedor.getByTestId('teclado-display')
    this.borrar = contenedor.getByRole('button', { name: 'Borrar', exact: true })
  }

  tecla(caracter: string): Locator {
    return this.contenedor.getByRole('button', { name: caracter, exact: true })
  }

  /** Teclea un monto en pesos (500, 37.5). */
  async teclear(pesos: number): Promise<void> {
    for (const caracter of paraTeclado(pesos)) await this.tecla(caracter).click()
  }

  /** Borra todo lo tecleado (hasta 10 caracteres). */
  async limpiar(): Promise<void> {
    for (let i = 0; i < 10; i++) await this.borrar.click()
  }
}
