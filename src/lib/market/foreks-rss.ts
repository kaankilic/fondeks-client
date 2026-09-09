import "server-only";

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const RSS_URL = "https://www.foreks.com/rss";
const CACHE_DIR = join(process.cwd(), ".cache");
const CACHE_FILE = join(CACHE_DIR, "foreks-rss.xml");
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export type RssItem = {
  title: string;
  link: string;
  summary: string | null;
  publishedAt: Date;
};

async function readCache(): Promise<string | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    const stat = await import("node:fs").then((fs) =>
      fs.statSync(CACHE_FILE),
    );
    if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) return raw;
  } catch {
    // No cache or stale — fetch fresh.
  }
  return null;
}

async function writeCache(xml: string): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, xml, "utf-8");
  } catch {
    // Non-fatal — the fetch still succeeded.
  }
}

async function fetchRssXml(): Promise<string> {
  const cached = await readCache();
  if (cached) return cached;

  const response = await fetch(RSS_URL, {
    headers: { accept: "application/rss+xml, application/xml, text/xml" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Foreks RSS failed with ${response.status}`);
  }

  const xml = await response.text();
  await writeCache(xml);
  return xml;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function parseItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1]?.trim();
    const link = /<link>([\s\S]*?)<\/link>/.exec(block)?.[1]?.trim();
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(block)?.[1]?.trim();

    const descRaw =
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/.exec(
        block,
      )?.[1] ??
      /<description>([\s\S]*?)<\/description>/.exec(block)?.[1];

    if (!title || !link || !pubDate) continue;

    const publishedAt = new Date(pubDate);
    if (Number.isNaN(publishedAt.getTime())) continue;

    items.push({
      title: stripHtml(title),
      link,
      summary: descRaw ? stripHtml(descRaw) : null,
      publishedAt,
    });
  }

  return items;
}

export async function fetchForeksNews(): Promise<RssItem[]> {
  const xml = await fetchRssXml();
  return parseItems(xml);
}
