# Casa Belén — QA del punto de venta

Pruebas end-to-end con **Playwright + TypeScript** del
[punto de venta](https://github.com/Irving-norte/casa-belen-punto-de-venta), y el
**entorno QA** donde vive la app de prueba:

**https://irving-norte.github.io/casa-belen-punto-de-venta-qa/**

Los casos están en [`docs/casos-de-prueba.xlsx`](docs/casos-de-prueba.xlsx). Cada
prueba lleva el ID de su caso (VG-01, VA-03, BU-02, GA-01, CO-01, HS-04, SI-06…),
así el reporte se lee junto con el Excel.

> **Regla:** la tablet de la tienda solo abre producción. El entorno QA tiene su
> propia base de datos y muestra la franja «QA · datos de prueba», pero no debe
> usarse para vender.

---

## Cómo corre en GitHub

El workflow [`qa.yml`](.github/workflows/qa.yml):

1. Descarga la app (rama `main`, o la que elijas) y la construye en modo QA.
2. Publica esa construcción en el GitHub Pages de este repo (entorno QA).
3. Corre todas las pruebas contra esa misma construcción (y el Apps Script de
   esa misma rama) y sube el reporte HTML como artefacto (`reporte-playwright`).

Se dispara al hacer push a `main` de este repo, o a mano desde **Actions → QA →
Run workflow**, donde puedes elegir otra rama de la app (por ejemplo, la de un PR
antes de fusionarlo).

## Correr en tu computadora

```bash
npm install
npx playwright install chromium

# Contra el entorno QA publicado
npm test

# Contra una app construida localmente (repo de la app en ../casa-belen-punto-de-venta).
# Necesario para las pruebas de sincronización (SI): la hoja simulada corre en 127.0.0.1.
npm run sitio:local
npm run test:local

# Un solo módulo o un solo caso
npm test -- tests/gastos
npm test -- --grep "VG-03"

# Ver el último reporte
npm run reporte
```

Variables útiles: `QA_URL` (probar otra dirección), `PW_CHROME_PATH` (usar el
Chrome del sistema), `PW_SIN_VIDEO=1` (sin grabación de video),
`QA_APPS_SCRIPT` (carpeta del Apps Script si no está en `.sitio/apps-script` ni
en `../casa-belen-punto-de-venta/apps-script`).

Contra la app publicada (`npm test`), las pruebas de sincronización se saltan
solas con su motivo en el reporte.

---

## La hoja de inventario en las pruebas

Ninguna prueba automática escribe en una hoja de Google. La **hoja simulada**
(`src/utils/hoja-simulada/`) ejecuta el Apps Script **real** de la app
(`apps-script/*.gs`) sobre un libro en memoria que imita a Google Sheets
(estricto en rangos, tamaños y fórmulas, como la hoja real), y lo publica en un
puerto local igual que una aplicación web de Apps Script: POST → 302 → GET con
la respuesta, y sin contestar la consulta previa de CORS.

- `tests/hoja/` (**HS**): el script solo, sin navegador: preparar la hoja,
  seguridad (clave y entorno), ventas, gastos, cortes, entradas y conteos,
  catálogo, idempotencia.
- `tests/sincronizacion/` (**SI**): la app y el script juntos: vincular,
  subir solo, sin internet, fallas de la hoja, precios y existencias.
- La hoja simulada puede fallar a propósito (`fallarSiguiente`,
  `perderSiguienteRespuesta`) para probar reintentos sin duplicados.
- La prueba con una hoja de Google real (de pruebas, nunca la de la tienda) es
  el caso manual **MA-02**.

---

## Estructura

La estructura pedida (Data, Constants, Elements, Instances, Objects, Pages,
Resources, Setup, Tests) adaptada a cómo se organiza un proyecto TypeScript:

| Carpeta | Equivale a | Contenido |
|---|---|---|
| `src/data/` | Data | Los casos del Excel: productos, cantidades, pagos y montos esperados |
| `src/constants/` | Constants | URL del entorno, número de prueba, fondo inicial, textos fijos de la app |
| `src/types/` | Objects | Interfaces de TypeScript: la forma de un caso, un pago, un gasto, una venta esperada |
| `src/factories/` | Instances | Construyen lo que la app debe mostrar a partir de los datos (venta esperada, ticket, corte) y los registros que la tablet sube a la hoja (`registros-hoja.ts`) |
| `src/components/` | Elements | Piezas de pantalla reutilizables con sus localizadores: teclado numérico, diálogo, navegación |
| `src/pages/` | Pages | Una clase por pantalla: localizadores y acciones (abrir caja, agregar producto, pagar…) |
| `src/flows/` | — | Flujos de negocio completos (registrar venta, registrar gastos), reutilizados por el corte |
| `src/fixtures/` | Setup | Preparación de cada prueba: pantallas listas, caja abierta, captura de WhatsApp, limpieza y hoja simulada vinculada (`hoja.ts`) |
| `src/utils/` | Resources | Formato de dinero, lectura del enlace de WhatsApp, borrado de datos de la app y la hoja simulada (`hoja-simulada/`) |
| `tests/<módulo>/` | Tests | `ventas-general`, `ventas-alumno`, `busqueda`, `gastos`, `corte`, `hoja`, `sincronizacion` |
| `docs/` | — | `casos-de-prueba.xlsx` |

En C#, *Objects* son las clases con sus propiedades e *Instances* los objetos
creados de esas clases. En TypeScript las propiedades se describen con
interfaces (`types/`) y los objetos se arman con funciones fábrica
(`factories/`). Los localizadores (*Elements*) viven dentro de cada página o
componente, que es la forma habitual del patrón Page Object en Playwright.

## Reglas de las pruebas

- **Datos limpios.** Cada prueba corre en un navegador nuevo. Al terminar, pase o
  falle, borra la base de datos y el almacenamiento de la app y verifica que no
  quedó nada (fixture automático `datosLimpios`).
- **Solo QA.** Antes de empezar, cada prueba confirma que está en la app de QA
  (franja visible). Si apunta a producción, se detiene.
- **Hoja simulada, nunca real.** La hoja de las pruebas vive en memoria y se
  descarta al terminar cada prueba.
- **WhatsApp simulado.** Las pruebas nunca abren WhatsApp: capturan el enlace
  `wa.me/524431417837` y validan el ticket que lleva. El envío real es el caso
  manual **MA-01**.
- **El corte es el nodo.** CO-01 repite en una sola sesión todas las ventas y
  gastos de los demás casos (los toma de `src/data`, no los copia) y valida el
  balance por forma de pago.
- **Precios escritos en los datos.** Si cambia un precio en la app, la prueba lo
  detecta. Si el cambio es intencional, actualiza `src/data` y el Excel.
- **Identificadores estables.** Las pruebas usan roles accesibles y los
  `data-testid` de la app. Si la app cambia uno, actualiza la página
  correspondiente en `src/pages`.
