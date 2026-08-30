import test from "node:test";
import assert from "node:assert/strict";
import { PexelsClient } from "../src/pexels.ts";
import { resolveImageForAgent } from "../src/agent.ts";
import type { Agent } from "../src/turso_store.ts";
import type { OpenRouterClient } from "../src/openrouter.ts";

const BASE_AGENT: Agent = {
  id: 1,
  name: "Agente Pexels Test",
  description: "Testes Pexels e Auto-cost",
  model: "openai/gpt-4o-mini",
  imageModel: "black-forest-labs/flux-1-schnell",
  imageSourceMode: "pexels_only",
  toolsEnabled: false,
  role: "writer",
  reviewerId: null,
  avatar: "bot",
  imageAspectRatio: "16:9",
  dailyPostLimit: 0,
  blogId: 1,
  categoryId: 1,
  publishToBlog: true,
  pinterestEnabled: false,
  imageGen: true,
  scheduleMinutes: 720,
  maxTokens: 8192,
  prompt: "Minimalist workspace",
  status: "active",
  postCount: 0,
  lastRunAt: null,
  lastError: null,
  createdAt: new Date().toISOString(),
};

test("PexelsClient: searchPhotos retorna lista formatada de fotos", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (url: string | URL) => {
      const urlStr = String(url);
      assert.ok(urlStr.includes("api.pexels.com/v1/search"));
      assert.ok(urlStr.includes("query=workspace"));
      assert.ok(urlStr.includes("orientation=landscape"));
      return new Response(
        JSON.stringify({
          total_results: 100,
          page: 1,
          per_page: 2,
          photos: [
            {
              id: 12345,
              width: 1920,
              height: 1080,
              url: "https://www.pexels.com/photo/12345",
              photographer: "Ana Silva",
              photographer_url: "https://www.pexels.com/@ana",
              avg_color: "#FFFFFF",
              alt: "Modern clean desk setup",
              src: {
                original: "https://images.pexels.com/12345/original.jpg",
                large2x: "https://images.pexels.com/12345/large2x.jpg",
                large: "https://images.pexels.com/12345/large.jpg",
                medium: "https://images.pexels.com/12345/medium.jpg",
                small: "https://images.pexels.com/12345/small.jpg",
                portrait: "https://images.pexels.com/12345/portrait.jpg",
                landscape: "https://images.pexels.com/12345/landscape.jpg",
                tiny: "https://images.pexels.com/12345/tiny.jpg",
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const client = new PexelsClient(() => "fake-pexels-key");
    assert.equal(client.isConfigured(), true);
    const photos = await client.searchPhotos("workspace", "landscape", 2);
    assert.equal(photos.length, 1);
    assert.equal(photos[0].id, 12345);
    assert.equal(photos[0].photographer, "Ana Silva");
    assert.equal(photos[0].src.landscape, "https://images.pexels.com/12345/landscape.jpg");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("PexelsClient: downloadImage baixa bytes da imagem", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      const dummyBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
      return new Response(dummyBytes, {
        status: 200,
        headers: { "Content-Type": "image/png" },
      });
    }) as typeof fetch;

    const client = new PexelsClient(() => "fake-key");
    const downloaded = await client.downloadImage("https://images.pexels.com/12345/landscape.jpg");
    assert.ok(downloaded);
    assert.equal(downloaded.type, "image/png");
    assert.equal(downloaded.bytes.length, 8);
    assert.ok(downloaded.filename.startsWith("pexels-"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("resolveImageForAgent: modo pexels_only prioriza busca Pexels", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (url: string | URL) => {
      const urlStr = String(url);
      if (urlStr.includes("api.pexels.com/v1/search")) {
        return new Response(
          JSON.stringify({
            photos: [
              {
                id: 999,
                alt: "Foto Pexels Teste",
                photographer: "Carlos",
                src: { landscape: "https://images.pexels.com/999/landscape.jpg" },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "image/jpeg" },
      });
    }) as typeof fetch;

    const client = new PexelsClient(() => "fake-key");
    const fakeOr = {
      generateImage: async () => {
        throw new Error("Não deve chamar OpenRouter no modo pexels_only");
      },
    } as unknown as OpenRouterClient;

    const res = await resolveImageForAgent(
      BASE_AGENT,
      "Tecnologia do Futuro",
      fakeOr,
      client,
      "flux-schnell",
    );

    assert.ok(res);
    assert.equal(res.source, "pexels");
    assert.equal(res.bytes.length, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
