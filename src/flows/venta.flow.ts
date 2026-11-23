import { expect, test } from '@playwright/test'
import { TEXTOS } from '@/constants'
import {
  busquedaEsperada,
  TICKET_NORMAL,
  ticketEsperado,
  totalAlAgregar,
  ventaEsperada,
  type FormatoTicket,
  type RenglonEsperado,
} from '@/factories'
import type { ImpresoraSimulada, Pantallas } from '@/fixtures'
import type { CasoBusqueda, CasoVenta, PagoCaso, VentaEsperada } from '@/types'
import { formatear, sumar, type TicketImpreso } from '@/utils'

/**
 * Flujos de negocio reutilizables: los usan las pruebas de cada módulo y el
 * corte del día (CO-01), que repite las mismas ventas en una sola sesión.
 */

export interface OpcionesVenta {
  /** Folio que la app debe asignar (1 en un navegador limpio). */
  folio?: number
  /** Imprimir el ticket y validar el papel. En el corte se omite. */
  imprimirTicket?: boolean
  /** Revisar la venta en «Ventas del día» (resumen solo cuando es la única venta). */
  revisarVentasDelDia?: boolean
}

// ---------------------------------------------------------------------------
// Venta desde categorías (VG / VA)
// ---------------------------------------------------------------------------

export async function registrarVenta(
  app: Pantallas,
  caso: CasoVenta,
  impresora: ImpresoraSimulada | null,
  opciones: OpcionesVenta = {},
): Promise<VentaEsperada> {
  const { folio = 1, imprimirTicket = true, revisarVentasDelDia = true } = opciones
  const venta = ventaEsperada(caso, folio)
  const { vender } = app
  await app.navegacion.ir('Vender')
  const alumnoDesdeInicio = caso.tipoCliente === 'Alumno' && !caso.cambiarAAlumno

  await test.step(`${caso.id} · tipo de cliente`, async () => {
    if (alumnoDesdeInicio) await vender.elegirTipoCliente('Alumno')
    else await expect(vender.tipoCliente('General')).toBeChecked()
  })

  await test.step(`${caso.id} · agregar ${caso.productos.length} productos de distintas categorías`, async () => {
    let acumulado = 0
    for (const producto of caso.productos) {
      const precioVisible = caso.cambiarAAlumno ? (producto.precioGeneral ?? producto.precio) : producto.precio
      await vender.agregar(producto, precioVisible)
      acumulado = sumar([acumulado, precioVisible])
      await vender.esperarLinea(producto.nombre, { cantidad: 1, precio: precioVisible, variante: producto.variante })
      if (producto.fueraDeRango) {
        await expect(vender.linea(producto.nombre).getByTestId('linea-fuera-de-rango')).toHaveText(
          TEXTOS.vender.fueraDeRango,
        )
      }
      await vender.esperarTotal(acumulado)
    }
    expect(acumulado).toBe(totalAlAgregar(caso, !caso.cambiarAAlumno))
  })

  if (caso.cambiarAAlumno) {
    await test.step(`${caso.id} · cambiar a Alumno recalcula las tarifas`, async () => {
      await vender.elegirTipoCliente('Alumno')
      for (const producto of caso.productos) {
        await vender.esperarLinea(producto.nombre, { cantidad: 1, precio: producto.precio, variante: producto.variante })
      }
      await vender.esperarTotal(totalAlAgregar(caso, true))
    })
  }

  await test.step(`${caso.id} · aumentar cantidad y quitar un producto`, async () => {
    const { producto, cantidad } = caso.aumentar
    const { precio, variante } = caso.productos.find((p) => p.nombre === producto)!
    await vender.aumentarHasta(producto, cantidad)
    await vender.esperarLinea(producto, { cantidad, precio, variante })
    await vender.esperarTotal(sumar([totalAlAgregar(caso, true), precio * (cantidad - 1)]))

    await vender.quitar(caso.quitar)
    await expect(vender.lineas).toHaveCount(venta.lineas.length)
    for (const linea of venta.lineas) await vender.esperarLinea(linea.nombre, linea)
    await vender.esperarTotal(venta.total)
  })

  await cobrarYTerminar(app, venta, caso.pagos, caso.tarjetaExcedida)
  if (imprimirTicket && impresora) await imprimirYRevisarTicket(app, venta, impresora)
  if (revisarVentasDelDia) await revisarEnVentasDelDia(app, venta, { impreso: imprimirTicket, unica: folio === 1 })
  return venta
}

