export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographerUrl: string;
  avgColor: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

export interface PexelsSearchResult {
  totalResults: number;
  page: number;
  perPage: number;
  photos: PexelsPhoto[];
}

export interface PexelsRateLimit {
  limit: number;
  remaining: number;
  reset: number;
}

export interface DownloadedImage {
  bytes: Uint8Array;
  type: string;
  filename: string;
  attributionHtml?: string;
  photographer?: string;
  photographerUrl?: string;
  photoUrl?: string;
}

export type PexelsOrientation = "landscape" | "portrait" | "square";

export class PexelsClient {
  private lastRateLimit: PexelsRateLimit | null = null;

  constructor(
    private apiKey: () => string,
    private baseUrl = "https://api.pexels.com/v1",
  ) {}

  getApiKey(): string {
    return this.apiKey();
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey() && this.apiKey().trim().length > 0);
  }

  getRateLimit(): PexelsRateLimit | null {
    return this.lastRateLimit;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: this.apiKey().trim(),
      Accept: "application/json",
      "User-Agent": "Blog-Agent-OS/1.0",
    };
  }

  private updateRateLimitFromHeaders(headers: Headers): void {
    const limit = Number(headers.get("x-ratelimit-limit"));
    const remaining = Number(headers.get("x-ratelimit-remaining"));
    const reset = Number(headers.get("x-ratelimit-reset"));
    if (!Number.isNaN(limit) && !Number.isNaN(remaining)) {
      this.lastRateLimit = { limit, remaining, reset: reset || 0 };
    }
  }

  async searchPhotos(
    query: string,
    orientation?: PexelsOrientation,
    limit = 5,
    locale = "pt-BR",
  ): Promise<PexelsPhoto[]> {
    if (!this.isConfigured()) return [];

    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const executeFetch = async (loc?: string): Promise<PexelsPhoto[]> => {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.set("query", cleanQuery);
      url.searchParams.set("per_page", String(Math.min(20, Math.max(1, limit))));
      url.searchParams.set("page", "1");
      if (loc) url.searchParams.set("locale", loc);
      if (orientation) url.searchParams.set("orientation", orientation);

      try {
        const res = await fetch(url.toString(), {
          headers: this.headers(),
          signal: AbortSignal.timeout(8000),
        });

        this.updateRateLimitFromHeaders(res.headers);

        if (!res.ok) {
          console.warn(`[Pexels API] Erro HTTP ${res.status}: ${res.statusText}`);
          return [];
        }

        const json = (await res.json()) as {
          total_results?: number;
          photos?: Array<{
            id: number;
            width: number;
            height: number;
            url: string;
            photographer: string;
            photographer_url: string;
            avg_color: string;
            alt: string;
            src: {
              original: string;
              large2x: string;
              large: string;
              medium: string;
              small: string;
              portrait: string;
              landscape: string;
              tiny: string;
            };
          }>;
        };

        if (!json || !Array.isArray(json.photos)) return [];

        return json.photos.map((p) => ({
          id: p.id,
          width: p.width,
          height: p.height,
          url: p.url,
          photographer: p.photographer,
          photographerUrl: p.photographer_url,
          avgColor: p.avg_color,
          alt: p.alt || "",
          src: p.src,
        }));
      } catch (err) {
        console.warn(
          `[Pexels API] Falha na busca por "${cleanQuery}": ${err instanceof Error ? err.message : err}`,
        );
        return [];
      }
    };

    let results = await executeFetch(locale);
    // Se não encontrou em pt-BR, tenta sem restrição de idioma para maior alcance
    if (results.length === 0 && locale) {
      results = await executeFetch(undefined);
    }
    return results;
  }

  async downloadImage(
    imageUrl: string,
    photoInfo?: { photographer?: string; photographerUrl?: string; photoUrl?: string },
  ): Promise<DownloadedImage | null> {
    if (!imageUrl) return null;
    try {
      const res = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return null;

      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const ext = contentType.includes("png") ? "png" : "jpg";

      let attributionHtml = "";
      if (photoInfo?.photographer && photoInfo?.photoUrl) {
        attributionHtml = `<p class="image-credit" style="font-size:0.85em;color:#6b7280;margin-top:1.5rem;font-style:italic">Foto por <a href="${photoInfo.photographerUrl || photoInfo.photoUrl}" target="_blank" rel="noopener nofollow">${photoInfo.photographer}</a> no <a href="https://www.pexels.com" target="_blank" rel="noopener nofollow">Pexels</a></p>`;
      }

      return {
        bytes: new Uint8Array(buffer),
        type: contentType,
        filename: `pexels-${Date.now()}.${ext}`,
        attributionHtml: attributionHtml || undefined,
        photographer: photoInfo?.photographer,
        photographerUrl: photoInfo?.photographerUrl,
        photoUrl: photoInfo?.photoUrl,
      };
    } catch (err) {
      console.warn(
        `[Pexels API] Falha ao baixar imagem: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }
}
