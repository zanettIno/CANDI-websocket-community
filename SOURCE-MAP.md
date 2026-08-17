# CANDI MVP WebSocket v5 — Source Map

## Escopo preservado

O v5 parte do MVP que já estava funcionando:

- DynamoDB Local
- NestJS
- Socket.IO
- JWT
- Login
- chat privado
- typing
- entrega/leitura

## Incrementos

### Backend

```text
backend/src/chat/chat.service.ts
backend/src/chat/chat.controller.ts
backend/src/chat/chat.gateway.ts
backend/src/chat/dto/chat.dto.ts
backend/src/dynamodb/dynamo-bootstrap.service.ts
```

Novos endpoints:

```text
GET  /chat/users
GET  /chat/groups
GET  /chat/groups/:groupId
POST /chat/groups
```

Nova tabela:

```text
CANDIGroups
```

### WebSocket

Novo evento de servidor:

```text
group_created
```

Mensagens continuam usando:

```text
send_message
new_message
user_typing
```

### Mobile

```text
mobile/App.js
```

A tela de Comunidade agora contém:

- conversas privadas
- grupos
- botão para criar grupo
- seleção de participantes

## Usuários

O seed passa a trabalhar com:

```text
Maicon
Eduardo
Andre
```

Nenhum grupo é criado automaticamente.
