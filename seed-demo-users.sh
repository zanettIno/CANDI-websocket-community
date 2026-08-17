#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://127.0.0.1:3000}"

wait_for_backend() {
  echo "== Aguardando backend pronto =="
  for i in {1..30}; do
    code="$(curl -sS -o /tmp/candi-health.json -w '%{http_code}' --max-time 3 "$API_BASE_URL/health" || true)"
    if [[ "$code" == "200" ]]; then
      echo "✅ Backend pronto."
      cat /tmp/candi-health.json
      echo
      return 0
    fi
    [[ "$code" == "503" ]] && echo "⏳ DynamoDB ainda inicializando..." || echo "⏳ Backend ainda indisponível..."
    sleep 1
  done
  echo "❌ Backend não ficou pronto em $API_BASE_URL" >&2
  exit 1
}

login_token() {
  local email="$1"
  curl -sS --fail-with-body -X POST "$API_BASE_URL/auth/login" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$email\",\"password\":\"senha123\"}" |
    python3 -c 'import json,sys; d=json.load(sys.stdin); t=d.get("accessToken");
if not t: raise SystemExit("Login sem accessToken: %s" % d)
print(t)'
}

rename_if_present() {
  local old_email="$1" new_name="$2" new_nickname="$3" new_email="$4"
  local token
  token="$(curl -sS -X POST "$API_BASE_URL/auth/login" -H 'Content-Type: application/json' --data "{\"email\":\"$old_email\",\"password\":\"senha123\"}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("accessToken", ""))' 2>/dev/null || true)"
  if [[ -n "$token" ]]; then
    echo "↳ Atualizando $old_email → $new_email"
    curl -sS --fail-with-body -X PATCH "$API_BASE_URL/auth/me" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $token" \
      --data "{\"name\":\"$new_name\",\"nickname\":\"$new_nickname\",\"email\":\"$new_email\"}" >/dev/null
    echo "✅ Usuário atualizado."
    local refreshed_token
    refreshed_token="$(login_token "$new_email")"
    curl -sS --fail-with-body -X POST "$API_BASE_URL/chat/sync-profile-name" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer $refreshed_token" \
      --data "{\"displayName\":\"$new_nickname\"}" >/dev/null
    return 0
  fi
  return 1
}

create_if_missing() {
  local name="$1" nickname="$2" email="$3"
  local response
  response="$(curl -sS -X POST "$API_BASE_URL/auth/register" \
    -H 'Content-Type: application/json' \
    --data "{\"name\":\"$name\",\"nickname\":\"$nickname\",\"email\":\"$email\",\"password\":\"senha123\"}")"
  echo "$response"
  if echo "$response" | grep -q 'Usuário registrado com sucesso'; then
    echo "✅ $name criado."
  elif echo "$response" | grep -q 'E-mail já cadastrado'; then
    echo "↳ $email já existe; continuando."
  else
    echo "❌ Falha ao preparar $email" >&2
    exit 1
  fi
}

wait_for_backend

echo "== Usuários da demonstração =="
if ! rename_if_present "ana@demo.candi" "Maicon Demo" "Maicon" "maicon@demo.candi"; then
  create_if_missing "Maicon Demo" "Maicon" "maicon@demo.candi"
fi
if ! rename_if_present "bruno@demo.candi" "Eduardo Demo" "Eduardo" "eduardo@demo.candi"; then
  create_if_missing "Eduardo Demo" "Eduardo" "eduardo@demo.candi"
fi
create_if_missing "Andre Demo" "Andre" "andre@demo.candi"

echo
echo "== Garantindo senhas de demonstração =="
for email in maicon@demo.candi eduardo@demo.candi andre@demo.candi; do
  curl -sS --fail-with-body -X POST "$API_BASE_URL/auth/demo-reset-password" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$email\",\"password\":\"senha123\"}" >/dev/null
  echo "✓ senha123 definida para $email"
done

echo
echo "== Criando conversas privadas básicas de Eduardo =="
EDUARDO_TOKEN="$(login_token "eduardo@demo.candi")"
for other in maicon@demo.candi andre@demo.candi; do
  curl -sS --fail-with-body -X POST "$API_BASE_URL/chat/start" \
    -H 'Content-Type: application/json' -H "Authorization: Bearer $EDUARDO_TOKEN" \
    --data "{\"otherUserEmail\":\"$other\"}" >/dev/null
  echo "✓ Eduardo ↔ $other"
done

echo
echo "=============================================="
echo " ✅ SEED CONCLUÍDO"
echo "=============================================="
echo
echo "Maicon:   maicon@demo.candi / senha123"
echo "Eduardo:  eduardo@demo.candi / senha123"
echo "Andre:    andre@demo.candi / senha123"
echo
echo "Nenhum grupo foi criado automaticamente."
echo "Crie o grupo dentro do aplicativo selecionando os participantes."
