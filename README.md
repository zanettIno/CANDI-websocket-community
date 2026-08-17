# Candi, o Diário do Câncer ft. Rede Feminina de SCS
Este repositório contêm o código fonte para o módulo de comunicação em tempo real (WebSocket) do aplicativo mobile desenvolvido como produto principal na matéria de Projeto Integrador pelo grupo Candi, nas ETEC Jorge Street e FATEC São Caetano, para os anos de 2024-2026; e tem como objetivo principal preencher o vazio relacionado à complexidade, ou falta, da documentação particular e diária, sobre o câncer, além de incentivar uma maior participação da família e acompanhantes no tratamento oncológico.
## O grupo Candi é composto por:
- **Carolina Pichelli Souza :violin:**
- **Fernando Alcantara D´Ávila :video_game:**
- **Guilherme Xavier Zanetti :drum:**
- **Heloísa Pichelli Souza :tada:**
- **Lucas Batista de Sousa :desktop_computer:**
- **Nuno Kasuo Tronco Yokoji :long_drum:**
---
## :high_brightness: Propósito
Este repositório concentra a funcionalidade de comunicação em tempo real do Candi: o chat e os grupos de comunidade que conectam pacientes oncológicos, familiares e acompanhantes durante o tratamento. A proposta é oferecer um espaço seguro e acolhedor de troca, reduzindo o isolamento durante o processo de tratamento e fortalecendo a rede de apoio ao redor do paciente.
## :bulb: Características Principais
- **Chat em tempo real**: comunicação instantânea via WebSocket entre pacientes e sua rede de apoio.
- **Comunidades**: criação e participação em grupos temáticos de conversa dentro do app.
- **Autenticação**: fluxo de login integrado ao backend, com persistência de sessão.
- **Integração mobile-backend**: aplicativo React Native consumindo a API e o gateway WebSocket do backend NestJS.
## 🛠️ Tecnologias Utilizadas:
- **React Native**: desenvolvimento do aplicativo mobile multiplataforma.
- **NestJS**: backend do sistema, incluindo módulos de autenticação, chat e integração com o banco de dados.
- **WebSocket (Socket.IO / Gateway NestJS)**: comunicação em tempo real entre cliente e servidor.
- **DynamoDB**: persistência dos dados de usuários, mensagens e comunidades.
- **Docker / Docker Compose**: orquestração dos serviços de backend em ambiente local e de desenvolvimento.
## :gear: Arquitetura de Software
O projeto segue uma arquitetura cliente-servidor dividida em dois módulos principais: o app mobile (React Native), responsável pela interface e experiência do usuário, e o backend (NestJS), organizado em módulos de domínio (auth, chat, dynamodb) que expõem tanto rotas REST quanto um gateway WebSocket para comunicação em tempo real. A comunicação entre os dois lados é feita via requisições HTTP para autenticação e demais operações, e via WebSocket para troca de mensagens instantâneas dentro dos chats e comunidades.
## 📁 Estrutura do Projeto
```
CANDI-MVP-WEBSOCKET/
├── backend/
│   ├── src/
│   │   ├── auth/          # autenticação (controller, service, guard, module)
│   │   ├── chat/          # chat e gateway WebSocket
│   │   ├── dynamodb/      # módulo e bootstrap do DynamoDB
│   │   ├── health.controller.ts
│   │   └── main.ts
│   ├── docker-compose.yml
│   └── package.json
├── mobile/
│   ├── src/
│   │   └── config.js      # configuração de API_BASE_URL e SOCKET_URL
│   ├── App.js              # telas: Login, Community, CreateGroup, Chat
│   └── package.json
├── scripts/
│   ├── check-backend.sh
│   ├── check-dynamodb.sh
│   └── reset-local.sh
├── seed-demo-users.sh
└── README.md
```
## 🚀 Como Utilizar
1. **Clone o repositório:**
    ```bash
    git clone https://github.com/zanettIno/CANDI-websocket-community.git
    ```
2. **Suba o DynamoDB com Docker Compose e o backend logo em seguida:**
    ```bash
    cd backend
    docker compose up
    npm run start:dev
    ```

3. **Configure os usuarios na raiz do projeto:**
    ```bash
    bash seed-demo-users.sh
    ```
    
4. **Configure o IP local no app mobile:**
    ```bash
    # em mobile/src/config.js, atualize a variável API_BASE_URL
    # com o IP da sua máquina na rede local
    ```
5. **Instale as dependências e rode o app mobile:**
    ```bash
    cd mobile
    npm install
    npx expo start
    ```
## 🔌 Arquivos-chave do Backend (WebSocket)
- **`backend/src/chat/chat.gateway.ts`**: gateway que abre e gerencia a conexão WebSocket, escutando e emitindo eventos em tempo real.
- **`backend/src/chat/chat.service.ts`**: lógica de negócio das mensagens e comunidades trocadas via socket.
- **`backend/src/chat/chat.module.ts`**: módulo NestJS que registra o gateway e injeta suas dependências.
## 📲 Arquivos-chave do Mobile (WebSocket)
- **`mobile/src/config.js`**: define `SOCKET_URL`, o endereço ao qual o app se conecta via WebSocket.
- **`mobile/App.js`**: componente `Chat`, responsável por abrir a conexão com o socket e renderizar as mensagens em tempo real.

