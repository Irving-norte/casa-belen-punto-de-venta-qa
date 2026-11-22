import { expect, test } from '@playwright/test'
import {
  cajaCerradaRegistro,
  gastoRegistro,
  ventaRegistro,
  type LineaRegistro,
} from '@/factories/registros-hoja'
import { HojaSimulada, hayAppsScript, type EntornoHoja, type RespuestaHoja } from '@/utils/hoja-simulada'

/**
 * HS — El Apps Script de la hoja, sin navegador ni Google: el script REAL de
 * la app corre sobre una hoja simulada (src/utils/hoja-simulada).
 */

const PESTANAS = ['Productos', 'Categorías', 'Existencias', 'Movimientos', 'Ventas', 'Detalle de ventas',
  'Pagos', 'Gastos', 'Cortes']

const SOYA_1KG: LineaRegistro = {
  productoId: 'ceras-soya-apf-1-kg', nombre: 'Soya APF 1 kg', categoriaId: 'ceras', cantidad: 2, precio: 135,
}
const SOYA_MEDIO: LineaRegistro = {
  productoId: 'ceras-soya-apf-kg', nombre: 'Soya APF ½ kg', categoriaId: 'ceras', cantidad: 1, precio: 75,
}
const PIGMENTO_AZUL: LineaRegistro = {
  productoId: 'pigmentos-pigmento-liquido-10-ml', nombre: 'Pigmento líquido 10 ml', categoriaId: 'pigmentos',
  cantidad: 3, precio: 35, variante: 'Azul',
}
const MECHERO: LineaRegistro = {
  productoId: 'complementos-mechero', nombre: 'Mechero', categoriaId: 'complementos', cantidad: 1, precio: 85,
}

function hojaLista(entorno: EntornoHoja = 'qa') {
  const hoja = new HojaSimulada()
  hoja.preparar(entorno)
  const { clave } = hoja.vincular(entorno)
  const pedir = (accion: string, datos?: unknown, extra: Record<string, unknown> = {}) =>
    hoja.llamar<RespuestaHoja>({ version: 1, clave, entorno, accion, datos, ...extra })
  return { hoja, clave, pedir }
}

