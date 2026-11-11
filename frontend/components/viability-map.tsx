'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AttributionControl,
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Feature } from 'geojson';
import type { Layer, Path, PathOptions } from 'leaflet';

import { Button } from '@/components/ui/button';
import { api, OIJ_BUSINESS_TYPE_TO_OSM_CATEGORY } from '@/lib/api';
import type { CantonProperties, ViabilityIndexRow } from '@/lib/api';
import { bandColor, normalizeCantonKey, NO_DATA_COLOR } from '@/lib/viability';

const CR_CENTER: [number, number] = [9.7489, -83.7534];

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

function MapLifecycle({ layer, version }: { layer: { current: L.GeoJSON | null }; version: string }) {
  const map = useMap();

  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      const bounds = layer.current?.getBounds();
      if (bounds?.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 9 });
    };

    const raf = requestAnimationFrame(fit);
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    window.addEventListener('resize', fit);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [layer, map, version]);

  return null;
}

export function ViabilityMap({
  rows,
  selectedKey,
  onSelect,
  province,
  canton,
  businessType,
}: {
  rows: ViabilityIndexRow[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  province: string;
  canton: string;
  businessType: string;
}) {
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const styleForRef = useRef<(feature?: Feature | { properties?: unknown } | null) => PathOptions>(
    () => ({}),
  );

  const geoQuery = useQuery({
    queryKey: ['coverage-canton-boundaries'],
    queryFn: api.coverage.cantonBoundaries,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const osmCategory = businessType ? OIJ_BUSINESS_TYPE_TO_OSM_CATEGORY[businessType] : undefined;
  const placesQuery = useQuery({
    queryKey: ['viability-business-places', osmCategory, province, canton],
    queryFn: () =>
      api.osm.byCategory({
        category: osmCategory as string,
        province: province || undefined,
        canton: canton || undefined,
      }),
    enabled: !!osmCategory,
  });

  const rowByKey = useMemo(() => {
    const map = new Map<string, ViabilityIndexRow>();
    for (const row of rows) {
      const key = normalizeCantonKey(row.province, row.canton);
      if (!map.has(key)) map.set(key, row);
    }
    return map;
  }, [rows]);

  const keyOf = (feature?: Feature | { properties?: unknown } | null) => {
    const props = feature?.properties as CantonProperties | undefined;
    if (!props) return '';
    return normalizeCantonKey(props.province, props.canton);
  };

  const styleFor = useMemo(() => {
    return (feature?: Feature | { properties?: unknown } | null): PathOptions => {
      const key = keyOf(feature);
      const row = rowByKey.get(key);
      const isSelected = key === selectedKey;
      const props = feature?.properties as CantonProperties | undefined;
      const isDimmed =
        !!props &&
        ((!!province && normalizeText(props.province) !== normalizeText(province)) ||
          (!!canton && key !== normalizeCantonKey(province || props.province, canton)));
      return {
        fillColor: row ? bandColor(row.band) : NO_DATA_COLOR,
        fillOpacity: isDimmed ? 0.12 : isSelected ? 0.85 : 0.65,
        color: isSelected ? '#1a1a1a' : '#ffffff',
        weight: isSelected ? 2 : 0.8,
        opacity: isDimmed ? 0.3 : 1,
      };
    };
  }, [rowByKey, selectedKey, province, canton]);

  useEffect(() => {
    // Los manejadores de mouseout leen la referencia al disparar el evento, siempre después del commit.
    styleForRef.current = styleFor;
    const layer = geoLayerRef.current;
    if (!layer) return;
    layer.eachLayer((child) => {
      const feature = (child as Layer & { feature?: Feature }).feature;
      if (child instanceof L.Path) child.setStyle(styleFor(feature));
    });
  }, [styleFor]);

  if (!geoQuery.data && geoQuery.isError) {
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground">
        <p>No se pudieron cargar los límites cantonales del SNIT.</p>
        <Button variant="outline" size="sm" disabled={geoQuery.isFetching} onClick={() => void geoQuery.refetch()}>
          {geoQuery.isFetching ? 'Reintentando…' : 'Reintentar'}
        </Button>
      </div>
    );
  }

  if (!geoQuery.data) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Cargando límites cantonales del SNIT…
      </div>
    );
  }

  return (
    <MapContainer
      center={CR_CENTER}
      zoom={8}
      className="h-full w-full bg-[#f4f4f5]"
      scrollWheelZoom
      zoomControl={false}
      zoomSnap={1}
      zoomDelta={1}
      attributionControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <MapLifecycle layer={geoLayerRef} version={geoQuery.data.fetchedAt} />
      <AttributionControl position="bottomright" prefix={false} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        key={`${geoQuery.data.fetchedAt}-${geoQuery.data.stale}-${rows[0]?.year ?? 'empty'}-${province}-${canton}`}
        ref={(instance) => {
          geoLayerRef.current = instance;
        }}
        data={geoQuery.data}
        attribution={`<a href="https://www.snitcr.go.cr/">IGN / SNIT</a>${geoQuery.data.stale ? ' (última copia disponible)' : ''}`}
        style={(feature) => styleFor(feature)}
        onEachFeature={(feature, layer: Layer) => {
          const key = keyOf(feature);
          const row = rowByKey.get(key);
          const props = feature.properties as CantonProperties;
          const tooltip = document.createElement('span');
          tooltip.textContent = row?.score != null
            ? `${props.canton}: ${row.score} (${row.band})`
            : `${props.canton}: sin datos`;
          layer.bindTooltip(tooltip, { sticky: true });
          layer.on({
            click: () => onSelect(key),
            mouseover: (event) => (event.target as Path).setStyle({ weight: 2.5 }),
            mouseout: (event) => (event.target as Path).setStyle(styleForRef.current(feature)),
          });
        }}
      />
      {placesQuery.data?.map((place) => (
        <CircleMarker
          key={place.id}
          center={[place.latitude, place.longitude]}
          radius={5}
          pathOptions={{
            color: '#1a1a1a',
            weight: 1,
            fillColor: '#2f6f5e',
            fillOpacity: 0.9,
          }}
        >
          <Tooltip>
            {place.name}
            {place.address ? ` — ${place.address}` : ''}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
