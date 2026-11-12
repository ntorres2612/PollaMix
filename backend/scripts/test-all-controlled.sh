#!/usr/bin/env bash
set -Eeuo pipefail

BACKEND="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$(cd "$BACKEND/../frontend" && pwd)"

cd "$BACKEND"

echo "=== 1. VALIDACIÓN PRISMA ==="
npx prisma validate

echo "=== 2. TYPESCRIPT BACKEND ==="
npx tsc --noEmit

echo "=== 3. TODAS LAS PRUEBAS BACKEND ==="
npx jest --runInBand --no-cache

echo "=== 4. COMPILACIÓN BACKEND ==="
npm run build

echo "=== 5. TYPESCRIPT FRONTEND ==="
cd "$FRONTEND"
npx tsc --noEmit

echo "=== 6. COMPILACIÓN FRONTEND ==="
npm run build

echo "=================================="
echo "POLLAMIX: TODAS LAS PRUEBAS OK"
echo "=================================="
