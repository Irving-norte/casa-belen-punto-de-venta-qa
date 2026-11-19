/**
 * Forma de los datos de prueba (lo que en C# serían las clases de "Objects").
 * Todos los montos van en PESOS, como los escribe una persona.
 */

export type FormaPago = 'Efectivo' | 'Tarjeta' | 'Transferencia'
export type TipoCliente = 'General' | 'Alumno'

/** Un producto que la prueba agrega desde su categoría. */
export interface ProductoCaso {
  nombre: string
  /** Categoría tal como aparece en el botón (p. ej. «Aromas 30 ml»). */
  categoria: string
  /** Precio unitario esperado al cobrar (con la tarifa del cliente final). */
  precio: number
  /** Precio General que se ve antes de cambiar a Alumno (solo en VA-05). */
  precioGeneral?: number
  /** Color u otra variante que se elige al agregar. */
  variante?: string
  /** Producto variable: el vendedor teclea `precio`. */
  capturado?: boolean
  /** Si el precio capturado queda fuera de este rango, la app pide confirmar. */
  fueraDeRango?: { minimo: number; maximo: number }
}

export interface PagoCaso {
  forma: FormaPago
  /** Lo que se teclea. Sin valor = se deja vacío (monto exacto / lo que falta). */
  entregado?: number
  referencia?: string
}

export interface CasoVenta {
  id: string
  nombre: string
  tipoCliente: TipoCliente
  /** Empieza en General y cambia a Alumno después de agregar los productos. */
  cambiarAAlumno?: boolean
  /** Incluye la apertura de caja (solo VG-01). */
  apertura?: boolean
  productos: ProductoCaso[]
  aumentar: { producto: string; cantidad: number }
  quitar: string
  /** Intento de cobrar con tarjeta más de lo que falta (debe rechazarse). */
  tarjetaExcedida?: number
  pagos: PagoCaso[]
  esperado: { total: number; cambio: number }
}

export interface BusquedaCaso {
  texto: string
  /** Nombres de todos los resultados, en el orden del catálogo. */
  resultados: string[]
  elegir: { nombre: string; precio: number }
}

export interface CasoBusqueda {
  id: string
  nombre: string
  /** Búsqueda que no debe encontrar nada. */
  sinResultados?: string
  busquedas: BusquedaCaso[]
  pagos: PagoCaso[]
  esperado: { total: number; cambio: number }
}

export interface GastoCaso {
  concepto: string
  monto: number
  nota?: string
  /** El concepto se elige con su botón de atajo en lugar de escribirlo. */
  atajo?: boolean
}

export interface CasoGasto {
  id: string
  nombre: string
  /** Incluye las validaciones de concepto y monto vacíos. */
  validaciones?: boolean
  gastos: GastoCaso[]
  esperado: { total: number }
}
