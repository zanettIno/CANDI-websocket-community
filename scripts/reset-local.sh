#!/usr/bin/env bash
set -euo pipefail

echo "⚠️  Isto apagará APENAS os dados do DynamoDB Local deste MVP."
read -r -p "Continuar? [s/N] " answer

if [[ ! "$answer" =~ ^[sS]$ ]]; then
  echo "Cancelado."
  exit 0
fi

docker compose down -v
docker compose up -d
echo "✅ DynamoDB Local recriado."
