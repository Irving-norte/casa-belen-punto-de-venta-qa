import { TEXTOS } from '@/constants'
import { PRODUCTOS_NOMBRES_LARGOS, VENTA_NOMBRES_LARGOS, VENTAS_ALUMNO, VENTAS_GENERAL } from '@/data'
import { ticketEsperado } from '@/factories'
import { NOMBRE_BLE_SIMULADA, expect, test } from '@/fixtures'
import { imprimirYRevisarTicket, registrarVenta, revisarTicket } from '@/flows'
import { formatear } from '@/utils'

const SPP = '00001101-0000-1000-8000-00805f9b34fb'
const sinImprimir = { imprimirTicket: false, revisarVentasDelDia: false }

/** Renglones del papel entre «CANT. DESCRIPCIÓN» y la raya del total. */
function productosDelPapel(renglones: string[]): string[] {
  const desde = renglones.findIndex((r) => /^CANT\. DESCRIPCI[OÓ]N$/.test(r)) + 1
  return renglones.slice(desde, renglones.indexOf(renglones[3]!, desde))
}

test.describe('Ticket impreso', () => {
  test('TI-01 Primera vez: «Imprimir ticket» pide conectar la impresora y luego imprime', async ({
    app,
    impresora,
    cajaAbierta,
  }) => {
    void cajaAbierta
    const { ticket } = app
    const venta = await registrarVenta(app, VENTAS_GENERAL[3]!, null, sinImprimir)

    await test.step('Al terminar la venta: botón Imprimir ticket y vista previa del papel', async () => {
      await expect(ticket.imprimir).toHaveText('Imprimir ticket')
      await expect(ticket.imprimir).toBeEnabled()
      await expect(ticket.impresora).toHaveText('Impresora: sin conectar')
      await expect(ticket.impreso).toHaveCount(0)
      await expect(app.ticket.renglones.first()).toHaveText('CERERÍA CASA BELÉN', { useInnerText: true })
      await expect(ticket.renglones).toHaveCount(ticketEsperado(venta).length)
      // Ya no hay nada de WhatsApp.
      await expect(app.ticket.panel.raiz).toBeHidden()
      await expect(ticket.folio.page().getByText(/WhatsApp/)).toHaveCount(0)
      expect(impresora.trabajos()).toHaveLength(0)
    })

    await imprimirYRevisarTicket(app, venta, impresora)

    await test.step('Se buscó una impresora Bluetooth clásica (puerto serie)', async () => {
      expect(impresora.elecciones).toEqual([
        { tipo: 'serial', opciones: { filters: [{ bluetoothServiceClassId: SPP }], allowedBluetoothServiceClassIds: [SPP] } },
      ])
      await expect(ticket.impresora).toHaveText('Impresora: Impresora Bluetooth')
    })

    await test.step('Imprimir no cambia la venta: sigue una sola, con su total', async () => {
      await app.navegacion.ir('Ventas del día')
      await expect(app.ventas.resumen).toHaveText(`1 venta · ${formatear(venta.total)}`)
      await expect(app.ventas.fila(venta.folio).getByTestId('venta-sin-ticket')).toHaveCount(0)
    })
  })

  test('TI-02 La impresora se recuerda: reimprimir y la siguiente venta no la vuelven a pedir', async ({
    app,
    impresora,
    cajaAbierta,
    page,
  }) => {
    void cajaAbierta
    const { ticket } = app
    const primera = await registrarVenta(app, VENTAS_GENERAL[1]!, impresora, { revisarVentasDelDia: false })

    await test.step('«Imprimir de nuevo» saca el mismo ticket, sin elegir impresora', async () => {
      await ticket.imprimir.click()
      await expect.poll(() => impresora.trabajos().length).toBe(2)
      const [uno, dos] = impresora.trabajos()
      expect(dos).toEqual(uno)
      await expect(ticket.panel.raiz).toBeHidden()
      expect(impresora.elecciones).toHaveLength(1)
    })

    await test.step('Al reabrir la app la impresora sigue elegida', async () => {
      await page.reload()
      await expect(ticket.impresora).toHaveText('Impresora: Impresora Bluetooth')
      await imprimirYRevisarTicket(app, primera, impresora)
      expect(impresora.elecciones).toHaveLength(1)
    })

    await test.step('La siguiente venta imprime directo', async () => {
      await ticket.nuevaVenta.click()
      await registrarVenta(app, VENTAS_GENERAL[2]!, impresora, { folio: 2, revisarVentasDelDia: false })
      expect(impresora.elecciones).toHaveLength(1)
      await app.navegacion.ir('Ventas del día')
      await expect(app.ventas.resumen).toContainText('2 ventas')
      await expect(page.getByTestId('venta-sin-ticket')).toHaveCount(0)
    })

    await test.step('«Olvidar impresora» la quita; la próxima vez se elige otra vez', async () => {
      await app.ventas.fila(2).click()
      await ticket.conectar.click()
      await expect(ticket.panel.elegida).toContainText('Impresora Bluetooth')
      await ticket.panel.olvidar.click()
      await expect(ticket.panel.pasos).toBeVisible()
      await ticket.panel.cerrar.click()
      await expect(ticket.impresora).toHaveText('Impresora: sin conectar')
      expect(impresora.recordada).toBe(false)
    })
  })

  test('TI-03 Sin elegir o con la impresora apagada: avisa, no marca el ticket y se puede reintentar', async ({
    app,
    impresora,
    cajaAbierta,
  }) => {
    void cajaAbierta
    const { ticket } = app
    const venta = await registrarVenta(app, VENTAS_ALUMNO[0]!, null, sinImprimir)

    await test.step('Cerrar la lista de Chrome sin elegir', async () => {
      impresora.cancelarEleccion = true
      await ticket.imprimir.click()
      await ticket.panel.buscar.click()
      await expect(ticket.panel.mensaje).toHaveText(TEXTOS.impresora.cancelada)
      await expect(ticket.panel.pasos).toBeVisible()
      await ticket.panel.cerrar.click()
      await expect(ticket.impreso).toHaveCount(0)
      expect(impresora.trabajos()).toHaveLength(0)
    })

    await test.step('Impresora apagada: «no responde»', async () => {
      impresora.cancelarEleccion = false
      impresora.encendida = false
      await ticket.imprimir.click()
      await ticket.panel.buscar.click()
      await expect(ticket.panel.raiz).toBeHidden()
      await expect(ticket.error).toHaveText(TEXTOS.impresora.noResponde)
      await expect(ticket.imprimir).toHaveText('Imprimir ticket')
      await expect(ticket.impreso).toHaveCount(0)
      expect(impresora.trabajos()).toHaveLength(0)
    })

    await test.step('Se prende y se reintenta: imprime', async () => {
      impresora.encendida = true
      await imprimirYRevisarTicket(app, venta, impresora)
      expect(impresora.elecciones).toHaveLength(2)
    })

    await test.step('En Ventas del día ya no dice «Sin ticket»', async () => {
      await app.navegacion.ir('Ventas del día')
      await expect(app.ventas.fila(venta.folio).getByTestId('venta-sin-ticket')).toHaveCount(0)
    })
  })

  test(`${VENTA_NOMBRES_LARGOS.id} ${VENTA_NOMBRES_LARGOS.nombre}`, async ({ app, impresora, cajaAbierta, page }) => {
    void cajaAbierta
    const { ticket } = app
    const { panel } = ticket
    const venta = await registrarVenta(app, VENTA_NOMBRES_LARGOS, impresora, { revisarVentasDelDia: false })

    await test.step('Los nombres largos pasan al renglón siguiente y nada se corta', async () => {
      const papel = impresora.ultimo().renglones.map((r) => r.texto)
      expect(productosDelPapel(papel)).toEqual(PRODUCTOS_NOMBRES_LARGOS.normal)
    })

    await test.step('Ajustes: 42 letras y sin acentos', async () => {
      await ticket.conectar.click()
      await expect(panel.ancho(48)).toBeChecked()
      await expect(panel.acentos(true)).toBeChecked()
      await panel.ancho(42).click()
      await panel.acentos(false).click()
      await expect(panel.ancho(42)).toBeChecked()
      await expect(panel.acentos(false)).toBeChecked()
      await panel.cerrar.click()
      await expect(ticket.renglones.first()).toHaveText(' CERERIA CASA BELEN', { useInnerText: true })
    })

    await test.step('Imprimir de nuevo con los ajustes', async () => {
      const formato = { columnas: 42, acentos: false } as const
      await imprimirYRevisarTicket(app, venta, impresora, formato)
      const papel = impresora.ultimo().renglones.map((r) => r.texto)
      expect(productosDelPapel(papel)).toEqual(PRODUCTOS_NOMBRES_LARGOS.angostoSinAcentos)
      expect(papel.at(-3)).toBe(`${' '.repeat(10)}GRACIAS POR TU COMPRA!`)
    })

    await test.step('Imprimir prueba: no es una venta', async () => {
      const antes = impresora.trabajos().length
      await ticket.conectar.click()
      await panel.prueba.click()
      await expect(panel.mensaje).toHaveText(TEXTOS.impresora.pruebaEnviada)
      expect(impresora.trabajos()).toHaveLength(antes + 1)
      const prueba = impresora.ultimo()
      const textos = prueba.renglones.map((r) => r.texto)
      expect(textos).toContain(`${' '.repeat(11)}PRUEBA DE IMPRESION`)
      expect(textos).toContain('123456789012345678901234567890123456789012')
      expect(textos).toContain('Medidas: 1/2 kg - 1/4 L - 5 x $19.00')
      expect(prueba.usaBytesAltos).toBe(false)
      expect(prueba.cortado).toBe(true)
      await panel.cerrar.click()
      await app.navegacion.ir('Ventas del día')
      await expect(app.ventas.resumen).toHaveText(`1 venta · ${formatear(venta.total)}`)
    })

    await test.step('Los ajustes se quedan al reabrir la app', async () => {
      await app.ventas.fila(venta.folio).click()
      await page.reload()
      await ticket.conectar.click()
      await expect(panel.ancho(42)).toBeChecked()
      await expect(panel.acentos(false)).toBeChecked()
    })
  })

  test('TI-05 Impresora Bluetooth LE: se elige por BLE, manda de 20 en 20 bytes y se vuelve a elegir al reabrir', async ({
    app,
    impresora,
    cajaAbierta,
    page,
  }) => {
    void cajaAbierta
    const { ticket } = app
    const { panel } = ticket
    await impresora.soportar({ serial: false, ble: true })
    await page.reload()
    const venta = await registrarVenta(app, VENTAS_ALUMNO[1]!, null, sinImprimir)

    await test.step('Sin Bluetooth clásico, el panel busca por BLE', async () => {
      await ticket.imprimir.click()
      await expect(panel.aviso).toBeVisible()
      await expect(panel.raiz.getByText(TEXTOS.impresora.soloBle)).toBeVisible()
      await expect(panel.buscarBle).toHaveCount(0)
      await panel.buscar.click()
      await expect(panel.raiz).toBeHidden()
      await expect(ticket.impreso).toContainText('Ticket impreso a las')
      await expect(ticket.impresora).toHaveText(`Impresora: ${NOMBRE_BLE_SIMULADA}`)
    })

    await test.step('El papel es igual que por Bluetooth clásico', async () => {
      const [eleccion] = impresora.elecciones
      expect(eleccion!.tipo).toBe('ble')
      expect(eleccion!.opciones).toMatchObject({
        acceptAllDevices: true,
        optionalServices: expect.arrayContaining(['000018f0-0000-1000-8000-00805f9b34fb']),
      })
      expect(impresora.trozoMaximo).toBeLessThanOrEqual(20)
      revisarTicket(impresora.ultimo(), ticketEsperado(venta), { columnas: 48, acentos: true })
    })

    await test.step('Al reabrir la app se elige otra vez (Chrome para Android no la recuerda)', async () => {
      await page.reload()
      await expect(ticket.impresora).toHaveText('Impresora: sin conectar')
      await ticket.imprimir.click()
      await panel.buscar.click()
      await expect.poll(() => impresora.trabajos().length).toBe(2)
      expect(impresora.elecciones).toHaveLength(2)
    })
  })

  test('TI-06 Navegador sin Bluetooth: no deja imprimir y dice qué hacer', async ({ app, impresora, cajaAbierta, page }) => {
    void cajaAbierta
    const { ticket } = app
    await impresora.soportar({ serial: false, ble: false })
    await page.reload()
    await registrarVenta(app, VENTAS_GENERAL[1]!, null, sinImprimir)

    await expect(ticket.imprimir).toBeDisabled()
    await expect(ticket.sinSoporte).toHaveText(TEXTOS.impresora.sinSoporte)
    await expect(ticket.conectar).toHaveCount(0)
    await expect(app.navegacion.impresora).toHaveCount(0)
    await expect(ticket.renglones.first()).toBeVisible()
    expect(impresora.trabajos()).toHaveLength(0)
    expect(impresora.elecciones).toHaveLength(0)
  })

  test('TI-07 Desde el encabezado y sin abrir caja: conectar la impresora e imprimir una prueba', async ({
    app,
    impresora,
  }) => {
    const { panel } = app.ticket

    await test.step('Antes de la primera venta el encabezado avisa «Sin impresora»', async () => {
      await expect(app.apertura.titulo).toBeVisible()
      await expect(app.navegacion.impresora).toHaveText('Sin impresora')
    })

    await test.step('Conectar desde el encabezado', async () => {
      await app.navegacion.impresora.click()
      await expect(panel.raiz).toBeVisible()
      await expect(panel.aviso).toHaveCount(0)
      await expect(panel.pasos).toBeVisible()
      await panel.buscar.click()
      await expect(panel.elegida).toHaveText('Lista para imprimir: Impresora Bluetooth')
      expect(impresora.trabajos()).toHaveLength(0)
    })

    await test.step('Imprimir prueba: acentos, medidas y regla de 48 letras', async () => {
      await panel.prueba.click()
      await expect(panel.mensaje).toHaveText(TEXTOS.impresora.pruebaEnviada)
      const prueba = impresora.ultimo()
      const textos = prueba.renglones.map((r) => r.texto)
      expect(textos).toEqual(
        expect.arrayContaining([
          `${' '.repeat(14)}PRUEBA DE IMPRESIÓN`,
          'Acentos: á é í ó ú ñ ü ¡! ¿?',
          'Mayúsculas: Á É Í Ó Ú Ñ',
          'Medidas: ½ kg · ¼ L · 5 × $19.00',
          '123456789012345678901234567890123456789012345678',
        ]),
      )
      expect(prueba.paginaDeCodigos).toBe(2)
      expect(prueba.cortado).toBe(true)
      expect(prueba.renglones[0]).toMatchObject({ grande: true, negritas: ['   CERERÍA CASA BELÉN'] })
    })

    await test.step('No se creó nada: sigue sin caja; luego la primera venta imprime directo', async () => {
      await panel.cerrar.click()
      await expect(app.navegacion.impresora).toHaveText('Impresora')
      await expect(app.apertura.titulo).toBeVisible()
      await expect(app.navegacion.cajaAbierta).toBeHidden()

      await app.apertura.teclado.teclear(500)
      await app.apertura.abrir.click()
      await registrarVenta(app, VENTAS_GENERAL[1]!, impresora, { revisarVentasDelDia: false })
      expect(impresora.elecciones).toHaveLength(1)
      expect(impresora.trabajos()).toHaveLength(2)
    })
  })
})
