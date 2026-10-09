import { Button, Group, Table, Text } from '@mantine/core';
import { useState } from 'react';
import type { Product } from '../../api/types';
import { useDashboard } from '../../app/useDashboard';
import { downloadCsv } from '../../domain/csv';
import { formatCagr, formatGrowth, formatPp, formatShare, formatVolume, STATUS_LABEL } from '../../domain/format';
import type { PeriodSummary, YearSummary } from '../../domain/metrics';

const TOP_N = 10;

interface Props {
  product: Product;
  year: YearSummary;
  period: PeriodSummary;
}

/**
 * Exact numbers next to the map: small countries are invisible on a map and
 * Mercator distorts area, so the table is the precise / accessible view (E14).
 */
export function RankingTable({ product, year, period }: Props) {
  const { selection, countries, actions } = useDashboard();
  const [showAll, setShowAll] = useState(false);
  const { from, to } = period; // growth ends at the focus year, like the values
  const producers = year.ranking.filter((r) => r.rank !== null || r.value === null);
  const rows = showAll ? producers : producers.slice(0, TOP_N);
  const name = (iso3: string) => countries.get(iso3)?.name ?? iso3;

  const exportCsv = () =>
    downloadCsv(
      `${product.id}_${year.year}_${from}-${to}.csv`,
      ['rank', 'country', 'iso3', `production_${year.year}`, 'unit', 'world_share', `share_change_${from}_${to}_pp`, `cagr_${from}_${to}`, 'status'],
      [
        ...year.ranking.map((r) => {
          const p = period.countries.get(r.iso3);
          return [
            r.rank,
            name(r.iso3),
            r.iso3,
            r.value,
            product.unit,
            r.share === null ? null : +r.share.toFixed(4),
            p?.shareChange == null ? null : +(p.shareChange * 100).toFixed(2),
            p?.cagr.kind === 'value' ? +p.cagr.rate.toFixed(4) : null,
            year.status,
          ];
        }),
        [null, 'Rest of World', 'ROW', year.rest.value, product.unit, year.rest.share, null, null, year.status],
        [null, 'World', 'WLD', year.world, product.unit, 1, null, null, year.status],
      ],
    );

  return (
    <div>
      <Group justify="space-between" mb={4}>
        <Text size="sm" fw={600}>
          Producer ranking · {year.year}{' '}
          <Text span size="xs" c="dimmed">
            ({STATUS_LABEL[year.status]}; Δ share and CAGR {from}→{to})
          </Text>
        </Text>
        <Button size="compact-xs" variant="default" onClick={exportCsv}>
          Export CSV
        </Button>
      </Group>
      <Table striped={false} highlightOnHover verticalSpacing={4} fz="xs" className="tabular">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={28}>#</Table.Th>
            <Table.Th>Country</Table.Th>
            <Table.Th ta="right">{product.unit}</Table.Th>
            <Table.Th ta="right">Share</Table.Th>
            <Table.Th ta="right">Δ share</Table.Th>
            <Table.Th ta="right">CAGR</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => {
            const p = period.countries.get(r.iso3);
            const selected = r.iso3 === selection.country;
            return (
              <Table.Tr
                key={r.iso3}
                onClick={() => actions.toggleCountry(r.iso3)}
                style={{ cursor: 'pointer', background: selected ? 'rgba(235,104,52,0.10)' : undefined }}
                fw={selected ? 600 : undefined}
              >
                <Table.Td>{r.rank ?? '–'}</Table.Td>
                <Table.Td>{name(r.iso3)}</Table.Td>
                <Table.Td ta="right">{formatVolume(r.value, '').trim()}</Table.Td>
                <Table.Td ta="right">{formatShare(r.share)}</Table.Td>
                <Table.Td ta="right">{formatPp(p?.shareChange)}</Table.Td>
                <Table.Td ta="right">{p ? formatCagr(p.cagr, from) : 'n/a'}</Table.Td>
              </Table.Tr>
            );
          })}
          <Table.Tr c="dimmed">
            <Table.Td />
            <Table.Td>Rest of World</Table.Td>
            <Table.Td ta="right">{formatVolume(year.rest.value, '').trim()}</Table.Td>
            <Table.Td ta="right">{formatShare(year.rest.share)}</Table.Td>
            <Table.Td />
            <Table.Td />
          </Table.Tr>
          <Table.Tr fw={600}>
            <Table.Td />
            <Table.Td>World</Table.Td>
            <Table.Td ta="right">{formatVolume(year.world, '').trim()}</Table.Td>
            <Table.Td ta="right">100%</Table.Td>
            <Table.Td />
            <Table.Td ta="right">{formatGrowth(period.worldCagr)}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      {producers.length > TOP_N && (
        <Button size="compact-xs" variant="subtle" mt={4} onClick={() => setShowAll((v) => !v)}>
          {showAll ? `Show top ${TOP_N}` : `Show all ${producers.length} producers`}
        </Button>
      )}
      <Text size="10px" c="dimmed" mt={4}>
        Rest of World = residual to the world total; it is not ranked and is excluded from HHI (so HHI is a lower bound).
        {period.includesEstimates && ' The focus year is an estimate/forecast.'}
      </Text>
    </div>
  );
}
