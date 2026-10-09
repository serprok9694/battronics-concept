import { Badge, Button, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import type { StyleSpecification } from 'maplibre-gl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Source, type MapLayerMouseEvent, type MapRef } from 'react-map-gl/maplibre';
import type { Iso3 } from '../../api/types';
import { useDashboard } from '../../app/useDashboard';
import { STATUS_LABEL } from '../../domain/format';
import { MAP_COLORS, shareColor } from '../../domain/scale';
import { useProductView } from '../useProductView';
import './maplibreSetup';
import { buildCountryGeoJSON, type CountryFeatureProps } from './geo';
import { MapLegend } from './MapLegend';
import { MapTooltip } from './MapTooltip';

// No basemap tiles: a plain background + country polygons is enough for a
// choropleth and needs no API key. Production would use vector tiles (see README).
const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': MAP_COLORS.background } }],
};

const SOURCE_ID = 'countries';
const FILL_LAYER = 'countries-fill';

/** 8×8 diagonal hatch for "no data" — distinguishes unknown from zero (E6). */
function hatchImage() {
  const size = 8;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const on = (x + y) % size === 0;
      const o = (y * size + x) * 4;
      data.set(on ? [176, 174, 166, 255] : [0, 0, 0, 0], o);
    }
  return { width: size, height: size, data };
}

interface Hover {
  props: CountryFeatureProps;
  x: number;
  y: number;
  nearRightEdge: boolean;
}

