import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { useDashboard } from '../../app/useDashboard';
import { STATUS_LABEL, formatGrowth, formatShare, formatVolume } from '../../domain/format';
import { useProductView } from '../useProductView';
import type { CountryFeatureProps } from './geo';

interface Props {
  hover: { props: CountryFeatureProps; x: number; y: number };
  clickable: boolean;
  /** Render to the left of the cursor near the right edge. */
  flip: boolean;
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <Group justify="space-between" gap="lg" wrap="nowrap">
    <Text size="xs" c="dimmed">
      {label}
    </Text>
    <Text size="xs" fw={500} className="tabular">
      {value}
    </Text>
  </Group>
);

export function MapTooltip({ hover, clickable, flip }: Props) {
  const { selection, countries, availability, products } = useDashboard();
  const { matrix, product, year } = useProductView();
  const { props } = hover;
  const country = props.iso3 ? countries.get(props.iso3) : undefined;
  const name = country?.name ?? props.name;

  let body: ReactNode;
  if (!props.iso3) {
    body = (
      <Text size="xs" c="dimmed">
        {product ? 'No data · counted in Rest of World' : 'Not covered by the dataset'}
      </Text>
    );
  } else if (matrix && product && year) {
    const row = year.ranking.find((r) => r.iso3 === props.iso3);
    if (!row || !availability.has(props.iso3, matrix.productId)) {
      body = (
        <Text size="xs" c="dimmed">
          No {product.name} production recorded 2010–2026
        </Text>
      );
    } else if (row.value === null) {
      body = (
        <Text size="xs" c="dimmed">
          Not reported for {year.year}
        </Text>
      );
    } else if (row.value === 0) {
      const values = matrix.rows.find((r) => r.iso3 === props.iso3)?.values ?? [];
      const firstIdx = values.findIndex((v) => (v ?? 0) > 0);
      body = (
        <Text size="xs" c="dimmed">
          No production in {year.year}
          {firstIdx >= 0 ? ` · producing from ${matrix.years[firstIdx]}` : ''}
        </Text>
      );
    } else {
      const producers = year.ranking.filter((r) => r.rank !== null).length;
      body = (
        <Stack gap={2}>
          <Row label="Production" value={formatVolume(row.value, product.unit)} />
          <Row label="World share" value={formatShare(row.share)} />
          <Row label="World rank" value={`#${row.rank} of ${producers}`} />
          <Row label={`Change vs ${year.year - 1}`} value={formatGrowth(row.yoy)} />
        </Stack>
      );
    }
  } else {
    const n = [...products.keys()].filter((p) => availability.has(props.iso3!, p)).length;
    body = (
      <Text size="xs" c="dimmed">
        Produces {n} of {products.size} tracked products
      </Text>
    );
  }

  const hint = clickable
    ? props.iso3 === selection.country
      ? 'Click to deselect'
      : 'Click to select'
    : null;

  return (
    <Paper
      withBorder
      shadow="md"
      p={8}
      pos="absolute"
      left={flip ? hover.x - 244 : hover.x + 14}
      top={hover.y + 14}
      w={230}
      style={{ pointerEvents: 'none', zIndex: 5 }}
    >
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Text size="sm" fw={600} truncate>
          {name}
        </Text>
        {year && matrix && (
          <Badge size="xs" variant={year.status === 'actual' ? 'light' : 'outline'} color={year.status === 'actual' ? 'gray' : 'orange'}>
            {year.year} · {STATUS_LABEL[year.status]}
          </Badge>
        )}
      </Group>
      {body}
      {hint && (
        <Text size="10px" c="dimmed" mt={6}>
          {hint}
        </Text>
      )}
    </Paper>
  );
}
