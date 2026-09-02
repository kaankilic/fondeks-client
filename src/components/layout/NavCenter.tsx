"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";

import { direction, formatPercent } from "@/lib/fondeks/format";

import styles from "./TopNav.module.scss";

export type NavItem = {
  href: ComponentProps<typeof Link>["href"];
  label: string;
  /** Extra path prefixes that should keep this item highlighted. */
  match?: readonly string[];
};

type SearchHit = {
  code: string;
  slug: string;
  name: string;
  founder: string;
  initials: string;
  color: string;
  category: string;
  y1: number;
};

/** How long typing has to settle before a request goes out. */
const DEBOUNCE_MS = 250;
const MIN_QUERY = 2;

function isActive(pathname: string, href: string, match?: readonly string[]) {
  const candidates = match ?? [href];
  return candidates.some((path) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path),
  );
}

/**
 * Magnifier plus either the nav links or the search field. Mounted with the
 * pathname as its key, so navigating anywhere collapses the search again.
 */
export function NavCenter({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  const router = useRouter();

  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);

  // Lazy search: wait for typing to settle, then fetch. A newer keystroke
  // aborts the request in flight.
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
        const data = (await response.json()) as { results: SearchHit[] };
        setHits(data.results);
      } catch {
        // Aborted or offline — keep whatever is already on screen.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  function closeSearch() {
    setSearching(false);
    setQuery("");
    setHits([]);
  }

  function goToResults() {
    const needle = query.trim();
    if (needle) router.push(`/arama?q=${encodeURIComponent(needle)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") closeSearch();
    if (event.key === "Enter") {
      event.preventDefault();
      goToResults();
    }
  }

  const needle = query.trim();
  const ready = needle.length >= MIN_QUERY;
  // Results are only shown for the query currently in the box.
  const visible = ready ? hits : [];
  const showEmpty = ready && !loading && visible.length === 0;

  return (
    <div className={styles.middle}>
      <button
        type="button"
        className={styles.searchToggle}
        onClick={() => (searching ? closeSearch() : setSearching(true))}
        aria-label={searching ? "Aramayı kapat" : "Fon ara"}
        aria-expanded={searching}
      >
        {searching ? (
          <span className={styles.close} aria-hidden>
            ✕
          </span>
        ) : (
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M10.8 10.8L14 14"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {searching ? (
        <div className={styles.searchField}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Fon adı, kod veya kurucu ara…"
            aria-label="Fon ara"
          />
          {loading ? <span className={styles.hint}>Aranıyor…</span> : null}

          {visible.length > 0 || showEmpty ? (
            <div className={styles.results}>
              <div className={styles.resultsInner}>
              {visible.map((hit) => (
                <Link
                  key={hit.code}
                  href={`/fon/${hit.slug}`}
                  className={styles.result}
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
                  <span
                    className={`${styles.resultReturn} ${styles[direction(hit.y1)]}`}
                  >
                    {formatPercent(hit.y1)}
                  </span>
                </Link>
              ))}

              {showEmpty ? (
                <div className={styles.noResult}>
                  <span className={styles.noResultIcon} aria-hidden>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <circle
                        cx="7"
                        cy="7"
                        r="5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M10.8 10.8L14 14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span>
                    <span className={styles.noResultTitle}>
                      &ldquo;{needle}&rdquo; için fon bulunamadı
                    </span>
                    <span className={styles.noResultHint}>
                      Fon kodu, fon adı veya kurucu adıyla aramayı dene.
                    </span>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.allResults}
                  onClick={goToResults}
                >
                  Tüm sonuçları gör →
                </button>
              )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <nav className={styles.nav} aria-label="Ana gezinme">
          {items.map((item) => {
            const active = isActive(pathname, String(item.href), item.match);
            return (
              <Link
                key={String(item.href)}
                href={item.href}
                className={`${styles.link} ${active ? styles.active : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
