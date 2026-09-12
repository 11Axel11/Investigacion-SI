'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GeoJSON, MapContainer, TileLayer } from 'react-leaflet';
import type { Layer, Path, PathOptions } from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';

import { ViabilityIndexRow } from '@/lib/api';
import { bandColor, normalizeCantonKey, NO_DATA_COLOR } from '@/lib/viability';

const CR_CENTER: [number, number] = [9.7489, -83.7534];

interface CantonProperties {
  Provincia: string;
  Canton: string;
  Codigo: string;
}

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
}

export function ViabilityMap({
  rows,
  selectedKey,
  onSelect,
  province,
}: {
  rows: ViabilityIndexRow[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  province: string;
}) {
  const geoQuery = useQuery({
    queryKey: ['cantones-cr-geojson'],
    queryFn: () => fetch('/cantones-cr.geojson').then((res) => res.json() as Promise<FeatureCollection>),
    staleTime: Infinity,
  });

  const rowByKey = useMemo(() => {
    const map = new Map<string, ViabilityIndexRow>();
    for (const row of rows) map.set(normalizeCantonKey(row.province, row.canton), row);
    return map;
  }, [rows]);

  const keyOf = (feature?: { properties?: unknown }) => {
    const props = feature?.properties as CantonProperties | undefined;
    if (!props) return '';
    return normalizeCantonKey(props.Provincia, props.Canton);
  };

  const style = (feature?: { properties?: unknown }): PathOptions => {
    const key = keyOf(feature);
    const row = rowByKey.get(key);
    const isSelected = key === selectedKey;
    const props = feature?.properties as CantonProperties | undefined;
    const isDimmed = !!province && !!props && normalizeText(props.Provincia) !== normalizeText(province);
    return {
      fillColor: row ? bandColor(row.band) : NO_DATA_COLOR,
      fillOpacity: isDimmed ? 0.12 : isSelected ? 0.9 : 0.7,
      color: isSelected ? '#0b0b0b' : '#fcfcfb',
      weight: isSelected ? 2.5 : 1,
      opacity: isDimmed ? 0.3 : 1,
    };
  };

  if (geoQuery.isLoading || !geoQuery.data) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando mapa…</div>;
  }

  return (
    <MapContainer center={CR_CENTER} zoom={8} className="h-full w-full" scrollWheelZoom zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        key={`${rows.length ? rows[0].year : 'empty'}-${province}`}
        data={geoQuery.data}
        style={style}
        onEachFeature={(feature, layer: Layer) => {
          const key = keyOf(feature);
          const row = rowByKey.get(key);
          const props = feature.properties as CantonProperties;
          layer.bindTooltip(
            row?.score != null ? `${props.Canton}: ${row.score} (${row.band})` : `${props.Canton}: sin datos`,
            { sticky: true },
          );
          layer.on({
            click: () => onSelect(key),
            mouseover: (event) => (event.target as Path).setStyle({ weight: 3 }),
            mouseout: (event) => (event.target as Path).setStyle(style(feature) as PathOptions),
          });
        }}
      />
    </MapContainer>
  );
}
