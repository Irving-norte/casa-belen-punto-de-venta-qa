import type { ProductoCaso } from '@/types'

/**
 * Hoja «Sincronización» de docs/casos-de-prueba.xlsx: lo que se cambia en la
 * hoja de pruebas antes de vincular la tablet.
 */

/** SI-07 · Cambios en la pestaña Productos. */
export const CAMBIOS_DE_CATALOGO = {
  precioNuevo: { id: 'aromas-30-vainilla', nombre: 'Vainilla', categoria: 'Aromas 30 ml', antes: 52, despues: 55 },
  productoNuevo: { nombre: 'Maracuyá', categoria: 'Aromas 30 ml', precio: 58, idEsperado: 'aromas-30-maracuya' },
  desactivado: { id: 'velas-vela-de-punta-chica', nombre: 'Vela de punta chica', categoria: 'Velas de punta' },
  conError: { id: 'aromas-30-cereza', nombre: 'Cereza', mensaje: 'Cereza: falta el Precio General' },
} as const

/**
 * SI-08 · Conteo físico inicial (pestaña Existencias, columna Conteo). Lo que
 * no se cuenta no muestra existencia en la tablet (la hoja no la conoce).
 */
export const CONTEOS = {
  mechero: { clave: 'complementos-mechero', conteo: 2 },
  escamador: { clave: 'complementos-escamador', conteo: 0 },
  pigmentoAzul: { clave: 'pigmentos-pigmento-liquido-10-ml | Azul', conteo: 1 },
  pigmentoRojo: { clave: 'pigmentos-pigmento-liquido-10-ml | Rojo', conteo: 0 },
  soya: { clave: 'Soya APF', conteo: 1500 },
} as const

export const MECHERO: ProductoCaso = { nombre: 'Mechero', categoria: 'Complementos de escamada', precio: 95 }
export const PIGMENTO_ROJO: ProductoCaso = {
  nombre: 'Pigmento líquido 10 ml', categoria: 'Pigmentos', precio: 35, variante: 'Rojo',
}
