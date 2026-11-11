#!/usr/bin/env bash
# Análisis de seguridad local (ítem 2.3): Semgrep CE con reglas propias + Gitleaks.
# Uso: scripts/seguridad.sh [directorio]   (por defecto, la raíz del repositorio)
# Salida: 0 sin hallazgos · 1 hay hallazgos · 2 falta una herramienta (NO se da por aprobado).
# Semgrep corre sin métricas ni consulta de versión; Gitleaks redacta los valores en su salida.
set -u
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
OBJ="${1:-$RAIZ}"
estado=0

for h in semgrep gitleaks; do
  command -v "$h" >/dev/null || { echo "Falta $h (brew install $h)."; exit 2; }
done

echo "▶ Semgrep CE (reglas: .semgrep/observatorio.yml)"
( cd "$OBJ" && semgrep --config "$RAIZ/.semgrep/observatorio.yml" --metrics=off --disable-version-check \
    --quiet --error --exclude node_modules --exclude .next --exclude dist . ) || estado=1

echo "▶ Archivos .env versionados (los .env locales se excluyen del escaneo del árbol: deben estar ignorados)"
if [ -d "$OBJ/.git" ]; then
  versionados=$(git -C "$OBJ" ls-files | grep -E '(^|/)\.env(\.[A-Za-z]+)*$' | grep -Ev '\.(example|sample|template)$' || true)
  if [ -n "$versionados" ]; then
    echo "HAY UN .env VERSIONADO (debe estar en .gitignore y fuera del historial):"
    echo "$versionados" | sed 's/^/  /'
    estado=1
  fi
fi

echo "▶ Gitleaks (árbol de trabajo y, si es un repositorio, el historial)"
if [ -d "$OBJ/.git" ]; then
  gitleaks git --config "$RAIZ/.gitleaks.toml" --no-banner --redact "$OBJ" || estado=1
fi
gitleaks dir --config "$RAIZ/.gitleaks.toml" --no-banner --redact "$OBJ" || estado=1

[ "$estado" -eq 0 ] && echo "Sin hallazgos." || echo "HAY HALLAZGOS: revisa y corrige (no los silencies)."
exit "$estado"
