import { Alert, Badge, Button, Center, Group, Loader, Paper, Stack, Table, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import type { Iso3, ProductId } from '../../api/types';
import { useDashboard } from '../../app/useDashboard';
import { formatCagr, formatGrowth, formatHhi, formatPp, formatShare, formatVolume, STATUS_LABEL } from '../../domain/format';
import { BATTERY_CHAIN, chainFor } from '../../domain/chain';
import { pairInsight, productInsight } from '../../domain/insight';
import { cagr, HHI_LABEL, share, yoy } from '../../domain/metrics';
import { useCountryProfile } from '../../queries/hooks';
import { useProductView } from '../useProductView';
import { PortfolioShareChart, ShareChart, SupplyStackChart, VolumeChart } from './charts/charts';
import { ChainView } from './ChainView';
import { KpiGrid } from './Kpi';
import { RankingTable } from './RankingTable';

export function DetailsPanel() {
  const { selection } = useDashboard();
  if (selection.product) return <ProductDetails />;
  if (selection.country) return <CountryDetails iso3={selection.country} />;
  return <EmptyState />;
}

// ---- Empty state: no dead screen, each chip starts a demo story ----------

const QUICK_START: Array<{ label: string; question: string; product?: ProductId; country?: Iso3 }> = [
  { label: 'Who controls cobalt mining?', question: 'Supply risk', product: 'cobalt-mined' },
  { label: 'Cobalt: mined vs refined', question: 'Where value is added', product: 'cobalt-refined' },
  { label: "Indonesia's nickel surge", question: 'New supply', product: 'nickel', country: 'IDN' },
  { label: 'Graphite concentration', question: 'Dependency', product: 'graphite' },
  { label: 'China profile', question: 'Country importance', country: 'CHN' },
];

function EmptyState() {
  const { actions } = useDashboard();
  return (
    <Stack gap="md">
      <div>
        <Title order={5}>Where is the battery supply chain produced?</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Pick a <b>product</b> to see who supplies the world and how concentrated the market is, or a <b>country</b>{' '}
          (also by clicking the map) to see which products it matters for. The other filter then only offers valid
          combinations.
        </Text>
      </div>
      <Stack gap={6}>
        <Text size="xs" fw={600} c="dimmed" tt="uppercase">
          Quick start
        </Text>
        {QUICK_START.map((q) => (
          <Button
            key={q.label}
            variant="light"
            justify="space-between"
            rightSection={<Text size="xs" c="dimmed">{q.question}</Text>}
            onClick={() => {
              if (q.product) actions.setProduct(q.product);
              if (q.country) actions.setCountry(q.country);
            }}
          >
            {q.label}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

// ---- Product (optionally + country) -------------------------------------

function ProductDetails() {
  const { selection, countries, meta } = useDashboard();
  const { matrix, product, year, period, isLoading, error, refetch } = useProductView();
  const name = (iso3: string) => countries.get(iso3)?.name ?? iso3;

  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (isLoading || !matrix || !product || !year || !period) return <LoadingState />;

  const [from, to] = selection.range;
  const iso3 = selection.country;
  const estimateNote = period.includesEstimates ? 'incl. estimates' : undefined;
  const countryRow = iso3 ? matrix.rows.find((r) => r.iso3 === iso3) : undefined;

  return (
    <Stack gap="md">
      <Header
        title={iso3 && countryRow ? `${name(iso3)} · ${product.name}` : product.name}
        subtitle={`${product.description} · unit: ${product.unit}`}
        year={year.year}
        status={year.status}
      />

      <ProductChain productId={product.id} country={iso3 && countryRow ? iso3 : null} />

      {iso3 && countryRow ? (
        <PairSection iso3={iso3} />
      ) : (
        <>
          <Insight text={productInsight(product, year, period, selection.range, name)} />
          <KpiGrid
            items={[
              { label: `World production ${year.year}`, value: formatVolume(year.world, product.unit) },
              { label: `Change vs ${year.year - 1}`, value: formatGrowth(yoy(matrix.world, matrix.years, year.year)) },
              { label: `World CAGR ${from}–${to}`, value: formatGrowth(period.worldCagr), hint: estimateNote },
              {
                label: 'Concentration (HHI)',
                value: formatHhi(year.hhi.value),
                hint: `${HHI_LABEL[year.hhi.category]} · ${period.hhiChange >= 0 ? '+' : '−'}${formatHhi(Math.abs(period.hhiChange))} since ${from}`,
              },
              {
                label: 'Top-1 producer',
                value: year.top1 ? formatShare(year.top1.share) : 'n/a',
                hint: year.top1 ? name(year.top1.iso3) : undefined,
              },
              { label: 'Top-3 share (CR3)', value: formatShare(year.cr3) },
            ]}
          />
          <ChartBlock title={`Supply by country, ${from}–${to} (${product.unit})`}>
            <SupplyStackChart
              matrix={matrix}
              product={product}
              range={selection.range}
              latestActualYear={meta.latestActualYear}
              name={name}
            />
          </ChartBlock>
        </>
      )}

      <RankingTable product={product} year={year} period={period} />
      <HhiNote />
    </Stack>
  );
}

function PairSection({ iso3 }: { iso3: Iso3 }) {
  const { selection, countries, meta } = useDashboard();
  const { matrix, product, year, period } = useProductView();
  if (!matrix || !product || !year || !period) return null;
  const row = matrix.rows.find((r) => r.iso3 === iso3)!;
  const ranked = year.ranking.find((r) => r.iso3 === iso3);
  const countryName = countries.get(iso3)?.name ?? iso3;
  const [from, to] = selection.range;
  const a = matrix.years.indexOf(from);
  const b = matrix.years.indexOf(to);
  const inPeriod = row.values.slice(a, b + 1).some((v) => (v ?? 0) > 0);

  // E1: compatible pair, but nothing produced inside the selected period.
  if (!inPeriod) {
    const firstIdx = row.values.findIndex((v) => (v ?? 0) > 0);
    const first = matrix.years[firstIdx];
    return (
      <Alert color="gray" variant="light" title={`No ${product.name} production in ${countryName}, ${from}–${to}`}>
        <Group gap="sm">
          <Text size="sm">First recorded production: {first}.</Text>
          {first !== undefined && (
            <PeriodButton from={Math.min(from, first)} to={Math.max(to, first)} />
          )}
        </Group>
      </Alert>
    );
  }

  const stats = period.countries.get(iso3);
  return (
    <Stack gap="md">
      <Insight text={pairInsight(product, countryName, year, period, iso3, selection.range)} />
      <KpiGrid
        items={[
          { label: `Production ${year.year}`, value: formatVolume(ranked?.value, product.unit) },
          { label: 'World share', value: formatShare(ranked?.share), hint: `of ${formatVolume(year.world, product.unit)}` },
          { label: 'World rank', value: ranked?.rank ? `#${ranked.rank}` : 'n/a' },
          { label: `Change vs ${year.year - 1}`, value: formatGrowth(yoy(row.values, matrix.years, year.year)) },
          {
            label: `CAGR ${from}–${to}`,
            value: formatGrowth(cagr(row.values, matrix.years, from, to)),
            hint: stats?.cagr.kind === 'value' && stats.cagr.sinceYear !== from ? `from first output in ${stats.cagr.sinceYear}` : period.includesEstimates ? 'incl. estimates' : undefined,
          },
          { label: `Share change ${from}–${to}`, value: formatPp(stats?.shareChange) },
        ]}
      />
      <ChartBlock title={`Production, ${product.unit}`}>
        <VolumeChart
          values={row.values}
          years={matrix.years}
          unit={product.unit}
          range={selection.range}
          latestActualYear={meta.latestActualYear}
          focusYear={selection.focusYear}
        />
      </ChartBlock>
      <ChartBlock title="Share of world production">
        <ShareChart
          values={row.values}
          world={matrix.world}
          years={matrix.years}
          range={selection.range}
          latestActualYear={meta.latestActualYear}
        />
      </ChartBlock>
    </Stack>
  );
}

// ---- Country only: portfolio --------------------------------------------

function CountryDetails({ iso3 }: { iso3: Iso3 }) {
  const { selection, countries, products, actions } = useDashboard();
  const profile = useCountryProfile(iso3);
  const country = countries.get(iso3);
  if (profile.error) return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} />;
  if (!profile.data || !country) return <LoadingState />;

  const p = profile.data;
  const year = selection.focusYear;
  const [from, to] = selection.range;
  const i = p.years.indexOf(year);
  const items = p.products
    .map((x) => {
      const prod = products.get(x.productId)!;
      const s = share(x.values[i], x.world[i]);
      return { x, prod, s, cagr: cagr(x.values, p.years, from, to) };
    })
    .sort((a, b) => (b.s ?? 0) - (a.s ?? 0));
  const top = items[0];
  const critical = items.filter((it) => (it.s ?? 0) >= 0.25);

  return (
    <Stack gap="md">
      <Header title={country.name} subtitle={`${country.region} · supply-chain profile`} year={year} status={p.status[i] ?? 'actual'} />
      <Insight
        text={
          top && top.s
            ? `${country.name} produces ${items.length} of ${products.size} tracked products. Its largest role is in ${top.prod.name} (${formatShare(top.s)} of world supply in ${year})${critical.length > 1 ? `; it holds ≥25% of world supply in ${critical.length} products` : ''}.`
            : `${country.name} has no recorded production in ${year}.`
        }
      />
      <KpiGrid
        items={[
          { label: 'Products produced', value: `${items.length} of ${products.size}` },
          { label: 'Largest world share', value: formatShare(top?.s), hint: top?.prod.name },
          { label: 'Products with ≥25% share', value: String(critical.length), hint: 'potential chokepoints' },
        ]}
      />
      <ChainView products={BATTERY_CHAIN} country={iso3} mode="country" />
      <ChartBlock title={`Share of world production by product, ${year}`}>
        <PortfolioShareChart profile={p} products={products} focusYear={year} />
      </ChartBlock>
      <div>
        <Text size="sm" fw={600} mb={4}>
          Portfolio · {year}
        </Text>
        <Table highlightOnHover verticalSpacing={4} fz="xs" className="tabular">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Product</Table.Th>
              <Table.Th>Stage</Table.Th>
              <Table.Th ta="right">Production</Table.Th>
              <Table.Th ta="right">Share</Table.Th>
              <Table.Th ta="right">CAGR {from}–{to}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map(({ x, prod, s, cagr: g }) => (
              <Table.Tr key={x.productId} style={{ cursor: 'pointer' }} onClick={() => actions.setProduct(x.productId)}>
                <Table.Td>{prod.name}</Table.Td>
                <Table.Td c="dimmed">{prod.stage}</Table.Td>
                <Table.Td ta="right">{formatVolume(x.values[i], prod.unit)}</Table.Td>
                <Table.Td ta="right">{formatShare(s)}</Table.Td>
                <Table.Td ta="right">{formatCagr(g, from)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="10px" c="dimmed" mt={4}>
          Volumes of different products are not summed: units differ (kt LCE, kt Co, GWh…). Click a row to open the product.
        </Text>
      </div>
    </Stack>
  );
}

function ProductChain({ productId, country }: { productId: ProductId; country: Iso3 | null }) {
  const chain = chainFor(productId);
  if (!chain)
    return (
      <Text size="xs" c="dimmed">
        Not part of the Li-ion battery value chain (rare earths go mainly into EV motor magnets).
      </Text>
    );
  return <ChainView products={chain} current={productId} country={country} mode="product" />;
}

// ---- Small building blocks ----------------------------------------------

function Header(props: { title: string; subtitle: string; year: number; status: 'actual' | 'estimate' | 'forecast' }) {
  return (
    <div>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Title order={5}>{props.title}</Title>
        <Badge variant={props.status === 'actual' ? 'light' : 'outline'} color={props.status === 'actual' ? 'gray' : 'orange'}>
          {props.year} · {STATUS_LABEL[props.status]}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        {props.subtitle}
      </Text>
    </div>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <Paper bg="#f2f6fc" p="sm" radius="sm" style={{ borderLeft: '3px solid #2a78d6' }}>
      <Text size="sm">{text}</Text>
    </Paper>
  );
}

function ChartBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <Text size="sm" fw={600} mb={2}>
        {title}
      </Text>
      {children}
    </div>
  );
}

function PeriodButton({ from, to }: { from: number; to: number }) {
  const { actions } = useDashboard();
  return (
    <Button size="compact-xs" variant="light" onClick={() => actions.setRange([from, to])}>
      Extend period to {from}–{to}
    </Button>
  );
}

function HhiNote() {
  return (
    <Text size="10px" c="dimmed">
      HHI = Σ(share %)², 0–10 000. Thresholds (US DOJ/FTC 2023): &lt;1 000 unconcentrated, 1 000–1 800 moderate, &gt;1 800
      highly concentrated.
    </Text>
  );
}

function LoadingState() {
  return (
    <Center h={200}>
      <Loader size="sm" />
    </Center>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Alert color="red" title="Could not load data">
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{message}</Text>
        <Button size="compact-xs" variant="light" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    </Alert>
  );
}
