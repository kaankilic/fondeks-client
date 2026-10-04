import { direction, formatCount, formatPercent } from "@/lib/fondeks/format";
import type { Fund, MarketIndex } from "@/lib/fondeks/types";
import { IndexTicker } from "@/components/market/IndexTicker";

import { FundCode } from "./primitives";
import styles from "./MarketHero.module.scss";

type Tone = "pos" | "neg" | "brand" | undefined;

/**
 * The discovery masthead: one gradient band that carries the screen title, the
 * shape of the whole catalogue as a dense KPI board, and the market ticker.
 * Every figure is derived from the funds already loaded for the page, so the
 * band costs no extra request. It replaces the flat sub-header + KPI strip with
 * a single premium unit that anchors the top of the screen.
 */
export function MarketHero({
  funds,
  indices,
}: {
  funds: Fund[];
  indices: MarketIndex[];
}) {
  const total = funds.length;
  const up = funds.filter((fund) => fund.daily > 0).length;
  const down = funds.filter((fund) => fund.daily < 0).length;
  const breadth = total ? Math.round((up / total) * 100) : 0;
  const avgY1 = total
    ? funds.reduce((sum, fund) => sum + fund.y1, 0) / total
    : 0;
  const leader = funds.reduce<Fund | null>(
    (best, fund) => (best === null || fund.y1 > best.y1 ? fund : best),
    null,
  );

  return (
    <section className={styles.hero} aria-label="Piyasa özeti">
      <div className={styles.glow} aria-hidden />

      <div className={styles.top}>
        <div className={styles.lead}>
          <span className={styles.kicker}>TEFAS · Canlı Piyasa</span>
          <h1 className={styles.title}>Keşfet</h1>
          <p className={styles.subtitle}>
            {formatCount(total)} fon · getiriye göre sıralı
          </p>
          <div className={styles.breadth}>
            <div className={styles.breadthBar} aria-hidden>
              <span
                className={styles.breadthFill}
                style={{ width: `${breadth}%` }}
              />
            </div>
            <span className={styles.breadthText}>
              Bugün <strong className={styles.pos}>{formatCount(up)}</strong>{" "}
              yükselen · <strong className={styles.neg}>{formatCount(down)}</strong>{" "}
              düşen
            </span>
          </div>
        </div>

        <div className={styles.board}>
          <Stat label="Takip Edilen" value={formatCount(total)} />
          <Stat
            label="Ortalama 1Y"
            value={formatPercent(avgY1)}
            tone={direction(avgY1)}
          />
          <Stat
            label="Günün Zirvesi"
            value={leader ? formatPercent(leader.y1) : "—"}
            tone="brand"
            hero
            note={leader ? <FundCode code={leader.code} size="sm" /> : null}
          />
        </div>
      </div>

      {indices.length > 0 ? (
        <div className={styles.ticker}>
          <IndexTicker indices={indices} />
        </div>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
  note,
  hero = false,
}: {
  label: string;
  value: string;
  tone?: Tone;
  note?: React.ReactNode;
  hero?: boolean;
}) {
  return (
    <div className={`${styles.stat} ${hero ? styles.statHero : ""}`}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.figure}>
        <span
          className={`${styles.value} ${tone ? styles[tone] : ""} ${
            hero ? styles.valueHero : ""
          }`}
        >
          {value}
        </span>
        {note}
      </span>
    </div>
  );
}
