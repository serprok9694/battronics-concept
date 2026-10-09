import { Alert, Badge, Button, Center, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { useMemo } from 'react';
import { indexAvailability } from '../domain/selection';
import { DetailsPanel } from '../features/details/DetailsPanel';
import { FilterBar } from '../features/filters/FilterBar';
import { WorldMap } from '../features/map/WorldMap';
import { useAvailability, useMeta, useReference } from '../queries/hooks';
import { DashboardProvider } from './DashboardContext';
import { useDashboard } from './useDashboard';
import classes from './App.module.css';

export function App() {
  const meta = useMeta();
  const reference = useReference();
  const availability = useAvailability();
  const index = useMemo(
    () => (availability.data ? indexAvailability(availability.data) : null),
    [availability.data],
  );

  const error = meta.error ?? reference.error ?? availability.error;
  if (error) {
    return (
      <Center h="100%">
        <Alert color="red" title="Could not load the dataset" maw={420}>
          <Stack gap="xs">
            <Text size="sm">{error.message}</Text>
            <Button size="xs" variant="light" onClick={() => window.location.assign(window.location.pathname)}>
              Retry
            </Button>
          </Stack>
        </Alert>
      </Center>
    );
  }

  if (!meta.data || !reference.data || !index) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  return (
    <DashboardProvider
      meta={meta.data}
      availability={index}
      countries={reference.data.countries}
      products={reference.data.products}
    >
      <Dashboard />
    </DashboardProvider>
  );
}

function Dashboard() {
  const { meta, droppedParams } = useDashboard();
  const clipboard = useClipboard({ timeout: 1500 });
  return (
    <div className={classes.shell}>
      <header className={classes.header}>
        <Group gap="sm">
          <Title order={4}>Battronics · Supply Chain Map</Title>
          <Badge variant="light" color="gray">
            concept
          </Badge>
        </Group>
        <Group gap="sm">
          <Badge color="orange" variant="filled">
            Mock data
          </Badge>
          <Text size="xs" c="dimmed">
            {meta.source} · updated {meta.updatedAt}
          </Text>
          {/* Read the URL at click time: it is kept in sync with the selection. */}
          <Button size="xs" variant="default" onClick={() => clipboard.copy(window.location.href)}>
            {clipboard.copied ? 'Link copied' : 'Copy link'}
          </Button>
        </Group>
      </header>
      {droppedParams.length > 0 && (
        <Alert color="yellow" py={6} className={classes.banner}>
          Some link parameters were invalid and ignored: {droppedParams.join(', ')}.
        </Alert>
      )}
      <FilterBar />
      <main className={classes.main}>
        <section className={classes.map}>
          <WorldMap />
        </section>
        <aside className={classes.details}>
          <DetailsPanel />
        </aside>
      </main>
    </div>
  );
}
