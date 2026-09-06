import type { Fund } from "./types";
import {
  formatAum,
  formatCount,
  formatDate,
  formatPercent,
  formatPercentPrefixed,
  formatPrice,
} from "./format";

/**
 * The sentence a fund's page offers a search engine.
 *
 * Every fund page used to inherit the site's own description, so a few
 * thousand pages made the same claim and none of them described the fund on
 * it. This writes one per fund out of what the page already shows: its
 * identity, its newest price and the date that price is from, the return over
 * the longest window it has history for, and what it costs to hold.
 *
 * The clauses are added while they fit inside `BUDGET`, so the sentence ends
 * on a full clause rather than mid-number — Google truncates around 155–160
 * characters and a description cut mid-figure reads as broken. Order is by
 * what a reader scanning results wants first, so what drops off the end is
 * what matters least.
 */

/** Characters a description is written to, before truncation would show. */
const BUDGET = 158;

function fold(value: string): string {
  return value.toLocaleLowerCase("tr");
}

/**
 * TEFAS names carry the issuer and usually the category — "Ak Portföy Yeni
 * Teknolojiler Yabancı Hisse Senedi Fonu" is all three at once. Repeating them
 * spends a third of the budget saying what the reader has just read, so each
 * is only added when the name does not already carry it.
 */
function identity(fund: Fund): string {
  const name = fold(fund.name);
  const parts: string[] = [];

  if (!name.includes(fold(fund.founder))) parts.push(fund.founder);

  if (!name.includes(fold(fund.category))) {
    const category = fold(fund.category);
    // "Serbest fon", but "hisse senedi fonu" — the suffix follows the noun.
    parts.push(
      fund.category === "Serbest" ? `${category} fon` : `${category} fonu`,
    );
  }

  const suffix = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  return `${fund.name} (${fund.code})${suffix}.`;
}

/**
 * The longest window the fund has a return for. A fund launched last month has
 * no yearly figure, and a zero there is absence rather than a flat year, so
 * the sentence falls back rather than claiming 0%.
 */
function returnClause(fund: Fund): string | null {
  const windows: [label: string, value: number][] = [
    ["1 yılda", fund.y1],
    ["3 ayda", fund.m3],
    ["1 ayda", fund.m1],
    ["1 haftada", fund.w1],
  ];

  const first = windows.find(([, value]) => value !== 0);
  if (!first) return null;

  const [label, value] = first;
  return `${label} ${formatPercent(value)} getiri`;
}

export function fundDescription(fund: Fund): string {
  const clauses: string[] = [];

  // Identity first: it is what makes the sentence this fund's and no other's.
  clauses.push(identity(fund));

  const performance = returnClause(fund);
  if (performance) clauses.push(`${performance}.`);

  clauses.push(
    `Son fiyat ${formatPrice(fund.price)} TL (${formatDate(fund.priceDate)}).`,
  );

  clauses.push(
    `Risk ${fund.risk}/7, yönetim ücreti ` +
      `${formatPercentPrefixed(fund.managementFee, 2)}.`,
  );

  if (fund.investors > 0) {
    clauses.push(`${formatCount(fund.investors)} yatırımcı.`);
  }

  if (fund.aum > 0) {
    clauses.push(`${formatAum(fund.aum)} TL büyüklük.`);
  }

  // Everything that still fits, in order, so the tail is what matters least.
  return clauses.reduce((sentence, clause) => {
    if (!sentence) return clause;
    const extended = `${sentence} ${clause}`;
    return extended.length <= BUDGET ? extended : sentence;
  }, "");
}
