import type { Page } from '@playwright/test'
import { NOMBRE_BASE_DE_DATOS, PREFIJO_ALMACENAMIENTO } from '@/constants'

/**
 * Borra todo lo que la app guardó en el navegador: la base IndexedDB del
 * entorno QA y sus claves de localStorage. Regresa lo que quedó, para
 * poder verificar que la limpieza fue completa.
 */
export async function borrarDatosApp(page: Page): Promise<{ bases: string[]; claves: string[] }> {
  if (page.isClosed() || !page.url().startsWith('http')) return { bases: [], claves: [] }

  return page.evaluate(
    async ({ base, prefijo }) => {
      for (const clave of Object.keys(localStorage)) {
        if (clave.startsWith(prefijo)) localStorage.removeItem(clave)
      }
      await new Promise<void>((resolver, rechazar) => {
        const solicitud = indexedDB.deleteDatabase(base)
        solicitud.onsuccess = () => resolver()
        solicitud.onerror = () => rechazar(solicitud.error)
        // La app (Dexie) cierra su conexión al recibir el aviso de borrado;
        // si algo la mantiene abierta, el borrado espera aquí.
        solicitud.onblocked = () => undefined
      })
      const bases = (await indexedDB.databases()).map((b) => b.name ?? '')
      return {
        bases: bases.filter((nombre) => nombre === base),
        claves: Object.keys(localStorage).filter((c) => c.startsWith(prefijo)),
      }
    },
    { base: NOMBRE_BASE_DE_DATOS, prefijo: PREFIJO_ALMACENAMIENTO },
  )
}
