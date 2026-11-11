#!/usr/bin/env bash
# Protección de `main` y `development` y permisos mínimos de Actions (ítem 3.5).
# Cambia la configuración del repositorio REMOTO y exige permisos de administración: lo ejecuta una PERSONA,
# no el agente (`.claude/settings.json` no lo permite sin aprobación). Por defecto solo MUESTRA lo que haría.
# Uso:
#   scripts/ci/proteger-ramas.sh                    # simulacro (no cambia nada)
#   APROBACIONES=1 scripts/ci/proteger-ramas.sh --aplicar
# Variables:
#   APROBACIONES     aprobaciones de otro integrante que exige el PR (por defecto 1; el ítem 3.5 pide al menos 1).
#   ENFORCE_ADMINS   true (por defecto) aplica las reglas también a administradores. Con un solo integrante
#                    disponible, 1 aprobación + true impide fusionar: decide en Q-13 antes de aplicar.
#   CHECKS           checks obligatorios separados por comas (por defecto: resultado, el agregado de ci.yml).
set -euo pipefail
APLICAR=0; [ "${1:-}" = "--aplicar" ] && APLICAR=1
REPO="${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
APROBACIONES="${APROBACIONES:-1}"
ENFORCE_ADMINS="${ENFORCE_ADMINS:-true}"
CHECKS="${CHECKS:-resultado}"
contextos="$(printf '%s' "$CHECKS" | python3 -c 'import sys,json; print(json.dumps([c.strip() for c in sys.stdin.read().split(",") if c.strip()]))')"

cuerpo() {
  cat <<JSON
{
  "required_status_checks": { "strict": true, "contexts": $contextos },
  "enforce_admins": $ENFORCE_ADMINS,
  "required_pull_request_reviews": {
    "required_approving_review_count": $APROBACIONES,
    "dismiss_stale_reviews": true,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
}

echo "Repositorio: $REPO · aprobaciones: $APROBACIONES · administradores sujetos a las reglas: $ENFORCE_ADMINS · checks: $CHECKS"
for rama in main development; do
  if ! gh api "repos/$REPO/branches/$rama" >/dev/null 2>&1; then echo "· $rama: no existe, se omite (Q-13)"; continue; fi
  echo "· $rama: protección con PR obligatorio, $APROBACIONES aprobación(es), checks [$CHECKS], sin force push ni borrado"
  [ "$APLICAR" -eq 1 ] && cuerpo | gh api --method PUT "repos/$REPO/branches/$rama/protection" --input - >/dev/null && echo "  aplicado"
done

echo "· Actions: permisos por defecto de solo lectura y sin poder aprobar PR"
[ "$APLICAR" -eq 1 ] && gh api --method PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null && echo "  aplicado"

[ "$APLICAR" -eq 1 ] || echo "Simulacro: no se cambió nada. Repite con --aplicar para aplicarlo."
