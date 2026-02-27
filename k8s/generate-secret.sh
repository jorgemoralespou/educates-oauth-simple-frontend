#!/usr/bin/env bash
set -euo pipefail

SCRIPT_NAME="$(basename "$0")"
CONFIG_DIR=""
OUTPUT=""
SECRET_NAME="educates-frontend-config"
NAMESPACE="educates-portal"

usage() {
  cat <<EOF
Usage: $SCRIPT_NAME [OPTIONS] [CONFIG_DIR]

Generate a Kubernetes Secret manifest containing the portal configuration
files (site.json, theme.css, logo.svg) from a config directory.

Arguments:
  CONFIG_DIR              Path to the config directory (default: ./config)

Options:
  -o, --output FILE       Write output to FILE instead of stdout
  -n, --name NAME         Secret name (default: $SECRET_NAME)
  -N, --namespace NS      Namespace (default: $NAMESPACE)
  -h, --help              Show this help message and exit

Files included (if present in CONFIG_DIR):
  site.json   (required)  Site configuration
  theme.css   (optional)  Custom CSS theme overrides
  logo.svg    (optional)  Custom logo for the header

Examples:
  $SCRIPT_NAME                                     # Use ./config, print to stdout
  $SCRIPT_NAME /path/to/config                     # Use custom config dir
  $SCRIPT_NAME -o secret.yaml                      # Write to file
  $SCRIPT_NAME -n my-secret -N my-ns /path/to/cfg  # Custom secret name & namespace
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -o|--output)
      OUTPUT="$2"
      shift 2
      ;;
    -n|--name)
      SECRET_NAME="$2"
      shift 2
      ;;
    -N|--namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    -*)
      echo "Error: Unknown option $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      CONFIG_DIR="$1"
      shift
      ;;
  esac
done

# Default config dir
if [[ -z "$CONFIG_DIR" ]]; then
  CONFIG_DIR="$(cd "$(dirname "$0")/../.." && pwd)/config"
fi

# Validate config dir
if [[ ! -d "$CONFIG_DIR" ]]; then
  echo "Error: Config directory not found: $CONFIG_DIR" >&2
  exit 1
fi

# site.json is required
if [[ ! -f "$CONFIG_DIR/site.json" ]]; then
  echo "Error: site.json not found in $CONFIG_DIR" >&2
  exit 1
fi

# Build the secret manifest
manifest="apiVersion: v1
kind: Secret
metadata:
  name: ${SECRET_NAME}
  namespace: ${NAMESPACE}
type: Opaque
data:"

# Encode site.json
b64_site=$(base64 < "$CONFIG_DIR/site.json" | tr -d '\n')
manifest="${manifest}
  site.json: ${b64_site}"

# Encode theme.css if present
b64_theme=""
if [[ -f "$CONFIG_DIR/theme.css" ]]; then
  b64_theme=$(base64 < "$CONFIG_DIR/theme.css" | tr -d '\n')
fi
  manifest="${manifest}
  theme.css: ${b64_theme}"

IMAGE_FILES=("logo.svg" "logo.png" "logo.jpg" "logo.jpeg" "logo.webp")
for file in "${IMAGE_FILES[@]}"; do
  b64_file=""
  if [[ -f "$CONFIG_DIR/$file" ]]; then
    b64_file=$(base64 < "$CONFIG_DIR/$file" | tr -d '\n')
  fi
  manifest="${manifest}
  ${file}: ${b64_file}"
done

# Output
if [[ -n "$OUTPUT" ]]; then
  echo "$manifest" > "$OUTPUT"
  echo "Secret manifest written to $OUTPUT" >&2
else
  echo "$manifest"
fi
