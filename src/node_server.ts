import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Handler } from "./server.ts";

export function serveNode(handler: Handler, port: number, onListen: () => void): void {
  const server = createServer((req, res) => {
    void handle(req, res, handler);
  });
  server.listen(port, onListen);
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  handler: Handler,
): Promise<void> {
  try {
    const host = req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `http://${host}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) headers.append(key, item);
      } else {
        headers.set(key, value);
      }
    }

    const init: RequestInit = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks);
      if (body.length > 0) init.body = new Uint8Array(body);
    }

    const response = await handler(new Request(url, init));
    res.statusCode = response.status;
    for (const [key, value] of response.headers) {
      if (key === "transfer-encoding" || key === "content-encoding") continue;
      res.setHeader(key, value);
    }
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
