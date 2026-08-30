# Blog Agent OS

Painel que gerencia **agentes autônomos** que escrevem artigos sozinhos via [OpenRouter](https://openrouter.ai) e publicam direto na API CLI do blog (documentada em `CLI-API.md`).

## Como funciona

1. Você cria um agente no painel: nome, foco/descrição, modelo OpenRouter, categoria do blog, frequência e instruções.
2. O agente ativo gera o artigo (HTML + SEO) via `chat/completions`, em português do Brasil.
3. Opcional: gera imagem de capa com um modelo de imagem e faz upload via `/api/cli/upload`.
4. Publica no blog via `POST /api/cli/posts` (rascunho ou publicado, com ou sem Pinterest).
5. Cada execução fica registrada: status, tokens, custo, ID do post e erros.

## Stack

- **Deno 2 ou Node.js** — código 100% cross-runtime (sem APIs exclusivas de nenhum runtime)
- **OpenRouter API** — modelos de texto e imagem
- **Turso DB** — SQLite distribuído (libsql) ou **SQLite local** (`node:sqlite`) como fallback
- Painel HTML/CSS embutido — sem build, sem dependências front-end

## Configuração

```bash
cp .env.example .env
```

Preencha no `.env`:

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `TURSO_DB_URL` | não | URL libsql do Turso (`libsql://nome-db-org.turso.io`). Se vazio, usa SQLite local |
| `TURSO_AUTH_TOKEN` | não | Token do banco Turso |
| `SQLITE_PATH` | não | Arquivo do SQLite local (default: `data/blog-agent.db`) |
| `ADMIN_USERNAME` | não | Usuário do painel (default: `admin`) |
| `ADMIN_PASSWORD` | sim | Senha do painel |
| `SESSION_SECRET` | não | Segredo do cookie (default: senha admin) |
| `RUN_INTERVAL_MINUTES` | não | Frequência do scheduler local (default: 15) |
| `CRON_TOKEN` | não | Token exigido no endpoint `/__cron` |
| `PORT` | não | Porta local (default: 8000) |

> As chaves do OpenRouter e a integração com o blog (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_IMAGE_MODEL`, `BLOG_API_BASE_URL`, `BLOG_API_TOKEN`) são configuradas pela tela **Configurações** (`/admin/settings`) do painel e ficam salvas no banco.

### Rodar sem Turso (SQLite local)

Deixe `TURSO_DB_URL` e `TURSO_AUTH_TOKEN` vazios: o painel grava tudo em um SQLite local (`data/blog-agent.db`, configurável via `SQLITE_PATH`). Ideal para testar — só o `ADMIN_PASSWORD` é obrigatório. Em produção no Deno Deploy, use o Turso.

## Documentação

- [`docs/nodejs.md`](docs/nodejs.md) — guia completo para rodar com Node.js (requisitos, scripts, deploy)

## Executar localmente

```bash
deno task dev      # com watch
deno task start    # produção local
```

Acesse **http://localhost:8000/admin** e entre com `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

### Com Node.js

```bash
npm install
npm run dev         # com watch
npm start           # produção local
```

> Requer Node >= 22.13. Detalhes e diferenças em [`docs/nodejs.md`](docs/nodejs.md).

## Testes

```bash
deno task test      # com Deno
npm test            # com Node (node:test)
```

## Deploy no Deno Deploy

1. Suba o repositório no GitHub e importe no [Deno Deploy](https://dash.deno.com) (entrypoint: `main.ts`).
2. Configure as variáveis de ambiente do painel (mesmas do `.env`).
3. Crie um **Cron** no Deno Deploy apontando para a URL `https://seu-projeto.deno.dev/__cron?token=SEU_CRON_TOKEN` com a frequência desejada (ex.: a cada 1 hora). O endpoint executa todos os agentes ativos cujo intervalo já venceu.

> O loop `setInterval` só roda de forma confiável na execução local. Em produção, use o cron do Deno Deploy (ou qualquer serviço externo de ping) chamando `/__cron`.

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/admin/login` | Login do painel |
| GET/POST | `/admin` | Dashboard (protegido por sessão) |
| GET/POST | `/admin/settings` | Configurações de integrações (OpenRouter e blog) |
| POST | `/admin/agents` | Criar agente |
| POST | `/admin/agents/:id/run` | Executar agente agora |
| POST | `/admin/agents/:id/toggle` | Ativar/pausar |
| POST | `/admin/agents/:id/update` | Editar agente |
| POST | `/admin/agents/:id/delete` | Excluir agente |
| POST | `/admin/run-due` | Executar agentes devidos |
| GET | `/__cron?token=...` | Gatilho de agendamento (cron) |
| GET | `/health` | Health check |

## Notas

- O agente pede ao modelo um JSON no formato `{title, excerpt, content_html, slug, tags}`; a resposta é validada antes da publicação.
- Se a geração de imagem falhar, o artigo é publicado normalmente sem capa.
- O custo por execução é estimado com o pricing público da OpenRouter (`GET /api/v1/models`).