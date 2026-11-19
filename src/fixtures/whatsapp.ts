import type { BrowserContext, Page } from '@playwright/test'
import { leerEnlaceWhatsApp, type EnlaceWhatsApp } from '@/utils'

/**
 * Las pruebas nunca abren WhatsApp: cualquier petición a wa.me se contesta
 * aquí con una página vacía y se guarda su dirección para validarla.
 * El envío real es el caso manual MA-01.
 */
export class CapturaWhatsApp {
  private constructor(private readonly context: BrowserContext) {}

  static async activar(context: BrowserContext): Promise<CapturaWhatsApp> {
    await context.route(/^https:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//, (ruta) =>
      ruta.fulfill({ status: 200, contentType: 'text/html', body: '<title>WhatsApp (simulado en pruebas)</title>' }),
    )
    return new CapturaWhatsApp(context)
  }

  /** Ejecuta la acción que abre WhatsApp y regresa el enlace que se abrió. */
  async capturar(accion: () => Promise<void>): Promise<EnlaceWhatsApp> {
    const [ventana] = await Promise.all([this.context.waitForEvent('page'), accion()])
    const enlace = await this.urlDe(ventana)
    await ventana.close()
    return leerEnlaceWhatsApp(enlace)
  }

  private async urlDe(ventana: Page): Promise<string> {
    if (!ventana.url().startsWith('https://wa.me/')) await ventana.waitForURL(/^https:\/\/wa\.me\//)
    return ventana.url()
  }
}
