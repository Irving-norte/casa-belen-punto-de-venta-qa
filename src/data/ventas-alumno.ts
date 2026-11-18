import type { CasoVenta } from '@/types'

/** Hoja «Ventas Alumno» de docs/casos-de-prueba.xlsx. Precios del catálogo vigente. */
export const VENTAS_ALUMNO: CasoVenta[] = [
  {
    id: 'VA-01',
    nombre: 'Venta Alumno en efectivo exacto',
    tipoCliente: 'Alumno',
    productos: [
      { nombre: 'Molde de barro #1', categoria: 'Moldes de barro', precio: 225 },
      { nombre: 'Coco', categoria: 'Aromas 30 ml', precio: 48 },
      { nombre: 'Parafina China 1 kg', categoria: 'Ceras', precio: 85 },
      { nombre: 'Gotero de plástico grande', categoria: 'Goteros', precio: 17 },
    ],
    aumentar: { producto: 'Coco', cantidad: 2 },
    quitar: 'Gotero de plástico grande',
    pagos: [{ forma: 'Efectivo' }],
    esperado: { total: 406, cambio: 0 },
  },
  {
    id: 'VA-02',
    nombre: 'Venta Alumno pagada con tarjeta',
    tipoCliente: 'Alumno',
    productos: [
      { nombre: 'Mechero', categoria: 'Complementos de escamada', precio: 85 },
      { nombre: 'Molde de madera #2', categoria: 'Moldes de madera', precio: 290 },
      { nombre: 'Aceite desmoldante', categoria: 'Extras', precio: 35 },
      { nombre: 'Pabilo con ficha chico', categoria: 'Pabilos', precio: 3 },
    ],
    aumentar: { producto: 'Pabilo con ficha chico', cantidad: 12 },
    quitar: 'Aceite desmoldante',
    pagos: [{ forma: 'Tarjeta', referencia: '4321' }],
    esperado: { total: 411, cambio: 0 },
  },
  {
    id: 'VA-03',
    nombre: 'Venta Alumno pagada con transferencia',
    tipoCliente: 'Alumno',
    productos: [
      { nombre: 'Base para cirios', categoria: 'Complementos de escamada', precio: 70 },
      { nombre: 'Estructura corazón', categoria: 'Estructuras de madera', precio: 30 },
      { nombre: 'Soya APF ½ kg', categoria: 'Ceras', precio: 75 },
      { nombre: 'Pigmento líquido 10 ml', categoria: 'Pigmentos', precio: 35, variante: 'Azul' },
    ],
    aumentar: { producto: 'Estructura corazón', cantidad: 3 },
    quitar: 'Pigmento líquido 10 ml',
    pagos: [{ forma: 'Transferencia', referencia: 'SPEI 30017' }],
    esperado: { total: 235, cambio: 0 },
  },
  {
    id: 'VA-04',
    nombre: 'Venta Alumno con pago mixto: transferencia + efectivo con cambio',
    tipoCliente: 'Alumno',
    productos: [
      { nombre: 'Escamador', categoria: 'Complementos de escamada', precio: 110 },
      { nombre: 'Molde de barro #2', categoria: 'Moldes de barro', precio: 185 },
      { nombre: 'Lavanda', categoria: 'Aromas ¼ L', precio: 300 },
      { nombre: 'Ficha botón', categoria: 'Pabilos', precio: 45 },
    ],
    aumentar: { producto: 'Molde de barro #2', cantidad: 2 },
    quitar: 'Ficha botón',
    pagos: [
      { forma: 'Transferencia', entregado: 500, referencia: 'SPEI 41260' },
      { forma: 'Efectivo', entregado: 300 },
    ],
    esperado: { total: 780, cambio: 20 },
  },
  {
    id: 'VA-05',
    nombre: 'Venta Alumno con las tres formas de pago, cambiando de General a Alumno',
    tipoCliente: 'Alumno',
    cambiarAAlumno: true,
    productos: [
      { nombre: 'Molde de madera #1', categoria: 'Moldes de madera', precio: 340, precioGeneral: 370 },
      { nombre: 'Mechero', categoria: 'Complementos de escamada', precio: 85, precioGeneral: 95 },
      { nombre: 'Cedro', categoria: 'Temporada 30 ml', precio: 61 },
      { nombre: 'Portavelas de madera', categoria: 'Variables', precio: 120, capturado: true },
    ],
    aumentar: { producto: 'Cedro', cantidad: 2 },
    quitar: 'Portavelas de madera',
    pagos: [
      { forma: 'Efectivo', entregado: 100 },
      { forma: 'Tarjeta', entregado: 200, referencia: '7788' },
      { forma: 'Transferencia', referencia: 'SPEI 77001' },
    ],
    esperado: { total: 547, cambio: 0 },
  },
]
