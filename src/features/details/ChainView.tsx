import { Paper, SimpleGrid, Skeleton, Stack, Text, UnstyledButton } from '@mantine/core';
import { useMemo } from 'react';
import type { Iso3, ProductId } from '../../api/types';
import { useDashboard } from '../../app/useDashboard';
import { CHAIN_STEPS, STEP_OF } from '../../domain/chain';
import { formatHhi, formatShare } from '../../domain/format';
import { HHI_LABEL, summarizeYear, type YearSummary } from '../../domain/metrics';
import { useProductMatrices } from '../../queries/hooks';

interface Props {
  /** Products to show, already in chain order. */
  products: ProductId[];
  /** Product currently open in the dashboard (highlighted). */
  current?: ProductId;
  /** When set, every card also shows this country's position. */
  country?: Iso3 | null;
  /** 'product': who leads each step. 'country': where the country sits in the chain. */
  mode: 'product' | 'country';
}

/**
 * The battery value chain for the current view: mining → refining → materials → cells.
 * Each card answers "who controls this step" (and "where is my country"), so the
 * concentration shift along the chain — e.g. DR Congo mines cobalt, China refines it — is visible at once.
 */
export function ChainView({ products, current, country, mode }: Props) {
  const { selection, countries, products: productMap, availability, actions } = useDashboard();
  const { matrices, isPending, error } = useProductMatrices(products);
  const year = selection.focusYear;

  const summaries = useMemo(() => {
    const out = new Map<ProductId, YearSummary>();
    for (const m of matrices) if (m) out.set(m.productId, summarizeYear(m, year));
    return out;
  }, [matrices, year]);

  if (error) return null; // the main panel already reports data errors
  const name = (iso3: string) => countries.get(iso3)?.name ?? iso3;
  const steps = CHAIN_STEPS.filter((s) => products.some((p) => STEP_OF[p] === s.id));

  // Executive takeaway: the most concentrated step (product mode) or the country's footprint (country mode).
  let takeaway: string | null = null;
  if (!isPending && mode === 'product') {
    const worst = products
      .map((p) => ({ p, s: summaries.get(p) }))
      .filter((x) => x.s?.top1)
      .sort((a, b) => b.s!.hhi.value - a.s!.hhi.value)[0];
    if (worst?.s?.top1)
      takeaway = `Most concentrated step in ${year}: ${productMap.get(worst.p)?.name} — ${name(worst.s.top1.iso3)} ${formatShare(worst.s.top1.share)} (HHI ${formatHhi(worst.s.hhi.value)}).`;
  }
  if (!isPending && mode === 'country' && country) {
    const present = steps.filter((s) =>
      products.some((p) => STEP_OF[p] === s.id && (summaries.get(p)?.ranking.find((r) => r.iso3 === country)?.value ?? 0) > 0),
    );
    takeaway =
      present.length === 0
        ? `${name(country)} has no battery-chain production in ${year}.`
        : present.length === steps.length
          ? `${name(country)} is present at every step of the battery chain in ${year}.`
          : `${name(country)} is present only in ${present.map((s) => s.label.toLowerCase()).join(', ')} in ${year}.`;
  }

  return (
    <div>
      <Text size="sm" fw={600} mb={2}>
        {mode === 'country' ? 'Position in the battery value chain' : 'Battery value chain'} · {year}
      </Text>
      {takeaway && (
        <Text size="xs" c="dimmed" mb={6}>
          {takeaway}
        </Text>
      )}
      <SimpleGrid cols={steps.length} spacing={6}>
        {steps.map((step, i) => (
          <Stack key={step.id} gap={4}>
            <Text size="10px" fw={600} c="dimmed" tt="uppercase">
              {step.label}
              {i < steps.length - 1 ? '  →' : ''}
            </Text>
            {products
              .filter((p) => STEP_OF[p] === step.id)
              .map((p) => {
                const s = summaries.get(p);
                const product = productMap.get(p);
                const own = country ? s?.ranking.find((r) => r.iso3 === country) : undefined;
                const produces = country ? availability.has(country, p) : true;
                // With the country as primary filter, products it never makes cannot be opened (R3).
                const clickable = !(selection.primary === 'country' && country && !produces);
                const active = p === current;
                return (
                  <UnstyledButton
                    key={p}
                    disabled={!clickable}
                    onClick={() => actions.setProduct(p)}
                    aria-label={`Open ${product?.name}`}
                    style={{ cursor: clickable ? 'pointer' : 'default' }}
                  >
                    <Paper
                      withBorder
                      p={6}
                      radius="sm"
                      style={{
                        borderColor: active ? '#2a78d6' : undefined,
                        borderWidth: active ? 2 : undefined,
                        opacity: mode === 'country' && !produces ? 0.45 : 1,
                      }}
                    >
                      <Text size="xs" fw={600} lh={1.2} truncate>
                        {product?.name}
                      </Text>
                      {!s ? (
                        <Skeleton h={10} mt={4} />
                      ) : mode === 'product' ? (
                        <>
                          <Text size="xs" lh={1.3} className="tabular" truncate>
                            {s.top1 ? `${name(s.top1.iso3)} ${formatShare(s.top1.share)}` : 'No production'}
                          </Text>
                          <Text size="10px" c="dimmed" lh={1.2} truncate>
                            {HHI_LABEL[s.hhi.category]}
                          </Text>
                          {country && (
                            <Text size="10px" lh={1.3} c={own?.rank ? undefined : 'dimmed'} className="tabular" truncate>
                              {country}: {own?.rank ? `${formatShare(own.share)} · #${own.rank}` : '—'}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text size="xs" lh={1.3} c={own?.rank ? undefined : 'dimmed'} className="tabular" truncate>
                          {own?.rank ? `${formatShare(own.share)} · #${own.rank}` : produces ? `none in ${year}` : '—'}
                        </Text>
                      )}
                    </Paper>
                  </UnstyledButton>
                );
              })}
          </Stack>
        ))}
      </SimpleGrid>
    </div>
  );
}
