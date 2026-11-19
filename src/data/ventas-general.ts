import type { CasoVenta } from '@/types'

/** Hoja «Ventas General» de docs/casos-de-prueba.xlsx. Precios del catálogo vigente. */
export const VENTAS_GENERAL: CasoVenta[] = [
  {
    id: 'VG-01',
    nombre: 'Apertura de caja y venta General en efectivo con cambio',
    tipoCliente: 'General',
    apertura: true,
    productos: [
      { nombre: 'Vela de punta grande', categoria: 'Velas de punta', precio: 22 },
      { nombre: 'Vainilla', categoria: 'Aromas 30 ml', precio: 52 },
      { nombre: 'Soya APF 1 kg', categoria: 'Ceras', precio: 135 },
      { nombre: 'Frasco con tapa 250 ml', categoria: 'Frascos', precio: 24 },
    ],
    aumentar: { producto: 'Vela de punta grande', cantidad: 3 },
    quitar: 'Frasco con tapa 250 ml',
    pagos: [{ forma: 'Efectivo', entregado: 300 }],
    esperado: { total: 253, cambio: 47 },
  },
  {
    id: 'VG-02',
    nombre: 'Venta General pagada con tarjeta',
    tipoCliente: 'General',
    productos: [
      { nombre: 'Molde de barro #3', categoria: 'Moldes de barro', precio: 195 },
      { nombre: 'Lavanda', categoria: 'Aromas 30 ml', precio: 43 },
      { nombre: 'Pabilo con ficha grande', categoria: 'Pabilos', precio: 5 },
      { nombre: 'Gotero de plástico chico', categoria: 'Goteros', precio: 7 },
    ],
    aumentar: { producto: 'Pabilo con ficha grande', cantidad: 10 },
    quitar: 'Gotero de plástico chico',
    tarjetaExcedida: 300,
    pagos: [{ forma: 'Tarjeta', referencia: '1234' }],
    esperado: { total: 288, cambio: 0 },
  },
  {
    id: 'VG-03',
    nombre: 'Venta General pagada con transferencia (incluye producto variable)',
    tipoCliente: 'General',
    productos: [
      { nombre: 'Cirio', categoria: 'Variables', precio: 180, capturado: true },
      { nombre: 'Menta', categoria: 'Aromas ¼ L', precio: 430 },
      { nombre: 'Pigmento líquido 10 ml', categoria: 'Pigmentos', precio: 35, variante: 'Rojo' },
      { nombre: 'Ficha estrella', categoria: 'Pabilos', precio: 45 },
    ],
    aumentar: { producto: 'Pigmento líquido 10 ml', cantidad: 2 },
    quitar: 'Ficha estrella',
    pagos: [{ forma: 'Transferencia', referencia: 'SPEI 88231' }],
    esperado: { total: 680, cambio: 0 },
  },
  {
    id: 'VG-04',
    nombre: 'Venta General con pago mixto: tarjeta + efectivo con cambio',
    tipoCliente: 'General',
    productos: [
      { nombre: 'Escamador', categoria: 'Complementos de escamada', precio: 130 },
      { nombre: 'Cera de abeja 1 kg', categoria: 'Ceras', precio: 410 },
      { nombre: 'Olimpia 25 g', categoria: 'Extras', precio: 25 },
      { nombre: 'Vela de punta chica', categoria: 'Velas de punta', precio: 17 },
    ],
    aumentar: { producto: 'Vela de punta chica', cantidad: 4 },
    quitar: 'Olimpia 25 g',
    pagos: [
      { forma: 'Tarjeta', entregado: 400, referencia: '5678' },
      { forma: 'Efectivo', entregado: 500 },
    ],
    esperado: { total: 608, cambio: 292 },
  },
  {
    id: 'VG-05',
    nombre: 'Venta General con pago mixto: tarjeta + transferencia (variable fuera de rango)',
    tipoCliente: 'General',
    productos: [
      {
        nombre: 'Copalero',
        categoria: 'Variables',
        precio: 450,
        capturado: true,
        fueraDeRango: { minimo: 100, maximo: 400 },
      },
      { nombre: 'Pino Navideño', categoria: 'Temporada 30 ml', precio: 53 },
      { nombre: 'Frasco ámbar con tapa 230 ml', categoria: 'Frascos', precio: 37 },
      { nombre: 'Pigmento sólido dorado', categoria: 'Pigmentos', precio: 40 },
    ],
    aumentar: { producto: 'Frasco ámbar con tapa 230 ml', cantidad: 3 },
    quitar: 'Pigmento sólido dorado',
    pagos: [
      { forma: 'Tarjeta', entregado: 300, referencia: '9012' },
      { forma: 'Transferencia', referencia: 'SPEI 55120' },
    ],
    esperado: { total: 614, cambio: 0 },
  },
]
