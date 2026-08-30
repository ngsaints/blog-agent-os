# CLI API — Documentação

> 🔒 Token protegido. Por segurança, ele só é exibido uma vez. Regenere para obter um novo valor.

Uso no header:

```
Authorization: Bearer SEU_TOKEN
```

---

## 🏷️ Categorias Disponíveis

| ID | Nome | Slug | Pinterest | Posts |
|----|------|------|-----------|-------|
| 2 | Economia | economia | — | 2 |
| 3 | Ganhar Dinheiro | ganhar-dinheiro | — | 1 |
| 4 | Home Office | home-office | — | 1 |
| 1 | Inteligência Artificial | inteligencia-artificial | ✅ | 16 |

## 📝 Posts Recentes (IDs para edição via CLI)

| ID | Título | Slug | Status | Data |
|----|--------|------|--------|------|
| 23 | Vaga HOME OFFICE NOTURNO Júnior (2026) \| R$2.735/mês + R$880 Comida | vaga-home-office-noturno-junior-2026-r2735mes-r880-comida-2 | Publicado | 24/07/2026 |
| 22 | KIMI K3: CRIOU O JOGO DO SPIDER MAN EM 3D | kimi-k3-criou-o-jogo-do-spider-man-em-3d | Publicado | 17/07/2026 |
| 21 | Criei Meu Próprio App de Delivery do Zero | criei-meu-proprio-app-de-delivery-do-zero-2 | Publicado | 16/07/2026 |
| 20 | 🔥ADEUS WORDPRESS? Esse Blog com IA Cria Conteúdo e Gera Tráfego no Automático | adeus-wordpress-esse-blog-com-ia-cria-conteudo-e-gera-trafeg-2 | Publicado | 01/07/2026 |
| 19 | IPCA 2025: inflação brasileira surpreende e encerra o ano dentro da meta | ipca-2025-inflacao-brasileira-surpreende-e-encerra-o-ano-den | Publicado | 28/06/2026 |
| 18 | Brasil: qual a saída para a crise financeira que aperta o seu bolso? | brasil-qual-a-saida-para-a-crise-financeira-que-aperta-o-seu-2 | Publicado | 28/06/2026 |
| 17 | Claude Mythos: o supermodelo de IA da Anthropic e seu impacto na cibersegurança | claude-mythos-o-supermodelo-de-ia-da-anthropic-e-seu-impacto | Publicado | 28/06/2026 |
| 14 | n8n: automatização de fluxos de trabalho de código aberto ganha destaque no mercado | n8n-automatizacao-de-fluxos-de-trabalho-de-codigo-aberto-gan | Publicado | 28/06/2026 |
| 13 | Google NotebookLM: a ferramenta de IA que revoluciona sua pesquisa e organização de conteúdo | google-notebooklm-a-ferramenta-de-ia-que-revoluciona-sua-pes | Publicado | 28/06/2026 |
| 12 | Aplicativos de IA transformam edição de fotos: conheça as melhores opções | aplicativos-de-ia-transformam-edicao-de-fotos-conheca-as-mel | Publicado | 28/06/2026 |

---

# 📚 Documentação Completa da API

## GET `/api/cli/posts`

Listar posts com paginação, filtros e ordenação por métricas.

**Parâmetros de Query:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | number | `1` | Número da página |
| `limit` | number | `25` | Quantidade de itens por página |
| `sort` | string | `created_at` | Critério de ordenação: `views` / `views_desc` (mais visualizados de sempre), `views_7d` (mais visualizados nos últimos 7 dias), `unique_visitors` (mais visitantes únicos), `created_at` (mais recentes), `created_at_asc` (mais antigos) |
| `category_id` | number | — | Filtrar por categoria |

```bash
# Listagem padrão
curl -H "Authorization: Bearer SEU_TOKEN" \
  "/api/cli/posts?page=1&limit=25"

# Top 10 posts mais acessados de todos os tempos
curl -H "Authorization: Bearer SEU_TOKEN" \
  "/api/cli/posts?sort=views&limit=10"

# Top 10 posts em alta nos últimos 7 dias
curl -H "Authorization: Bearer SEU_TOKEN" \
  "/api/cli/posts?sort=views_7d&limit=10"
```

