# Chat com o agente (/chat)

O modo `/chat` é um chat estilo ChatGPT que conversa com o painel: ele tem acesso aos dados reais (blogs, agentes, ranking, posts, categorias, estatísticas do banco) e pode **propor ações** que só são executadas após você clicar em **Aprovar**.

## Como acessar

1. Entre no painel (`/admin`).
2. Clique em **💬 Chat** no topo.
3. Selecione o modelo na lista (por padrão, o **Modelo do Chat** configurado nas Configurações; se vazio, o primeiro modelo da lista).
4. Envie mensagens em linguagem natural, ex.: "Qual é o ranking hoje?", "Crie um agente sobre tecnologia para o blog X", "Peça para o agente Y escrever um post sobre IA".

## O que o chat consegue fazer

**Consulta (responde direto):**

- `list_blogs` — blogs cadastrados
- `list_agents` — agentes e seus status
- `get_ranking` — ranking de posts (views, ROI, etc.)
- `list_posts` — posts por blog, com busca e filtros
- `list_categories` — categorias de cada blog
- `get_database_metrics` — métricas do banco
- `get_stats` — estatísticas de execução e consumo

**Ações (cria uma proposta que você aprova):**

| Ação | Descrição |
|------|-----------|
| `create_post` | Gera um post no blog selecionado (artigo ou imagem para Pinterest) |
| `create_agent` | Cria um novo agente |
| `update_agent` | Altera configurações de um agente |
| `delete_agent` | Exclui um agente |
| `run_agent` | Executa um agente agora |
| `toggle_agent` | Liga/desliga um agente |
| `delegate_task` | Pede para um agente já criado executar uma tarefa específica |

## Aprovação de ações

- Toda ação aparece como um **card de proposta** na conversa com os botões **Aprovar** e **Recusar**.
- Propostas expiram após **30 minutos** sem resposta.
- Aprovar executa a ação imediatamente (ex.: cria o agente, gera o post, delega a tarefa).

## Configurações

- **Modelo do Chat (/chat)**: campo nas Configurações do painel (`/admin?tab=settings`). Define o modelo padrão das novas conversas; pode ser trocado a qualquer momento no seletor dentro do chat.
- **Modelos de imagem e de agentes**: são definidos **por agente** (na criação/edição do agente), não globalmente.

## Histórico

- As conversas ficam na tabela `chat_conversations` e as mensagens em `chat_messages` (SQLite local ou Turso).
- A sidebar lista as conversas; carregamento de mensagens antigas é feito sob demanda (lazy load).
- É possível renomear (PATCH), excluir (DELETE) e criar novas conversas.

## API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/chat` | Página do chat |
| GET | `/chat/api/conversations` | Lista conversas |
| POST | `/chat/api/conversations` | Cria conversa `{ model? }` |
| PATCH | `/chat/api/conversations/:id` | Renomeia/define modelo `{ title?, model? }` |
| DELETE | `/chat/api/conversations/:id` | Exclui conversa e mensagens |
| GET | `/chat/api/conversations/:id/messages?before=&limit=` | Lista mensagens (paginado) |
| POST | `/chat/api/conversations/:id/messages` | Envia mensagem `{ text, model? }` → responde com `{ messages, proposals }` |
| POST | `/chat/api/proposals/:id/approve` | Aprova proposta |
| POST | `/chat/api/proposals/:id/reject` | Recusa proposta |

Todas as rotas exigem autenticação (mesma sessão do painel).

## Notas técnicas

- O `ChatService` (em `src/chat.ts`) usa o Agent SDK do `@openrouter/agent` com `stopWhen: [stepCountIs(8), maxCost(0.08)]`; se o SDK falhar, há fallback para a chamada direta `openrouter.chat` (sem ferramentas).
- As propostas ficam em memória (`ProposalStore`, TTL 30 min) — reiniciar o servidor descarta propostas pendentes.
- `delegate_task` executa o agente com a tarefa como instrução extra (`runAgentOnce` com parâmetro `task`); o resultado aparece no histórico de execuções do painel.
- Layout mobile-first: no celular a lista de conversas vira um drawer (botão ☰ no topo).