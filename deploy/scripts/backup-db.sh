#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$#" -ne 1 ]; then
  echo "Uso: $0 prd|qa"
  exit 2
fi

case "$1" in
  prd)
    SERVICE="postgres-prd"
    DB="golpro_prd"
    DB_USER="golpro_prd_user"
    ;;
  qa)
    SERVICE="postgres-qa"
    DB="golpro_qa"
    DB_USER="golpro_qa_user"
    ;;
  *)
    echo "ERROR: Entorno no válido."
    exit 2
    ;;
esac

ENV_FILE="$DEPLOY_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No existe deploy/.env."
  exit 1
fi

BACKUP_ROOT="${GOLPRO_BACKUP_DIR:-$HOME/golpro-db-backups}"

mkdir -p "$BACKUP_ROOT/$1"
chmod 700 "$BACKUP_ROOT" "$BACKUP_ROOT/$1"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_ROOT/$1/${DB}_${STAMP}.dump"
PARTIAL="${FILE}.partial"

if [ -e "$FILE" ] || [ -e "$PARTIAL" ]; then
  echo "ERROR: Ya existe un archivo con ese nombre."
  exit 1
fi

cleanup() {
  if [ -e "$PARTIAL" ]; then
    rm -f -- "$PARTIAL"
  fi
}
trap cleanup EXIT

COMPOSE=(
  docker compose
  --project-directory "$DEPLOY_DIR"
  --env-file "$ENV_FILE"
  -f "$DEPLOY_DIR/compose.db.yml"
  -f "$DEPLOY_DIR/compose.apps.yml"
)

echo "===== GOLPRO: RESPALDO ====="
echo "Entorno: $1"
echo "Base: $DB"
echo "Servicio: $SERVICE"

"${COMPOSE[@]}" exec -T "$SERVICE" \
  pg_dump -U "$DB_USER" -d "$DB" -Fc \
  --no-owner --no-acl > "$PARTIAL"

if [ ! -s "$PARTIAL" ]; then
  echo "ERROR: El respaldo está vacío."
  exit 1
fi

"${COMPOSE[@]}" exec -T "$SERVICE" \
  pg_restore --list < "$PARTIAL" > /dev/null

chmod 600 "$PARTIAL"
mv "$PARTIAL" "$FILE"

trap - EXIT

echo "RESPALDO CREADO Y FORMATO VERIFICADO"
echo "Archivo: $FILE"
echo "Sin modificar registros PostgreSQL."
echo "No se realizó restauración."
echo "No se ejecutaron migraciones."
