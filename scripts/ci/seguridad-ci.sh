#!/usr/bin/env bash
# Análisis de seguridad en CI (ítem 3.2): Semgrep CE + Gitleaks + OSV-Scanner, con reportes en ./reportes.
# Reglas de decisión (documentadas en docs/fases/03-construccion-integracion/evidencias/3.2-seguridad-ci.md):
#   Semgrep   exit 0 sin hallazgos · 1 hallazgos (BLOQUEA) · otro = no pudo ejecutarse (INCOMPLETO)
#   Gitleaks  exit 0 sin secretos  · 1 secretos  (BLOQUEA) · otro = no pudo ejecutarse (INCOMPLETO)
#   OSV       exit 0 sin bloqueos  · 1 avisos CVSS >= 7 sin excepción vigente (BLOQUEA) · 2 incompleto
# Un análisis que no pudo ejecutarse es INCOMPLETO y también bloquea: nunca se interpreta como aprobado.
# Salida del script: 0 todo limpio · 1 hay hallazgos · 2 al menos un análisis incompleto (tiene prioridad).
# Los reportes redactan los secretos (Gitleaks --redact) y no incluyen variables de entorno.
set -u
cd "$(dirname "$0")/../.."
mkdir -p reportes
hallazgos=0
incompletos=0

resumen() { # resumen <herramienta> <código> <mensaje de hallazgos>
  case "$2" in
    0) echo "  ✔ $1: sin hallazgos" ;;
    1) echo "  ✘ $1: $3"; hallazgos=1 ;;
    *) echo "  ⚠ $1: NO pudo ejecutarse (código $2): análisis INCOMPLETO"; incompletos=1 ;;
  esac
}

echo "▶ Semgrep CE"
semgrep --config .semgrep/observatorio.yml --metrics=off --disable-version-check --quiet --error \
  --exclude node_modules --exclude .next --exclude dist --json -o reportes/semgrep.json .
resumen Semgrep $? "hay hallazgos (ver reportes/semgrep.json)"

echo "▶ Gitleaks (historial completo)"
gitleaks git --config .gitleaks.toml --no-banner --redact --report-format json --report-path reportes/gitleaks-historial.json .
resumen "Gitleaks (historial)" $? "se detectaron secretos"
echo "▶ Gitleaks (árbol de trabajo)"
gitleaks dir --config .gitleaks.toml --no-banner --redact --report-format json --report-path reportes/gitleaks-arbol.json .
resumen "Gitleaks (árbol)" $? "se detectaron secretos"

echo "▶ Archivos .env versionados"
versionados=$(git ls-files | grep -E '(^|/)\.env(\.[A-Za-z]+)*$' | grep -Ev '\.(example|sample|template)$' || true)
if [ -n "$versionados" ]; then echo "  ✘ hay un .env versionado:"; echo "$versionados" | sed 's/^/    /'; hallazgos=1; else echo "  ✔ ninguno"; fi

echo "▶ OSV-Scanner (package-lock.json de backend y frontend)"
osv-scanner scan source -L backend/package-lock.json -L frontend/package-lock.json --format json --output-file reportes/osv.json >/dev/null 2>reportes/osv.stderr
codigo_osv=$?
# 0 = sin vulnerabilidades, 1 = hay vulnerabilidades (la compuerta decide cuáles bloquean), otro = error.
if [ "$codigo_osv" -le 1 ]; then
  node scripts/ci/osv-gate.mjs reportes/osv.json osv-excepciones.json | tee reportes/osv-resumen.txt
  resumen OSV "${PIPESTATUS[0]}" "hay avisos de gravedad alta o crítica sin excepción vigente"
else
  resumen OSV "$codigo_osv" ""
fi

echo
if [ "$incompletos" -eq 1 ]; then echo "RESULTADO: INCOMPLETO (no se da por aprobado)."; exit 2; fi
if [ "$hallazgos" -eq 1 ]; then echo "RESULTADO: HAY HALLAZGOS que bloquean."; exit 1; fi
echo "RESULTADO: limpio."
