#!/usr/bin/env bash
set -euo pipefail
API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"

echo "== CANDI: verificando backend =="
echo "Endpoint: $API_BASE_URL/health"

for i in {1..30}; do
  code="$(curl -sS -o /tmp/candi-health.json -w '%{http_code}' --max-time 3 "$API_BASE_URL/health" || true)"

  if [[ "$code" == "200" ]]; then
    cat /tmp/candi-health.json
    echo
    echo "✅ Backend e DynamoDB estão prontos."
    exit 0
  fi

  if [[ "$code" == "503" ]]; then
    echo "⏳ Backend online; aguardando DynamoDB..."
  else
    echo "⏳ Aguardando backend... HTTP $code"
  fi

  sleep 1
done

echo "❌ Backend não ficou pronto em $API_BASE_URL"
exit 1
