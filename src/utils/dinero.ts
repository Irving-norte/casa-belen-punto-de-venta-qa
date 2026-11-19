/**
 * Formato de dinero igual al de la app: «$1,234» sin centavos y «$37.50»
 * con centavos. Recibe PESOS (como en los datos de prueba).
 */
const sinCentavos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const conCentavos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function aCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

export function formatear(pesos: number): string {
  const centavos = aCentavos(pesos)
  return (centavos % 100 === 0 ? sinCentavos : conCentavos).format(centavos / 100)
}

/** Lo que se teclea en el teclado numérico de la app: 37.5 → "37.5", 500 → "500". */
export function paraTeclado(pesos: number): string {
  return String(aCentavos(pesos) / 100)
}

/** Suma exacta en centavos para no arrastrar errores de punto flotante. */
export function sumar(montos: number[]): number {
  return montos.reduce((s, m) => s + aCentavos(m), 0) / 100
}