// ---------------------------------------------------------------------------
// Venta desde la barra de búsqueda (BU)
// ---------------------------------------------------------------------------

export async function registrarVentaPorBusqueda(
  app: Pantallas,
  caso: CasoBusqueda,
  impresora: ImpresoraSimulada | null,
  opciones: OpcionesVenta = {},
): Promise<VentaEsperada> {
  const { folio = 1, imprimirTicket = true, revisarVentasDelDia = true } = opciones
  const venta = busquedaEsperada(caso, folio)
  const { vender } = app
  await app.navegacion.ir('Vender')

  await expect(vender.tipoCliente('General')).toBeChecked()

  if (caso.sinResultados) {
    await test.step(`${caso.id} · búsqueda sin resultados`, async () => {
      await vender.buscar(caso.sinResultados!)
      await expect(vender.sinResultados).toBeVisible()
      await expect(vender.tarjetas).toHaveCount(0)
      await expect(vender.categoria('Variables')).toBeHidden()
    })
  }

  await test.step(`${caso.id} · agregar ${caso.busquedas.length} productos buscándolos`, async () => {
    let acumulado = 0
    for (const busqueda of caso.busquedas) {
      await vender.buscar(busqueda.texto)
      await expect(vender.tarjetas).toHaveCount(busqueda.resultados.length)
      expect(await vender.nombresDeTarjetas()).toEqual(busqueda.resultados)
      await vender.tarjeta(busqueda.elegir.nombre, busqueda.elegir.precio).click()
      acumulado = sumar([acumulado, busqueda.elegir.precio])
      await vender.esperarLinea(busqueda.elegir.nombre, { cantidad: 1, precio: busqueda.elegir.precio })
      await vender.esperarTotal(acumulado)
    }
    await vender.buscar('')
    await expect(vender.categoria('Variables')).toBeVisible()
  })

  await cobrarYTerminar(app, venta, caso.pagos)
  if (imprimirTicket && impresora) await imprimirYRevisarTicket(app, venta, impresora)
  if (revisarVentasDelDia) await revisarEnVentasDelDia(app, venta, { impreso: imprimirTicket, unica: folio === 1 })
  return venta
}

// ---------------------------------------------------------------------------
// Pasos compartidos
// ---------------------------------------------------------------------------

export async function cobrarYTerminar(
  app: Pantallas,
  venta: VentaEsperada,
  pagos: PagoCaso[],
  tarjetaExcedida?: number,
): Promise<void> {
  const { vender, cobrar, ticket } = app
  await test.step(`${venta.id} · cobrar ${venta.formas}`, async () => {
    await vender.cobrar.click()
    await expect(cobrar.total).toHaveText(formatear(venta.total))
    await expect(cobrar.falta).toHaveText(formatear(venta.total))

    if (tarjetaExcedida) {
      await cobrar.forma('Tarjeta').click()
      await cobrar.teclado.teclear(tarjetaExcedida)
      await cobrar.registrar('Tarjeta').click()
      await expect(cobrar.error).toHaveText(TEXTOS.cobro.tarjetaExcede)
      await expect(cobrar.pagos).toHaveCount(0)
      await cobrar.teclado.limpiar()
      await expect(cobrar.teclado.visor).toHaveText('$0')
    }

    let falta = venta.total
    for (const [i, pago] of pagos.entries()) {
      const esperado = venta.pagos[i]!
      await cobrar.pagar(pago)
      await expect(cobrar.pagos).toHaveCount(i + 1)
      const registrado = cobrar.pagos.nth(i)
      await expect(registrado).toHaveAttribute('data-forma', esperado.forma.toLowerCase())
      await expect(registrado.getByTestId('pago-monto')).toHaveText(formatear(esperado.abona))
      falta = sumar([falta, -esperado.abona])
      if (falta > 0) await expect(cobrar.falta).toHaveText(formatear(falta))
    }

    if (venta.cambio > 0) await expect(cobrar.cambio).toHaveText(formatear(venta.cambio))
    else await expect(cobrar.pagoCompleto).toBeVisible()

    await cobrar.terminarVenta()
    await expect(ticket.folio).toContainText(`Venta #${venta.folio}`)
    await expect(ticket.total).toHaveText(formatear(venta.total))
  })
}

