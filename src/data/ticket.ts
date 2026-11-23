import type { CasoVenta } from '@/types'

/**
 * Hoja «Ticket impreso» de docs/casos-de-prueba.xlsx: la venta de TI-04, con
 * el nombre más largo del catálogo (debe pasar al renglón siguiente), una
 * medida con ½ y un color.
 */
export const VENTA_NOMBRES_LARGOS: CasoVenta = {
  id: 'TI-04',
  nombre: 'Nombres largos, ½ y ajustes de 42 letras y sin acentos',
  tipoCliente: 'General',
  productos: [
    { nombre: 'Lámina de cera de abeja (24 x 40 cm)', categoria: 'Ceras', precio: 45 },
    { nombre: 'Soya APF ½ kg', categoria: 'Ceras', precio: 75 },
    { nombre: 'Pigmento líquido 10 ml', categoria: 'Pigmentos', precio: 35, variante: 'Amarillo' },
    { nombre: 'Frasco ámbar con tapa 230 ml', categoria: 'Frascos', precio: 37 },
  ],
  aumentar: { producto: 'Lámina de cera de abeja (24 x 40 cm)', cantidad: 10 },
  quitar: 'Frasco ámbar con tapa 230 ml',
  pagos: [{ forma: 'Efectivo', entregado: 600 }],
  esperado: { total: 560, cambio: 40 },
}

/** Renglones de productos de TI-04, escritos a mano: así deben salir en papel. */
export const PRODUCTOS_NOMBRES_LARGOS = {
  normal: [
    '10 × Lámina de cera de abeja (24 x 40    $450.00',
    '     cm)',
    '10 × $45.00 c/u',
    '1 × Soya APF ½ kg                         $75.00',
    '1 × $75.00 c/u',
    '1 × Pigmento líquido 10 ml (Amarillo)     $35.00',
    '1 × $35.00 c/u',
  ],
  angostoSinAcentos: [
    '10 x Lamina de cera de abeja (24 x $450.00',
    '     40 cm)',
    '10 x $45.00 c/u',
    '1 x Soya APF 1/2 kg                 $75.00',
    '1 x $75.00 c/u',
    '1 x Pigmento liquido 10 ml          $35.00',
    '    (Amarillo)',
    '1 x $35.00 c/u',
  ],
}
