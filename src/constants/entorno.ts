/** Entorno QA de la app (GitHub Pages de este repo). */
export const URL_QA = 'https://irving-norte.github.io/casa-belen-punto-de-venta-qa/'

/** Ruta con la que se construye la app en QA (VITE_BASE). */
export const RUTA_BASE_QA = '/casa-belen-punto-de-venta-qa/'

/**
 * Nombres que usa la app construida con VITE_ENTORNO=qa. Si la app los
 * cambia (src/lib/entorno.ts del repo de la app), cámbialos aquí.
 */
export const NOMBRE_BASE_DE_DATOS = 'casa-belen-pos-qa'
export const PREFIJO_ALMACENAMIENTO = 'casa-belen-pos-qa'

/** Puerto del servidor local que sirve la app construida (QA_SITIO_LOCAL). */
export const PUERTO_LOCAL = 4173

/**
 * Hacia dónde apuntan las pruebas (lo usa playwright.config.ts):
 *  - QA_URL=<url>               → cualquier URL (p. ej. la de QA publicada).
 *  - QA_SITIO_LOCAL=<carpeta>   → la app construida servida en 127.0.0.1.
 *  - Ninguna                    → el entorno QA publicado en GitHub Pages.
 */
export function urlDePruebas(): string {
  const local = `http://127.0.0.1:${PUERTO_LOCAL}${RUTA_BASE_QA}`
  return process.env.QA_URL ?? (process.env.QA_SITIO_LOCAL ? local : URL_QA)
}
