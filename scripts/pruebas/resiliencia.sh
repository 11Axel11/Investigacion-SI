#!/usr/bin/env bash
# Experimento de resiliencia con Toxiproxy (ítem 4.10). Levanta Toxiproxy y la BD de pruebas, ejecuta
# backend/scripts/pruebas/resiliencia.test.cjs y lo elimina todo al terminar. Overpass es un servidor local falso.
# Salida: 0 hipótesis confirmadas · 1 alguna no se cumplió · 2 falta Docker (INCOMPLETO).
set -u
cd "$(dirname "$0")/../.."
command -v docker >/dev/null && docker info >/dev/null 2>&1 || { echo "Falta Docker en ejecución: experimento INCOMPLETO."; exit 2; }
TOXIPROXY="ghcr.io/shopify/toxiproxy@sha256:9378ed52a28bc50edc1350f936f518f31fa95f0d15917d6eb40b8e376d1a214e"
NOMBRE="observatorio-toxiproxy"

scripts/pruebas/ambiente.sh up || exit $?
trap 'docker rm -f "$NOMBRE" >/dev/null 2>&1; scripts/pruebas/ambiente.sh down >/dev/null 2>&1' EXIT
docker rm -f "$NOMBRE" >/dev/null 2>&1
docker run -d --rm --name "$NOMBRE" --add-host=host.docker.internal:host-gateway -p 127.0.0.1:8474:8474 -p 127.0.0.1:8666:8666 "$TOXIPROXY" >/dev/null || exit 2
for _ in $(seq 1 20); do curl -fs http://127.0.0.1:8474/version >/dev/null 2>&1 && break; sleep 1; done
curl -fs http://127.0.0.1:8474/version >/dev/null 2>&1 || { echo "Toxiproxy no respondió: INCOMPLETO."; exit 2; }

export TEST_DATABASE_URL="$(scripts/pruebas/ambiente.sh url)"
(cd backend && npm run build --silent && node --test scripts/pruebas/resiliencia.test.cjs)
