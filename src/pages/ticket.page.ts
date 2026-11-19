import type { Locator, Page } from '@playwright/test'

export class TicketPage {
  readonly folio: Locator
  readonly total: Locator
  readonly telefono: Locator
  readonly enviar: Locator
  readonly enviado: Locator
  readonly texto: Locator
  readonly error: Locator
  readonly nuevaVenta: Locator

  constructor(page: Page) {
    this.folio = page.getByTestId('ticket-folio')
    this.total = page.getByTestId('ticket-total')
    this.telefono = page.getByLabel('WhatsApp del cliente')
    this.enviar = page.getByRole('button', { name: /ticket por WhatsApp/ })
    this.enviado = page.getByTestId('ticket-enviado')
    this.texto = page.getByTestId('ticket-texto')
    this.error = page.getByRole('main').getByRole('alert')
    this.nuevaVenta = page.getByRole('button', { name: 'Nueva venta' })
  }
}
