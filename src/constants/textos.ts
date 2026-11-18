/** Textos fijos de la app que las pruebas validan tal cual. */
export const TEXTOS = {
  apertura: {
    errorSinMonto: 'Escribe el efectivo con el que abre la caja (puede ser 0)',
  },
  vender: {
    carritoVacio: 'Toca un producto para agregarlo.',
    sinResultados: 'No hay productos que coincidan.',
    fueraDeRango: 'Fuera de rango',
  },
  cobro: {
    pagoCompleto: 'Pago completo',
    tarjetaExcede: 'Con tarjeta no se puede cobrar más de lo que falta',
  },
  gastos: {
    sinGastos: 'Sin gastos registrados.',
    errorConcepto: 'Escribe el concepto del gasto',
    errorMonto: 'Escribe un monto mayor a cero',
  },
  corte: {
    cuadra: 'La caja cuadra exacto.',
  },
  ticket: {
    encabezado: 'CERERÍA CASA BELÉN',
    clienteAlumno: 'Cliente: Alumno',
    despedida: '¡Gracias por tu compra!',
  },
} as const
