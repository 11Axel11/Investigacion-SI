#!/usr/bin/env bash
# Ambiente aislado de pruebas (ítem 4.1). PostgreSQL efímero en Docker, con datos FICTICIOS.
#
# Uso:
#   scripts/pruebas/ambiente.sh up       # inicia la BD de pruebas y espera a que acepte conexiones
#   scripts/pruebas/ambiente.sh seed     # carga datos ficticios (TSE, OIJ y OSM inventados)
#   scripts/pruebas/ambiente.sh limpiar  # vacía las tablas (el esquema se conserva)
#   scripts/pruebas/ambiente.sh down     # detiene y elimina el contenedor y sus datos
#   scripts/pruebas/ambiente.sh estado   # dice si la BD responde
#   scripts/pruebas/ambiente.sh url      # imprime TEST_DATABASE_URL (credenciales de PRUEBA, no secretas)
#
# Cuentas con distintos permisos: el sistema no tiene usuarios (Q-01/Q-02). Los dos "roles" son el visitante
# (sin clave) y el operador (cabecera X-Admin-Key). Se usa una clave FICTICIA de prueba, distinta de cualquier
# clave real; vive solo en este script y en las pruebas. Reutilizable desde CI: el workflow llama a este mismo script.
#
# Códigos de salida: 0 correcto · 1 falló · 2 falta Docker (la prueba que dependa de la BD queda INCOMPLETA).
set -euo pipefail
cd "$(dirname "$0")/../.."

NOMBRE="${PRUEBAS_DB_NOMBRE:-observatorio-pruebas-db}"
PUERTO="${PRUEBAS_DB_PUERTO:-55432}"
IMAGEN="postgres:17-alpine@sha256:e5d2edd28b1f8d40a0a6c0c9cdc545b19b56a0d5d88f94bc11a97d970d4700d0"
# Credenciales de laboratorio, solo para este contenedor efímero que escucha en 127.0.0.1.
URL="postgresql://pruebas:pruebas-locales@127.0.0.1:${PUERTO}/pruebas"

requiere_docker() {
  command -v docker >/dev/null && docker info >/dev/null 2>&1 || { echo "Falta Docker en ejecución: la prueba con BD queda INCOMPLETA."; exit 2; }
}

esperar() {
  for _ in $(seq 1 40); do
    if docker exec "$NOMBRE" pg_isready -U pruebas -d pruebas >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo "La BD de pruebas no respondió en 40 s."; exit 1
}

case "${1:-}" in
  up)
    requiere_docker
    if docker ps --format '{{.Names}}' | grep -qx "$NOMBRE"; then echo "Ya estaba iniciada: $NOMBRE"; else
      docker rm -f "$NOMBRE" >/dev/null 2>&1 || true
      docker run -d --name "$NOMBRE" --rm \
        -e POSTGRES_USER=pruebas -e POSTGRES_PASSWORD=pruebas-locales -e POSTGRES_DB=pruebas \
        -p "127.0.0.1:${PUERTO}:5432" --tmpfs /var/lib/postgresql/data \
        "$IMAGEN" >/dev/null
    fi
    esperar
    echo "BD de pruebas lista en 127.0.0.1:${PUERTO}"
    ;;
  seed)
    (cd backend && npm run build --silent && TEST_DATABASE_URL="$URL" node scripts/pruebas/sembrar.cjs)
    ;;
  limpiar)
    (cd backend && npm run build --silent && TEST_DATABASE_URL="$URL" node scripts/pruebas/sembrar.cjs --limpiar)
    ;;
  down)
    requiere_docker
    docker rm -f "$NOMBRE" >/dev/null 2>&1 && echo "Eliminada: $NOMBRE" || echo "No existía: $NOMBRE"
    ;;
  estado)
    requiere_docker
    docker exec "$NOMBRE" pg_isready -U pruebas -d pruebas
    ;;
  url)
    echo "$URL"
    ;;
  *)
    sed -n '2,16p' "$0"; exit 1
    ;;
esac
