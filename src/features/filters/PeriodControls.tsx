import { ActionIcon, Badge, Box, Group, RangeSlider, Slider, Text, Tooltip } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useDashboard } from '../../app/useDashboard';
import { STATUS_LABEL } from '../../domain/format';
import { statusOfYear } from '../../domain/status';

const PLAY_INTERVAL_MS = 900;

export function PeriodControls() {
  const { selection, bounds, actions, playing, setPlaying, meta } = useDashboard();
  const [from, to] = selection.range;
  // Local value only while dragging; the reducer is updated on release.
  const [dragRange, setDragRange] = useState<[number, number] | null>(null);
  const draftRange = dragRange ?? selection.range;

  // S4: Play steps the focus year through the period. Data is already cached, so no requests.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (selection.focusYear >= to) setPlaying(false); // E10: stop at the end
      else actions.setFocusYear(selection.focusYear + 1);
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, selection.focusYear, to, actions, setPlaying]);

  const togglePlay = () => {
    if (!playing && selection.focusYear >= to) actions.setFocusYear(from); // replay from start
    setPlaying(!playing);
  };

  const status = statusOfYear(selection.focusYear, meta);
  const marks = [
    { value: bounds.firstYear, label: String(bounds.firstYear) },
    { value: bounds.lastYear, label: String(bounds.lastYear) },
  ];

  return (
    // Both columns share one grid: header row (22px) · control row (28px, the Play button
    // height) · tick labels, so the two sliders sit on the same line.
    <Group gap="lg" align="flex-start" wrap="wrap">
      <Box w={240}>
        <Group h={22} gap={6}>
          <Text size="sm" fw={500}>
            Period{' '}
            <Text span c="dimmed" size="sm" className="tabular">
              {draftRange[0]}–{draftRange[1]}
            </Text>
          </Text>
        </Group>
        <Box h={28} mt={6} mb="lg" style={{ display: 'flex', alignItems: 'center' }}>
          <RangeSlider
            flex={1}
            min={bounds.firstYear}
            max={bounds.lastYear}
            step={1}
            minRange={0}
            value={draftRange}
            onChange={setDragRange}
            onChangeEnd={(r) => {
              setDragRange(null);
              actions.setRange(r);
            }}
            marks={marks}
            aria-label="Period"
          />
        </Box>
      </Box>
      <Box w={240}>
        <Group h={22} gap={6} justify="space-between">
          <Text size="sm" fw={500}>
            Focus year{' '}
            <Text span c="dimmed" size="sm" className="tabular">
              {selection.focusYear}
            </Text>
          </Text>
          <Badge size="sm" variant={status === 'actual' ? 'light' : 'outline'} color={status === 'actual' ? 'gray' : 'orange'}>
            {STATUS_LABEL[status]}
          </Badge>
        </Group>
        <Group h={28} gap="xs" wrap="nowrap" mt={6} mb="lg">
          <Tooltip label={playing ? 'Pause' : `Play ${from}–${to}`}>
            <ActionIcon variant="light" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} disabled={from === to}>
              {playing ? '❚❚' : '▶'}
            </ActionIcon>
          </Tooltip>
          <Slider
            flex={1}
            min={from}
            max={to}
            step={1}
            value={selection.focusYear}
            onChange={actions.setFocusYear}
            disabled={from === to}
            marks={[
              { value: from, label: String(from) },
              { value: to, label: String(to) },
            ]}
            label={(v) => `${v} · ${STATUS_LABEL[statusOfYear(v, meta)]}`}
            aria-label="Focus year"
          />
        </Group>
      </Box>
    </Group>
  );
}
