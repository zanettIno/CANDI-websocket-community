# CANDI MVP — WebSocket Local v5

MVP de apresentação do Candi isolado para demonstrar **chat privado e chat de grupo em tempo real via Socket.IO**.

## O que está funcionando

- NestJS + Socket.IO
- DynamoDB Local em memória (`-inMemory`) — configuração conhecida por funcionar na apresentação
- JWT
- Chat privado
- Typing
- Entrega/leitura no chat privado
- Criação de grupos pelo aplicativo
- Seleção de participantes antes da criação do grupo
- Chat de grupo via WebSocket
- Log de cada mensagem no console do backend com prefixo `[CHAT-MESSAGE]`

## Usuários da demonstração

```text
Maicon   maicon@demo.candi   senha123
Eduardo  eduardo@demo.candi  senha123
Andre    andre@demo.candi    senha123
```

O seed transforma os usuários demo antigos Ana/Bruno em Maicon/Eduardo quando eles ainda existem, e cria Andre; em uma inicialização limpa ele simplesmente cria os três e cria apenas as conversas privadas necessárias para a demonstração. **Nenhum grupo é criado pelo seed.**

## Banco local

O Docker usa DynamoDB Local em memória para evitar o problema de SQLite/permissão que ocorreu com o volume persistente.

```bash
docker compose up -d
```

O backend cria automaticamente:

```text
CANDIProfile
CANDIMessages
CANDIUserConversations
CANDIGroups
```

`CANDIGroups` é a única nova tabela adicionada no v5; as três tabelas que já funcionavam permanecem com a mesma função.

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm run start:dev
```

Health:

```bash
curl http://127.0.0.1:3000/health
```

Esperado:

```json
{"status":"ok","websocket":"/chat","dynamodb":"ready"}
```

## Seed

```bash
bash seed-demo-users.sh
```

O seed **não cria grupo**.

## Mobile

```bash
cd mobile
npm install
npx expo start
```

Configure `mobile/src/config.js` conforme o dispositivo:

- iOS Simulator: `http://localhost:3000`
- Android Emulator: `http://10.0.2.2:3000`
- Dispositivo físico: `http://IP_DA_MAQUINA:3000`

## Criar grupo pelo app

Depois de entrar como Eduardo:

1. Abra **Grupos**.
2. Toque em **+ Grupo**.
3. Dê um nome ao grupo.
4. Selecione Maicon e/ou Andre.
5. Toque em **Criar grupo**.
6. O backend grava o grupo em `CANDIGroups`.
7. O backend emite `group_created` via Socket.IO para os membros online.
8. Ao abrir o grupo, o cliente entra na sala Socket.IO `GROUP#...`.
9. Mensagens do grupo são persistidas em `CANDIMessages` e distribuídas em tempo real.

O criador é incluído automaticamente como membro.

## Eventos adicionais de grupo

Cliente → servidor:

```text
join_conversation
send_message
typing
leave_conversation
```

Servidor → cliente:

```text
group_created
new_message
user_typing
```

## Log de mensagens

No console do backend, cada mensagem persistida pelo WebSocket gera uma linha simples:

```text
[CHAT-MESSAGE] 2026-08-15T...#uuid | Eduardo | GROUP#... | Olá pessoal!
```

Isso permite demonstrar para a banca que a mensagem chegou ao backend, foi persistida e então distribuída pela sala Socket.IO.

## Fluxo ideal da apresentação

### Chat privado

Eduardo ↔ Maicon

- typing
- mensagem
- entrega
- leitura

### Chat de grupo

Eduardo:

- cria "Grupo Candi"
- seleciona Maicon e Andre
- cria o grupo
- os membros entram
- Eduardo envia uma mensagem
- Maicon e Andre recebem em tempo real

## Reset da apresentação

Como o DynamoDB está em memória, basta:

```bash
docker compose down
```

e depois:

```bash
docker compose up -d
```

As tabelas serão recriadas pelo backend.

## v5.1 — correção de senha

A atualização de nome/e-mail preserva `profile_password`. O seed também redefine explicitamente `senha123` para os três usuários de demonstração, garantindo credenciais reproduzíveis no DynamoDB Local.
