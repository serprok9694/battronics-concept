import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { COUNTRIES } from '../../mocks/reference';

export interface CountryFeatureProps {
  fid: string; // stable feature id (promoted for feature-state)
  iso3: string | null; // null = not covered by the dataset
  name: string;
  inDataset: boolean;
}

// world-atlas features carry numeric ISO 3166 ids. Matching on the numeric code
// avoids the Natural Earth "ISO_A3 = -99" pitfall (France, Norway) — edge case E13.
const isoByNumeric = new Map(COUNTRIES.map((c) => [c.isoNumeric, c.iso3]));

/**
 * Russia and Fiji cross the antimeridian: their rings jump from +180 to −180,
 * which draws a band across the whole map without world copies. Shift the
 * western part of such rings by +360° (MapLibre accepts longitudes > 180).
 */
function fixAntimeridian(geometry: Geometry): Geometry {
  const fixRing = (ring: number[][]) =>
    ring.some(([lon]) => lon! > 150) && ring.some(([lon]) => lon! < -150)
      ? ring.map(([lon, lat]) => [lon! < 0 ? lon! + 360 : lon!, lat!])
      : ring;
  if (geometry.type === 'Polygon') return { ...geometry, coordinates: geometry.coordinates.map(fixRing) };
  if (geometry.type === 'MultiPolygon')
    return { ...geometry, coordinates: geometry.coordinates.map((poly) => poly.map(fixRing)) };
  return geometry;
}

const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const collection = feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>;

export const COUNTRY_GEOJSON: FeatureCollection<Geometry, CountryFeatureProps> = {
  type: 'FeatureCollection',
  features: collection.features
    .filter((f) => f.properties.name !== 'Antarctica')
    .map((f, i): Feature<Geometry, CountryFeatureProps> => {
      const iso3 = f.id !== undefined ? (isoByNumeric.get(String(f.id)) ?? null) : null;
      return {
        type: 'Feature',
        geometry: fixAntimeridian(f.geometry),
        properties: { fid: iso3 ?? `x-${f.id ?? i}`, iso3, name: f.properties.name, inDataset: iso3 !== null },
      };
    }),
};

/** Dataset countries that have no polygon at 110m resolution — listed in tables only (E14). */
export const COUNTRIES_WITHOUT_GEOMETRY = COUNTRIES.filter(
  (c) => !COUNTRY_GEOJSON.features.some((f) => f.properties.iso3 === c.iso3),
).map((c) => c.iso3);
