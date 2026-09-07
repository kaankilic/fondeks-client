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
KAP filing ──► kap_portfolio_reports  (the filing, and where its PDF lives)
                        │  Haiku reads section III
                        ▼
               fund_holding_snapshots (what a fund held, per period)
                        │  diff consecutive periods
                        ▼
                 fund_positions (top movers, both directions)
```

Keeping raw snapshots means the movers can be recomputed for any pair of
periods, and a corrected filing repairs the derived table on the next run. The
offline provider generates two consecutive periods, so the diff reproduces the
design's AFT movers exactly (ASELS +1,8 / KCHOL -1,4 puan) — computed, not typed.

#### The report archive

`kap_portfolio_reports` records where every tracked fund's Portföy Dağılım
Raporu lives — `document_obj_id` is KAP's attachment id and `document_url` the
address it resolves to. The PDF is not copied: KAP hosts it, so the reference is
the archive.

That reference is what makes the reports re-readable. Getting to a filing costs
a day-by-day walk of the disclosure listing plus one attachment lookup, neither
repeatable for free; once the document is recorded, reading the report again is
a single download. So a change to the extraction — a sharper prompt, a schema
that asks for the bond or deposit rows section III also carries, a fix to a
house whose template trips the weight check — can be run back over months of
filings instead of prompting another crawl:

```bash
yarn ingest documents --period 2026-09-01          # locate, don't read
yarn ingest reextract --period 2026-09-01 --codes AFT,BHE
yarn ingest collect                                # apply, rebuild movers
```

`documents` runs inside `positions` too, ahead of submission, so a period's
reports are all locatable even when extraction only gets through the first
`KAP_SUBMIT_LIMIT` of them. `reextract` re-submits reports that were already
extracted; reports still queued against a running batch are left alone, so the
same extraction is never billed twice.

## Running an import

```bash
yarn ingest catalog                       # funds + issuers
yarn ingest daily --days 3                # recent days (default job)
yarn ingest range --from 2026-01-01 --to 2026-03-31
yarn ingest indices --days 60             # index quotes
yarn ingest positions --period 2026-09-01 # discover + submit extractions
yarn ingest collect                       # apply finished batches, rebuild movers
yarn ingest documents --period 2026-09-01 # record where each report PDF lives
yarn ingest reextract --period 2026-09-01 # read recorded reports again
yarn ingest reports --period 2026-09-01   # per-status count for a period
yarn ingest backfill --days 400           # first-run: everything
yarn ingest status                        # last 10 runs
```

`MARKET_DATA_PROVIDER` selects the source (`fixture` by default, `tefas` in
production). `yarn db:seed` runs the same jobs with the fixture provider, so
local development exercises the production code path.

## Scheduling

Scheduling lives on an external cron server, not on Vercel — `vercel.json`
registers no crons. The routes take `GET` or `POST` and only need the shared
secret, so any scheduler can drive them.

| Route | Schedule (UTC) | Purpose |
|---|---|---|
| `sync-daily` | `0 19 * * 1-5` (22:00 TRT) | re-reads the last 3 days |
| `sync-indices` | `30 13 * * 1-5` (16:30 TRT) | after TCMB's bulletin |
| `sync-catalog` | `0 5 * * 1` | new, renamed and retired funds |
| `sync-positions` | `0 6 3-20 * *` | discovers filings, submits extractions |
| `collect-positions` | `0 */6 * * *` | applies finished batches, rebuilds movers |
| `sync-inceptions` | `30 5 * * 1` | fills fund launch dates from KAP |
| `submit-urls` | `0 20 * * *` | announces the sitemap's URLs to IndexNow and Google |

Auth is `Authorization: Bearer $CRON_SECRET` or `x-cron-secret`, compared in
constant time. Vercel Cron sends the Bearer form automatically.

Re-reading a few days each run is deliberate: writes are upserts keyed on
`(fund_code, date)`, so a late or corrected publish is repaired instead of
duplicated, and a missed run heals itself.

### Driving it from an external cron server

The routes are ordinary HTTP endpoints, so a crontab of `curl` calls is the
whole integration:

```cron
CRON_TZ=UTC
MAILTO=ops@fondeks.com
SECRET=…
URL=https://fondeks.com/api/cron

0 19 * * 1-5   curl -fsS --max-time 330 -X POST -H "Authorization: Bearer $SECRET" $URL/sync-daily
30 13 * * 1-5  curl -fsS --max-time 330 -X POST -H "Authorization: Bearer $SECRET" $URL/sync-indices
0 5 * * 1      curl -fsS --max-time 330 -X POST -H "Authorization: Bearer $SECRET" $URL/sync-catalog
0 6 3-20 * *   curl -fsS --max-time 330 -X POST -H "Authorization: Bearer $SECRET" $URL/sync-positions
0 */6 * * *    curl -fsS --max-time 330 -X POST -H "Authorization: Bearer $SECRET" $URL/collect-positions
30 5 * * 1     curl -fsS --max-time 330 -X POST -H "Authorization: Bearer $SECRET" $URL/sync-inceptions
0 20 * * *     curl -fsS --max-time 330 -X POST -H "Authorization: Bearer $SECRET" $URL/submit-urls
```

Three flags earn their place. `-f` makes curl exit non-zero on a 502, so cron's
`MAILTO` sees a failed job instead of silently succeeding. `--max-time 330`
covers the routes' `maxDuration = 300` — curl's default is no timeout at all, so
a hung request would otherwise pile runs up. `-sS` keeps the progress meter out
of the mail but keeps errors in.

Schedules are UTC. Set `CRON_TZ=UTC` (or convert) on a server running Istanbul
local time, or the market-hours jobs fire three hours early — `sync-daily` would
run before TEFAS publishes.

Optional query parameters: `sync-daily` takes `?days=` or `?from=&to=`,
`sync-indices` takes `?days=`, and `sync-positions` takes `?period=yyyy-mm-01`.

Note that cron expands `$SECRET` into the command line, where `ps` exposes it to
every user on that box. On a shared host, read it from a mode-0600 file at call
time instead — `curl` will take the header on stdin with `--config -`.

### One runner at a time

`sync-positions` and `collect-positions` take a Postgres advisory lock
(`src/lib/ingest/lock.ts`) for the duration of a run. Two overlapping runs of
`sync-positions` would otherwise read the same `discovered` reports and submit
both copies to the Batch API — which is billed per request, so a duplicate is
real money, not just a wasted round trip.

The loser does nothing and reports `{"ok": true, "skipped": true}` with HTTP
200. A skipped run is a normal outcome, not a failure: something else is already
doing the work, and an external scheduler should not alert on it.

The lock is held on one dedicated connection for the whole job. Taking it
through the pool would be a bug — `pg_advisory_lock` is session-scoped, so the
unlock could land on a different pooled connection than the lock did.

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
- Each sync covers three TEFAS universes — `YAT` (2.099 menkul kıymet fonu),
  `EMK` (400 emeklilik yatırım fonu) and `BYF` (37 borsa yatırım fonu) — which
  is one request per universe per window. `TEFAS_FUND_TYPES` narrows that to a
  subset when the rate limit matters. Every fund is stamped with its universe;
  the product's screens read `PRODUCT_FUND_TYPE`, so pension funds and ETFs
  stay current in the database without appearing in the fund lists until a
  section for them exists.
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
