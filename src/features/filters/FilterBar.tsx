import { Alert, Button, Group, Select, Text, type ComboboxItem, type ComboboxParsedItem, type OptionsFilter } from '@mantine/core';
import { useMemo } from 'react';
import type { Iso3, ProductId, SupplyChainStage } from '../../api/types';
import { useDashboard } from '../../app/useDashboard';
import { formatShare, formatVolume } from '../../domain/format';
import { useCountryOptions, useProductOptions } from '../../queries/hooks';
import { PeriodControls } from './PeriodControls';
import classes from './FilterBar.module.css';

const STAGE_LABEL: Record<SupplyChainStage, string> = {
  upstream: 'Upstream · mining',
  midstream: 'Midstream · refining & materials',
  downstream: 'Downstream · cells',
};

/** Search by label or alias (DRC → DR Congo, Li → Lithium). */
const aliasFilter =
  (aliases: Map<string, string[]>): OptionsFilter =>
  ({ options, search }) => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    const match = (o: ComboboxItem) =>
      o.label.toLowerCase().includes(q) || (aliases.get(o.value) ?? []).some((a) => a.toLowerCase().includes(q));
    return options.flatMap<ComboboxParsedItem>((o) => {
      if ('group' in o) {
        const items = o.items.filter(match);
        return items.length ? [{ ...o, items }] : [];
      }
      return match(o) ? [o] : [];
    });
  };

export function FilterBar() {
  const { selection, actions, countries, products, meta } = useDashboard();
  const latest = meta.latestActualYear;
  const { primary } = selection;

  // R2: the primary list is never filtered; the dependent list is filtered by the primary.
  const productFilter = primary === 'country' ? selection.country : null;
  const countryFilter = primary === 'product' ? selection.product : null;
  const productOptions = useProductOptions(productFilter);
  const countryOptions = useCountryOptions(countryFilter);

  const productData = useMemo(() => {
    const opts = productOptions.data ?? [];
    return (['upstream', 'midstream', 'downstream'] as const)
      .map((stage) => ({
        group: STAGE_LABEL[stage],
        items: opts
          .filter((o) => o.product.stage === stage)
          .map((o) => ({ value: o.product.id, label: o.product.name, share: o.latestShare })),
      }))
      .filter((g) => g.items.length > 0);
  }, [productOptions.data]);

  const countryData = useMemo(
    () =>
      (countryOptions.data ?? []).map((o) => ({
        value: o.country.iso3,
        label: o.country.name,
        volume: o.latestValue,
      })),
    [countryOptions.data],
  );

  const productAliases = useMemo(
    () => new Map([...products.values()].map((p) => [p.id as string, p.aliases])),
    [products],
  );
  const countryAliases = useMemo(
    () => new Map([...countries.values()].map((c) => [c.iso3, [c.iso3, ...c.aliases]])),
    [countries],
  );

  const productHint = productFilter
    ? `Produced in ${countries.get(productFilter)?.name} · ${productData.reduce((n, g) => n + g.items.length, 0)} of ${products.size}, ranked by ${latest} world share`
    : 'All products';
  const countryHint = countryFilter
    ? `Producers of ${products.get(countryFilter)?.name} · ${countryData.length} of ${countries.size}, ranked by ${latest} volume`
    : 'All countries';

  const { notice } = selection;
  const productUnit = countryFilter ? products.get(countryFilter)?.unit ?? '' : '';

  return (
    <div className={classes.bar}>
      <Group align="flex-end" gap="md" wrap="wrap">
        <Select
          w={260}
          label={primary === 'product' ? 'Product · selected first' : 'Product'}
          description={productHint}
          placeholder="Choose a product"
          searchable
          clearable
          nothingFoundMessage="No matching product"
          data={productData}
          value={selection.product}
          onChange={(v) => actions.setProduct(v as ProductId | null)}
          filter={aliasFilter(productAliases)}
          maxDropdownHeight={360}
          renderOption={({ option }) => {
            const share = productData.flatMap((g) => g.items).find((i) => i.value === option.value)?.share;
            return (
              <Group justify="space-between" w="100%" wrap="nowrap">
                <span>{option.label}</span>
                {share != null && (
                  <Text size="xs" c="dimmed" className="tabular">
                    {formatShare(share)} of world
                  </Text>
                )}
              </Group>
            );
          }}
        />
        <Select
          w={260}
          label={primary === 'country' ? 'Country · selected first' : 'Country'}
          description={countryHint}
          placeholder="Choose a country (or click the map)"
          searchable
          clearable
          nothingFoundMessage="No matching country"
          data={countryData}
          value={selection.country}
          onChange={(v) => actions.setCountry(v as Iso3 | null)}
          filter={aliasFilter(countryAliases)}
          maxDropdownHeight={360}
          renderOption={({ option }) => {
            const volume = countryData.find((i) => i.value === option.value)?.volume;
            return (
              <Group justify="space-between" w="100%" wrap="nowrap">
                <span>{option.label}</span>
                {volume != null && (
                  <Text size="xs" c="dimmed" className="tabular">
                    {formatVolume(volume, productUnit)}
                  </Text>
                )}
              </Group>
            );
          }}
        />
        <PeriodControls />
        <Button variant="subtle" color="gray" onClick={actions.reset}>
          Reset
        </Button>
      </Group>
      {notice && (
        <Alert color="blue" variant="light" py={6} mt="xs">
          <Text size="sm">
            {countries.get(notice.country)?.name} does not produce {products.get(notice.product)?.name} (2010–2026).{' '}
            {notice.cleared === 'country' ? 'Country' : 'Product'} selection was cleared.
          </Text>
        </Alert>
      )}
    </div>
  );
}
