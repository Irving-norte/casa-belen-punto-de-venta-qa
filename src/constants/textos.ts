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
  impresora: {
    noResponde:
      'La impresora no responde. Revisa que esté encendida, con papel y cerca de la tablet, y vuelve a intentar.',
    cancelada:
      'No se eligió ninguna impresora. Si no aparece en la lista, emparéjala primero en Ajustes › Bluetooth de la tablet.',
    sinSoporte: 'Este navegador no puede usar impresoras Bluetooth. Abre la app en Google Chrome de la tablet.',
    pruebaEnviada: 'Prueba enviada. Revisa los acentos y que la regla quepa en un renglón.',
    soloBle: 'Así solo se ven impresoras Bluetooth LE. Para las demás, instala la app desde Google Chrome.',
  },
} as const
