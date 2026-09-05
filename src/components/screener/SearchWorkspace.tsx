"use client";

import { useMemo, useRef, useState } from "react";

import {
  DEFAULT_SORT,
  FundTable,
  type Sort,
} from "@/components/funds/FundTable";
import { SearchInput } from "@/components/funds/SearchInput";
import { Button } from "@/components/ui/Button";
import {
  FUND_CATEGORIES,
  RISK_MAX as RISK_SCALE_MAX,
  RISK_MIN as RISK_SCALE_MIN,
} from "@/lib/fondeks/constants";
import type { Fund, FundCategory } from "@/lib/fondeks/types";

import { DualRangeSlider, RangeSlider } from "./RangeSlider";
import styles from "./SearchWorkspace.module.scss";

const RISK_MIN = RISK_SCALE_MIN;
const RISK_MAX = RISK_SCALE_MAX;
const RETURN_MIN = 0;
const RETURN_MAX = 60;

type Filters = {
  categories: FundCategory[];
  risk: [number, number];
  minReturn: number;
};

const NO_FILTERS: Filters = {
  categories: [],
  risk: [RISK_MIN, RISK_MAX],
  minReturn: RETURN_MIN,
};

const SORT_OPTIONS: { value: string; label: string; sort: Sort }[] = [
  {
    value: "y1-desc",
    label: "1 Yıl Getiri ↓",
    sort: { key: "y1", dir: "desc" },
  },
  { value: "y1-asc", label: "1 Yıl Getiri ↑", sort: { key: "y1", dir: "asc" } },
  {
    value: "daily-desc",
    label: "Günlük ↓",
    sort: { key: "daily", dir: "desc" },
  },
  {
    value: "price-desc",
    label: "Fiyat ↓",
    sort: { key: "price", dir: "desc" },
  },
];

/** Ties the phone-only filters toggle to the panel it opens. */
const FILTERS_ID = "screener-filters";

/** Turkish-aware case folding so "İŞ" matches "iş". */
function fold(value: string) {
  return value.toLocaleLowerCase("tr");
}

