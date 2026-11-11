#!/usr/bin/env bash
# Políticas de contenedores (ítem 3.4). Conftest + OPA/Rego.
# 1) Pruebas unitarias de las reglas (conftest verify).
# 2) Los archivos reales (Dockerfile y docker-compose.yml) y el ejemplo PERMITIDO deben pasar.
# 3) Los ejemplos RECHAZADOS deben fallar (si alguno pasa, la política dejó de proteger).
# Salida: 0 todo como se espera · 1 alguna comprobación falló · 2 falta conftest (NO se da por aprobado).
set -u
cd "$(dirname "$0")/.."
command -v conftest >/dev/null || { echo "Falta conftest (brew install conftest)."; exit 2; }
estado=0

echo "▶ Pruebas de las reglas"
conftest verify --policy policy || estado=1

echo "▶ Archivos reales y ejemplo permitido (deben pasar)"
conftest test --policy policy backend/Dockerfile frontend/Dockerfile docker-compose.yml \
  policy/ejemplos/permitido/Dockerfile policy/ejemplos/permitido/compose.yml || estado=1

echo "▶ Ejemplos rechazados (deben fallar)"
for ejemplo in rechazado-user-root/Dockerfile rechazado-sin-user/Dockerfile rechazado-privilegiado/compose.yml; do
  if conftest test --policy policy "policy/ejemplos/$ejemplo" >/dev/null 2>&1; then
    echo "  ✘ $ejemplo PASÓ y debía ser rechazado"; estado=1
  else
    echo "  ✔ $ejemplo rechazado"
  fi
done

[ "$estado" -eq 0 ] && echo "Políticas OK." || echo "FALLARON LAS POLÍTICAS."
exit "$estado"
