export interface BlogPostInput {
  title: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  published?: boolean;
  pinterest_enabled?: boolean;
  pinterest_image?: string;
  category_ids?: number[];
  is_premium?: boolean;
  youtube_video_url?: string;
  tags?: string;
  slug?: string;
}

export interface BlogPostResult {
  id: number;
  slug: string;
}

export interface CategoryInfo {
  id: number;
  name: string;
}

export type PostSortOption =
  | "views"
  | "views_desc"
  | "views_7d"
  | "unique_visitors"
  | "created_at"
  | "created_at_asc";

export interface ListPostsOptions {
  page?: number;
  limit?: number;
  sort?: PostSortOption | string;
  category_id?: number;
}

export interface PostItem {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  cover_image?: string;
  published?: boolean;
  pinterest_enabled?: boolean;
  pinterest_image?: string;
  view_count?: number;
  views_7d?: number;
  unique_visitors?: number;
  category?: CategoryInfo;
  categories?: CategoryInfo[];
  created_at?: string;
  updated_at?: string;
}

export interface PostListResult {
  posts: PostItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function normalizeBlogBaseUrl(raw: string): string {
  let url = (raw || "").trim().replace(/\/+$/, "");
  if (!url) return url;
  if (url.endsWith("/admin/cli")) {
    url = url.replace(/\/admin\/cli$/, "/api/cli");
  } else if (url.endsWith("/admin")) {
    url = url.replace(/\/admin$/, "/api/cli");
  } else if (!url.endsWith("/api/cli")) {
    if (url.endsWith("/api")) {
      url = `${url}/cli`;
    } else if (url.endsWith("/cli")) {
      url = url.replace(/\/cli$/, "/api/cli");
    } else {
      url = `${url}/api/cli`;
    }
  }
  return url;
}

export class BlogApiClient {
  private baseUrl: string;
  private token: string;

  constructor(
    baseUrl: string,
    token: string,
  ) {
    this.baseUrl = normalizeBlogBaseUrl(baseUrl);
    this.token = token;
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<Record<string, unknown>> {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    let origin = "";
    try {
      origin = new URL(this.baseUrl).origin;
    } catch {}

    const res = await fetch(`${this.baseUrl}${cleanPath}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(30000),
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(origin
          ? {
            Origin: origin,
            Referer: `${origin}/admin`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
          }
          : {}),
        ...(init.headers ?? {}),
      },
    });
    const body = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = body ? JSON.parse(body) : {};
    } catch {
      // corpo não-JSON (ex.: erro de proxy)
    }
    if (!res.ok) {
      const detail = typeof json.error === "string" ? json.error : body.slice(0, 300);
      throw new Error(`Blog API ${res.status}: ${detail}`);
    }
    return json;
  }

  async listCategories(): Promise<CategoryInfo[]> {
    try {
      return await this.fetchCategoriesStrict();
    } catch {
      return [];
    }
  }

  async fetchCategoriesStrict(): Promise<CategoryInfo[]> {
    let origin = "";
    try {
      origin = new URL(this.baseUrl).origin;
    } catch {}

    const auth = {
      Authorization: `Bearer ${this.token}`,
      ...(origin
        ? {
          Origin: origin,
          Referer: `${origin}/admin`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty",
        }
        : {}),
    };
    const seen = new Map<number, string>();
    const push = (id: unknown, name: unknown): void => {
      const n = Number(id);
      if (Number.isFinite(n) && typeof name === "string" && name.trim()) {
        if (!seen.has(n)) seen.set(n, name.trim());
      }
    };

    const res = await fetch(`${this.baseUrl}/categories`, { headers: auth });
    if (!res.ok) {
      throw new Error(
        `Blog API ${res.status}: verifique o domínio e o token (${res.statusText})`,
      );
    }
    const json: any = await res.json().catch(() => null);
    const items = Array.isArray(json)
      ? json
      : Array.isArray(json?.categories)
      ? json.categories
      : Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.items)
      ? json.items
      : [];
    for (const item of items) {
      push(
        (item as { id?: unknown }).id,
        (item as { name?: unknown }).name,
      );
    }
    if (seen.size === 0) {
      try {
        const postsRes = await fetch(`${this.baseUrl}/posts?limit=50`, {
          headers: auth,
        });
        if (postsRes.ok) {
          const postsJson: unknown = await postsRes.json().catch(() => null);
          const posts = Array.isArray((postsJson as { posts?: unknown })?.posts)
            ? (postsJson as { posts: unknown[] }).posts
            : [];
          for (const post of posts) {
            const p = post as { category?: unknown; categories?: unknown };
            if (p.category && typeof p.category === "object") {
              push(
                (p.category as { id?: unknown }).id,
                (p.category as { name?: unknown }).name,
              );
            }
            if (Array.isArray(p.categories)) {
              for (const c2 of p.categories) {
                push(
                  (c2 as { id?: unknown }).id,
                  (c2 as { name?: unknown }).name,
                );
              }
            }
          }
        }
      } catch {
        // categorias via posts é apenas um complemento
      }
    }

    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.id - b.id);
  }

  async createPost(input: BlogPostInput): Promise<BlogPostResult> {
    const json = await this.request("/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return {
      id: Number(json.id ?? 0),
      slug: typeof json.slug === "string" ? json.slug : "",
    };
  }

  async listPosts(options: ListPostsOptions = {}): Promise<PostListResult> {
    const params = new URLSearchParams();
    if (options.page) params.set("page", String(options.page));
    if (options.limit) params.set("limit", String(options.limit));
    if (options.sort) params.set("sort", options.sort);
    if (options.category_id) params.set("category_id", String(options.category_id));

    const qs = params.toString();
    const json = await this.request(`/posts${qs ? `?${qs}` : ""}`);
    const posts = Array.isArray(json.posts) ? (json.posts as PostItem[]) : [];
    return {
      posts,
      pagination: json.pagination as PostListResult["pagination"],
    };
  }

  async getPost(id: number): Promise<PostItem> {
    const json = await this.request(`/posts/${id}`);
    return json as unknown as PostItem;
  }

  async getTopPosts(
    sort: PostSortOption = "views",
    limit = 10,
  ): Promise<PostItem[]> {
    const res = await this.listPosts({ sort, limit });
    return res.posts;
  }

  async uploadImage(bytes: Uint8Array, filename: string, type: string, folder = "blog"): Promise<string> {
    const form = new FormData();
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    form.append("file", new Blob([buffer], { type }), filename);
    form.append("folder", folder);
    const json = await this.request("/upload", { method: "POST", body: form });
    if (typeof json.url !== "string" || !json.url) {
      throw new Error("Blog API: resposta de upload sem URL");
    }
    return json.url;
  }
}
