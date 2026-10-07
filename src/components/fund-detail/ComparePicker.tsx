"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type KeyboardEvent } from "react";

import { useEvents } from "@/lib/analytics/useEvents";
import type { SearchResult } from "@/lib/fondeks/types";

import styles from "./ComparePicker.module.scss";

/** How long typing has to settle before a request goes out. */
const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;
/** Keep the board readable; two is the common case, three the ceiling. */
export const MAX_FUNDS = 3;

/**
 * Chooses which funds the compare board shows by editing the `fonlar` query
 * param: chips remove a fund, the search box adds one. All state lives in the
 * URL, so the comparison is shareable and survives reload.
 */
export function ComparePicker({
  selected,
}: {
  selected: { code: string; name: string }[];
}) {
  const router = useRouter();
  const { track } = useEvents();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const codes = selected.map((fund) => fund.code);
  const full = codes.length >= MAX_FUNDS;

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < MIN_QUERY) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/funds/search?q=${encodeURIComponent(needle)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { results: SearchResult[] };
        setHits(data.results);
      } catch {
        // Aborted or offline — keep whatever is on screen.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function pushCodes(next: string[]) {
    const unique = Array.from(new Set(next));
    router.push(
      unique.length ? `/karsilastir?fonlar=${unique.join(",")}` : "/karsilastir",
    );
  }

  function add(code: string) {
    if (full || codes.includes(code)) return;
    track("compare_fund_added", { code, total: codes.length + 1 });
    setQuery("");
    setHits([]);
    pushCodes([...codes, code]);
  }

  function remove(code: string) {
    track("compare_fund_removed", { code, total: codes.length - 1 });
    pushCodes(codes.filter((item) => item !== code));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setQuery("");
      setHits([]);
    }
  }

  const needle = query.trim();
  const ready = needle.length >= MIN_QUERY;
  // Only surface results for the query currently in the box, so stale hits from
  // a longer previous query never show after the text is shortened.
  const results = ready ? hits.filter((hit) => !codes.includes(hit.code)) : [];
  const showEmpty = ready && !loading && results.length === 0;

  return (
    <section className={styles.picker}>
      {selected.length > 0 ? (
        <div className={styles.chips}>
          {selected.map((fund) => (
            <span key={fund.code} className={styles.chip}>
              <span className={styles.chipCode}>{fund.code}</span>
              <span className={styles.chipName}>{fund.name}</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => remove(fund.code)}
                aria-label={`${fund.code} karşılaştırmadan çıkar`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {full ? (
        <p className={styles.limit}>
          En fazla {MAX_FUNDS} fon karşılaştırılabilir. Yeni bir fon eklemek için
          birini çıkar.
        </p>
      ) : (
        <div className={styles.field}>
          <input
            className={styles.input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Karşılaştırmak için fon ara (kod, ad veya kurucu)…"
            aria-label="Karşılaştırmaya fon ekle"
          />
          {loading ? <span className={styles.hint}>Aranıyor…</span> : null}

          {results.length > 0 || showEmpty ? (
            <div className={styles.results}>
              {results.map((hit) => (
                <button
                  key={hit.code}
                  type="button"
                  className={styles.result}
                  onClick={() => add(hit.code)}
                >
                  <span
                    className={styles.resultMark}
                    style={{ background: hit.color }}
                    aria-hidden
                  >
                    {hit.initials}
                  </span>
                  <span className={styles.resultCode}>{hit.code}</span>
                  <span className={styles.resultText}>
                    <span className={styles.resultName}>{hit.name}</span>
                    <span className={styles.resultMeta}>
                      {hit.category} · {hit.founder}
                    </span>
                  </span>
                  <span className={styles.resultAdd} aria-hidden>
                    +
                  </span>
                </button>
              ))}

              {showEmpty ? (
                <div className={styles.noResult}>
                  &ldquo;{needle}&rdquo; için fon bulunamadı.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
