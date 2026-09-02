import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { Allocation } from "@/components/fund-detail/Allocation";
import { CompareTable } from "@/components/fund-detail/CompareTable";
import { FundFacts } from "@/components/fund-detail/FundFacts";
import { FundHeader } from "@/components/fund-detail/FundHeader";
import { HoldingChanges } from "@/components/fund-detail/HoldingChanges";
import { MonthlyTrends } from "@/components/fund-detail/MonthlyTrends";
import { PriceChart } from "@/components/fund-detail/PriceChart";
import { SignupGate } from "@/components/fund-detail/SignupGate";
import { SimilarFunds } from "@/components/fund-detail/SimilarFunds";
import { Page, PageBody } from "@/components/layout/Shell";
import { getCurrentUser } from "@/lib/auth/session";
import { getFund, getFundDetail } from "@/lib/fondeks/queries";
import { codeFromSlug } from "@/lib/fondeks/slug";

import styles from "./fon.module.scss";

export async function generateMetadata({
  params,
}: PageProps<"/fon/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const fund = await getFund(codeFromSlug(slug));

  return { title: fund ? `${fund.code} — ${fund.name}` : "Fon" };
}

export default async function FundDetailPage({
  params,
}: PageProps<"/fon/[slug]">) {
  const { slug } = await params;
  const code = codeFromSlug(slug);

  const [fund, user] = await Promise.all([getFund(code), getCurrentUser()]);
  if (!fund) notFound();

  // A bare code or a stale name redirects to the canonical slug, so every
  // fund has exactly one URL.
  if (slug !== fund.slug) permanentRedirect(`/fon/${fund.slug}`);

  // Visitors get the price strip and nothing else — the rest of the fund is
  // never queried for them, so it never reaches the browser either.
  if (!user) {
    return (
      <Page>
        <FundHeader fund={fund} />
        <PageBody>
          <SignupGate preset="fund" fundCode={fund.code} />
        </PageBody>
      </Page>
    );
  }

  const detail = await getFundDetail(code);
  if (!detail) notFound();

  return (
    <Page>
      <FundHeader fund={detail.fund} />

      <PageBody>
        <PriceChart prices={detail.prices} />

        <FundFacts fund={detail.fund} />

        <MonthlyTrends monthly={detail.monthly} />

        <HoldingChanges
          increased={detail.increased}
          decreased={detail.decreased}
        />

        <div className={styles.split}>
          <Allocation slices={detail.allocation} />
          <SimilarFunds funds={detail.similar} />
        </div>

        <CompareTable
          codes={detail.compare.codes}
          rows={detail.compare.rows}
        />
      </PageBody>
    </Page>
  );
}