## 💻 Código Explicado

### `chat.gateway.ts`
É o ponto de entrada do WebSocket, criado com o decorator `@WebSocketGateway`, rodando no namespace `/chat` e usando `socket.io` como transporte.
- **`handleConnection`**: a cada nova conexão, extrai o JWT enviado pelo cliente (`handshake.auth.token`), valida com `JwtService` e anexa os dados do usuário ao socket (`client.user`). Também registra o usuário no mapa `onlineUsers` (profileId → sockets) e avisa todo mundo que ele ficou online via `user_online`.
- **`handleDisconnect`**: remove o socket do usuário do mapa de presença; só emite `user_offline` quando o usuário não tem mais nenhuma conexão ativa (ex: fechou todas as abas/dispositivos).
- **`join_conversation` / `leave_conversation`**: o cliente entra numa "sala" do socket.io correspondente à conversa. O nome da sala é um hash SHA-1 do `conversationId` (função `safeRoom`), pra evitar problemas com caracteres especiais como `#`.
- **`send_message`**: salva a mensagem via `ChatService.sendMessage` e emite `new_message` para todos na sala. Se for uma conversa privada (não começa com `GROUP#`), também dispara `inbox_update` pro destinatário (se estiver online) e `message_delivered` pro remetente, simulando a confirmação de entrega.
- **`ack_read`**: chamado quando o usuário abre/lê uma conversa; zera o contador de não lidas e notifica o remetente original via `messages_read`.
- **`typing`**: repassa o evento de "digitando..." para os outros participantes da sala.
- Métodos como `broadcastGroupCreated`, `broadcastNewPost`, `emitNewMessage` e `notifyKickedFromGroup` são chamados por fora do gateway (ex: pelo `ChatController`) para emitir eventos originados de requisições HTTP, e não apenas de mensagens recebidas via socket.

### `chat.service.ts`
Concentra toda a lógica de negócio e o acesso ao DynamoDB, usando quatro tabelas: `CANDIMessages`, `CANDIUserConversations`, `CANDIProfile` e `CANDIGroups`.
- **`getConversationId`**: gera um ID determinístico de conversa 1-para-1 ordenando e concatenando os dois `profile_id` com `#` — assim os dois participantes sempre chegam no mesmo ID, independente de quem inicia a conversa.
- **`findOrCreateConversationByEmail` / `findOrCreateConversationInternal`**: busca o outro usuário pelo e-mail e cria (ou reaproveita) duas entradas na tabela de conversas — uma para cada participante — cada uma guardando o nome do outro, última mensagem e contador de não lidas.
- **`sendMessage`**: para grupos, apenas valida a associação e grava a mensagem. Para conversas privadas, usa um `TransactWriteCommand` para gravar a mensagem e atualizar o inbox dos dois participantes numa única transação atômica — evitando estados inconsistentes (ex: mensagem salva mas contador não atualizado).
- **`getReadStatus`**: compara o `last_read_at` do destinatário com o `last_message_timestamp` da conversa para informar ao remetente se a mensagem já foi lida.
- **`checkUserInConversation` / `ensureGroupMember`**: garantem que o usuário realmente participa da conversa/grupo antes de deixá-lo ler ou enviar mensagens — é a camada de autorização do chat.

### `chat.controller.ts`
Expõe as rotas REST do chat (protegidas por `AuthGuard`), usadas para tudo que não precisa ser instantâneo via socket: listar usuários, inbox, grupos, iniciar conversa, buscar histórico de mensagens e status de leitura. Ele injeta o próprio `ChatGateway` para, após uma ação HTTP, disparar eventos em tempo real — por exemplo, `POST /chat/groups` cria o grupo pelo `ChatService` e imediatamente chama `chatGateway.broadcastGroupCreated` para avisar os membros online.

### `chat.module.ts`
Módulo NestJS que amarra tudo: importa `DynamoDBModule` (acesso ao banco) e `AuthModule` (validação de JWT), registra `ChatController` como controller HTTP e disponibiliza `ChatService` e `ChatGateway` como providers — exportando os dois para que outros módulos do backend também possam emitir eventos de chat quando necessário.

### `mobile/src/config.js`
Centraliza os endereços do backend: `API_BASE_URL` (usado nas requisições REST) e `SOCKET_URL`, montado como `${API_BASE_URL}/chat` — o mesmo namespace `/chat` definido no `@WebSocketGateway` do backend. É o único lugar que precisa ser atualizado quando o IP da máquina de desenvolvimento muda.

## 📝 Notas de Desenvolvimento
- Antes de rodar o app em um dispositivo físico ou emulador, sempre confira e atualize o IP em `mobile/src/config.js` — ele muda conforme a rede em que a máquina de desenvolvimento está conectada.
- Os scripts em `scripts/` auxiliam na verificação do backend, do DynamoDB local e no reset do ambiente de desenvolvimento.
- Use `seed-demo-users.sh` para popular o ambiente com usuários de teste durante o desenvolvimento.

---
