# Fondeks backend

Market data flows one way: **provider → ingest job → Postgres → query layer → UI/API**.
Nothing in the app calls an upstream service at request time.

## Pipeline

```
MarketDataProvider          src/lib/market/
  ├── TefasProvider         live import (tefas.ts)
  └── FixtureProvider       offline, deterministic (fixture.ts)
        │
        ▼
ingest jobs                 src/lib/ingest/jobs.ts
  ├── syncFundCatalog()     funds + issuers, upsert by code
  └── syncDailyStats(range) price / size / investors, upsert by (code, date)
        │  every attempt recorded in ingest_runs
        ▼
Postgres                    fund_daily_stats is the single source of truth
        │
        ▼
query layer                 src/lib/fondeks/queries.ts
        │  returns, volatility, monthly rollups, leader lists — all derived
        ▼
pages + /api/*
```

### Why one daily table

TEFAS publishes price, fund size and investor count together per fund per day,
so they share a grain and live in one row (`fund_daily_stats`). Everything else
is derived rather than stored, which removes the class of bug where a cached
return disagrees with the prices behind it:

| Shown in the product | Derived from |
|---|---|
| Günlük / 1 Ay / 3 Ay / 1 Yıl getiri | price vs the closest earlier row at that offset |
| Volatilite (1Y) | `stddev_samp` of daily returns × √252 |
| Fon toplam değeri, Yatırımcı sayısı | latest daily row |
| Aylık gelişim, Nakit giriş/çıkışı | month-end rollup; flow = size change the return doesn't explain |
| Getiri Liderleri, En Çok/Az Kazandıran | ranked 1-year return |
| Yatırımcısı En Çok Artan | latest investor count vs the reading ~30 days earlier |
| Son Çıkan Fonlar | `funds.inception_date` |

## Sources

| Data | Source | Status |
|---|---|---|
| Fund catalogue, daily price / size / investors | TEFAS (Takasbank portal services) | endpoints found in the live bundle, **field mapping unverified** |
| USD/TRY, EUR/TRY | TCMB daily bulletin XML | **verified live** — free, official, no key |
| BIST 100 / 30, gram altın, gösterge faiz | TCMB EVDS | needs `TCMB_EVDS_API_KEY`; series codes configurable |
| Artırılan / azaltılan pozisyonlar | KAP portfolio disclosures | endpoint **unverified** (KAP is now a Next.js app too) |
| Haberler, KAP bildirimleri, Rehber, kategori getirileri | editorial / fixtures | no feed wired |

Anything unverified runs through the same defensive adapter pattern: field
names read by candidate, tolerant number and date parsing, and one sample row
logged per endpoint under `INGEST_LOG_SAMPLES=true`.

### Market indices

`market_indices` holds presentation and source wiring only; the numbers live in
`index_quotes`, so the card's value, its change and its sparkline are read from
one dated series and cannot disagree. An index whose source is not configured
simply has no quotes — the card shows nothing rather than a made-up number.

### Portfolio holdings

```
KAP filing ──► fund_holding_snapshots (what a fund held, per period)
                        │  diff consecutive periods
                        ▼
                 fund_positions (top movers, both directions)
```

Keeping raw snapshots means the movers can be recomputed for any pair of
periods, and a corrected filing repairs the derived table on the next run. The
offline provider generates two consecutive periods, so the diff reproduces the
design's AFT movers exactly (ASELS +1,8 / KCHOL -1,4 puan) — computed, not typed.

## Running an import

```bash
yarn ingest catalog                       # funds + issuers
yarn ingest daily --days 3                # recent days (default job)
yarn ingest range --from 2026-01-01 --to 2026-03-31
yarn ingest indices --days 60             # index quotes
yarn ingest positions --period 2026-09-01 # holdings + recomputed movers
yarn ingest backfill --days 400           # first-run: everything
yarn ingest status                        # last 10 runs
```

`MARKET_DATA_PROVIDER` selects the source (`fixture` by default, `tefas` in
production). `yarn db:seed` runs the same jobs with the fixture provider, so
local development exercises the production code path.

## Scheduling

`vercel.json` registers two crons; any scheduler works, the routes only need
the shared secret.

| Route | Schedule | Purpose |
|---|---|---|
| `GET/POST /api/cron/sync-daily` | `0 19 * * 1-5` (22:00 TRT) | re-reads the last 3 days |
| `GET/POST /api/cron/sync-indices` | `30 13 * * 1-5` (16:30 TRT) | after TCMB's bulletin |
| `GET/POST /api/cron/sync-catalog` | `0 5 * * 1` | new, renamed and retired funds |
| `GET/POST /api/cron/sync-positions` | `0 6 3 * *` | monthly portfolio disclosures |

Auth is `Authorization: Bearer $CRON_SECRET` or `x-cron-secret`, compared in
constant time. Vercel Cron sends the Bearer form automatically.

Re-reading a few days each run is deliberate: writes are upserts keyed on
`(fund_code, date)`, so a late or corrected publish is repaired instead of
duplicated, and a missed run heals itself.

## Health

`GET /api/health` returns 503 — not just 200 with bad news — when the database
is unreachable, the last `daily-stats` run failed, or the newest price is more
than 4 days old. Point an uptime check at it; a silently broken feed looks
exactly like a healthy server otherwise.

## Public read API

| Route | Notes |
|---|---|
| `GET /api/funds` | `q`, `category`, `minRisk`, `maxRisk`, `minReturn`, `sort`, `dir`, `limit`≤100, `offset` |
| `GET /api/funds/:code` | `?include=prices,monthly,detail`; accepts a code or a full slug |
| `GET /api/funds/search?q=` | typeahead for the header search |
| `GET /api/leaders?type=` | `returns`, `gainers`, `losers`, `investors`, `new` |

Query strings are validated with Zod; responses carry
`s-maxage=60, stale-while-revalidate=300`.

## Resilience

- Bounded timeouts, retries with exponential backoff **and full jitter**, retrying
  only transport errors, 429 and 5xx.
- A process-wide concurrency limiter (`TEFAS_CONCURRENCY`, default 3) so a
  400-day backfill cannot hammer the source.
- Long ranges are split into 90-day windows.
- Rows for unknown fund codes are skipped and counted, never fatal.
- Funds the source stops listing are marked `is_active = false`, keeping history.

## Before the first live run

Two adapters need one live run each to confirm their field mapping. Both log a
raw sample row and both isolate the mapping in a single `MAPPING` constant.

```bash
# TEFAS — fund catalogue and daily stats
MARKET_DATA_PROVIDER=tefas INGEST_LOG_SAMPLES=true yarn ingest catalog

# KAP — portfolio disclosures
HOLDINGS_PROVIDER=kap INGEST_LOG_SAMPLES=true yarn ingest positions
```

### Why they are unverified

Both sites were rebuilt on Next.js in 2026 and their data now sits behind
endpoints that are not discoverable from outside the browser:

- **TEFAS** — the old `www.tefas.gov.tr/api/DB/*` endpoints answer
  `Method not found or disabled!`. The service paths in
  `src/lib/market/tefas.ts` come from the live site bundle, but the host
  `tefasws.takasbank.com.tr` does not resolve from every network.
- **KAP** — `www.kap.org.tr` serves the app fine, but no public JSON route
  responded to the documented disclosure-query paths.

Correct `MAPPING` / `ENDPOINTS` in `src/lib/market/tefas.ts` and
`src/lib/market/kap.ts` once you have a sample; nothing else needs to change.
