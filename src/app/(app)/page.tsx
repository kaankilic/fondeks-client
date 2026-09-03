import { FeaturedFunds } from "@/components/funds/FeaturedFunds";
import {
  FundHighlightPanel,
  HighlightGrid,
} from "@/components/funds/FundHighlights";
import { FundTable } from "@/components/funds/FundTable";
import { ReturnLeaderboard } from "@/components/funds/ReturnLeaderboard";
import { GuidePanel } from "@/components/guides/GuideList";
import { Page, PageBody, SubHeader } from "@/components/layout/Shell";
import {
  direction,
  formatCount,
  formatDate,
  formatPercent,
} from "@/lib/fondeks/format";
import {
  getFeaturedFunds,
  getFunds,
  getGuides,
  getInvestorGrowth,
  getNewestFunds,
  getSparklines,
  getTopGainers,
  getSmallestGainers,
} from "@/lib/fondeks/queries";
import type { Fund, FundHighlight } from "@/lib/fondeks/types";

import styles from "./screener.module.scss";

/** Rows the discover page previews before the reader drills into a full list. */
const PREVIEW_ROWS = 10;

/** Ranked by one-year return, with the issuer as the supporting line. */
function byReturn(funds: Fund[]): FundHighlight[] {
  return funds.map((fund) => ({
    fund,
    value: formatPercent(fund.y1),
    tone: direction(fund.y1),
    detail: `${fund.category} · ${fund.founder}`,
  }));
}

export default async function DiscoverPage() {
  const [funds, featured, gainers, smallestGainers, growth, newest, guides] =
    await Promise.all([
      getFunds(),
      getFeaturedFunds(),
      getTopGainers(),
      getSmallestGainers(),
      getInvestorGrowth(),
      getNewestFunds(4),
      getGuides(3),
    ]);

  const sparklines = await getSparklines(featured.map((fund) => fund.code));

  return (
    <Page>
      <SubHeader
        title="Keşfet"
        subtitle={`${funds.length} fon · getiriye göre sıralı`}
      />

      <PageBody>
        <FeaturedFunds funds={featured} sparklines={sparklines} />

        <div className={styles.split}>
          <FundTable funds={funds} limit={PREVIEW_ROWS} />

          <div className={styles.rail}>
            <ReturnLeaderboard funds={funds.slice(0, PREVIEW_ROWS)} />
            <GuidePanel guides={guides} />
          </div>
        </div>

        <HighlightGrid>
          <FundHighlightPanel
            title="En Çok Kazandıran Fonlar"
            hint="1 yıllık getiri"
            items={byReturn(gainers)}
          />

          <FundHighlightPanel
            title="En Az Kazandıran Fonlar"
            hint="1 yıllık getiri"
            items={byReturn(smallestGainers)}
          />

          <FundHighlightPanel
            title="Yatırımcısı En Çok Artan Fonlar"
            hint="Son bir ay"
            items={growth.map((row) => ({
              fund: row.fund,
              value: formatPercent(row.growth),
              tone: direction(row.growth),
              detail: `${formatCount(row.investors)} yatırımcı`,
            }))}
          />

          <FundHighlightPanel
            title="Son Çıkan Fonlar"
            hint="3 aylık getiri"
            items={newest.map((fund) => ({
              fund,
              value: formatPercent(fund.m3),
              tone: direction(fund.m3),
              detail: `${
                fund.inceptionDate ? formatDate(fund.inceptionDate) : "—"
              } · ${formatCount(fund.investors)} yatırımcı`,
            }))}
          />
        </HighlightGrid>
      </PageBody>
    </Page>
  );
}
