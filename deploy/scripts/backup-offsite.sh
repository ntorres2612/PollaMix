#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$#" -ne 1 ]; then
  echo "Uso: backup-offsite.sh prd|qa"
  exit 2
fi

case "$1" in
  prd)
    REPO_VAR="GOLPRO_RESTIC_REPOSITORY_PRD"
    PASS_VAR="GOLPRO_RESTIC_PASSWORD_FILE_PRD"
    ;;
  qa)
    REPO_VAR="GOLPRO_RESTIC_REPOSITORY_QA"
    PASS_VAR="GOLPRO_RESTIC_PASSWORD_FILE_QA"
    ;;
  *)
    echo "ERROR: Entorno no válido."
    exit 2
    ;;
esac

if ! command -v restic >/dev/null 2>&1; then
  echo "ERROR: Restic no está instalado."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker no está disponible."
  exit 1
fi

REPOSITORY="${!REPO_VAR:-}"
PASSWORD_FILE="${!PASS_VAR:-}"

if [ -z "$REPOSITORY" ] || [ -z "$PASSWORD_FILE" ]; then
  echo "ERROR: Falta configuración privada de Restic."
  exit 1
fi

if [ ! -f "$PASSWORD_FILE" ]; then
  echo "ERROR: Falta el archivo privado de contraseña."
  exit 1
fi

export RESTIC_REPOSITORY="$REPOSITORY"
export RESTIC_PASSWORD_FILE="$PASSWORD_FILE"

BACKUP_ROOT="${GOLPRO_BACKUP_DIR:-$HOME/golpro-db-backups}"
export GOLPRO_BACKUP_DIR="$BACKUP_ROOT"

echo "===== GOLPRO: RESPALDO EXTERNO ====="
echo "Entorno: $1"

echo "Verificando repositorio remoto..."
restic cat config >/dev/null

echo "Creando respaldo PostgreSQL..."
"$SCRIPT_DIR/backup-db.sh" "$1"

echo "Enviando respaldo cifrado..."
restic backup \
  --tag "golpro-$1" \
  "$BACKUP_ROOT/$1"

echo "Verificando catálogo remoto..."
restic snapshots --tag "golpro-$1"

echo "RESPALDO EXTERNO REGISTRADO."
echo "Sin restaurar ni modificar PostgreSQL."
echo "Sin eliminar respaldos anteriores."