export function WorldMap() {
  const { selection, actions, availability, countries } = useDashboard();
  const { matrix, product, selectedProduct, year, isStale, isLoading, error, refetch } = useProductView();
  // A product is selected but its data is not there (loading or failed): the map must not
  // fall back to the "no product" mode, which would show misleading colours and clicks.
  const awaitingData = selectedProduct !== null && !matrix;
  const mapRef = useRef<MapRef>(null);
  const geojson = useMemo(() => buildCountryGeoJSON(countries.values()), [countries]);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);

  const rowByIso = useMemo(
    () => new globalThis.Map((year?.ranking ?? []).map((r) => [r.iso3, r])),
    [year],
  );

  /** R8/R9: with a product selected only its producers are clickable; otherwise any dataset country. */
  const isClickable = useCallback(
    (p: CountryFeatureProps) => {
      if (!p.iso3 || awaitingData) return false;
      if (matrix) return availability.has(p.iso3, matrix.productId);
      return availability.hasCountry(p.iso3);
    },
    [matrix, availability, awaitingData],
  );

  // Fill colour per feature, pushed to MapLibre as feature-state (no GeoJSON re-upload on each year).
  const fills = useMemo(() => {
    const out: Array<[string, string]> = [];
    for (const f of geojson.features) {
      const p = f.properties;
      let color: string = MAP_COLORS.noData;
      if (awaitingData) {
        color = MAP_COLORS.noData;
      } else if (p.iso3 && matrix) {
        const row = rowByIso.get(p.iso3);
        if (!row || !availability.has(p.iso3, matrix.productId)) color = MAP_COLORS.notProducer;
        else color = row.value === null ? MAP_COLORS.noData : shareColor(row.share);
      } else if (p.iso3) {
        color = p.iso3 === selection.country ? '#256abf' : MAP_COLORS.neutral;
      }
      out.push([p.fid, color]);
    }
    return out;
  }, [geojson, matrix, rowByIso, availability, selection.country, awaitingData]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!ready || !map) return;
    // <Source> registers itself after the map's load event, so wait for it if needed.
    const apply = () => {
      if (!map.getSource(SOURCE_ID)) return false;
      for (const [fid, color] of fills) map.setFeatureState({ source: SOURCE_ID, id: fid }, { color });
      return true;
    };
    if (apply()) return;
    const onSourceData = () => {
      if (apply()) map.off('sourcedata', onSourceData);
    };
    map.on('sourcedata', onSourceData);
    return () => {
      map.off('sourcedata', onSourceData);
    };
  }, [fills, ready]);

  const onLoad = () => {
    const map = mapRef.current?.getMap();
    if (map && !map.hasImage('hatch')) map.addImage('hatch', hatchImage());
    setReady(true);
  };

  const onMouseMove = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    const width = e.target.getContainer().clientWidth;
    setHover(
      f
        ? { props: f.properties as CountryFeatureProps, x: e.point.x, y: e.point.y, nearRightEdge: e.point.x > width - 260 }
        : null,
    );
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const props = e.features?.[0]?.properties as CountryFeatureProps | undefined;
    if (props && isClickable(props)) actions.toggleCountry(props.iso3 as Iso3);
  };

  const selectedName = selection.country ? countries.get(selection.country)?.name : null;
  const titleProduct = product ?? selectedProduct;

  return (
    <>
      <Map
        ref={mapRef}
        initialViewState={{ bounds: [[-150, -50], [175, 72]] }}
        minZoom={0.6}
        maxZoom={6}
        dragRotate={false}
        pitchWithRotate={false}
        renderWorldCopies={false}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={[FILL_LAYER]}
        cursor={hover && isClickable(hover.props) ? 'pointer' : 'default'}
        onLoad={onLoad}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
        attributionControl={{ compact: true, customAttribution: 'Boundaries: Natural Earth' }}
      >
        <Source id={SOURCE_ID} type="geojson" data={geojson} promoteId="fid">
          <Layer
            id={FILL_LAYER}
            type="fill"
            paint={{
              'fill-color': ['coalesce', ['feature-state', 'color'], MAP_COLORS.noData],
              'fill-opacity': isStale ? 0.55 : 1,
            }}
          />
          {ready && (
            <Layer
              id="countries-no-data"
              type="fill"
              filter={['!', ['get', 'inDataset']]}
              paint={{ 'fill-pattern': 'hatch' }}
            />
          )}
          <Layer id="countries-borders" type="line" paint={{ 'line-color': MAP_COLORS.outline, 'line-width': 0.6 }} />
          <Layer
            id="countries-hover"
            type="line"
            filter={['==', ['get', 'fid'], hover?.props.fid ?? '']}
            paint={{ 'line-color': MAP_COLORS.hover, 'line-width': 1.2 }}
          />
          <Layer
            id="countries-selected"
            type="line"
            filter={['==', ['get', 'iso3'], selection.country ?? '']}
            paint={{ 'line-color': MAP_COLORS.selected, 'line-width': 2.5 }}
          />
        </Source>
      </Map>

      {/* What the map currently shows — essential while scrubbing or playing. */}
      <Paper withBorder shadow="xs" px="sm" py={6} pos="absolute" top={10} left={10} style={{ pointerEvents: 'none' }}>
        <Group gap="xs">
          <Text size="sm" fw={600}>
            {titleProduct ? `${titleProduct.name} · share of world production` : selectedName ? selectedName : 'Countries in dataset'}
          </Text>
          {year && (
            <>
              <Text size="sm" className="tabular">
                {year.year}
              </Text>
              <Badge size="sm" variant={year.status === 'actual' ? 'light' : 'outline'} color={year.status === 'actual' ? 'gray' : 'orange'}>
                {STATUS_LABEL[year.status]}
              </Badge>
            </>
          )}
          {(isLoading || isStale) && <Loader size={14} />}
        </Group>
      </Paper>

      <MapLegend mode={selectedProduct ? 'share' : 'neutral'} />

      {error && (
        <Paper withBorder shadow="md" p="md" pos="absolute" top="40%" left="50%" style={{ transform: 'translate(-50%, -50%)' }}>
          <Stack gap={6} align="center">
            <Text size="sm" fw={600}>
              Could not load {selectedProduct?.name ?? 'data'}
            </Text>
            <Text size="xs" c="dimmed">
              {error.message}
            </Text>
            <Button size="compact-xs" variant="light" onClick={() => void refetch()}>
              Retry
            </Button>
          </Stack>
        </Paper>
      )}

      {hover && (
        <MapTooltip
          hover={hover}
          clickable={isClickable(hover.props)}
          flip={hover.nearRightEdge}
        />
      )}
    </>
  );
}
