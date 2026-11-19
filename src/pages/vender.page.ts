import { expect, type Locator, type Page } from '@playwright/test'
import { Dialogo } from '@/components'
import { TEXTOS } from '@/constants'
import type { ProductoCaso, TipoCliente } from '@/types'
import { formatear } from '@/utils'

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export class VenderPage {
  readonly buscador: Locator
  readonly tarjetas: Locator
  readonly lineas: Locator
  readonly total: Locator
  readonly carritoVacio: Locator
  readonly sinResultados: Locator
  readonly cobrar: Locator
  readonly dialogo: Dialogo

  constructor(private readonly page: Page) {
    this.buscador = page.getByPlaceholder('Buscar producto…')
    this.tarjetas = page.getByTestId('producto')
    this.lineas = page.getByTestId('linea-carrito')
    this.total = page.getByTestId('total-venta')
    this.carritoVacio = page.getByText(TEXTOS.vender.carritoVacio)
    this.sinResultados = page.getByText(TEXTOS.vender.sinResultados)
    this.cobrar = page.getByRole('button', { name: 'Cobrar', exact: true })
    this.dialogo = new Dialogo(page)
  }

  // ---------- Localizadores ----------

  categoria(nombre: string): Locator {
    return this.page.getByRole('button', { name: nombre, exact: true })
  }

  tipoCliente(tipo: TipoCliente): Locator {
    return this.page.getByRole('radiogroup', { name: 'Tipo de cliente' }).getByRole('radio', { name: tipo })
  }

  /** Tarjeta de producto por nombre exacto; `precio` desempata nombres repetidos. */
  tarjeta(nombre: string, precio?: number): Locator {
    let tarjeta = this.tarjetas.filter({
      has: this.page.getByText(nombre, { exact: true }),
    })
    if (precio !== undefined) tarjeta = tarjeta.filter({ hasText: formatear(precio) })
    return tarjeta
  }

  nombresDeTarjetas(): Promise<string[]> {
    return this.tarjetas.getByTestId('producto-nombre').allInnerTexts()
  }

  /** «Quedan 3» / «Sin existencias» de una tarjeta (solo con hoja vinculada). */
  existenciaDe(nombre: string, precio?: number): Locator {
    return this.tarjeta(nombre, precio).getByTestId('producto-existencia')
  }

  /** Botón de un color en el diálogo de variantes. */
  variante(nombre: string): Locator {
    return this.page.locator(`[data-testid="variante"][data-variante="${nombre}"]`)
  }

  /** Línea del carrito por nombre exacto (con o sin variante). */
  linea(nombre: string): Locator {
    return this.lineas.filter({
      has: this.page.getByTestId('linea-nombre').filter({ hasText: new RegExp(`^${escapar(nombre)}( · .+)?$`) }),
    })
  }

  // ---------- Acciones ----------

  async elegirTipoCliente(tipo: TipoCliente): Promise<void> {
    await this.tipoCliente(tipo).click()
    await expect(this.tipoCliente(tipo)).toBeChecked()
  }

  /** Agrega un producto desde su categoría, resolviendo color o precio capturado. */
  async agregar(producto: ProductoCaso, precioVisible = producto.precio): Promise<void> {
    await this.categoria(producto.categoria).click()
    await this.tarjeta(producto.nombre).click()

    if (producto.variante) {
      await this.variante(producto.variante).click()
    } else if (producto.capturado) {
      await this.dialogo.teclado.teclear(precioVisible)
      await this.dialogo.boton('Agregar').click()
      if (producto.fueraDeRango) {
        const { minimo, maximo } = producto.fueraDeRango
        await expect(this.dialogo.alerta).toContainText(
          `${formatear(precioVisible)} está fuera del rango normal de este producto (${formatear(minimo)} – ${formatear(maximo)})`,
        )
        await this.dialogo.boton('Sí, agregar').click()
      }
    }
    await expect(this.dialogo.raiz).toBeHidden()
  }

  async buscar(texto: string): Promise<void> {
    await this.buscador.fill(texto)
  }

  async aumentarHasta(nombre: string, cantidad: number): Promise<void> {
    const linea = this.linea(nombre)
    const actual = Number(await linea.getByTestId('linea-cantidad').innerText())
    for (let i = actual; i < cantidad; i++) {
      await linea.getByRole('button', { name: `Agregar uno de ${nombre}` }).click()
    }
    await expect(linea.getByTestId('linea-cantidad')).toHaveText(String(cantidad))
  }

  async quitar(nombre: string): Promise<void> {
    await this.linea(nombre).getByRole('button', { name: 'Quitar', exact: true }).click()
    await expect(this.linea(nombre)).toHaveCount(0)
  }

  // ---------- Verificaciones ----------

  async esperarLinea(nombre: string, datos: { cantidad: number; precio: number; variante?: string }): Promise<void> {
    const linea = this.linea(nombre)
    await expect(linea).toHaveCount(1)
    await expect(linea.getByTestId('linea-nombre')).toHaveText(datos.variante ? `${nombre} · ${datos.variante}` : nombre)
    await expect(linea.getByTestId('linea-cantidad')).toHaveText(String(datos.cantidad))
    await expect(linea.getByTestId('linea-precio-unitario')).toHaveText(formatear(datos.precio))
    await expect(linea.getByTestId('linea-subtotal')).toHaveText(formatear(datos.precio * datos.cantidad))
  }

  async esperarTotal(pesos: number): Promise<void> {
    await expect(this.total).toHaveText(formatear(pesos))
  }
}
