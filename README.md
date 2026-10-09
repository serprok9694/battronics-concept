# Battronics · Supply Chain Map (concept)

A prototype that shows the production of battery supply-chain products by country on a world map for 2010–2026. You can pick a **country or a product first**, and the other filter then offers only valid combinations.

> **All data is mock data.** Numbers are plausible orders of magnitude, not real statistics.

## What it answers, and for whom

| Persona | Key questions | Where the prototype answers them |
|---|---|---|
| **Analyst** | Who produces X, how much (with units)? How did shares change? Who is a new entrant? Can I export the numbers? | Choropleth + tooltip, ranking table (Δ share, CAGR), stacked supply chart, CSV export |
| **Procurement / strategy** | How concentrated is supply? How dependent are we on one country? Are alternatives growing? What does country Y matter for? | HHI + top-1 / CR3 KPIs, "fastest-growing alternative" insight, country portfolio view |
| **Executive** | One sentence: who dominates and is dependency rising? Is it fact or forecast? | Insight line, actual/estimate/forecast badges, shareable link |

The main metric in this domain is **concentration, not volume**: critical raw materials matter because supply sits in very few countries.

## Run

```bash
nvm use        # Node 24 (see .nvmrc; Vite 8 needs Node ≥ 20.19)
npm install
npm run dev    # http://localhost:5173
```

Other scripts: `npm run build`, `npm run lint` (oxlint), `npm run preview`.

## Demo scenarios

The state lives in the URL, so every view is a link:

| Story | Link |
|---|---|
| Who controls cobalt mining? (DR Congo ≈ 70%) | `/?product=cobalt-mined` |
| Mined vs refined: China refines ≈ 80% | `/?product=cobalt-refined` |
| Indonesia's nickel: ore export ban (2014), then dominance. Press ▶ | `/?product=nickel&year=2012` |
| Indonesia as a country profile | `/?country=IDN` |
| Graphite: persistently highly concentrated | `/?product=graphite` |
| New entrant outside the selected period (empty state E1) | `/?product=lithium&country=ZWE&first=product&to=2015&year=2014` |
| Simulated API failure (error state) | `/?product=graphite&fail=1` |

## Linked filters: rules

- The filter picked first is **primary**. Its list is never filtered. The other filter is **dependent** and lists only compatible values, ranked by the latest actual year (share or volume).
- Compatibility is evaluated over the **whole 2010–2026 horizon**, so lists don't jump while the period slider moves or Play runs.
- Changing the primary keeps a compatible dependent value. An incompatible one is cleared with an explanation, e.g. *"DR Congo does not produce Cobalt (refined). Country selection was cleared."*
- If you clear the primary while the dependent is set, the dependent becomes primary.
- Clicking the map works like the country select. With a product selected, only its producers are clickable. Clicking the selected country again deselects it.
- A compatible pair can have no production inside the chosen period. The selection is then kept, and an empty state offers to extend the period.
- Invalid link parameters (unknown product, year 2031, incompatible pair) are dropped with a notice.

The rules are a pure reducer in [`src/domain/selection.ts`](src/domain/selection.ts).

## Metrics

| Metric | Definition | Notes |
|---|---|---|
| World share | `V(c,y) / World(y)` | Basis of the map colours; the scale has fixed thresholds, identical for every product and year |
| Rank | Position by volume in a year | Rest of World is not ranked |
| YoY | `V(y)/V(y−1) − 1` | Previous year 0 → "New since …", never a fake % |
| CAGR | `(V(to)/V(from))^(1/(to−from)) − 1` | If production starts inside the period, computed from the first year with output and labelled "since YYYY" |
| Δ share | `share(to) − share(from)`, in percentage points | Who gains or loses share |
| HHI | `Σ (share %)²`, 0–10 000 | US DOJ/FTC 2023 thresholds: < 1 000 unconcentrated, 1 000–1 800 moderate, > 1 800 high. Rest of World is excluded, so HHI is a lower bound |
| CR3 | Sum of top-3 shares | Easier to read than HHI for executives |

**Data status:** 2010–2024 actual, 2025 estimate, 2026 forecast. Projections are marked in badges, tooltips, a shaded chart band and the "incl. estimates" hint on growth figures.

