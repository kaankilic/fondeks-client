import Link from "next/link";

import { BrandMark, FundCode, fundLogo } from "@/components/funds/primitives";
import { Button } from "@/components/ui/Button";
import {
  direction,
  formatAum,
  formatCount,
  formatDate,
  formatPercent,
  formatPrice,
} from "@/lib/fondeks/format";
import type { Fund } from "@/lib/fondeks/types";

import styles from "./FundHeader.module.scss";

export function FundHeader({ fund }: { fund: Fund }) {
  const stats: {
    label: string;
    value: string;
    tone?: "pos" | "neg" | "muted";
    /** Small line under the figure — where it needs a date to be read. */
    note?: string;
  }[] = [
    {
      label: "Son Fiyat",
      value: formatPrice(fund.price),
      // TEFAS publishes a fund's price a day late, so the figure is only
      // readable next to the session it belongs to.
      note: formatDate(fund.priceDate),
    },
    {
      label: "Günlük",
      value: formatPercent(fund.daily),
      tone: direction(fund.daily),
    },
    { label: "1 Ay", value: formatPercent(fund.m1), tone: direction(fund.m1) },
    { label: "1 Yıl", value: formatPercent(fund.y1), tone: direction(fund.y1) },
    { label: "Büyüklük", value: formatAum(fund.aum), tone: "muted" },
    { label: "Yatırımcı", value: formatCount(fund.investors), tone: "muted" },
  ];

  return (
    <div className={styles.header}>
      <nav className={styles.breadcrumb} aria-label="Konum">
        <Link href="/">Keşfet</Link>
        <span className={styles.separator} aria-hidden>
          ›
        </span>
        <Link href={`/arama?q=${encodeURIComponent(fund.category)}`}>
          {fund.category}
        </Link>
        <span className={styles.separator} aria-hidden>
          ›
        </span>
        <span className={styles.current}>{fund.code}</span>
      </nav>

      <div className={styles.identityRow}>
        <div className={styles.identity}>
          <BrandMark logo={fundLogo(fund)} size="hero" />
          <FundCode code={fund.code} size="hero" />
          <div className={styles.identityText}>
            <h1 className={styles.name}>{fund.name}</h1>
            <div className={styles.meta}>
              {fund.founder} · {fund.category}
              {fund.isin ? ` · ${fund.isin}` : ""} · Risk{" "}
              <span className={styles.risk}>{fund.risk}/7</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary">☆ İzle</Button>
          <Button variant="secondary">Karşılaştır</Button>
          <Button>Portföye Ekle</Button>
        </div>
      </div>

      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div
              className={`${styles.statValue} ${
                stat.tone ? styles[stat.tone] : ""
              }`}
            >
              {stat.value}
            </div>
            {stat.note ? (
              <div className={styles.statNote}>{stat.note}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
