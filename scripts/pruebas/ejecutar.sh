#!/usr/bin/env bash
# Suite de pruebas de la fase 4 que usa la BD de pruebas (ítems 4.1, 4.3, 4.5 y 4.6). Reutilizable desde CI.
# Inicia la BD efímera, ejecuta las pruebas unitarias y las de integración/autorización y la elimina al terminar.
# Códigos de salida: 0 todo pasó · 1 alguna prueba falló · 2 falta Docker (INCOMPLETA: nunca se reporta como aprobada).
set -u
cd "$(dirname "$0")/../.."
AMBIENTE=scripts/pruebas/ambiente.sh
estado=0

"$AMBIENTE" up || exit $?
trap '"$AMBIENTE" down >/dev/null 2>&1' EXIT
export TEST_DATABASE_URL="$("$AMBIENTE" url)"

(cd backend && npm run test:coverage --silent) || estado=1
(cd backend && npm run test:integracion --silent) || estado=1

[ "$estado" -eq 0 ] && echo "Pruebas de la fase 4 (con BD): OK." || echo "FALLARON pruebas de la fase 4."
exit "$estado"
