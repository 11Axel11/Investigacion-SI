#!/usr/bin/env bash
# Verificaciones de la fase 2 (ítems 2.2 a 2.4). Se ejecuta a mano o desde el hook Stop.
# Uso: scripts/verificar.sh [--rapido]
#   --rapido  omite compilar el frontend (lo más lento).
# Códigos de salida: 0 todo pasó · 1 alguna comprobación falló · 2 falta una herramienta obligatoria.
# Nunca imprime variables de entorno ni el contenido de archivos .env.
set -u
cd "$(dirname "$0")/.."
RAPIDO=0
[ "${1:-}" = "--rapido" ] && RAPIDO=1

fallos=()
omitidas=()

paso() { # paso <nombre> <directorio> <comando...>
  local nombre="$1" dir="$2"; shift 2
  echo "▶ $nombre"
  local salida
  if salida=$(cd "$dir" && "$@" 2>&1); then
    echo "  ✔ $nombre"
  else
    echo "  ✘ $nombre"
    echo "$salida" | tail -n 40 | sed 's/^/    /'
    fallos+=("$nombre")
  fi
}

paso "backend: lint"            backend  npm run lint --silent
paso "backend: build"           backend  npm run build --silent
paso "backend: test:admin"      backend  npm run test:admin --silent
paso "backend: test:oij"        backend  npm run test:oij --silent
paso "frontend: lint"           frontend npm run lint --silent
paso "frontend: test:operator"  frontend npm run test:operator --silent
if [ "$RAPIDO" -eq 0 ]; then
  paso "frontend: build"        frontend npm run build --silent
  git checkout -- frontend/next-env.d.ts 2>/dev/null   # next build lo regenera
else
  omitidas+=("frontend: build (--rapido)")
fi

# Seguridad (2.3). Si falta la herramienta NO se da por aprobado: se informa como omitida.
if [ -x scripts/seguridad.sh ]; then
  paso "seguridad (Semgrep + Gitleaks)" . scripts/seguridad.sh
else
  omitidas+=("seguridad: scripts/seguridad.sh no existe")
fi

echo
[ "${#omitidas[@]}" -gt 0 ] && printf 'OMITIDA: %s\n' "${omitidas[@]}"
if [ "${#fallos[@]}" -gt 0 ]; then
  printf 'FALLÓ: %s\n' "${fallos[@]}"
  exit 1
fi
echo "OK: todas las comprobaciones ejecutadas pasaron."
