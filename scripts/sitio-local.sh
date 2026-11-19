#!/usr/bin/env bash
# Construye la app en modo QA y la deja en .sitio/ para `npm run test:local`,
# junto con su Apps Script (.sitio/apps-script, para la hoja simulada).
# Uso: npm run sitio:local [ruta-al-repo-de-la-app]   (por defecto ../casa-belen-punto-de-venta)
set -euo pipefail
APP="${1:-../casa-belen-punto-de-venta}"
DESTINO="$(pwd)/.sitio/casa-belen-punto-de-venta-qa"
[ -f "$APP/package.json" ] || { echo "No encuentro la app en $APP" >&2; exit 1; }
( cd "$APP" && npm ci --no-audit --no-fund && VITE_ENTORNO=qa VITE_BASE=/casa-belen-punto-de-venta-qa/ npx vite build --outDir "$DESTINO" --emptyOutDir )
rm -rf "$(pwd)/.sitio/apps-script" && cp -r "$APP/apps-script" "$(pwd)/.sitio/apps-script"
echo "Sitio QA listo en $DESTINO (Apps Script en .sitio/apps-script)"
