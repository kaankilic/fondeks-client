import type { Metadata } from "next";

import { JsonLd } from "@/components/layout/JsonLd";
import {
  MarketStatus,
  Page,
  PageBody,
  SubHeader,
} from "@/components/layout/Shell";
import { CategoryPerformance } from "@/components/market/CategoryPerformance";
import { IndexCards } from "@/components/market/IndexCards";
import { NewsPanel } from "@/components/news/NewsPanel";
import { MARKET_SESSION } from "@/lib/fondeks/constants";
import {
  getCategoryPerformance,
  getForeksNews,
  getMarketIndices,
  getNews,
} from "@/lib/fondeks/queries";
import { breadcrumbSchema, webPageSchema } from "@/lib/fondeks/schema";
import { marketDescription, ogMeta, twitterMeta } from "@/lib/fondeks/seo";

import styles from "./piyasa.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  const indices = await getMarketIndices();
  const title = "Piyasa Özeti";
  const description = marketDescription(indices.map((index) => index.name));

  return {
    title,
    description,
    keywords: [
      "piyasa özeti",
      "borsa endeks",
      "BIST 100",
      "piyasa haberleri",
      "KAP",
    ],
    openGraph: ogMeta(title, description),
    twitter: twitterMeta(title, description),
  };
}

export default async function MarketPage() {
  const [indices, categories, headlines, filings] = await Promise.all([
    getMarketIndices(),
    getCategoryPerformance(),
    getForeksNews(6),
    getNews("kap", 6),
  ]);

  const description = marketDescription(indices.map((index) => index.name));

  return (
    <Page>
      <JsonLd
        data={webPageSchema("Piyasa Özeti", description, "/piyasa-ozeti")}
      />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: "Piyasa Özeti", href: "/piyasa-ozeti" },
        ])}
      />

      <SubHeader
        title="Piyasa Özeti"
        subtitle={`${MARKET_SESSION.date} · ${MARKET_SESSION.close}`}
      >
        <MarketStatus open={MARKET_SESSION.open} />
      </SubHeader>

      <PageBody>
        <IndexCards indices={indices} />

        <div className={styles.split}>
          <NewsPanel
            title="Son Haberler"
            hint="Piyasa gündemi"
            items={headlines}
          />

          <div className={styles.rail}>
            <CategoryPerformance categories={categories} />
            <NewsPanel
              title="KAP Bildirimleri"
              hint="Şirket açıklamaları"
              items={filings}
              compact
              showSummary={false}
            />
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
