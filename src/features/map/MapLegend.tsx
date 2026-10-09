import { Group, Paper, Stack, Text } from '@mantine/core';
import { MAP_COLORS, SHARE_BUCKETS } from '../../domain/scale';

const Swatch = ({ color, hatch }: { color: string; hatch?: boolean }) => (
  <span
    style={{
      display: 'inline-block',
      width: 14,
      height: 10,
      borderRadius: 2,
      background: hatch
        ? `repeating-linear-gradient(135deg, #b0aea6 0 1px, ${color} 1px 5px)`
        : color,
      border: '1px solid rgba(11,11,11,0.10)',
    }}
  />
);

export function MapLegend({ mode }: { mode: 'share' | 'neutral' }) {
  return (
    <Paper withBorder shadow="xs" p={8} pos="absolute" bottom={28} left={10} style={{ pointerEvents: 'none' }}>
      <Stack gap={4}>
        {mode === 'share' && (
          <>
            <Text size="xs" fw={600}>
              Share of world production
            </Text>
            <Group gap={2} wrap="nowrap">
              {SHARE_BUCKETS.map((b) => (
                <Stack key={b.label} gap={0} align="center" w={40}>
                  <span style={{ display: 'block', width: 38, height: 10, background: b.color, borderRadius: 2 }} />
                  <Text size="10px" c="dimmed" className="tabular">
                    {b.label}
                  </Text>
                </Stack>
              ))}
            </Group>
          </>
        )}
        <Group gap="md">
          {mode === 'share' ? (
            <Group gap={4}>
              <Swatch color={MAP_COLORS.notProducer} />
              <Text size="xs">Not a producer</Text>
            </Group>
          ) : (
            <Group gap={4}>
              <Swatch color={MAP_COLORS.neutral} />
              <Text size="xs">Has data · click to open profile</Text>
            </Group>
          )}
          <Group gap={4}>
            <Swatch color={MAP_COLORS.noData} hatch />
            <Text size="xs">No data</Text>
          </Group>
        </Group>
      </Stack>
    </Paper>
  );
}
