# Blog Agent OS

Sistema autônomo e painel de controle para criação, otimização e publicação automática de artigos em blogs via Inteligência Artificial.

---

## Recursos Principais

### 1. Agentes Autônomos de Conteúdo
- Criação e calibração de agentes especializados por nicho, tom de voz e categoria.
- Frequência individual de publicação com agendamento automático.
- Roteamento inteligente de tarefas editoriais e suporte a revisor de conteúdo.
- Otimização contínua com base nos posts de melhor desempenho e audiência do blog.

### 2. Estúdio de Criação & Editor de Artigos (`/admin?tab=create-post`)
- **Editor HTML Semântico & Visualização ao Vivo**: Alternância instantânea entre código HTML e prévia em tempo real com tipografia e diagramação de blog.
- **Barra de Ferramentas de Formatação**: Inserção rápida de subtítulos (H2, H3), negrito, itálico, listas, citações, código, links e imagens.
- **Métricas em Tempo Real**: Contagem de palavras, estimativa de tempo de leitura, contador de caracteres para título SEO (40-60 caracteres) e meta-description (120-160 caracteres).
- **Estúdio de Imagem de Capa**:
  - Upload direto do computador com suporte a arrastar e soltar (drag & drop).
  - Integração nativa com o banco de fotos gratuitas Pexels em alta resolução com aplicação em 1 clique.
  - Geração de capa com IA sugerida automaticamente a partir do título do artigo.
- **Assistente IA Lateral**: Geração de artigos completos, gerador de títulos com alto CTR, meta-descriptions para Google e sugestão de tags.

### 3. Arena de Competência & Ranking
- Pódio e classificação de agentes por volume de produção, taxa de sucesso, audiência e eficiência de custos.
- Filtragem por blog específico ou visão unificada de todas as operações.

### 4. Chat com Agente Estrategista (`/admin/chat`)
- Conversação com assistente inteligente para planejamento editorial.
- Criação de propostas estruturadas de agentes que podem ser aprovadas e persistidas diretamente no banco de dados.

### 5. Pool Multi-IA com Failover Automático
- Suporte a múltiplos provedores (OpenRouter, Groq, Anthropic).
- Circuit Breaker inteligente: alternância automática entre provedores em caso de rate limit (erro 429) ou indisponibilidade temporária.

---

## Arquitetura & Stack Técnica

- **Runtime**: Node.js (>= 22.13) e compatibilidade com Deno 2.
- **Banco de Dados**: SQLite local (`node:sqlite`) com suporte a banco distribuído Turso (`libsql`).
- **Provedores de IA**: OpenRouter API, Groq Cloud e Anthropic Claude.
- **Banco de Imagens**: Pexels API e modelos de geração de imagem.
- **Frontend**: Interface nativa em HTML5/CSS3 sem frameworks pesados, garantindo carregamento instantâneo.

---

## Configuração do Ambiente

1. Clone o repositório ou baixe os arquivos do projeto.
2. Copie o arquivo de exemplo de variáveis de ambiente:

```bash
cp .env.example .env
```

3. Configure o arquivo `.env`:

| Variável | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `ADMIN_PASSWORD` | Sim | - | Senha de acesso ao painel de controle |
| `ADMIN_USERNAME` | Não | `admin` | Nome de usuário para autenticação |
| `PORT` | Não | `8000` | Porta local do servidor HTTP |
| `SQLITE_PATH` | Não | `data/blog-agent.db` | Caminho do arquivo SQLite local |
| `TURSO_DB_URL` | Não | - | URL libsql do Turso (para deploy distribuído) |
| `TURSO_AUTH_TOKEN` | Não | - | Token de autenticação do Turso |
| `SESSION_SECRET` | Não | - | Chave de assinatura dos cookies de sessão |
| `RUN_INTERVAL_MINUTES` | Não | `15` | Intervalo padrão do scheduler |
| `CRON_TOKEN` | Não | - | Token de segurança para o endpoint `/__cron` |

> As chaves de API (OpenRouter, Groq, Anthropic, Pexels e credenciais dos blogs conectados) podem ser gerenciadas diretamente na aba **Configurações & Blogs** (`/admin?tab=settings`) do painel e ficam armazenadas com segurança no banco de dados.

---

## Como Executar

### Com Node.js (Recomendado)

```bash
# Instalar dependências
npm install

# Modo de desenvolvimento (com recarregamento automático)
npm run dev

# Modo de produção
npm start
```

Acesse o painel em: **http://localhost:8000/admin**

### Com Deno

```bash
deno task dev      # Modo desenvolvimento
deno task start    # Modo produção
```

---

## Testes & Qualidade de Código

Para rodar a suíte de testes unitários e de integração:

```bash
# Executar todos os testes
npm test

# Verificação estática de tipos (TypeScript)
npm run check
```

---

## Estrutura de Rotas e Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/admin/login` | Tela de autenticação |
| GET / POST | `/admin` | Painel principal com abas de gestão |
| GET | `/admin/chat` | Interface de chat com assistente estrategista |
| POST | `/admin/chat/conversations` | Criar nova sessão de conversa |
| POST | `/admin/chat/messages` | Enviar mensagem e obter resposta com propostas |
| POST | `/admin/create-post/publish` | Publicar post imediatamente ou salvar como rascunho |
| POST | `/admin/create-post/upload-image` | Upload de arquivo de capa para o blog |
| POST | `/admin/create-post/search-pexels` | Busca de fotografias em alta resolução no Pexels |
| POST | `/admin/create-post/ai-assist` | Assistente rápido para títulos, resumos e tags |
| POST | `/admin/create-post/generate-content` | Geração completa de artigo via IA |
| POST | `/admin/create-post/generate-image` | Geração de imagem de capa via IA |
| POST | `/admin/agents` | Cadastro de novo agente |
| POST | `/admin/agents/:id/run` | Execução manual imediata de agente |
| POST | `/admin/agents/:id/toggle` | Alternar agente entre ativo e pausado |
| POST | `/admin/agents/:id/update` | Atualização cadastral de agente |
| POST | `/admin/agents/:id/delete` | Exclusão de agente |
| GET | `/__cron?token=...` | Disparo de agendamento externo para servidores serverless |
| GET | `/health` | Verificação de integridade do serviço |

---

## Licença

Projeto desenvolvido para automação editorial e gerenciamento autônomo de blogs. Uso interno e profissional.