"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { direction, formatPercent, formatPrice } from "@/lib/fondeks/format";
import type { Fund, FundCategory } from "@/lib/fondeks/types";

import { ChangePill, FundIdentity, RiskChip } from "./primitives";
import styles from "./FundTable.module.scss";

export type SortKey = "price" | "daily" | "y1";
export type SortDir = "asc" | "desc";
export type Sort = { key: SortKey; dir: SortDir };

const TABS: { label: string; category: FundCategory | null }[] = [
  { label: "Tümü", category: null },
  { label: "Hisse", category: "Hisse Senedi" },
  { label: "Serbest", category: "Serbest" },
  { label: "Maden", category: "Kıymetli Maden" },
];

const ARROW: Record<SortDir, string> = { asc: "↑", desc: "↓" };

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10.8 10.8L14 14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Turkish-aware case folding, so "İŞ" matches "iş". */
function fold(value: string) {
  return value.toLocaleLowerCase("tr");
}

export const DEFAULT_SORT: Sort = { key: "y1", dir: "desc" };

export function FundTable({
  funds,
  title = "Tüm Fonlar",
  header,
  showTabs = true,
  showFounder = false,
  searchable = true,
  wide = false,
  flush = false,
  sort: controlledSort,
  onSortChange,
}: {
  funds: Fund[];
  title?: string;
  /** Replaces the whole header strip — used by the search results screen. */
  header?: ReactNode;
  showTabs?: boolean;
  showFounder?: boolean;
  /** Shows the magnifier that filters this list in place. */
  searchable?: boolean;
  wide?: boolean;
  /** Drops the card chrome for screens that run edge to edge. */
  flush?: boolean;
  /** Pass both to drive sorting from outside; omit to keep it internal. */
  sort?: Sort;
  onSortChange?: (sort: Sort) => void;
}) {
  const [category, setCategory] = useState<FundCategory | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalSort, setInternalSort] = useState<Sort>(DEFAULT_SORT);
  const sort = controlledSort ?? internalSort;
  const setSort = onSortChange ?? setInternalSort;

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

  const rows = useMemo(() => {
    const needle = fold(query.trim());

    const filtered = funds.filter((fund) => {
      if (category && fund.category !== category) return false;
      if (!needle) return true;
      return fold(
        `${fund.code} ${fund.name} ${fund.founder} ${fund.category}`,
      ).includes(needle);
    });

    return [...filtered].sort((a, b) => {
      const delta = a[sort.key] - b[sort.key];
      return sort.dir === "asc" ? delta : -delta;
    });
  }, [funds, category, query, sort]);

  function closeSearch() {
    setSearching(false);
    setQuery("");
  }

  // Clicking the active column flips direction; a new column starts descending.
  function toggleSort(key: SortKey) {
    setSort(
      sort.key === key
        ? { key, dir: sort.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );
  }

  function headerCell(key: SortKey, label: string) {
    const active = sort.key === key;
    return (
      <button
        type="button"
        className={`${styles.colLabel} ${styles.sortable} ${styles.alignRight} ${
          active ? styles.sorted : ""
        }`}
        onClick={() => toggleSort(key)}
        aria-label={
          active
            ? `${label} — ${sort.dir === "asc" ? "artan" : "azalan"} sıralı, yönü değiştir`
            : `${label} sütununa göre sırala`
        }
      >
        {label} {active ? ARROW[sort.dir] : ""}
      </button>
    );
  }

  return (
    <section
      className={`${styles.panel} ${wide ? styles.wide : ""} ${
        flush ? styles.flush : ""
      }`}
    >
      {header === undefined ? (
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>

          <div className={styles.headerRight}>
            {showTabs ? (
              <div className={styles.tabs}>
                {TABS.map((tab) => (
                  <button
                    key={tab.label}
                    type="button"
                    className={`${styles.tab} ${
                      tab.category === category ? styles.tabActive : ""
                    }`}
                    onClick={() => setCategory(tab.category)}
                    aria-pressed={tab.category === category}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}

            {searchable ? (
              <button
                type="button"
                className={styles.searchToggle}
                onClick={() => (searching ? closeSearch() : setSearching(true))}
                aria-label={searching ? "Aramayı kapat" : "Listede ara"}
                aria-expanded={searching}
              >
                <SearchIcon />
              </button>
            ) : null}
          </div>

          {searching ? (
            <div className={styles.search}>
              <SearchIcon />
              <input
                ref={inputRef}
                className={styles.searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "Escape") closeSearch();
                }}
                placeholder="Bu listede ara…"
                aria-label={`${title} içinde ara`}
              />
              <span className={styles.searchCount}>{rows.length}</span>
              <button
                type="button"
                className={styles.searchClose}
                onClick={closeSearch}
                aria-label="Aramayı kapat"
              >
                ✕
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        header
      )}

      <div className={styles.headRow}>
        <span className={styles.colLabel}>Fon / Kod</span>
        {headerCell("price", "Fiyat")}
        {headerCell("daily", "Günlük")}
        {headerCell("y1", "1 Yıl")}
        <span className={`${styles.colLabel} ${styles.alignCenter}`}>Risk</span>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Bu kritere uyan fon bulunamadı</p>
          <p className={styles.emptyHint}>
            Filtreleri gevşetmeyi veya farklı bir fon kodu denemeyi dene.
          </p>
        </div>
      ) : (
        rows.map((fund) => (
          <Link
            key={fund.code}
            href={`/fon/${fund.slug}`}
            className={styles.dataRow}
          >
            <FundIdentity
              fund={fund}
              meta={
                showFounder
                  ? `${fund.category} · ${fund.founder}`
                  : fund.category
              }
            />
            <span className={styles.price}>{formatPrice(fund.price)}</span>
            <ChangePill value={fund.daily} />
            <span className={`${styles.return} ${styles[direction(fund.y1)]}`}>
              {formatPercent(fund.y1)}
            </span>
            <RiskChip risk={fund.risk} />
          </Link>
        ))
      )}
    </section>
  );
}
