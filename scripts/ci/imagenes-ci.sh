#!/usr/bin/env bash
# Imágenes candidatas y su análisis (ítem 3.3). Construye backend y frontend, ejecuta Trivy sobre cada imagen y
# sobre los Dockerfile y docker-compose.yml (IaC) y genera el SBOM CycloneDX. Reportes en ./reportes-imagenes.
# No publica nada: la imagen aprobada se publica por digest en la fase 5.
# Reglas (docs/fases/03-construccion-integracion/evidencias/3.3-imagenes.md):
#   - Bloquea cualquier vulnerabilidad HIGH o CRITICAL con corrección disponible (--ignore-unfixed) en la imagen y
#     cualquier configuración insegura HIGH o CRITICAL en Dockerfile o compose.
#   - Si no se pudo construir, descargar la base de datos de Trivy o generar un reporte, el análisis es INCOMPLETO
#     y también bloquea. Nunca se interpreta como aprobado.
# Salida: 0 limpio · 1 hay hallazgos · 2 incompleto (tiene prioridad).
# Variables: COMMIT_SHA (por defecto, el HEAD). Los reportes no contienen secretos ni variables de entorno.
set -u
cd "$(dirname "$0")/../.."
SHA="${COMMIT_SHA:-$(git rev-parse HEAD)}"
OUT=reportes-imagenes
mkdir -p "$OUT"
hallazgos=0
incompletos=0
ids=()

falla_incompleto() { echo "  ⚠ $1: INCOMPLETO"; incompletos=1; }

for servicio in backend frontend; do
  etiqueta="observatorio-$servicio:$SHA"
  echo "▶ $servicio: construir $etiqueta"
  if ! docker build --quiet --tag "$etiqueta" --label "org.opencontainers.image.revision=$SHA" \
      --label "org.opencontainers.image.title=observatorio-$servicio" "$servicio" >/dev/null; then
    falla_incompleto "construcción de $servicio"; continue
  fi
  id="$(docker inspect --format '{{.Id}}' "$etiqueta")"
  ids+=("\"$servicio\":{\"imagen\":\"$etiqueta\",\"id\":\"$id\"}")

  echo "▶ $servicio: Trivy (imagen)"
  trivy image --quiet --exit-code 0 --format json --output "$OUT/trivy-imagen-$servicio.json" "$etiqueta" \
    || { falla_incompleto "Trivy imagen $servicio"; continue; }
  trivy image --quiet --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed --format table \
    --output "$OUT/trivy-bloqueo-$servicio.txt" "$etiqueta" \
    || { echo "  ✘ $servicio: vulnerabilidades HIGH/CRITICAL con corrección disponible (reporte: trivy-bloqueo-$servicio.txt)"
         grep -E "│ *(HIGH|CRITICAL) *│" "$OUT/trivy-bloqueo-$servicio.txt" | head -20; hallazgos=1; }

  echo "▶ $servicio: SBOM CycloneDX"
  trivy image --quiet --format cyclonedx --output "$OUT/sbom-$servicio.cdx.json" "$etiqueta" \
    || falla_incompleto "SBOM de $servicio"
done

echo "▶ Trivy (IaC: Dockerfile y docker-compose.yml; policy/ejemplos se excluye: son casos rechazados a propósito, cubiertos por Conftest)"
trivy config --quiet --skip-dirs policy/ejemplos --skip-dirs node_modules --exit-code 0 --format json --output "$OUT/trivy-iac.json" . \
  || falla_incompleto "Trivy IaC"
trivy config --quiet --skip-dirs policy/ejemplos --skip-dirs node_modules --exit-code 1 --severity HIGH,CRITICAL --format table --output "$OUT/trivy-iac-bloqueo.txt" . \
  || { echo "  ✘ configuración insegura HIGH/CRITICAL (reporte: trivy-iac-bloqueo.txt)"; head -40 "$OUT/trivy-iac-bloqueo.txt"; hallazgos=1; }

# Identidad de lo evaluado: commit e imágenes. La fase 5 reutiliza estos reportes y publica la MISMA imagen.
printf '{"commit":"%s","trivy":"%s","imagenes":{%s}}\n' "$SHA" "$(trivy --version | head -1 | awk '{print $2}')" \
  "$(IFS=,; echo "${ids[*]:-}")" > "$OUT/metadatos.json"

echo
if [ "$incompletos" -eq 1 ]; then echo "RESULTADO: INCOMPLETO (no se da por aprobado)."; exit 2; fi
if [ "$hallazgos" -eq 1 ]; then echo "RESULTADO: HAY HALLAZGOS que bloquean."; exit 1; fi
echo "RESULTADO: limpio."
