#!/usr/bin/env bash
# DAST con ZAP Automation Framework contra las imágenes candidatas (ítem 4.7). Datos ficticios, red aislada de Docker.
# Levanta docker-compose.yml con un proyecto propio, espera /health, ejecuta pruebas/zap/plan.yaml y evalúa el informe.
# Salida: 0 sin alertas ALTO · 1 alertas ALTO · 2 no se pudo ejecutar (INCOMPLETO: nunca se reporta como aprobado).
# Informes en reportes-pruebas/zap/ (JSON y HTML). Reutilizable desde CI.
set -u
cd "$(dirname "$0")/../.."
command -v docker >/dev/null && docker info >/dev/null 2>&1 || { echo "Falta Docker en ejecución: DAST INCOMPLETO."; exit 2; }

ZAP_IMAGEN="ghcr.io/zaproxy/zaproxy@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af"
PROYECTO="observatorio-zap"
SALIDA="reportes-pruebas/zap"
# Valores FICTICIOS, solo para este ambiente efímero.
export ADMIN_API_KEY="clave-ficticia-de-prueba-0123456789"
export POSTGRES_PASSWORD="pruebas-locales-zap"
export NEXT_PUBLIC_API_URL="http://backend:3001"
export ZAP_ADMIN_KEY="$ADMIN_API_KEY"

mkdir -p "$SALIDA" && rm -f "$SALIDA"/zap-informe.*
limpiar() { docker compose -p "$PROYECTO" down -v --remove-orphans >/dev/null 2>&1; }
trap limpiar EXIT

echo "▶ Construyendo y levantando las imágenes candidatas"
docker compose -p "$PROYECTO" up -d --build >/dev/null 2>&1 || { echo "No se pudo levantar el compose."; docker compose -p "$PROYECTO" logs --tail 30; exit 2; }

echo "▶ Esperando /health del backend"
listo=0
for _ in $(seq 1 60); do
  if docker compose -p "$PROYECTO" exec -T backend node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then listo=1; break; fi
  sleep 2
done
[ "$listo" -eq 1 ] || { echo "El backend no respondió: DAST INCOMPLETO."; docker compose -p "$PROYECTO" logs --tail 30 backend; exit 2; }

echo "▶ Ejecutando ZAP Automation Framework"
docker run --rm --network "${PROYECTO}_default" -u 0 \
  -e ZAP_ADMIN_KEY \
  -v "$PWD/pruebas/zap:/zap/wrk/plan:ro" -v "$PWD/$SALIDA:/zap/wrk" \
  "$ZAP_IMAGEN" zap.sh -cmd -autorun /zap/wrk/plan/plan.yaml > "$SALIDA/zap-consola.log" 2>&1
codigo=$?
echo "ZAP terminó con código $codigo (0 correcto · 1 error de ejecución · 2 avisos)"
[ "$codigo" -eq 1 ] && { tail -20 "$SALIDA/zap-consola.log"; echo "ZAP falló al ejecutarse: INCOMPLETO."; exit 2; }

node scripts/pruebas/zap-compuerta.mjs "$SALIDA/zap-informe.json"
