#!/usr/bin/env bash
# Instala una herramienta de análisis en CI con versión FIJADA y checksum SHA-256 verificado (ítems 3.2 a 3.4).
# Uso: scripts/ci/instalar-herramienta.sh <semgrep|gitleaks|osv-scanner|conftest|trivy>
# Instala en $HERRAMIENTAS_BIN (por defecto ~/.local/bin). Si el checksum no coincide, falla: no se ejecuta
# nada descargado que no sea exactamente el binario publicado. Para actualizar una versión, cambia la
# versión (en la URL, dos veces) y el checksum de abajo en el mismo PR; el checksum se copia del archivo de
# checksums de la release. Renovate NO actualiza este archivo: la actualización es manual (ver
# docs/fases/03-construccion-integracion/evidencias/3.2-seguridad-ci.md). Nota: el checksum viene de la misma release; protege contra descargas corruptas o
# alteradas en tránsito, no contra una release comprometida en origen.
set -euo pipefail
DEST="${HERRAMIENTAS_BIN:-$HOME/.local/bin}"
mkdir -p "$DEST"
tmp="$(mktemp -d)"
trap 'rm -r "$tmp"' EXIT

bajar() { # bajar <url> <sha256> <archivo>
  curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 --retry 3 -o "$tmp/$3" "$1"
  echo "$2  $tmp/$3" | sha256sum --check --status || { echo "Checksum inválido para $3: se aborta." >&2; exit 1; }
}

case "${1:-}" in
  semgrep)
    python3 -m pip install --user --quiet "semgrep==1.184.0" ;;
  gitleaks)
    bajar "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz" \
      551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb gitleaks.tgz
    tar -xzf "$tmp/gitleaks.tgz" -C "$DEST" gitleaks ;;
  osv-scanner)
    bajar "https://github.com/google/osv-scanner/releases/download/v2.7.1/osv-scanner_linux_amd64" \
      fb7dab19a8bd9bbe5c3189f09d4b7ee1820c9553a23bac202648a56efd2f6ee8 osv-scanner
    install -m 0755 "$tmp/osv-scanner" "$DEST/osv-scanner" ;;
  conftest)
    bajar "https://github.com/open-policy-agent/conftest/releases/download/v0.71.1/conftest_0.71.1_Linux_x86_64.tar.gz" \
      c3f6b2a753bd56e377a1e51a95ae3e057f926f2e9139f7d5b5dfbbaf810f7985 conftest.tgz
    tar -xzf "$tmp/conftest.tgz" -C "$DEST" conftest ;;
  trivy)
    bajar "https://github.com/aquasecurity/trivy/releases/download/v0.76.2/trivy_0.76.2_Linux-64bit.tar.gz" \
      bc0fc726e017b8927a62b2d3531d7a84ee01769daf5c99ed866dced54089fdbf trivy.tgz
    tar -xzf "$tmp/trivy.tgz" -C "$DEST" trivy ;;
  *) echo "Uso: $0 <semgrep|gitleaks|osv-scanner|conftest|trivy>" >&2; exit 2 ;;
esac
echo "Instalado: $1"
