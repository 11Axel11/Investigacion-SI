#!/usr/bin/env bash
# Demostración de que las pruebas detectan fallos (ítem 4.9). Introduce un defecto CONTROLADO en una copia temporal
# del archivo, ejecuta las pruebas que deben detectarlo (deben FALLAR), restaura el archivo y vuelve a ejecutarlas
# (deben PASAR). Nunca deja el defecto en el árbol: si algo se interrumpe, el `trap` restaura el original.
#
# Uso:  scripts/pruebas/defecto-controlado.sh funcional     # reintroduce el bug de fechas imposibles (F01-AC5)
#       scripts/pruebas/defecto-controlado.sh seguridad     # quita la clave de administración de POST /oij/sync (T-01)
# Requiere Docker solo para el caso "seguridad" (usa la BD de pruebas). Salida: 0 si el defecto fue detectado y el
# código original pasa; 1 si el defecto NO fue detectado o el original falla; 2 si no se pudo ejecutar (INCOMPLETO).
set -u
cd "$(dirname "$0")/../.."
tipo="${1:-}"
SALIDA=reportes-pruebas; mkdir -p "$SALIDA"

case "$tipo" in
  funcional)
    archivo=backend/src/tse/tse.service.ts
    parche() { python3 - "$archivo" <<'PY'
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
viejo = "if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {"
assert viejo in s, 'no se encontró la línea a mutar'
open(p, 'w', encoding='utf-8').write(s.replace(viejo, "if (!parsed || Number.isNaN(parsed.getTime())) {"))
PY
    }
    pruebas() { (cd backend && npm run test:tse --silent); }
    ;;
  seguridad)
    archivo=backend/src/oij/oij.controller.ts
    parche() { python3 - "$archivo" <<'PY'
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
viejo = "@Post('sync') @UseGuards(AdminKeyGuard) sync("
assert viejo in s, 'no se encontró la línea a mutar'
open(p, 'w', encoding='utf-8').write(s.replace(viejo, "@Post('sync') sync("))
PY
    }
    pruebas() {
      scripts/pruebas/ambiente.sh up >/dev/null || return 2
      # Se ejecutan las dos suites aunque la primera falle, para ver qué detecta cada una.
      (cd backend && export TEST_DATABASE_URL="$(../scripts/pruebas/ambiente.sh url)"; npm run test:admin --silent; a=$?; npm run test:integracion --silent; b=$?; exit $((a | b)))
    }
    trap 'scripts/pruebas/ambiente.sh down >/dev/null 2>&1' EXIT
    ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac

[ -z "$(git status --porcelain -- "$archivo")" ] || { echo "$archivo tiene cambios sin guardar; se aborta para no perderlos."; exit 2; }
respaldo="$(mktemp)"; cp "$archivo" "$respaldo"
restaurar() { [ -f "$respaldo" ] && cp "$respaldo" "$archivo"; rm -f "$respaldo"; }
trap 'restaurar; scripts/pruebas/ambiente.sh down >/dev/null 2>&1' EXIT

echo "▶ 1/3 Con el defecto ($tipo) las pruebas deben FALLAR"
parche || { echo "No se pudo aplicar el defecto."; exit 2; }
pruebas > "$SALIDA/defecto-$tipo-fallo.txt" 2>&1; con_defecto=$?
grep -E "^(✖|ℹ (tests|pass|fail))" "$SALIDA/defecto-$tipo-fallo.txt" | head -12
restaurar

echo "▶ 2/3 Defecto retirado: el archivo original vuelve a estar en el árbol"
git diff --quiet -- "$archivo" && echo "  (sin diferencias con git)" || { echo "  El archivo difiere de git: revisa a mano."; exit 2; }

echo "▶ 3/3 Con el código original las pruebas deben PASAR"
pruebas > "$SALIDA/defecto-$tipo-aprobado.txt" 2>&1; original=$?
grep -E "^ℹ (tests|pass|fail)" "$SALIDA/defecto-$tipo-aprobado.txt" | head -6

[ "$con_defecto" -eq 2 ] || [ "$original" -eq 2 ] && { echo "INCOMPLETO: no se pudo ejecutar."; exit 2; }
if [ "$con_defecto" -ne 0 ] && [ "$original" -eq 0 ]; then echo "OK: las pruebas detectaron el defecto y aprueban el código original."; exit 0; fi
[ "$con_defecto" -eq 0 ] && echo "FALLO: las pruebas NO detectaron el defecto."
[ "$original" -ne 0 ] && echo "FALLO: el código original no pasa las pruebas."
exit 1
