import { BUSQUEDAS } from './busqueda'
import { GASTOS } from './gastos'
import { VENTAS_ALUMNO } from './ventas-alumno'
import { VENTAS_GENERAL } from './ventas-general'

/**
 * Hoja «Corte»: el nodo del día. No define ventas propias: reutiliza las de
 * los otros casos para que un cambio en ellos se refleje aquí.
 */
export const CORTE = {
  id: 'CO-01',
  nombre: 'Corte del día completo: balance por forma de pago, gastos y conteo',
  ventas: [...VENTAS_GENERAL, ...VENTAS_ALUMNO],
  busquedas: BUSQUEDAS,
  gastos: GASTOS.flatMap((c) => c.gastos),
  /** Valores de la tabla de cuadre del Excel; la prueba también los recalcula. */
  esperado: {
    ventas: 13,
    totalVendido: 5290,
    efectivo: 1491,
    tarjeta: 1780,
    transferencia: 2019,
    gastos: 332.5,
    esperado: 1658.5,
  },
  /** Conteos de efectivo que se prueban antes de cerrar. */
  conteos: { deMenos: 1600, deMas: 1700 },
} as const
