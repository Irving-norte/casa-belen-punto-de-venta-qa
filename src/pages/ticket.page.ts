import type { Locator, Page } from '@playwright/test'

/** Panel «Impresora de tickets» (modal). */
export class PanelImpresora {
  readonly raiz: Locator
  readonly aviso: Locator
  readonly pasos: Locator
  readonly elegida: Locator
  readonly sinSoporte: Locator
  readonly buscar: Locator
  readonly cambiar: Locator
  readonly buscarBle: Locator
  readonly prueba: Locator
  readonly olvidar: Locator
  readonly mensaje: Locator
  readonly cerrar: Locator

  constructor(page: Page) {
    this.raiz = page.getByRole('dialog', { name: 'Impresora de tickets' })
    this.aviso = this.raiz.getByText('Conecta la impresora para imprimir el ticket.')
    this.pasos = this.raiz.getByTestId('impresora-pasos')
    this.elegida = this.raiz.getByTestId('impresora-elegida')
    this.sinSoporte = this.raiz.getByTestId('impresora-sin-soporte')
    this.buscar = this.raiz.getByRole('button', { name: 'Buscar impresora', exact: true })
    this.cambiar = this.raiz.getByRole('button', { name: 'Cambiar impresora', exact: true })
    this.buscarBle = this.raiz.getByRole('button', { name: '¿No aparece? Buscar por Bluetooth LE' })
    this.prueba = this.raiz.getByRole('button', { name: 'Imprimir prueba' })
    this.olvidar = this.raiz.getByRole('button', { name: 'Olvidar impresora' })
    this.mensaje = this.raiz.getByTestId('impresora-mensaje')
    this.cerrar = this.raiz.getByRole('button', { name: 'Cerrar' })
  }

  ancho(columnas: 48 | 42): Locator {
    return this.raiz
      .getByRole('radiogroup', { name: 'Ancho del ticket' })
      .getByRole('radio', { name: columnas === 48 ? '48 letras (normal)' : '42 letras' })
  }

  acentos(con: boolean): Locator {
    return this.raiz.getByRole('radiogroup', { name: 'Acentos' }).getByRole('radio', { name: con ? 'Con acentos' : 'Sin acentos' })
  }
}

export class TicketPage {
  readonly folio: Locator
  readonly total: Locator
  readonly imprimir: Locator
  readonly impreso: Locator
  readonly error: Locator
  readonly impresora: Locator
  readonly conectar: Locator
  readonly sinSoporte: Locator
  /** Vista previa: un elemento por renglón del papel. */
  readonly renglones: Locator
  readonly nuevaVenta: Locator
  readonly panel: PanelImpresora

  constructor(page: Page) {
    const main = page.getByRole('main')
    this.folio = page.getByTestId('ticket-folio')
    this.total = page.getByTestId('ticket-total')
    this.imprimir = main.getByRole('button', { name: /^(Imprimir ticket|Imprimir de nuevo|Imprimiendo…)$/ })
    this.impreso = page.getByTestId('ticket-impreso')
    this.error = page.getByTestId('ticket-error')
    this.impresora = page.getByTestId('ticket-impresora')
    this.conectar = main.getByRole('button', { name: /^(Conectar|Cambiar o probar)$/ })
    this.sinSoporte = page.getByTestId('ticket-sin-soporte')
    this.renglones = page.getByTestId('ticket-vista').getByTestId('ticket-renglon')
    this.nuevaVenta = page.getByRole('button', { name: 'Nueva venta' })
    this.panel = new PanelImpresora(page)
  }

  /** Texto de cada renglón de la vista previa, con sus espacios. */
  async textoDeVista(): Promise<string[]> {
    return this.renglones.evaluateAll((els) => els.map((e) => e.textContent ?? ''))
  }
}
