import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DecisionPanel } from "@/components/fund-detail/DecisionPanel";
import { FundTable } from "@/components/funds/FundTable";
import { GoalGrid } from "@/components/funds/GoalGrid";
import { EmptyState } from "@/components/layout/EmptyState";
import { JsonLd } from "@/components/layout/JsonLd";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import { buttonClass } from "@/components/ui/Button";
import { TrackView } from "@/lib/analytics/Track";
import { percentileRank } from "@/lib/fondeks/choose";
import { formatCount } from "@/lib/fondeks/format";
import { GOALS, goalBySlug } from "@/lib/fondeks/goals";
import { getFundPrices, getFunds } from "@/lib/fondeks/queries";
import { breadcrumbSchema, fundCollectionSchema } from "@/lib/fondeks/schema";
import { ogMeta, twitterMeta } from "@/lib/fondeks/seo";

import styles from "./kategori.module.scss";

/** One static route per goal, so each comparison page is built and indexable. */
export function generateStaticParams() {
  return GOALS.map((goal) => ({ slug: goal.slug }));
}

/** The meta description — concise, built from the goal rather than its long lead. */
function metaDescription(heading: string): string {
  return `${heading}: maliyet, stopaj ve enflasyon sonrası net getiriye göre sıralı, bağımsız karşılaştırma listesi.`;
}

export async function generateMetadata({
  params,
}: PageProps<"/kategori/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const goal = goalBySlug(slug);
  if (!goal) return { title: "Kategori" };

  const description = metaDescription(goal.heading);
  return {
    title: goal.heading,
    description,
    keywords: goal.keywords,
    openGraph: ogMeta(goal.heading, description),
    twitter: twitterMeta(goal.heading, description),
  };
}

export default async function GoalCategoryPage({
  params,
}: PageProps<"/kategori/[slug]">) {
  const { slug } = await params;
  const goal = goalBySlug(slug);
  if (!goal) notFound();

  const categories = new Set<string>(goal.categories);
  const funds = (await getFunds()).filter((fund) =>
    categories.has(fund.category),
  );

  const description = metaDescription(goal.heading);
  const path = `/kategori/${goal.slug}`;

  if (funds.length === 0) {
    return (
      <Page>
        <SubHeader title={goal.heading} />
        <PageBody>
          <GoalGrid location="category" current={goal.slug} />
          <EmptyState
            title="Bu kategoride fon bulunamadı"
            message="Veri kaynağı bu kategoriyi henüz döndürmüyor. Hazır olduğunda fonlar burada net getiriye göre listelenecek."
          />
        </PageBody>
      </Page>
    );
  }

  // The catalogue comes back best one-year return first, so the head of the
  // filtered list is the category leader — the fund worth featuring with the
  // full decision panel. Its percentile is computed against the peers we hold
  // right here, so the page needs nothing from the backend to show it.
  const featured = funds[0];
  const [prices] = await Promise.all([getFundPrices(featured.code, 400)]);
  const percentile = percentileRank(featured, funds, "y1");

  const topCodes = funds.slice(0, 3).map((fund) => fund.code);
  const comparePath = `/karsilastir?fonlar=${topCodes.join(",")}`;

  return (
    <Page>
      <TrackView
        event="category_page_viewed"
        params={{ goal: goal.slug, funds: funds.length }}
      />
      <JsonLd data={fundCollectionSchema(goal.heading, description, path, funds)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Keşfet", href: "/" },
          { name: goal.label, href: path },
        ])}
      />

      <SubHeader
        title={goal.heading}
        subtitle={`${formatCount(funds.length)} fon · getiriye göre sıralı`}
      />

      <PageBody>
        <p className={styles.intro}>{goal.intro}</p>

        <GoalGrid location="category" current={goal.slug} />

        <div className={styles.featured}>
          <span className={styles.featuredKicker}>
            Kategori lideri · {featured.code} {featured.name}
          </span>
          <DecisionPanel fund={featured} prices={prices} percentile={percentile} />
        </div>

        <FundTable
          funds={funds}
          title={goal.heading}
          showTabs={false}
          showFounder
          wide
          trackContext="category"
        />

        {topCodes.length >= 2 ? (
          <div className={styles.cta}>
            <div className={styles.ctaText}>
              <span className={styles.ctaTitle}>İlk {topCodes.length} fonu karşılaştır</span>
              <span className={styles.ctaSub}>
                Getiri, stopaj sonrası net, reel getiri ve toplam gideri yan yana gör.
              </span>
            </div>
            <a href={comparePath} className={buttonClass()}>
              Karşılaştır →
            </a>
          </div>
        ) : null}
      </PageBody>
    </Page>
  );
}