test.describe('Hoja · Apps Script', () => {
  test.skip(!hayAppsScript(), 'Falta el Apps Script de la app: npm run sitio:local o QA_APPS_SCRIPT=<carpeta>')
  test('HS-01 Preparar hoja crea pestañas, catálogo inicial y existencias', () => {
    const hoja = new HojaSimulada()
    const resumen = hoja.preparar('qa')

    expect(hoja.libro.getSheets().map((p) => p.getName())).toEqual(PESTANAS)
    expect(hoja.libro.zonaHoraria).toBe('America/Mexico_City')
    expect(hoja.libro.getSpreadsheetLocale()).toBe('es_MX')
    expect(resumen).toMatchObject({ categorias: 16, productos: 206, errores: [] })

    const existencias = hoja.renglones('Existencias')
    const claves = existencias.map((r) => r.Clave)
    // Pigmentos por color; ceras por artículo en gramos (1 kg y ½ kg comparten).
    expect(claves).toContain('pigmentos-pigmento-liquido-10-ml | Azul')
    expect(claves).toContain('pigmentos-pigmento-en-polvo-3-g')
    expect(claves.filter((c) => c === 'Soya APF')).toHaveLength(1)
    expect(existencias.find((r) => r.Clave === 'Soya APF')).toMatchObject({ Artículo: 'Soya APF', Unidad: 'g', Existencia: 0 })
    expect(existencias.find((r) => r.Clave === 'variables-cirio')).toMatchObject({ Artículo: 'Cirio', Unidad: 'pieza' })
    expect(claves.some((c) => String(c).startsWith('ceras-soya'))).toBe(false)

    // Repetir no duplica nada y no cambia el entorno.
    hoja.preparar('qa')
    expect(hoja.renglones('Productos')).toHaveLength(206)
    expect(hoja.renglones('Existencias')).toHaveLength(existencias.length)
    expect(() => hoja.preparar('produccion')).toThrow(/ya está preparada como qa/)
  })

  test('HS-02 Rechaza peticiones sin la clave, del otro entorno o de otra versión, sin escribir nada', () => {
    const sinVincular = new HojaSimulada()
    sinVincular.preparar('qa')
    expect(sinVincular.llamar({ version: 1, clave: 'x', entorno: 'qa', accion: 'estado' })).toMatchObject({
      ok: false, error: 'sin-clave',
    })

    const { hoja, clave, pedir } = hojaLista('qa')
    const venta = ventaRegistro({ folio: 1, lineas: [MECHERO] })
    const casos: [Record<string, unknown>, string][] = [
      [{ version: 1, clave: 'otra-clave', entorno: 'qa' }, 'clave'],
      [{ version: 1, entorno: 'qa' }, 'clave'],
      [{ version: 1, clave, entorno: 'produccion' }, 'entorno'],
      [{ version: 2, clave, entorno: 'qa' }, 'version'],
    ]
    for (const [peticion, error] of casos) {
      const r = hoja.llamar({ ...peticion, accion: 'sincronizar', datos: { ventas: [venta] } })
      expect(r, JSON.stringify(peticion)).toMatchObject({ ok: false, error })
    }
    expect(hoja.llamar('esto no es json')).toMatchObject({ ok: false, error: 'datos' })
    expect(hoja.renglones('Ventas')).toHaveLength(0)
    expect(hoja.renglones('Movimientos')).toHaveLength(0)

    expect(pedir('estado')).toMatchObject({ ok: true, entorno: 'qa', hoja: 'Casa Belén · Inventario' })
  })

  test('HS-03 Una venta llena Ventas, Detalle, Pagos y Movimientos y descuenta existencias', () => {
    const { hoja, pedir } = hojaLista()
    const venta = ventaRegistro({
      folio: 7,
      tipoCliente: 'alumno',
      lineas: [SOYA_1KG, SOYA_MEDIO, PIGMENTO_AZUL, MECHERO],
      pagos: [{ forma: 'tarjeta', monto: 300, referencia: 'Op 1234' }, { forma: 'efectivo', monto: 235 }],
    })
    expect(venta.total).toBe(53500)

    const r = pedir('sincronizar', { ventas: [venta] })
    expect(r.ok, r.mensaje).toBe(true)
    expect(r.aceptados).toEqual({ ventas: [venta.id], gastos: [], cajas: [] })
    expect(r.rechazados).toEqual([])

    expect(hoja.renglones('Ventas')).toEqual([
      expect.objectContaining({
        ID: venta.id, Folio: 7, Caja: 'caja-prueba-1', Cliente: 'Alumno', Piezas: 7, Total: 535,
        Efectivo: 235, Tarjeta: 300, Transferencia: 0, Cambio: 0,
      }),
    ])
    expect(hoja.renglones('Detalle de ventas').map((d) => [d.Producto, d.Categoría, d.Variante, d.Cantidad,
      d['Precio unitario'], d.Subtotal])).toEqual([
      ['Soya APF 1 kg', 'Ceras', '', 2, 135, 270],
      ['Soya APF ½ kg', 'Ceras', '', 1, 75, 75],
      ['Pigmento líquido 10 ml', 'Pigmentos', 'Azul', 3, 35, 105],
      ['Mechero', 'Complementos de escamada', '', 1, 85, 85],
    ])
    expect(hoja.renglones('Pagos').map((p) => [p.Forma, p.Monto, p.Referencia])).toEqual([
      ['Tarjeta', 300, 'Op 1234'],
      ['Efectivo', 235, ''],
    ])
    expect(hoja.renglones('Movimientos').map((m) => [m.Tipo, m.Clave, m.Cantidad, m.Unidad, m.Referencia])).toEqual([
      ['Venta', 'Soya APF', -2000, 'g', 'Venta #7'],
      ['Venta', 'Soya APF', -500, 'g', 'Venta #7'],
      ['Venta', 'pigmentos-pigmento-liquido-10-ml | Azul', -3, 'pieza', 'Venta #7'],
      ['Venta', 'complementos-mechero', -1, 'pieza', 'Venta #7'],
    ])

    // La fórmula de la hoja y lo que recibe la tablet dicen lo mismo.
    expect(hoja.existencia('Soya APF')).toBe(-2500)
    expect(r.existencias?.['Soya APF']).toEqual({ cantidad: -2500, unidad: 'g' })
    expect(r.existencias?.['pigmentos-pigmento-liquido-10-ml | Azul']).toEqual({ cantidad: -3, unidad: 'pieza' })
    // Sin movimientos la hoja no sabe cuánto hay: no se manda (la tablet no muestra nada).
    expect(r.existencias).not.toHaveProperty(['pigmentos-pigmento-liquido-10-ml | Rojo'])
  })

  test('HS-04 Subir dos veces lo mismo no duplica (la respuesta se perdió y la tablet reintenta)', () => {
    const { hoja, pedir } = hojaLista()
    const venta = ventaRegistro({ folio: 1, lineas: [SOYA_1KG] })
    const gasto = gastoRegistro('Bolsas', 45.5)
    const datos = { ventas: [venta], gastos: [gasto] }

    pedir('sincronizar', datos)
    const otraVez = pedir('sincronizar', datos)

    expect(otraVez.aceptados).toEqual({ ventas: [venta.id], gastos: [gasto.id], cajas: [] })
    expect(hoja.renglones('Ventas')).toHaveLength(1)
    expect(hoja.renglones('Detalle de ventas')).toHaveLength(1)
    expect(hoja.renglones('Pagos')).toHaveLength(1)
    expect(hoja.renglones('Movimientos')).toHaveLength(1)
    expect(hoja.renglones('Gastos')).toHaveLength(1)
    expect(hoja.existencia('Soya APF')).toBe(-2000)
  })

  test('HS-05 Una venta inválida se rechaza sin detener las demás', () => {
    const { hoja, pedir } = hojaLista()
    const buena = ventaRegistro({ folio: 1, lineas: [MECHERO] })
    const descuadrada = { ...ventaRegistro({ folio: 2, lineas: [MECHERO] }), total: 1 }

    const r = pedir('sincronizar', { ventas: [descuadrada, buena] })

    expect(r.aceptados?.ventas).toEqual([buena.id])
    expect(r.rechazados).toEqual([{ tipo: 'venta', id: descuadrada.id, motivo: 'el total no cuadra con productos y pagos' }])
    expect(hoja.renglones('Ventas').map((v) => v.Folio)).toEqual([1])
  })

  test('HS-06 Gastos y corte de caja', () => {
    const { hoja, pedir } = hojaLista()
    const gastos = [gastoRegistro('Bolsas', 45.5, 'Paquete de 100'), gastoRegistro('Cajas', 120)]
    const caja = cajaCerradaRegistro({
      fondo: 500, ventas: 13, efectivo: 1491, tarjeta: 1780, transferencia: 2019, gastos: 332.5, contado: 1600,
    })

    const r = pedir('sincronizar', { gastos, cajas: [caja] })

    expect(r.aceptados).toEqual({ ventas: [], gastos: gastos.map((g) => g.id), cajas: [caja.id] })
    expect(hoja.renglones('Gastos').map((g) => [g.Concepto, g.Monto, g.Nota])).toEqual([
      ['Bolsas', 45.5, 'Paquete de 100'],
      ['Cajas', 120, ''],
    ])
    expect(hoja.renglones('Cortes')).toEqual([
      expect.objectContaining({
        Caja: caja.id, 'Fondo inicial': 500, Ventas: 13, Efectivo: 1491, Tarjeta: 1780, Transferencia: 2019,
        'Total vendido': 5290, Gastos: 332.5, 'Efectivo esperado': 1658.5, 'Efectivo contado': 1600, Diferencia: -58.5,
      }),
    ])
    // Una caja sin cerrar no se acepta.
    const abierta = { id: 'caja-abierta', abiertaEn: caja.abiertaEn, fondoInicial: 50000 }
    expect(pedir('sincronizar', { cajas: [abierta] }).rechazados).toEqual([
      { tipo: 'caja', id: 'caja-abierta', motivo: 'la caja no está cerrada' },
    ])
  })

  test('HS-07 Entradas y conteos se vuelven movimientos y se limpian', () => {
    const { hoja, pedir } = hojaLista()
    pedir('sincronizar', { ventas: [ventaRegistro({ folio: 1, lineas: [SOYA_1KG] })] }) // Soya: −2000 g

    hoja.capturar('Soya APF', { entrada: 25000, nota: 'Costal nuevo' })
    hoja.capturar('variables-cirio', { conteo: 12 })
    hoja.capturar('complementos-mechero', { conteo: 0 })
    hoja.capturar('frascos-frasco-con-tapa-170-ml', { entrada: -4 })

    const r = hoja.registrarEntradasYConteos()

    expect(r).toMatchObject({ entradas: 1, ajustes: 1, sinDiferencia: 1 })
    expect(r.errores).toEqual([
      expect.objectContaining({ mensaje: 'Frasco con tapa 170 ml: la entrada debe ser mayor a cero' }),
    ])
    expect(hoja.existencia('Soya APF')).toBe(23000)
    expect(hoja.existencia('variables-cirio')).toBe(12)
    // En el orden de la pestaña Existencias (Variables va antes que Ceras).
    // Un conteo sin diferencia también queda registrado (ajuste de 0).
    expect(hoja.renglones('Movimientos').slice(1).map((m) => [m.Tipo, m.Clave, m.Cantidad, m.Nota])).toEqual([
      ['Ajuste', 'variables-cirio', 12, 'Conteo: 12'],
      ['Entrada', 'Soya APF', 25000, 'Costal nuevo'],
      ['Ajuste', 'complementos-mechero', 0, 'Conteo: 0'],
    ])
    expect(hoja.existenciasDelScript()['complementos-mechero']).toEqual({ cantidad: 0, unidad: 'pieza' })
    // Lo registrado se limpia; lo que tuvo error se queda para corregirlo.
    const captura = (clave: string) => {
      const f = hoja.renglones('Existencias').find((e) => e.Clave === clave)!
      return [f.Entrada, f.Conteo, f.Nota]
    }
    expect(captura('Soya APF')).toEqual(['', '', ''])
    expect(captura('variables-cirio')).toEqual(['', '', ''])
    expect(captura('frascos-frasco-con-tapa-170-ml')).toEqual([-4, '', ''])
  })

  test('HS-08 El catálogo que recibe la tablet sale de la pestaña Productos', () => {
    const { hoja, pedir } = hojaLista()
    hoja.editarProducto('aromas-30-vainilla', 'Precio General', 55)
    hoja.editarProducto('complementos-mechero', 'Precio Alumno', 80)
    hoja.editarProducto('velas-vela-de-punta-chica', 'Activo', 'No')
    hoja.editarProducto('aromas-30-cereza', 'Precio General', '')
    hoja.editarProducto('pigmentos-pigmento-liquido-10-ml', 'Variantes', 'Amarillo, Azul, Rojo, Morado, Verde')
    hoja.agregarProducto({ Categoría: 'Aromas 30 ml', Nombre: 'Maracuyá', 'Precio General': 58, Activo: 'Sí' })
    hoja.agregarProducto({ Categoría: 'Inventada', Nombre: 'Algo', 'Precio General': 10 })

    const r = pedir('sincronizar', {})
    const productos = r.catalogo!.productos
    const buscar = (id: string) => productos.find((p) => p.id === id)

    expect(buscar('aromas-30-vainilla')?.precio).toEqual({ tipo: 'fijo', centavos: 5500 })
    expect(buscar('complementos-mechero')?.precio).toEqual({ tipo: 'tarifas', general: 9500, alumno: 8000 })
    expect(buscar('variables-cirio')?.precio).toEqual({ tipo: 'variable', minimo: 2000, maximo: 30000 })
    expect(buscar('ceras-soya-apf-kg')).toMatchObject({ articulo: 'Soya APF', descuenta: 500 })
    expect(buscar('velas-vela-de-punta-chica')).toBeUndefined()
    expect(buscar('aromas-30-cereza')).toBeUndefined()
    // Producto nuevo: el script le pone ID y lo escribe en la hoja.
    expect(buscar('aromas-30-maracuya')).toMatchObject({ categoriaId: 'aromas-30', nombre: 'Maracuyá' })
    expect(hoja.renglones('Productos').some((p) => p.ID === 'aromas-30-maracuya')).toBe(true)
    expect(r.catalogo!.errores.map((e) => e.mensaje)).toEqual([
      'Cereza: falta el Precio General',
      'Algo: la categoría «Inventada» no existe en Categorías',
    ])
    // Color nuevo y producto nuevo ya tienen renglón de existencias (en 0, sin movimientos).
    const claves = hoja.renglones('Existencias').map((e) => e.Clave)
    expect(claves).toContain('pigmentos-pigmento-liquido-10-ml | Verde')
    expect(claves).toContain('aromas-30-maracuya')
    expect(hoja.existencia('aromas-30-maracuya')).toBe(0)
    expect(productos).toHaveLength(206 - 2 + 1)
  })

  test('HS-09 El texto que manda la tablet nunca se vuelve fórmula', () => {
    const { hoja, pedir } = hojaLista()
    const malicioso = '=IMPORTXML("https://ejemplo.com", "//a")'
    pedir('sincronizar', { gastos: [gastoRegistro(malicioso, 10, '+52 443 141 7837')] })

    const formulas = hoja.pestana('Gastos').getRange(2, 1, 1, 7).getFormulas()[0] ?? []
    expect(formulas.every((f) => f === '')).toBe(true)
    expect(hoja.renglones('Gastos')[0]).toMatchObject({ Concepto: malicioso, Nota: '+52 443 141 7837' })
  })

  test('HS-10 Movimientos crece más allá de las 1,000 filas iniciales', () => {
    const { hoja, pedir } = hojaLista()
    const ventas = Array.from({ length: 260 }, (_, i) =>
      ventaRegistro({ folio: i + 1, lineas: [SOYA_1KG, SOYA_MEDIO, PIGMENTO_AZUL, MECHERO] }),
    )
    const r = pedir('sincronizar', { ventas })
    expect(r.ok, r.mensaje).toBe(true)
    expect(hoja.renglones('Movimientos')).toHaveLength(1040)
    expect(hoja.existencia('Soya APF')).toBe(-260 * 2500)
  })

  test('HS-11 Las fórmulas de Existencias funcionan aunque la hoja use coma decimal (España)', () => {
    const { hoja, pedir } = hojaLista()
    hoja.libro.setSpreadsheetLocale('es_ES')
    hoja.agregarProducto({ Categoría: 'Aromas 30 ml', Nombre: 'Maracuyá', 'Precio General': 58, Activo: 'Sí' })

    const r = pedir('sincronizar', { ventas: [ventaRegistro({ folio: 1, lineas: [MECHERO] })] })

    expect(r.ok, r.mensaje).toBe(true)
    // El renglón nuevo se escribió con la hoja ya en es_ES.
    expect(hoja.renglones('Existencias').find((e) => e.Clave === 'aromas-30-maracuya')).toMatchObject({
      Existencia: 0,
      Estado: '',
    })
    expect(hoja.existencia('complementos-mechero')).toBe(-1)
    expect(hoja.renglones('Existencias').filter((e) => typeof e.Existencia !== 'number')).toEqual([])
  })

  test('HS-12 La hoja repara sola las fórmulas de Existencias (con #ERROR! o con un número encima)', () => {
    const { hoja, pedir } = hojaLista()
    const pestana = hoja.pestana('Existencias')
    const n = pestana.getLastRow() - 1
    // Como quedó una hoja real: fórmulas con «,» en una hoja de España
    // (#ERROR!), corridas un renglón, y un número tecleado encima.
    hoja.libro.setSpreadsheetLocale('es_ES')
    pestana.getRange(2, 5, n, 1).setValues(
      Array.from({ length: n }, (_, i) => [`=SUMIF(Movimientos!D:D,A${i + 1},Movimientos!G:G)`]),
    )
    pestana.getRange(2, 7, n, 1).setValues(
      Array.from({ length: n }, (_, i) => [`=IF(F${i + 2}="","",IF(E${i + 2}<=F${i + 2},"Reabastecer",""))`]),
    )
    hoja.teclearEnExistencias('complementos-mechero', 'Existencia', 5)
    hoja.teclearEnExistencias('complementos-mechero', 'Mínimo', 10)
    expect(hoja.renglones('Existencias').find((e) => e.Clave === 'variables-cirio')).toMatchObject({
      Existencia: '#ERROR!',
      Estado: '#ERROR!',
    })

    // 1) La tablet sincroniza: se reparan todas y la venta ya cuenta.
    pedir('sincronizar', { ventas: [ventaRegistro({ folio: 1, lineas: [MECHERO] })] })

    const existencias = hoja.renglones('Existencias')
    expect(existencias.filter((e) => typeof e.Existencia !== 'number' || String(e.Estado).startsWith('#'))).toEqual([])
    expect(existencias.find((e) => e.Clave === 'complementos-mechero')).toMatchObject({
      Existencia: -1,
      Mínimo: 10,
      Estado: 'Reabastecer',
    })
    const filaMechero = existencias.findIndex((e) => e.Clave === 'complementos-mechero') + 2
    expect(hoja.formulaEnExistencias('complementos-mechero', 'Existencia')).toBe(
      `=SUMIF(Movimientos!D:D,A${filaMechero},Movimientos!G:G)`,
    )

    // 2) Alguien vuelve a escribir encima; registrar un conteo también la repara.
    hoja.teclearEnExistencias('complementos-mechero', 'Existencia', 5)
    hoja.capturar('complementos-mechero', { conteo: 5 })
    hoja.registrarEntradasYConteos()
    expect(hoja.existencia('complementos-mechero')).toBe(5)
    expect(hoja.existenciasDelScript()['complementos-mechero']).toEqual({ cantidad: 5, unidad: 'pieza' })
    pedir('sincronizar', { ventas: [ventaRegistro({ folio: 2, lineas: [MECHERO] })] })
    expect(hoja.existencia('complementos-mechero')).toBe(4)
  })

  test('HS-13 Antes de registrar conteos, la hoja avisa cuándo sincronizó la tablet', () => {
    const { hoja, pedir } = hojaLista()

    // Solo una entrada: suma, no compara; no hay aviso.
    hoja.capturar('complementos-mechero', { entrada: 10 })
    expect(hoja.avisoDeConteo()).toBe('')

    // Con un conteo y la tablet sin sincronizar nunca.
    hoja.capturar('complementos-escamador', { conteo: 3 })
    expect(hoja.avisoDeConteo()).toContain('La tablet todavía no se ha sincronizado con esta hoja.')
    expect(hoja.avisoDeConteo()).toContain('¿Registrar los conteos?')

    // Después de sincronizar, dice cuándo.
    pedir('sincronizar', {})
    const aviso = hoja.avisoDeConteo(new Date(Date.now() + 5 * 60_000))
    expect(aviso).toMatch(
      /^La tablet se sincronizó por última vez (hoy a las? \d{1,2}:\d{2} [ap]\. m\. \(hace 5 min\)|ayer a las? \d{1,2}:\d{2} [ap]\. m\.)\./,
    )
    expect(aviso).toContain('contesta «No» y espera a que la tablet diga «Hoja al día»')

    // El aviso no registra nada por sí solo.
    expect(hoja.renglones('Movimientos')).toEqual([])

    // Formato de la hora (zona de la Ciudad de México).
    const ahora = new Date('2026-11-20T19:45:00-06:00')
    expect(hoja.describirMomento(new Date('2026-11-20T19:42:00-06:00'), ahora)).toBe('hoy a las 7:42 p. m. (hace 3 min)')
    expect(hoja.describirMomento(new Date('2026-11-20T19:44:50-06:00'), ahora)).toBe(
      'hoy a las 7:44 p. m. (hace menos de un minuto)',
    )
    expect(hoja.describirMomento(new Date('2026-11-20T13:05:00-06:00'), ahora)).toBe('hoy a la 1:05 p. m. (hace 6 h)')
    expect(hoja.describirMomento(new Date('2026-11-20T00:10:00-06:00'), ahora)).toBe('hoy a las 12:10 a. m. (hace 19 h)')
    expect(hoja.describirMomento(new Date('2026-11-19T21:05:00-06:00'), ahora)).toBe('ayer a las 9:05 p. m.')
    expect(hoja.describirMomento(new Date('2026-11-18T10:30:00-06:00'), ahora)).toBe('el 18/11/2026 a las 10:30 a. m.')
  })
})