**Resposta:**

```json
{
  "posts": [
    {
      "id": 23,
      "title": "Vaga HOME OFFICE NOTURNO Júnior (2026)",
      "slug": "vaga-home-office-noturno-junior-2026",
      "published": true,
      "view_count": 1420,
      "views_7d": 380,
      "unique_visitors": 950,
      "created_at": "2026-07-24T12:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

---

## POST `/api/cli/posts`

Criar novo post.

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `title` | string | **obrigatório** — título |
| `content` | string | **obrigatório** — conteúdo em HTML |
| `excerpt` | string | resumo |
| `cover_image` | string | URL da imagem de capa |
| `published` | boolean | publicar (default: `false`) |
| `pinterest_enabled` | boolean | incluir no feed Pinterest |
| `pinterest_image` | string | URL da imagem vertical 9:16 |
| `category_ids` | number[] | ex: `[1, 2]` |
| `is_18_plus` | boolean | conteúdo adulto |
| `is_premium` | boolean | conteúdo premium |
| `youtube_video_url` | string | URL de vídeo relacionado |
| `tags` | string | tags separadas por vírgula |
| `slug` | string | URL customizada (opcional) |

```bash
curl -X POST \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Meu Post Incrível",
    "content": "<p>Conteúdo do post em <strong>HTML</strong>.</p>",
    "excerpt": "Resumo do post",
    "cover_image": "https://exemplo.com/imagem.jpg",
    "published": true,
    "pinterest_enabled": true,
    "pinterest_image": "https://exemplo.com/vertical.jpg",
    "category_ids": [2],
    "is_18_plus": false
  }' \
  /api/cli/posts
```

**Resposta 201:**

```json
{ "success": true, "id": 42, "slug": "meu-post-incrivel" }
```

---

## GET `/api/cli/posts/:id`

Ver um post específico, incluindo métricas de visualização e engajamento.

```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  /api/cli/posts/1
```

**Resposta:**

```json
{
  "id": 1,
  "title": "Título do Post",
  "slug": "titulo-do-post",
  "content": "<p>Conteúdo em HTML...</p>",
  "excerpt": "Resumo do post",
  "cover_image": "https://res.cloudinary.com/.../capa.jpg",
  "published": true,
  "pinterest_enabled": true,
  "view_count": 520,
  "views_7d": 140,
  "unique_visitors": 390,
  "created_at": "2026-06-28T14:30:00.000Z"
}
```

---

## PUT `/api/cli/posts/:id`

Editar post existente (todos os campos são opcionais).

**Publicar + ativar Pinterest:**

```bash
curl -X PUT \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"published": true, "pinterest_enabled": true}' \
  /api/cli/posts/1
```

**Atualizar categorias:**

```bash
curl -X PUT \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category_ids": [2, 3, 4, 1]}' \
  /api/cli/posts/1
```

---

## DELETE `/api/cli/posts/:id`

Deletar post (ação irreversível).

```bash
curl -X DELETE \
  -H "Authorization: Bearer SEU_TOKEN" \
  "/api/cli/posts/1?confirm=1"
```

---

## 🖼️ Upload de Imagens — Cloudinary

### POST `/api/cli/upload`

> 💡 **Fluxo recomendado:** Faça o upload da imagem primeiro com este endpoint, pegue a URL retornada e use-a nos campos `cover_image` ou `pinterest_image` ao criar/editar posts. O upload é feito diretamente para o Cloudinary via servidor — seguro, sem expor credenciais.

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `file` | arquivo | JPG, PNG, WEBP, GIF, AVIF (máx 20MB) |
| `folder` | string | subpasta no Cloudinary (default: `"blog"`) |

**Upload de imagem:**

```bash
curl -X POST \
  -H "Authorization: Bearer SEU_TOKEN" \
  -F "file=@/caminho/para/imagem.jpg" \
  -F "folder=blog" \
  /api/cli/upload