/**
 * Imprime el ticket desde la pantalla del ticket. Si la impresora todavía no
 * está elegida, la app pide conectarla y, al elegirla, imprime enseguida.
 */
export async function imprimirYRevisarTicket(
  app: Pantallas,
  venta: VentaEsperada,
  impresora: ImpresoraSimulada,
  formato: FormatoTicket = TICKET_NORMAL,
): Promise<void> {
  const { ticket } = app
  await test.step(`${venta.id} · imprimir el ticket`, async () => {
    const antes = impresora.trabajos().length
    const yaImpreso = (await ticket.impreso.count()) > 0
    await expect(ticket.imprimir).toHaveText(yaImpreso ? 'Imprimir de nuevo' : 'Imprimir ticket')
    await ticket.imprimir.click()

    if (!impresora.recordada) {
      await expect(ticket.panel.aviso).toBeVisible()
      await expect(ticket.panel.pasos).toBeVisible()
      await ticket.panel.buscar.click()
      await expect(ticket.panel.raiz).toBeHidden()
    }

    await expect(ticket.impreso).toContainText('Ticket impreso a las')
    await expect(ticket.imprimir).toHaveText('Imprimir de nuevo')
    await expect(ticket.error).toHaveCount(0)
    expect(impresora.trabajos(), 'Un solo ticket por toque').toHaveLength(antes + 1)

    const papel = impresora.ultimo()
    revisarTicket(papel, ticketEsperado(venta, formato), formato)
    // La vista previa en pantalla es exactamente el papel.
    expect(await ticket.textoDeVista()).toEqual(papel.renglones.map((r) => r.texto))
  })
}

/** Compara el papel con lo esperado: texto, tamaño y negritas de cada renglón. */
export function revisarTicket(papel: TicketImpreso, esperado: RenglonEsperado[], formato: FormatoTicket): void {
  const textos = papel.renglones.map((r) => r.texto)
  const esperados = esperado.map((e, i) =>
    typeof e.texto === 'string' ? e.texto : e.texto.test(textos[i] ?? '') ? textos[i] : String(e.texto),
  )
  expect(textos, 'Renglones del ticket impreso').toEqual(esperados)
  expect(papel.renglones.map((r) => r.grande), 'Renglones en tamaño doble').toEqual(esperado.map((e) => !!e.grande))
  expect(papel.renglones.map((r) => r.negritas.map((n) => n.trim())), 'Negritas').toEqual(esperado.map((e) => e.negritas ?? []))
  for (const r of papel.renglones) {
    expect(r.texto.length, `«${r.texto}» cabe en el papel`).toBeLessThanOrEqual(r.grande ? formato.columnas / 2 : formato.columnas)
  }
  expect(papel.cortado, 'Corta el papel al final').toBe(true)
  expect(papel.comandosDesconocidos).toEqual([])
  if (formato.acentos) {
    expect(papel.paginaDeCodigos, 'Página de códigos PC850').toBe(2)
    expect(papel.sinModoChino).toBe(true)
  } else {
    expect(papel.usaBytesAltos, 'Sin acentos: solo letras básicas').toBe(false)
  }
}

export async function revisarEnVentasDelDia(
  app: Pantallas,
  venta: VentaEsperada,
  { impreso, unica }: { impreso: boolean; unica: boolean },
): Promise<void> {
  const { navegacion, ventas } = app
  await test.step(`${venta.id} · aparece en Ventas del día`, async () => {
    await navegacion.ir('Ventas del día')
    await expect(ventas.titulo).toBeVisible()
    if (unica) await expect(ventas.resumen).toHaveText(`1 venta · ${formatear(venta.total)}`)

    const fila = ventas.fila(venta.folio)
    await expect(fila).toHaveCount(1)
    await expect(fila.getByTestId('venta-folio')).toHaveText(`#${venta.folio}`)
    await expect(fila.getByTestId('venta-formas')).toHaveText(venta.formas + (venta.alumno ? ' · Alumno' : ''))
    await expect(fila.getByTestId('venta-total')).toHaveText(formatear(venta.total))
    await expect(fila.getByTestId('venta-sin-ticket')).toHaveCount(impreso ? 0 : 1)
    await navegacion.ir('Vender')
  })
}
