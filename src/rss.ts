export interface FeedArticle {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  snippet: string;
  guid?: string;
}

interface CacheEntry {
  articles: FeedArticle[];
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de cache
const feedCache = new Map<string, CacheEntry>();

function decodeEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagValue(xmlBlock: string, tagName: string): string {
  // Try CDATA first: <tag><![CDATA[...]]></tag>
  const cdataRegex = new RegExp(`<${tagName}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tagName}>`, "i");
  const cdataMatch = xmlBlock.match(cdataRegex);
  if (cdataMatch?.[1]) {
    return decodeEntities(cdataMatch[1].trim());
  }

  // Fallback to standard tag: <tag>...</tag>
  const tagRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = xmlBlock.match(tagRegex);
  if (match?.[1]) {
    return decodeEntities(match[1].replace(/<[^>]+>/g, "").trim());
  }

  // Atom style: <link href="..." />
  if (tagName === "link") {
    const hrefMatch = xmlBlock.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
    if (hrefMatch?.[1]) {
      return hrefMatch[1].trim();
    }
  }

  return "";
}

export function parseFeedXml(xml: string, defaultSource = "Feed RSS"): FeedArticle[] {
  const articles: FeedArticle[] = [];
  if (!xml || typeof xml !== "string") return articles;

  // Detect channel/feed title for source name from feed header before items
  const headerPart = xml.split(/<item[\s>]/i)[0].split(/<entry[\s>]/i)[0];
  const channelTitle = extractTagValue(headerPart, "title");
  const sourceName = channelTitle && channelTitle.length < 60 ? channelTitle : defaultSource;

  // 1. Try RSS 2.0 items (<item>...</item>)
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null && articles.length < 30) {
    const block = match[1];
    const title = extractTagValue(block, "title");
    const link = extractTagValue(block, "link");
    const pubDate = extractTagValue(block, "pubDate") || extractTagValue(block, "dc:date") || "";
    const description = extractTagValue(block, "description") || extractTagValue(block, "content:encoded") || "";
    const guid = extractTagValue(block, "guid") || link;

    if (title && title.length >= 3) {
      articles.push({
        title,
        link,
        source: sourceName,
        pubDate,
        snippet: description.slice(0, 300),
        guid,
      });
    }
  }

  // 2. Try Atom entries (<entry>...</entry>) if no RSS items found
  if (articles.length === 0) {
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null && articles.length < 30) {
      const block = match[1];
      const title = extractTagValue(block, "title");
      const link = extractTagValue(block, "link");
      const pubDate = extractTagValue(block, "published") || extractTagValue(block, "updated") || "";
      const summary = extractTagValue(block, "summary") || extractTagValue(block, "content") || "";
      const guid = extractTagValue(block, "id") || link;

      if (title && title.length >= 3) {
        articles.push({
          title,
          link,
          source: sourceName,
          pubDate,
          snippet: summary.slice(0, 300),
          guid,
        });
      }
    }
  }

  return articles;
}

export async function fetchFeedArticles(url: string, sourceName = "Feed RSS", limit = 10): Promise<FeedArticle[]> {
  const cleanUrl = url.trim();
  if (!cleanUrl) return [];

  // Check in-memory cache
  const cached = feedCache.get(cleanUrl);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.articles.slice(0, limit);
  }

  try {
    const res = await fetch(cleanUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return cached ? cached.articles.slice(0, limit) : [];
    }

    const xml = await res.text();
    const articles = parseFeedXml(xml, sourceName);

    if (articles.length > 0) {
      feedCache.set(cleanUrl, { articles, timestamp: now });
    }

    return articles.slice(0, limit);
  } catch {
    return cached ? cached.articles.slice(0, limit) : [];
  }
}

export async function fetchMultiFeedRadar(
  sources: Array<{ id?: number; name: string; url: string; isActive?: boolean }>,
  limitTotal = 25,
): Promise<FeedArticle[]> {
  const activeSources = sources.filter((s) => s.isActive !== false);
  if (activeSources.length === 0) return [];

  const promises = activeSources.map(async (s) => {
    try {
      return await fetchFeedArticles(s.url, s.name, 6);
    } catch {
      return [];
    }
  });

  const results = await Promise.all(promises);
  const allArticles = results.flat();

  // Sort by pubDate descending if possible
  allArticles.sort((a, b) => {
    const timeA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const timeB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    if (isNaN(timeA) || isNaN(timeB)) return 0;
    return timeB - timeA;
  });

  // Deduplicate by title similarity
  const seenTitles = new Set<string>();
  const uniqueArticles: FeedArticle[] = [];
  for (const art of allArticles) {
    const key = art.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      uniqueArticles.push(art);
      if (uniqueArticles.length >= limitTotal) break;
    }
  }

  return uniqueArticles;
}