```

**Criar post com imagem em um só fluxo (shell script):**

```bash
#!/bin/bash
TOKEN="SEU_TOKEN"

# 1. Faz upload da imagem
IMAGEM_URL=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@capa.jpg" \
  "/api/cli/upload" | python3 -c "import sys,json; print(json.load(sys.stdin)['url'])")

echo "Imagem: $IMAGEM_URL"

# 2. Cria o post com a URL retornada
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"Título\", \"content\": \"<p>Corpo</p>\", \"cover_image\": \"$IMAGEM_URL\", \"published\": true}" \
  "/api/cli/posts"
```

**Resposta 201:**

```json
{
  "success": true,
  "url": "https://res.cloudinary.com/SEU_CLOUD/image/upload/v123/blog/imagem.jpg",
  "filename": "capa.jpg",
  "size": 348210,
  "type": "image/jpeg"
}
```

---

## 📌 Pinterest — Automação de Feed

### POST `/api/cli/posts`

Criar post com Pinterest ativado (exemplo completo).

> 💡 **Como funciona:** Ao criar ou editar um post, passe `pinterest_enabled: true` e opcionalmente `pinterest_image` com URL de uma imagem vertical (9:16, ideal 1000×1500px). O post aparecerá automaticamente em `/pinterest.xml` e nos feeds por categoria.

**Post com Pinterest:**

```bash
curl -X POST \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Look do Dia: Casual Chic",
    "content": "<p>Conteúdo do post...</p>",
    "excerpt": "Visual leve e sofisticado para o dia a dia",
    "cover_image": "https://res.cloudinary.com/exemplo/imagem.jpg",
    "published": true,
    "pinterest_enabled": true,
    "pinterest_image": "https://res.cloudinary.com/exemplo/vertical-9x16.jpg",
    "category_ids": [2],
    "is_18_plus": false
  }' \
  /api/cli/posts
```

### PUT `/api/cli/posts/:id`

**Ativar Pinterest + definir imagem vertical:**

```bash
curl -X PUT \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pinterest_enabled": true, "pinterest_image": "https://res.cloudinary.com/exemplo/vertical.jpg"}' \
  /api/cli/posts/1
```

**Desativar Pinterest:**

```bash
curl -X PUT \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pinterest_enabled": false}' \
  /api/cli/posts/1
```

### PATCH `/api/cli/categories/:id`

Ativar ou desativar o feed Pinterest de uma categoria.

> 💡 **Por que isso importa:** Cada categoria com `pinterest_enabled: true` gera automaticamente o feed `/pinterest_<slug>.xml` para conectar como board separado no Pinterest. Por exemplo, a categoria "Looks" gera o feed `/pinterest_looks.xml`.

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `pinterest_enabled` | boolean | **obrigatório** |

**Ativar Pinterest na categoria:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pinterest_enabled": true}' \
  /api/cli/categories/2
```

**Desativar Pinterest na categoria:**

```bash
curl -X PATCH \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pinterest_enabled": false}' \
  /api/cli/categories/2
```

**Resposta:**

```json
{
  "success": true,
  "category": { "id": 1, "name": "Looks", "slug": "looks", "pinterest_enabled": true },
  "message": "Pinterest ativado para a categoria \"Looks\"."
}
```

**Suas categorias (use o ID no comando acima):**

| ID | Categoria | Pinterest |
|----|-----------|-----------|
| 2 | Economia | — inativo |
| 3 | Ganhar Dinheiro | — inativo |
| 4 | Home Office | — inativo |
| 1 | Inteligência Artificial | 📌 ativo |

---

## INFO — Códigos de Erro

| Código | Significado | Solução |
|--------|-------------|---------|
| 401 | Header Authorization ausente | Adicione `-H "Authorization: Bearer TOKEN"` |
| 403 | Token inválido ou expirado | Regenere o token nesta página |
| 400 | Dados inválidos | Verifique o JSON e campos obrigatórios |
| 404 | Post/recurso não encontrado | Verifique o ID ou slug |
| 201 | Post criado com sucesso | — |
| 200 | Sucesso | — |
