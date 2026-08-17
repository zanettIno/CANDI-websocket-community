#!/usr/bin/env bash
set -euo pipefail
ENDPOINT="${DYNAMODB_URL:-http://127.0.0.1:8000}"

echo "== CANDI: verificando DynamoDB Local =="
echo "Endpoint: $ENDPOINT"

if ! curl -sS --max-time 3 "$ENDPOINT" >/dev/null 2>&1; then
  echo "❌ DynamoDB Local não está acessível."
  echo "   Execute na raiz: docker compose up -d"
  exit 1
fi

echo "✅ DynamoDB Local está acessível."
