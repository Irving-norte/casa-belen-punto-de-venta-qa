import type { BrowserContext } from '@playwright/test'
import { leerTicket, separarTrabajos, type TicketImpreso } from '@/utils'

/**
 * Impresora Bluetooth simulada. Las pruebas nunca usan una impresora real:
 * antes de que cargue la app se reemplazan Web Serial (Bluetooth clásico) y
 * Web Bluetooth (BLE) del navegador por estas versiones, que le pasan cada
 * byte a la prueba. La impresión real es el caso manual MA-01.
 *
 * Como en Chrome para Android: el permiso de Bluetooth clásico se recuerda
 * (aunque se recargue la app) y el de BLE no.
 */

export interface Soporte {
  serial: boolean
  ble: boolean
}

interface Eleccion {
  tipo: 'serial' | 'ble'
  opciones: unknown
}

export const NOMBRE_BLE_SIMULADA = 'Impresora BLE simulada'

export class ImpresoraSimulada {
  /** false = apagada o fuera de alcance: no se puede abrir ni escribir. */
  encendida = true
  /** La persona cierra la lista de Chrome sin elegir. */
  cancelarEleccion = false
  /** Cada vez que la app abrió la lista de Chrome para elegir impresora. */
  readonly elecciones: Eleccion[] = []
  /** Trozo más grande que llegó en una sola escritura (BLE: ≤ 20). */
  trozoMaximo = 0
  aperturas = 0

  private bytes: number[] = []
  private permisoSerial = false

  private constructor(private readonly context: BrowserContext) {}

  static async activar(context: BrowserContext): Promise<ImpresoraSimulada> {
    const impresora = new ImpresoraSimulada(context)
    await context.exposeBinding('__impresoraSimulada', (_fuente, accion: string, datos: unknown) =>
      impresora.atender(accion, datos),
    )
    await context.addInitScript(instalarImpresoraSimulada, NOMBRE_BLE_SIMULADA)
    return impresora
  }

  /** Lo que el navegador ofrece. Aplica desde la siguiente carga de la página. */
  async soportar(soporte: Soporte): Promise<void> {
    await this.context.addInitScript((s: Soporte) => {
      if (!s.serial) Object.defineProperty(Navigator.prototype, 'serial', { configurable: true, get: () => undefined })
      if (!s.ble) Object.defineProperty(Navigator.prototype, 'bluetooth', { configurable: true, get: () => undefined })
    }, soporte)
  }

  /** Chrome ya tiene permiso para la impresora (Bluetooth clásico). */
  get recordada(): boolean {
    return this.permisoSerial
  }

  /** Tickets recibidos, en orden (cada uno empieza con ESC @). */
  trabajos(): number[][] {
    return separarTrabajos(this.bytes)
  }

  ultimo(): TicketImpreso {
    const trabajos = this.trabajos()
    if (!trabajos.length) throw new Error('La impresora simulada no recibió ningún ticket')
    return leerTicket(trabajos.at(-1)!)
  }

  /** Bytes del último ticket, tal cual llegaron. */
  bytesDelUltimo(): number[] {
    return this.trabajos().at(-1) ?? []
  }

  private atender(accion: string, datos: unknown): { ok: boolean; concedida?: boolean } {
    switch (accion) {
      case 'estado':
        return { ok: true, concedida: this.permisoSerial }
      case 'elegir': {
        const eleccion = datos as Eleccion
        this.elecciones.push(eleccion)
        if (this.cancelarEleccion) return { ok: false }
        if (eleccion.tipo === 'serial') this.permisoSerial = true
        return { ok: true }
      }
      case 'abrir':
        this.aperturas++
        return { ok: this.encendida }
      case 'escribir': {
        if (!this.encendida) return { ok: false }
        const trozo = datos as number[]
        this.trozoMaximo = Math.max(this.trozoMaximo, trozo.length)
        this.bytes.push(...trozo)
        return { ok: true }
      }
      case 'olvidar':
        this.permisoSerial = false
        return { ok: true }
      default:
        return { ok: true }
    }
  }
}

