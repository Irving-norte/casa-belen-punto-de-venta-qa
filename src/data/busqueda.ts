import type { CasoBusqueda } from '@/types'

/** Hoja «Búsqueda» de docs/casos-de-prueba.xlsx. Cliente General. */
export const BUSQUEDAS: CasoBusqueda[] = [
  {
    id: 'BU-01',
    nombre: 'Venta buscando productos y pagando en efectivo con cambio',
    busquedas: [
      {
        texto: 'soya',
        resultados: ['Soya APF 1 kg', 'Soya APF ½ kg', 'Soya BPF 1 kg', 'Soya BPF ½ kg'],
        elegir: { nombre: 'Soya BPF 1 kg', precio: 120 },
      },
      {
        texto: 'gotero',
        resultados: ['Gotero de plástico grande', 'Gotero de plástico chico'],
        elegir: { nombre: 'Gotero de plástico grande', precio: 17 },
      },
      {
        // Hay dos «Menta»: 30 ml ($57) y ¼ L ($430). Se distingue por el precio.
        texto: 'menta',
        resultados: ['Menta', 'Menta'],
        elegir: { nombre: 'Menta', precio: 57 },
      },
    ],
    pagos: [{ forma: 'Efectivo', entregado: 200 }],
    esperado: { total: 194, cambio: 6 },
  },
  {
    id: 'BU-02',
    nombre: 'Venta buscando sin acentos y pagando con tarjeta',
    busquedas: [
      {
        texto: 'cafe',
        resultados: ['Café Moka', 'Café', 'Café Moka', 'Café'],
        elegir: { nombre: 'Café', precio: 53 },
      },
      {
        texto: 'parafina',
        resultados: [
          'Parafina Malasia blanca 1 kg',
          'Parafina Malasia blanca ½ kg',
          'Parafina Malasia miel 1 kg',
          'Parafina Malasia miel ½ kg',
          'Parafina China 1 kg',
          'Parafina China ½ kg',
        ],
        elegir: { nombre: 'Parafina China 1 kg', precio: 85 },
      },
      {
        texto: 'jazmin',
        resultados: ['Jazmín'],
        elegir: { nombre: 'Jazmín', precio: 43 },
      },
    ],
    pagos: [{ forma: 'Tarjeta', referencia: '2468' }],
    esperado: { total: 181, cambio: 0 },
  },
  {
    id: 'BU-03',
    nombre: 'Búsqueda sin resultados que se corrige y pago mixto efectivo + transferencia',
    sinResultados: 'vela aromatica xyz',
    busquedas: [
      {
        texto: 'vela de punta',
        resultados: ['Vela de punta chica', 'Vela de punta mediana', 'Vela de punta grande'],
        elegir: { nombre: 'Vela de punta mediana', precio: 19 },
      },
      {
        texto: 'estrella',
        resultados: ['Ficha estrella'],
        elegir: { nombre: 'Ficha estrella', precio: 45 },
      },
      {
        texto: 'frasco ambar',
        resultados: ['Frasco ámbar con tapa 100 ml', 'Frasco ámbar con tapa 230 ml'],
        elegir: { nombre: 'Frasco ámbar con tapa 100 ml', precio: 29 },
      },
    ],
    pagos: [
      { forma: 'Efectivo', entregado: 50 },
      { forma: 'Transferencia', referencia: 'SPEI 90210' },
    ],
    esperado: { total: 93, cambio: 0 },
  },
]
