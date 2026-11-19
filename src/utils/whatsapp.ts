export interface EnlaceWhatsApp {
  numero: string
  texto: string
}

/** Lee un enlace https://wa.me/<numero>?text=<ticket>. */
export function leerEnlaceWhatsApp(url: string): EnlaceWhatsApp {
  const enlace = new URL(url)
  if (enlace.hostname !== 'wa.me') throw new Error(`No es un enlace de WhatsApp: ${url}`)
  return {
    numero: enlace.pathname.replace(/^\//, ''),
    texto: enlace.searchParams.get('text') ?? '',
  }
}
