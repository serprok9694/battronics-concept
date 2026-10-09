import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import type { Country } from '../../api/types';

export interface CountryFeatureProps {
  fid: string; // stable feature id (promoted for feature-state)
  iso3: string | null; // null = not covered by the dataset
  name: string;
  inDataset: boolean;
}

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

/**
 * Country polygons joined with the dataset's country dictionary (from the API).
 * world-atlas features carry numeric ISO 3166 ids; matching on them avoids the
 * Natural Earth "ISO_A3 = -99" pitfall (France, Norway) — edge case E13.
 */
export function buildCountryGeoJSON(countries: Iterable<Country>): FeatureCollection<Geometry, CountryFeatureProps> {
  const isoByNumeric = new Map([...countries].map((c) => [c.isoNumeric, c.iso3]));
  return {
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
}
