import type { CasoGasto } from '@/types'

/** Hoja «Gastos» de docs/casos-de-prueba.xlsx. */
export const GASTOS: CasoGasto[] = [
  {
    id: 'GA-01',
    nombre: 'Gasto con concepto frecuente',
    gastos: [{ concepto: 'Bolsas', monto: 50, atajo: true }],
    esperado: { total: 50 },
  },
  {
    id: 'GA-02',
    nombre: 'Gasto con concepto escrito, nota y centavos',
    gastos: [{ concepto: 'Cinta adhesiva', monto: 37.5, nota: 'Papelería del centro' }],
    esperado: { total: 37.5 },
  },
  {
    id: 'GA-03',
    nombre: 'Validaciones y varios gastos que suman el total',
    validaciones: true,
    gastos: [
      { concepto: 'Cajas', monto: 80, atajo: true },
      { concepto: 'Limpieza', monto: 45, atajo: true },
      { concepto: 'Comida', monto: 120, atajo: true },
    ],
    esperado: { total: 245 },
  },
]