export function SearchWorkspace({
  funds,
  initialQuery = "",
}: {
  funds: Fund[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  // Phones open on the results; the rail is a panel they pull down. From `lg`
  // the rail is always on screen and this flag stops mattering.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    const map = new Map<FundCategory, number>();
    for (const fund of funds) {
      map.set(fund.category, (map.get(fund.category) ?? 0) + 1);
    }
    return map;
  }, [funds]);

  const results = useMemo(() => {
    const needle = fold(query.trim());

    return funds.filter((fund) => {
      if (
        needle &&
        !fold(`${fund.code} ${fund.name} ${fund.founder}`).includes(needle)
      ) {
        return false;
      }
      if (
        filters.categories.length > 0 &&
        !filters.categories.includes(fund.category)
      ) {
        return false;
      }
      if (fund.risk < filters.risk[0] || fund.risk > filters.risk[1]) {
        return false;
      }
      return fund.y1 >= filters.minReturn;
    });
  }, [funds, query, filters]);

  function toggleCategory(category: FundCategory) {
    setFilters((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  }

  const riskFiltered =
    filters.risk[0] !== RISK_MIN || filters.risk[1] !== RISK_MAX;
  const returnFiltered = filters.minReturn > RETURN_MIN;
  const hasFilters =
    query.trim() !== "" ||
    filters.categories.length > 0 ||
    riskFiltered ||
    returnFiltered;

  function reset() {
    setQuery("");
    setFilters(NO_FILTERS);
  }

  const activeSort =
    SORT_OPTIONS.find(
      (option) => option.sort.key === sort.key && option.sort.dir === sort.dir,
    )?.value ?? "";

  return (
    <div className={styles.workspace}>
      <aside className={styles.rail} aria-label="Filtreler">
        <div className={styles.railHead}>
          <button
            type="button"
            className={styles.railToggle}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls={FILTERS_ID}
          >
            <span className={styles.railTitle}>Filtreler</span>
            <span className={styles.railChevron} aria-hidden>
              {filtersOpen ? "▲" : "▼"}
            </span>
          </button>

          <button
            type="button"
            className={styles.reset}
            onClick={reset}
            disabled={!hasFilters}
          >
            Sıfırla
          </button>
        </div>

        <div
          id={FILTERS_ID}
          className={`${styles.railBody} ${filtersOpen ? styles.railBodyOpen : ""}`}
        >
          <SearchInput
            compact
            placeholder="Fon ara…"
            value={query}
            onChange={setQuery}
          />

          <div>
            <span className={styles.groupLabel}>Kategori</span>
            <div className={styles.options}>
              {FUND_CATEGORIES.map((category) => (
                <label key={category} className={styles.option}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={filters.categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span className={styles.box} aria-hidden>
                    ✓
                  </span>
                  {category}
                  <span className={styles.count}>
                    {counts.get(category) ?? 0}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <DualRangeSlider
            label="Risk Değeri"
            display={`${filters.risk[0]} – ${filters.risk[1]}`}
            value={filters.risk}
            min={RISK_MIN}
            max={RISK_MAX}
            onChange={(risk) => setFilters((current) => ({ ...current, risk }))}
          />

          <RangeSlider
            label="Min. 1 Yıl Getiri"
            display={`≥ +${filters.minReturn}%`}
            displayTone="pos"
            value={filters.minReturn}
            min={RETURN_MIN}
            max={RETURN_MAX}
            step={5}
            onChange={(minReturn) =>
              setFilters((current) => ({ ...current, minReturn }))
            }
          />

          <Button
            block
            onClick={() => {
              setFiltersOpen(false);
              resultsRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {results.length} fonu göster
          </Button>
        </div>
      </aside>

      <div className={styles.results} ref={resultsRef}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarTop}>
            <span className={styles.resultsCount}>
              {results.length} sonuç
              {query.trim() ? (
                <span className={styles.resultsQuery}>
                  {" "}
                  · &ldquo;{query.trim()}&rdquo;
                </span>
              ) : null}
            </span>

            <label className={styles.sort}>
              Sırala:
              <select
                className={styles.sortSelect}
                value={activeSort}
                onChange={(event) => {
                  const option = SORT_OPTIONS.find(
                    (item) => item.value === event.target.value,
                  );
                  if (option) setSort(option.sort);
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {hasFilters ? (
            <div className={styles.chips}>
              <span className={styles.chipsLabel}>Aktif</span>

              {query.trim() ? (
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() => setQuery("")}
                >
                  &ldquo;{query.trim()}&rdquo;
                  <span className={styles.chipRemove} aria-hidden>
                    ✕
                  </span>
                  <span className="sr-only">aramayı temizle</span>
                </button>
              ) : null}

              {filters.categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={styles.chip}
                  onClick={() => toggleCategory(category)}
                >
                  {category}
                  <span className={styles.chipRemove} aria-hidden>
                    ✕
                  </span>
                  <span className="sr-only">filtreyi kaldır</span>
                </button>
              ))}

              {riskFiltered ? (
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      risk: [RISK_MIN, RISK_MAX],
                    }))
                  }
                >
                  Risk {filters.risk[0]}–{filters.risk[1]}
                  <span className={styles.chipRemove} aria-hidden>
                    ✕
                  </span>
                </button>
              ) : null}

              {returnFiltered ? (
                <button
                  type="button"
                  className={styles.chip}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      minReturn: RETURN_MIN,
                    }))
                  }
                >
                  Getiri ≥ +{filters.minReturn}%
                  <span className={styles.chipRemove} aria-hidden>
                    ✕
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <FundTable
          funds={results}
          header={null}
          showTabs={false}
          searchable={false}
          showFounder
          wide
          flush
          sort={sort}
          onSortChange={setSort}
        />
      </div>
    </div>
  );
}
