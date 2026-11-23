import { CAMBIOS_DE_CATALOGO, CONTEOS, GASTOS, MECHERO, PIGMENTO_ROJO, VENTAS_GENERAL } from '@/data'
import { NOMBRE_HOJA, expect, rutaDeEnlace, test } from '@/fixtures/hoja'
import { registrarGastos, registrarVenta } from '@/flows'
import { URL_QA, urlDePruebas } from '@/constants'
import { HojaSimulada, appServidaLocalmente, hayAppsScript } from '@/utils/hoja-simulada'
import { formatear } from '@/utils'

/**
 * SI — La tablet y la hoja de inventario. La hoja es la simulada
 * (src/utils/hoja-simulada): ejecuta el Apps Script real de la app, sin
 * Google. Nunca se escribe en una hoja real.
 */

const VG_03 = VENTAS_GENERAL.find((c) => c.id === 'VG-03')!
const VG_02 = VENTAS_GENERAL.find((c) => c.id === 'VG-02')!
const GA_02 = GASTOS.find((c) => c.id === 'GA-02')!

test.describe('Sincronización con la hoja', () => {
  test.skip(
    !appServidaLocalmente(urlDePruebas()) || !hayAppsScript(),
    'Necesita la app servida localmente y su Apps Script: npm run sitio:local y npm run test:local',
  )
  test('SI-01 Vincular la tablet con el enlace de la hoja', async ({ app, hoja, page }) => {
    await test.step('Sin vincular: la app usa su catálogo de arranque', async () => {
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja sin vincular')
      await app.sincronizacion.abrir()
      await expect(app.sincronizacion.sinVincular).toBeVisible()
      await expect(app.sincronizacion.catalogo).toHaveAttribute('data-origen', 'arranque')
    })

    await test.step('Abrir el enlace de Casa Belén → Vincular tablet', async () => {
      const { enlace } = hoja.vincular('qa')
      await page.goto(rutaDeEnlace(enlace))
      await expect(app.vincular.estado).toContainText(`Hoja encontrada: ${NOMBRE_HOJA}`)
      await app.vincular.vincular.click()
    })

    await test.step('Queda vinculada, al día y con el catálogo de la hoja', async () => {
      await expect(app.sincronizacion.hojaNombre).toHaveText(NOMBRE_HOJA)
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
      await expect(app.sincronizacion.pendientes).toHaveText('Nada, todo está en la hoja')
      await expect(app.sincronizacion.catalogo).toHaveAttribute('data-origen', 'hoja')
      await expect(app.sincronizacion.catalogo).toContainText('De la hoja: 206 productos')
      expect(hoja.peticiones.map((p) => p.accion)).toEqual(['estado', 'sincronizar'])
      expect(hoja.peticiones.every((p) => p.entorno === 'qa')).toBe(true)
    })

    await test.step('Volver a abrir el mismo enlace no la vincula dos veces', async () => {
      await page.goto(rutaDeEnlace(hoja.vincular('qa').enlace))
      await expect(page.getByText('Esta tablet ya está vinculada con esta hoja.')).toBeVisible()
      await expect(app.vincular.vincular).toHaveCount(0)
    })
  })

  test('SI-02 Un enlace inválido o con otra clave no vincula nada', async ({ app, hoja, page }) => {
    await test.step('Enlace que no es de Apps Script', async () => {
      await page.goto('./#/vincular?u=https%3A%2F%2Fejemplo.com%2Fexec&c=0123456789abcdef0123')
      await expect(app.vincular.error).toHaveText(
        'El enlace no es válido. Vuelve a copiarlo desde la hoja: Casa Belén → Vincular tablet.',
      )
    })

    await test.step('Enlace con una clave que la hoja no reconoce', async () => {
      hoja.vincular('qa')
      await page.goto(`./#/vincular?u=${encodeURIComponent(hoja.url)}&c=${'0'.repeat(64)}`)
      await expect(app.vincular.error).toHaveText('La clave no coincide: vuelve a vincular la tablet')
      await expect(app.vincular.vincular).toHaveCount(0)
    })

    await page.goto('./#/')
    await expect(app.navegacion.estadoHoja).toHaveText('Hoja sin vincular')
    expect(hoja.peticiones.filter((p) => p.accion === 'sincronizar')).toHaveLength(0)
  })

  test('SI-03 La app de QA no se vincula con la hoja real de la tienda', async ({ app, page }) => {
    const hojaReal = new HojaSimulada()
    hojaReal.preparar('produccion')
    await hojaReal.iniciar()
    try {
      const { enlace } = hojaReal.vincular('produccion')
      // El enlace de la hoja real abre la app de producción, nunca la de QA.
      expect(enlace.startsWith('https://irving-norte.github.io/casa-belen-punto-de-venta/#/vincular?')).toBe(true)
      expect(enlace.startsWith(URL_QA)).toBe(false)

      await page.goto(rutaDeEnlace(enlace, 'https://irving-norte.github.io/casa-belen-punto-de-venta/'))
      await expect(app.vincular.error).toHaveText('Esta es la hoja real de la tienda: la app de QA no puede usarla')
      await expect(app.vincular.vincular).toHaveCount(0)
      await page.goto('./#/')
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja sin vincular')
      expect(hojaReal.renglones('Ventas')).toHaveLength(0)
    } finally {
      await hojaReal.detener()
    }
  })

  test('SI-04 Venta, gasto y corte suben solos a la hoja', async ({ app, hoja, hojaVinculada, cajaAbierta }) => {
    void hojaVinculada
    void cajaAbierta
    const venta = await registrarVenta(app, VG_03, null, { imprimirTicket: false, revisarVentasDelDia: false })
    await app.navegacion.ir('Gastos')
    await registrarGastos(app, GA_02.gastos, { id: 'SI-04' })
    const efectivoEsperado = 500 - GA_02.esperado.total

    await test.step('Cerrar la caja contando el efectivo exacto', async () => {
      await app.navegacion.ir('Corte')
      await app.corte.teclado.teclear(efectivoEsperado)
      await app.corte.cerrarCaja()
      await expect(app.apertura.titulo).toBeVisible()
    })

    await test.step('La tablet sube el corte y queda al día', async () => {
      await expect.poll(() => hoja.renglones('Cortes').length).toBe(1)
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
    })

    await test.step('Ventas, Detalle de ventas y Pagos', async () => {
      expect(hoja.renglones('Ventas')).toEqual([
        expect.objectContaining({ Folio: 1, Cliente: 'General', Total: venta.total, Transferencia: venta.total, Efectivo: 0, Tarjeta: 0 }),
      ])
      expect(
        hoja.renglones('Detalle de ventas').map((d) => ({
          nombre: d.Producto, variante: d.Variante || undefined, cantidad: d.Cantidad, precio: d['Precio unitario'],
        })),
      ).toEqual(venta.lineas.map((l) => ({ nombre: l.nombre, variante: l.variante, cantidad: l.cantidad, precio: l.precio })))
      expect(hoja.renglones('Detalle de ventas').find((d) => d.Producto === 'Cirio')?.['Precio capturado']).toBe('Sí')
      expect(hoja.renglones('Pagos')).toEqual([
        expect.objectContaining({ Folio: 1, Forma: 'Transferencia', Monto: venta.total, Referencia: 'SPEI 88231' }),
      ])
    })

    await test.step('Gastos y Cortes', async () => {
      const gasto = GA_02.gastos[0]!
      expect(hoja.renglones('Gastos')).toEqual([
        expect.objectContaining({ Concepto: gasto.concepto, Monto: gasto.monto, Nota: gasto.nota }),
      ])
      expect(hoja.renglones('Cortes')).toEqual([
        expect.objectContaining({
          'Fondo inicial': 500, Ventas: 1, Efectivo: 0, Tarjeta: 0, Transferencia: venta.total,
          'Total vendido': venta.total, Gastos: GA_02.esperado.total, 'Efectivo esperado': efectivoEsperado,
          'Efectivo contado': efectivoEsperado, Diferencia: 0,
        }),
      ])
    })

    await test.step('Movimientos: la venta descuenta existencias', async () => {
      expect(hoja.renglones('Movimientos').map((m) => [m.Tipo, m.Artículo, m.Variante, m.Cantidad])).toEqual(
        venta.lineas.map((l) => ['Venta', l.nombre, l.variante ?? '', -l.cantidad]),
      )
      expect(hoja.existencia('pigmentos-pigmento-liquido-10-ml | Rojo')).toBe(-2)
    })
  })

  test('SI-05 Sin internet todo se guarda y sube al volver la conexión', async ({
    app, hoja, hojaVinculada, cajaAbierta, context,
  }) => {
    void hojaVinculada
    void cajaAbierta
    await test.step('Se va el internet', async () => {
      await context.setOffline(true)
      await expect(app.navegacion.estadoHoja).toHaveText('Sin internet · se guarda en la tablet')
    })

    const venta = await registrarVenta(app, VG_02, null, { imprimirTicket: false, revisarVentasDelDia: false })

    await test.step('La venta espera en la tablet', async () => {
      await expect(app.navegacion.estadoHoja).toHaveText('Sin internet · 1 por subir')
      await app.sincronizacion.abrir()
      await expect(app.sincronizacion.pendientes).toHaveText('1 venta')
      await expect(app.sincronizacion.sincronizarAhora).toBeDisabled()
      expect(hoja.renglones('Ventas')).toHaveLength(0)
    })

    await test.step('Vuelve el internet: sube sola', async () => {
      await context.setOffline(false)
      await expect.poll(() => hoja.renglones('Ventas').length).toBe(1)
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
      await expect(app.sincronizacion.pendientes).toHaveText('Nada, todo está en la hoja')
      expect(hoja.renglones('Ventas')).toEqual([expect.objectContaining({ Folio: 1, Total: venta.total, Tarjeta: venta.total })])
    })
  })

  test('SI-06 Si la hoja falla o la respuesta se pierde, se reintenta sin duplicar', async ({
    app, hoja, hojaVinculada, cajaAbierta, impresora, page,
  }) => {
    void hojaVinculada
    void cajaAbierta
    hoja.fallarSiguiente()
    await registrarVenta(app, VG_02, impresora, { imprimirTicket: true, revisarVentasDelDia: false })

    await test.step('Error 500 de la hoja: la venta queda pendiente y se avisa', async () => {
      await expect(app.navegacion.estadoHoja).toHaveText('Error con la hoja · 1 por subir')
      await app.sincronizacion.abrir()
      await expect(app.sincronizacion.error).toContainText('La hoja contestó con un error (HTTP 500)')
      expect(hoja.renglones('Ventas')).toHaveLength(0)
    })

    await test.step('La hoja guarda la venta pero la respuesta se pierde', async () => {
      hoja.perderSiguienteRespuesta()
      await app.sincronizacion.sincronizarAhora.click()
      await expect(app.sincronizacion.error).toContainText('No se pudo conectar con la hoja')
      await expect(app.sincronizacion.pendientes).toHaveText('1 venta')
      expect(hoja.renglones('Ventas')).toHaveLength(1)
    })

    await test.step('Al reintentar se confirma sin duplicar', async () => {
      await app.sincronizacion.sincronizarAhora.click()
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
      await expect(app.sincronizacion.error).toHaveCount(0)
      expect(hoja.renglones('Ventas')).toHaveLength(1)
      expect(hoja.renglones('Pagos')).toHaveLength(1)
      expect(hoja.renglones('Movimientos')).toHaveLength(3)
    })

    await test.step('Lo del ticket impreso no sale de la tablet', async () => {
      await page.goto('./#/ventas')
      await expect(page.getByTestId('venta-sin-ticket')).toHaveCount(0)
      const subido = JSON.stringify(hoja.peticiones.filter((p) => p.accion === 'sincronizar'))
      expect(subido, 'La venta sí se subió').toContain('"folio":1')
      expect(subido).not.toContain('ticketImpresoEn')
      expect(subido).not.toContain('telefonoCliente')
    })
  })

  test('SI-07 Precios y productos salen de la hoja', async ({ app, hoja, page, cajaAbierta }) => {
    void cajaAbierta
    const { precioNuevo, productoNuevo, desactivado, conError } = CAMBIOS_DE_CATALOGO

    await test.step('Antes de vincular: precios de arranque', async () => {
      await app.vender.categoria(precioNuevo.categoria).click()
      await expect(app.vender.tarjeta(precioNuevo.nombre)).toContainText(formatear(precioNuevo.antes))
    })

    await test.step('Cambios en la pestaña Productos', async () => {
      hoja.editarProducto(precioNuevo.id, 'Precio General', precioNuevo.despues)
      hoja.agregarProducto({
        Categoría: productoNuevo.categoria, Nombre: productoNuevo.nombre, 'Precio General': productoNuevo.precio, Activo: 'Sí',
      })
      hoja.editarProducto(desactivado.id, 'Activo', 'No')
      hoja.editarProducto(conError.id, 'Precio General', '')
    })

    await test.step('Vincular: la tablet recibe el catálogo de la hoja', async () => {
      await page.goto(rutaDeEnlace(hoja.vincular('qa').enlace))
      await app.vincular.vincular.click()
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
      // 206 − desactivado − con error + nuevo
      await expect(app.sincronizacion.catalogo).toContainText('De la hoja: 205 productos')
      await expect(app.sincronizacion.erroresCatalogo).toContainText(conError.mensaje)
    })

    await test.step('Vender muestra lo de la hoja', async () => {
      await page.goto('./#/')
      await app.vender.categoria(precioNuevo.categoria).click()
      await expect(app.vender.tarjeta(precioNuevo.nombre)).toContainText(formatear(precioNuevo.despues))
      await expect(app.vender.tarjeta(productoNuevo.nombre)).toContainText(formatear(productoNuevo.precio))
      await expect(app.vender.tarjeta(conError.nombre)).toHaveCount(0)
      await app.vender.categoria(desactivado.categoria).click()
      await expect(app.vender.tarjeta(desactivado.nombre)).toHaveCount(0)
    })

    await test.step('Se vende con el precio nuevo y el producto nuevo llega a la hoja', async () => {
      await app.vender.categoria(precioNuevo.categoria).click()
      await app.vender.tarjeta(precioNuevo.nombre).click()
      await app.vender.tarjeta(productoNuevo.nombre).click()
      await app.vender.esperarTotal(precioNuevo.despues + productoNuevo.precio)
      await app.vender.cobrar.click()
      await app.cobrar.pagar({ forma: 'Efectivo' })
      await app.cobrar.terminarVenta()
      await expect.poll(() => hoja.renglones('Detalle de ventas').length).toBe(2)
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
      expect(hoja.renglones('Detalle de ventas').map((d) => [d['Producto ID'], d['Precio unitario']])).toEqual([
        [precioNuevo.id, precioNuevo.despues],
        [productoNuevo.idEsperado, productoNuevo.precio],
      ])
    })
  })

  test('SI-08 Existencias: se muestran, avisan en cero y no bloquean la venta', async ({ app, hoja, page, cajaAbierta }) => {
    void cajaAbierta
    await test.step('Conteo físico en la hoja (Registrar entradas y conteos)', async () => {
      for (const { clave, conteo } of Object.values(CONTEOS)) hoja.capturar(clave, { conteo })
      expect(hoja.registrarEntradasYConteos()).toMatchObject({ ajustes: 3, sinDiferencia: 2, errores: [] })
      await page.goto(rutaDeEnlace(hoja.vincular('qa').enlace))
      await app.vincular.vincular.click()
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
      await page.goto('./#/')
    })

    const { vender } = app
    await test.step('Tarjetas: piezas, kilos y agotados', async () => {
      await vender.categoria(MECHERO.categoria).click()
      await expect(vender.existenciaDe('Mechero')).toHaveText('Quedan 2')
      await expect(vender.existenciaDe('Escamador')).toHaveText('Sin existencias')
      // No contado: la hoja no sabe cuánto hay y la tarjeta no dice nada.
      await expect(vender.existenciaDe('Base para cirios')).toHaveCount(0)
      await vender.categoria('Ceras').click()
      await expect(vender.existenciaDe('Soya APF 1 kg')).toHaveText('Quedan 1.5 kg')
      await expect(vender.existenciaDe('Soya APF ½ kg')).toHaveText('Quedan 1.5 kg')
      await vender.categoria(PIGMENTO_ROJO.categoria).click()
      await expect(vender.existenciaDe(PIGMENTO_ROJO.nombre)).toHaveText('Queda 1')
    })

    await test.step('Por color, y un color agotado se puede vender igual', async () => {
      await vender.tarjeta(PIGMENTO_ROJO.nombre).click()
      await expect(vender.variante('Azul').getByTestId('producto-existencia')).toHaveText('Queda 1')
      await expect(vender.variante('Rojo').getByTestId('producto-existencia')).toHaveText('Sin existencias')
      await expect(vender.variante('Morado').getByTestId('producto-existencia')).toHaveCount(0)
      await vender.variante('Rojo').click()
      await vender.esperarLinea(PIGMENTO_ROJO.nombre, { cantidad: 1, precio: PIGMENTO_ROJO.precio, variante: 'Rojo' })
      await expect(vender.linea(PIGMENTO_ROJO.nombre).getByTestId('linea-sin-existencia')).toHaveText(
        'Sin existencias según la hoja',
      )
    })

    await test.step('Pedir más de lo que queda avisa en el carrito', async () => {
      await vender.categoria(MECHERO.categoria).click()
      await vender.tarjeta(MECHERO.nombre).click()
      await expect(vender.linea(MECHERO.nombre).getByTestId('linea-sin-existencia')).toHaveCount(0)
      await vender.aumentarHasta(MECHERO.nombre, 3)
      await expect(vender.linea(MECHERO.nombre).getByTestId('linea-sin-existencia')).toHaveText(
        'Según la hoja solo quedan 2',
      )
      await vender.esperarTotal(PIGMENTO_ROJO.precio + MECHERO.precio * 3)
    })

    await test.step('Se cobra sin bloqueo y la hoja descuenta', async () => {
      await vender.cobrar.click()
      await app.cobrar.pagar({ forma: 'Efectivo' })
      await app.cobrar.terminarVenta()
      await expect.poll(() => hoja.existencia(CONTEOS.mechero.clave)).toBe(-1)
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja al día')
      expect(hoja.existencia('pigmentos-pigmento-liquido-10-ml | Rojo')).toBe(-1)
      await page.goto('./#/')
      await vender.categoria(MECHERO.categoria).click()
      await expect(vender.existenciaDe('Mechero')).toHaveText('Sin existencias')
    })
  })

  test('SI-09 Desvincular: lo nuevo se queda en la tablet', async ({ app, hoja, hojaVinculada, cajaAbierta }) => {
    void hojaVinculada
    void cajaAbierta
    await test.step('Desvincular desde la pantalla de la hoja', async () => {
      await app.sincronizacion.abrir()
      await app.sincronizacion.confirmarDesvincular()
      await expect(app.sincronizacion.sinVincular).toBeVisible()
      await expect(app.navegacion.estadoHoja).toHaveText('Hoja sin vincular')
    })

    await registrarVenta(app, VG_02, null, { imprimirTicket: false, revisarVentasDelDia: false })

    await test.step('La venta no sube y queda esperando', async () => {
      await app.sincronizacion.abrir()
      await expect(app.sincronizacion.pendientes).toHaveText('1 venta esperando a que la tablet se vincule.')
      expect(hoja.renglones('Ventas')).toHaveLength(0)
    })
  })
})
