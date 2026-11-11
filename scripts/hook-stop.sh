#!/usr/bin/env bash
# Hook Stop de Claude Code (ítem 2.4). Ejecuta scripts/verificar.sh al terminar el agente y le
# devuelve los fallos para que los corrija. Reintentos con límite: tras MAX_INTENTOS fallos seguidos
# se detiene y reporta a una persona (no bloquea más). Registro en .claude/verificaciones.log.
set -u
cd "$(dirname "$0")/.."
MAX_INTENTOS="${MAX_INTENTOS:-3}"
ESTADO=".claude/.intentos"
LOG=".claude/verificaciones.log"
mkdir -p .claude
cat >/dev/null   # descarta la entrada JSON del hook

# Sin cambios sin confirmar no hay nada que verificar.
if [ -z "$(git status --porcelain 2>/dev/null)" ]; then rm -f "$ESTADO"; exit 0; fi

salida=$(scripts/verificar.sh --rapido 2>&1); codigo=$?
intentos=$(cat "$ESTADO" 2>/dev/null || echo 0)
marca=$(date '+%Y-%m-%d %H:%M:%S')

if [ "$codigo" -eq 0 ]; then
  rm -f "$ESTADO"
  echo "$marca OK (tras $intentos fallos previos)" >> "$LOG"
  exit 0
fi

intentos=$((intentos + 1))
echo "$intentos" > "$ESTADO"
echo "$marca FALLO intento $intentos/$MAX_INTENTOS (código $codigo)" >> "$LOG"

if [ "$intentos" -ge "$MAX_INTENTOS" ]; then
  rm -f "$ESTADO"
  echo "$marca DETENIDO: límite de reintentos; requiere intervención humana" >> "$LOG"
  printf '{"systemMessage":"Verificaciones fallan tras %s intentos. El agente se detiene: requiere intervención humana. Ver .claude/verificaciones.log"}\n' "$MAX_INTENTOS"
  exit 0
fi

{
  echo "Las verificaciones fallaron (intento $intentos de $MAX_INTENTOS). Corrige la causa; no desactives ni debilites pruebas, reglas ni controles."
  echo "$salida" | tail -n 60
} >&2
exit 2
