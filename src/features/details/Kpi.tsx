import { Paper, SimpleGrid, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { GlossaryTerm } from '../../domain/glossary';
import { InfoTip } from '../common/InfoTip';

export interface KpiItem {
  label: string;
  value: string;
  hint?: ReactNode;
  /** Glossary term explained by an ⓘ next to the label. */
  info?: GlossaryTerm;
}

/** Stat tiles: one number + label + the context needed to trust it. */
export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <SimpleGrid cols={{ base: 2, md: 3 }} spacing={8}>
      {items.map((k) => (
        <Paper key={k.label} withBorder p={8} radius="sm">
          <Text size="xs" c="dimmed">
            {k.label}
            {k.info && <InfoTip term={k.info} />}
          </Text>
          <Text size="lg" fw={600} lh={1.3}>
            {k.value}
          </Text>
          {k.hint && (
            <Text size="10px" c="dimmed" lh={1.3}>
              {k.hint}
            </Text>
          )}
        </Paper>
      ))}
    </SimpleGrid>
  );
}
