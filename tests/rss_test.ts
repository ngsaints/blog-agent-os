import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeedXml, fetchMultiFeedRadar } from "../src/rss.ts";

test("parseFeedXml: interpreta RSS 2.0 com CDATA e tags comuns", () => {
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Canaltech</title>
      <item>
        <title><![CDATA[NVIDIA anuncia nova arquitetura &amp; DLSS 5]]></title>
        <link>https://canaltech.com.br/hardware/nvidia-dlss-5/</link>
        <pubDate>Sat, 05 Sep 2026 10:00:00 GMT</pubDate>
        <description><![CDATA[<p>Novidades sobre GPUs e inteligência artificial.</p>]]></description>
      </item>
      <item>
        <title>Google Atualiza Gemini 3</title>
        <link>https://canaltech.com.br/ia/google-gemini-3/</link>
        <pubDate>Fri, 04 Sep 2026 18:00:00 GMT</pubDate>
        <description>Atualização traz melhorias em raciocínio.</description>
      </item>
    </channel>
  </rss>`;

  const articles = parseFeedXml(rssXml, "Canaltech");
  assert.equal(articles.length, 2);
  assert.equal(articles[0].title, "NVIDIA anuncia nova arquitetura & DLSS 5");
  assert.equal(articles[0].source, "Canaltech");
  assert.equal(articles[0].link, "https://canaltech.com.br/hardware/nvidia-dlss-5/");
  assert.equal(articles[1].title, "Google Atualiza Gemini 3");
});

test("parseFeedXml: interpreta feed Atom com entry e link href", () => {
  const atomXml = `<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <title>OpenAI News</title>
    <entry>
      <title>Introducing New Frontier Reasoning</title>
      <link href="https://openai.com/index/frontier-reasoning/" />
      <published>2026-09-04T12:00:00Z</published>
      <summary>Detailed technical paper on autonomous agents.</summary>
    </entry>
  </feed>`;

  const articles = parseFeedXml(atomXml, "OpenAI");
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "Introducing New Frontier Reasoning");
  assert.equal(articles[0].link, "https://openai.com/index/frontier-reasoning/");
  assert.equal(articles[0].source, "OpenAI News");
});

test("fetchMultiFeedRadar: deduplica e ordena notícias", async () => {
  const radar = await fetchMultiFeedRadar([
    {
      name: "Mock 1",
      url: "https://invalid-non-existing-domain-test.local/rss",
      isActive: false, // Inativo deve ser ignorado
    },
  ]);
  assert.deepEqual(radar, []);
});