## Data model (mock)

- 10 products across the chain (upstream mining → midstream refining & materials → downstream cells), each with its own unit (kt LCE, kt Co, kt Ni, kt REO, GWh…). **Volumes of different products are never summed.** The country profile compares world shares instead.
- 27 countries plus **Rest of World**, the residual to the world total, so country shares are not inflated.
- Values are generated deterministically from keyframes (world total × country share + ±3% seeded noise) in [`src/mocks`](src/mocks). Four products carry deliberate stories: cobalt mined vs refined, Indonesian nickel, lithium (Australia overtakes Chile, Zimbabwe emerges), graphite concentration.
- `0` and "no data" are different things: Myanmar's rare earths for 2021 are *not reported*, not zero.

## Architecture

```
src/
  api/        contract types + fake endpoints (async, 200–500 ms latency, ?fail → 503)
  mocks/      reference data, scenario keyframes, generator
  queries/    TanStack Query: query-key factory and hooks
  domain/     pure logic: selection reducer, metrics, colour scale, formatting, insight text
  features/   filters · map (MapLibre) · details (ECharts, KPIs, tables)
  app/        providers, layout, dashboard context (selection ↔ URL)
```

- **Fake API with a real contract.** Components never see mocks. They call hooks like `useProductMatrix(product)`, and each endpoint mirrors a REST route (`GET /countries?product=`, `GET /products/{id}/matrix`). Switching to a real backend means replacing `src/api`.
- **One payload per product.** `getProductMatrix` returns all countries × all years. The map, ranking, KPIs and the Play animation are derived on the client, so numbers are consistent across widgets and Play makes no requests.
- **Map** has no basemap tiles and no API key: country polygons from Natural Earth 110m (`world-atlas`) with colours pushed via `feature-state`. Countries are matched by numeric ISO code, which avoids Natural Earth's `ISO_A3 = -99` issue for France and Norway.
- **Charts** use a single y-axis each (the pair view has two charts instead of a dual axis). Categorical colours are assigned in a fixed order and the scale is single-hue sequential.

## Deliberately not done (concept scope)

Tests, Docker, CI, OpenAPI client generation and authentication were left out on purpose: the brief asks for a prototype, so the time went into the business logic. Also out of scope: multi-country comparison, trade-flow maps, risk overlays, alerts, saved views, mobile layout, i18n.

## Path to production

- **API:** generate a typed client from the backend's OpenAPI spec (`openapi-typescript` + `openapi-fetch`, or `orval`) behind the same function signatures. Move aggregates (shares, HHI, ranks) to the server so the dashboard and exports share one source of truth. Use pagination and filtering for ranking and list endpoints, and HTTP caching (ETag) for matrices.
- **Auth:** OIDC Authorization Code + PKCE (`oidc-client-ts` / `react-oidc-context`), access token in memory, silent refresh, a single 401/403 handler in the client. Subscription entitlements filter the reference data on the backend.
- **Tests:** unit tests for `src/domain` first (pure functions: selection rules, metrics, edge cases). Then component tests (Testing Library + MSW in place of the fake API), and Playwright e2e for the demo scenarios.
- **Delivery:** multi-stage Dockerfile (node build → nginx static) with runtime config from env. CI runs lint, strict typecheck, tests, build, preview deploys per PR, and a bundle-size budget. The bundle is currently one ~690 kB gzip chunk, so split MapLibre and ECharts into lazy chunks.
- **Map at scale:** vector tiles (PMTiles) instead of GeoJSON, a policy on disputed borders, and an equal-area or globe projection to avoid Mercator's area distortion.
- **Data trust:** dataset version and release date, per-point source lineage, revision history (estimate → actual), methodology notes.

## Open questions for domain experts

1. Units: lithium as LCE or Li content? Manganese as Mn content or ore?
2. Product granularity: is "cobalt" one product with stages, or separate products as modelled here?
3. Methodology and revision policy for estimates and forecasts.
4. Source of world totals, and treatment of unreported producers (Rest of World).
5. Naming and borders policy for disputed territories.
