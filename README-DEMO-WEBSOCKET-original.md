# CANDI — Demo isolada de WebSocket (backend real + app Expo real)

Escopo: chat 1:1 em tempo real (`chat.gateway.ts`). Comunidade e Feed ficam de
fora de propósito — ambos só *chamam* o `ChatGateway` (kick de grupo, post
compartilhado, broadcast de novo post), nunca o contrário, então cortá-los do
backend não quebra nada do chat. Isso já foi testado: o `app.module.ts` deste
pacote compila e sobe sozinho com só 4 módulos (`Config`, `DynamoDB`, `Auth`,
`Chat`) — sem o `nest build` reclamar de nada.

## 1. Subir o DynamoDB Local

```bash
cd CANDI-backend-API
cp /caminho/para/docker-compose.yml .
docker compose up -d
```

Isso sobe o DynamoDB Local em `localhost:8000`, em memória (reseta a cada
restart — bom pra ensaiar várias vezes sem acumular lixo).

## 2. Aplicar o corte no backend

```bash
cp /caminho/para/app.module.ts src/app.module.ts
cp /caminho/para/.env.example .env
```

Depois `npm install` (se ainda não tiver) e `npm run start:dev`. No log você
deve ver só `ConfigModule`, `DynamoDBModule`, `AuthModule`, `ChatModule`
inicializando, e as rotas mapeadas devem ser só `/auth/*` e `/chat/*` — nada
de `/community`, `/feed`, `/diary` etc. Na primeira subida o
`DynamoBootstrapService` vai criar as tabelas no DynamoDB Local (ele tenta
criar *todas* as tabelas do app original, não só as do chat — inofensivo,
`ResourceInUseException` é só ignorado nas próximas vezes).

> Atenção: `auth.guard.ts` lê `DYNAMO_TABLE_PROFILE` sem valor padrão — se
> essa env var não estiver setada, todo endpoint REST protegido (`/chat/*`)
> quebra com "usuário não encontrado". O `.env.example` já cobre isso.

## 3. Popular 2 usuários de teste

Com o backend e o Docker no ar:

```bash
chmod +x seed-demo-users.sh
./seed-demo-users.sh
```

Cria `ana@demo.candi` e `bruno@demo.candi` (senha `senha123` pros dois) e já
inicia a conversa entre eles via `POST /chat/start` — a mesma rota que o
modal "nova conversa" do app usa.

## 4. Apontar o app Expo pro backend local

Em `candi-app/src/constants/api.ts` o `API_BASE_URL` está fixo em
`http://localhost:3000`. Isso só funciona liso no simulador iOS (compartilha
a rede do Mac). Pros outros casos, troque temporariamente:

- **Emulador Android**: `http://10.0.2.2:3000` (é assim que o emulador
  enxerga o `localhost` da sua máquina)
- **Device físico via Expo Go**: o IP da sua máquina na rede local, tipo
  `http://192.168.x.x:3000` (device e máquina precisam estar na mesma
  Wi-Fi/rede)

Lembre de reverter isso depois da apresentação, ou deixar num `.env`/config
separado pra não ir parar no repositório real.

## 5. Roteiro de navegação ao vivo (app real, sem tocar em código de UI)

Com 2 instâncias do app rodando (ex.: emulador Android + device físico via
Expo Go, ou 2 emuladores lado a lado):

1. Login com `ana@demo.candi` / `senha123` numa instância, `bruno@demo.candi`
   / `senha123` na outra
2. Tab **Comunidade** → abrir a conversa já criada pelo seed (ou usar "nova
   conversa" por e-mail, ao vivo, se quiser mostrar o REST `/chat/start`
   também)
3. Digitar em uma tela → indicador de "digitando..." aparece em tempo real na
   outra (evento `typing` / `user_typing`)
4. Enviar mensagem → aparece instantaneamente nas duas telas (`send_message`
   → `new_message`), com o tique de entrega mudando de enviado → entregue →
   lido conforme a outra pessoa abre a conversa (`message_delivered`,
   `messages_read`)
5. Fechar o app de um lado (ou matar o processo) → do outro lado dá pra
   mostrar a query `get_online_users`/eventos `user_online`/`user_offline` se
   quiser expor esse estado em algum log/tela de debug

## Detalhe que vale citar na apresentação

O JWT emitido no `/auth/login` só carrega `{ id, email }`. Mensagens
mandadas por **HTTP** (`POST /chat/messages/:id`) pegam nome/apelido do
perfil completo no DynamoDB via `AuthGuard`. Mensagens mandadas por
**WebSocket** (`send_message`) usam só o payload do token, que não tem
nome/apelido — o gateway cai no fallback (prefixo do e-mail). Ou seja,
dependendo do caminho (REST vs WS), o nome do remetente pode aparecer
diferente. É um bom exemplo real de inconsistência entre autenticação REST e
autenticação de handshake WS quando o payload do token não é o mesmo em
ambos os fluxos.
