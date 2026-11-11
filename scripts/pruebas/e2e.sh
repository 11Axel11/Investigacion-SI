#!/usr/bin/env bash
# E2E con Playwright de los flujos críticos (ítem 4.4). Levanta la BD de pruebas, compila el backend, ejecuta
# e2e/ (que arranca Overpass falso, backend y frontend) y elimina la BD al terminar.
# Salida: 0 todo pasó · 1 alguna prueba falló · 2 falta Docker (INCOMPLETO). Informe: e2e/informe/.
set -u
cd "$(dirname "$0")/../.."
scripts/pruebas/ambiente.sh up || exit $?
trap 'scripts/pruebas/ambiente.sh down >/dev/null 2>&1' EXIT
export TEST_DATABASE_URL="$(scripts/pruebas/ambiente.sh url)"
(cd backend && npm run build --silent) || exit 1
(cd e2e && npx playwright test)
