import "server-only";

import { db } from "@/db";
import { news } from "@/db/schema/funds";
import { fetchForeksNews } from "@/lib/market/foreks-rss";

import { withRun } from "./runs";

const CHUNK_SIZE = 50;

export async function syncForeksNews() {
  return withRun("foreks-news", {}, async () => {
    const items = await fetchForeksNews();

    let written = 0;

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const batch = items.slice(i, i + CHUNK_SIZE);

      const result = await db
        .insert(news)
        .values(
          batch.map((item) => ({
            source: "haber" as const,
            title: item.title,
            summary: item.summary,
            publisher: "ForInvest",
            url: item.link,
            publishedAt: item.publishedAt,
          })),
        )
        .onConflictDoNothing({ target: news.url })
        .returning({ id: news.id });

      written += result.length;
    }

    return { rowsRead: items.length, rowsWritten: written };
  });
}
