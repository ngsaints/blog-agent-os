# Rodar o Blog Agent OS com Node.js

O projeto é **cross-runtime**: o mesmo código roda em **Deno 2** e **Node.js**. Nenhuma API específica do Deno é usada no código-fonte — tudo foi migrado para APIs compartilhadas ou módulos `node:*` (que o Deno também suporta).

## Requisitos

| Item | Versão |
|------|--------|
| Node.js | **>= 22.13** (recomendado: 24 LTS) |
| npm | 10+ |

> No Node 22, o `node:sqlite` (usado no modo local) emite um aviso experimental — funciona normalmente. No Node 24+ o aviso não existe.

## Instalação

```bash
cp .env.example .env
npm install
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia com watch (recarga ao salvar) |
| `npm start` | Inicia em produção local |
| `npm run check` | Checagem de tipos com `tsc` |
| `npm test` | Testes com `node:test` + `tsx` |

Acesse **http://localhost:8000/admin** (porta configurável via `PORT` no `.env`).

## Como a compatibilidade funciona

| Antes (Deno-only) | Agora (cross-runtime) |
|--------------------|------------------------|
| `Deno.serve(...)` | `createServer` de `node:http` em `src/node_server.ts` (adaptador Request/Response) |
| `Deno.env.get(...)` | `process.env` via `node:process` |
| `Deno.mkdirSync(...)` | `mkdirSync` de `node:fs` |
| `Deno.exit(...)` | `process.exit(1)` |
| `Deno.test` + `@std/assert` | `node:test` + `node:assert/strict` (roda em ambos) |

- TypeScript é executado via **tsx** (sem build step). A checagem de tipos usa `tsconfig.node.json` — o Deno não o lê, mantendo a checagem nativa intacta.
- O cliente do Turso (`@libsql/client/web`) é npm e funciona nos dois runtimes.
- As rotas e o fluxo do painel usam apenas `fetch`/`Request`/`Response`/`FormData`, disponíveis em ambos.

## Banco de dados

- **Modo nuvem (Turso):** preencha `TURSO_DB_URL` e `TURSO_AUTH_TOKEN` no `.env`.
- **Modo local (SQLite):** deixe as duas variáveis vazias — o app usa `node:sqlite` gravando em `data/blog-agent.db` (configurável via `SQLITE_PATH`). Ótimo para testar.

## Deploy em servidor Node

```bash
npm install --omit=dev
npm start
```

Sugestões: PM2, Docker (imagem `node:24-alpine`), Render, Railway, Fly.io. Para automação agendada em produção, configure um cron externo chamando `GET /__cron?token=SEU_TOKEN` (mesma lógica do README).

## Observações

- O scheduler local (`setInterval`) funciona em Node, mas para produção confiável use o endpoint `/__cron` com um serviço externo de agendamento.
- O modo SQLite local usa `node:sqlite`, que exige **Node >= 22.13** (não funciona em versões mais antigas).
- Em ambientes serverless baseados em Deno (Deno Deploy), prefira o modo Turso — `node:sqlite` pode não estar disponível.