/** Corre en el navegador antes que la app. */
function instalarImpresoraSimulada(nombreBle: string): void {
  type Respuesta = { ok: boolean; concedida?: boolean }
  const llamar = (accion: string, datos: unknown = null): Promise<Respuesta> =>
    (window as unknown as { __impresoraSimulada: (a: string, d: unknown) => Promise<Respuesta> }).__impresoraSimulada(
      accion,
      datos,
    )
  const comoArreglo = (valor: ArrayBufferView | ArrayBuffer): number[] =>
    ArrayBuffer.isView(valor)
      ? Array.from(new Uint8Array(valor.buffer, valor.byteOffset, valor.byteLength))
      : Array.from(new Uint8Array(valor))
  const perdida = () => new DOMException('The device has been lost.', 'NetworkError')

  // ---- Bluetooth clásico (Web Serial) ----
  class PuertoSimulado extends EventTarget {
    readable: ReadableStream<Uint8Array> | null = null
    writable: WritableStream<Uint8Array> | null = null
    getInfo() {
      return { bluetoothServiceClassId: '00001101-0000-1000-8000-00805f9b34fb' }
    }
    async open(_opciones: { baudRate: number }) {
      if (this.writable) throw new DOMException('The port is already open.', 'InvalidStateError')
      if (!(await llamar('abrir')).ok) throw new DOMException('Failed to open serial port.', 'NetworkError')
      this.writable = new WritableStream<Uint8Array>({
        write: async (trozo) => {
          if (!(await llamar('escribir', comoArreglo(trozo))).ok) throw perdida()
        },
      })
    }
    async close() {
      this.writable = null
      await llamar('cerrar')
    }
    async forget() {
      this.writable = null
      await llamar('olvidar')
    }
  }
  const puerto = new PuertoSimulado()
  const serial = Object.assign(new EventTarget(), {
    async requestPort(opciones: unknown) {
      if (!(await llamar('elegir', { tipo: 'serial', opciones })).ok) {
        throw new DOMException('No port selected by the user.', 'NotFoundError')
      }
      return puerto
    },
    async getPorts() {
      return (await llamar('estado')).concedida ? [puerto] : []
    },
  })

  // ---- Bluetooth LE (Web Bluetooth) ----
  const escritura = {
    uuid: '00002af1-0000-1000-8000-00805f9b34fb',
    properties: { write: false, writeWithoutResponse: true },
    async writeValueWithoutResponse(valor: ArrayBufferView) {
      if (!(await llamar('escribir', comoArreglo(valor))).ok) throw perdida()
    },
    async writeValueWithResponse(valor: ArrayBufferView) {
      if (!(await llamar('escribir', comoArreglo(valor))).ok) throw perdida()
    },
  }
  const servicio = { uuid: '000018f0-0000-1000-8000-00805f9b34fb', getCharacteristics: async () => [escritura] }
  const dispositivo = Object.assign(new EventTarget(), {
    id: 'ble-simulada',
    name: nombreBle,
    async forget() {},
    gatt: {
      connected: false,
      async connect() {
        if (!(await llamar('abrir')).ok) throw new DOMException('Bluetooth Device is no longer in range.', 'NetworkError')
        this.connected = true
        return this
      },
      disconnect() {
        this.connected = false
      },
      async getPrimaryServices() {
        return [servicio]
      },
    },
  })
  const bluetooth = Object.assign(new EventTarget(), {
    async requestDevice(opciones: unknown) {
      if (!(await llamar('elegir', { tipo: 'ble', opciones })).ok) {
        throw new DOMException('User cancelled the requestDevice() chooser.', 'NotFoundError')
      }
      return dispositivo
    },
    // Sin getDevices(): como Chrome para Android, BLE no se recuerda.
  })

  Object.defineProperty(Navigator.prototype, 'serial', { configurable: true, get: () => serial })
  Object.defineProperty(Navigator.prototype, 'bluetooth', { configurable: true, get: () => bluetooth })
}
