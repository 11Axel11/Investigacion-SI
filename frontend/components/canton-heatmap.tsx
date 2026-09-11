'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { CrimeRateRow } from '@/lib/api';

const WIDTH = 640;
const HEIGHT = 480;

// Escala secuencial de un solo tono (azul), de "casi cero" a "máximo" — nunca arcoíris.
const SEQUENTIAL_RAMP = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec',
  '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab',
  '#184f95', '#104281', '#0d366b',
];
const NO_DATA_FILL = '#e1e0d9';

interface CantonFeature {
  type: 'Feature';
  properties: { Provincia: string; Canton: string; Codigo: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}

interface CantonFeatureCollection {
  type: 'FeatureCollection';
  features: CantonFeature[];
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
}

function colorForValue(value: number, max: number) {
  if (max <= 0) return SEQUENTIAL_RAMP[0];
  const ratio = Math.max(0, Math.min(1, value / max));
  const index = Math.round(ratio * (SEQUENTIAL_RAMP.length - 1));
  return SEQUENTIAL_RAMP[index];
}

function buildProjector(fc: CantonFeatureCollection) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const visitRing = (ring: number[][]) => {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  };
  for (const feature of fc.features) {
    const { type, coordinates } = feature.geometry;
    if (type === 'Polygon') (coordinates as number[][][]).forEach(visitRing);
    else (coordinates as number[][][][]).forEach((polygon) => polygon.forEach(visitRing));
  }

  const meanLat = (minLat + maxLat) / 2;
  const lonScale = Math.cos((meanLat * Math.PI) / 180);
  const spanX = (maxLon - minLon) * lonScale;
  const spanY = maxLat - minLat;
  const padding = 16;
  const scale = Math.min((WIDTH - padding * 2) / spanX, (HEIGHT - padding * 2) / spanY);
  const offsetX = padding + (WIDTH - padding * 2 - spanX * scale) / 2;
  const offsetY = padding + (HEIGHT - padding * 2 - spanY * scale) / 2;

  return (lon: number, lat: number) => ({
    x: offsetX + (lon - minLon) * lonScale * scale,
    y: offsetY + (maxLat - lat) * scale,
  });
}

function ringToPath(ring: number[][], project: (lon: number, lat: number) => { x: number; y: number }) {
  return ring
    .map(([lon, lat], index) => {
      const { x, y } = project(lon, lat);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
}

function featurePath(feature: CantonFeature, project: (lon: number, lat: number) => { x: number; y: number }) {
  const { type, coordinates } = feature.geometry;
  if (type === 'Polygon') {
    return (coordinates as number[][][]).map((ring) => ringToPath(ring, project)).join(' ');
  }
  return (coordinates as number[][][][])
    .map((polygon) => polygon.map((ring) => ringToPath(ring, project)).join(' '))
    .join(' ');
}

export function CantonHeatmap({ rows, year }: { rows: CrimeRateRow[]; year: string }) {
  const geoQuery = useQuery({
    queryKey: ['cantones-cr-geojson'],
    queryFn: () => fetch('/cantones-cr.geojson').then((res) => res.json() as Promise<CantonFeatureCollection>),
    staleTime: Infinity,
  });
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const rateByKey = useMemo(() => {
    const map = new Map<string, CrimeRateRow>();
    for (const row of rows) map.set(`${normalizeText(row.province)}::${normalizeText(row.canton)}`, row);
    return map;
  }, [rows]);

  const maxRate = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.crimeRatePer1000Electors ?? 0), 0),
    [rows],
  );

  const project = useMemo(() => (geoQuery.data ? buildProjector(geoQuery.data) : null), [geoQuery.data]);

  if (geoQuery.isLoading || !geoQuery.data || !project) {
    return <div className="flex h-[480px] items-center justify-center text-sm text-muted-foreground">Cargando mapa…</div>;
  }

  const hovered = hoveredCode
    ? geoQuery.data.features.find((feature) => feature.properties.Codigo === hoveredCode)
    : null;
  const hoveredRow = hovered
    ? rateByKey.get(`${normalizeText(hovered.properties.Provincia)}::${normalizeText(hovered.properties.Canton)}`)
    : null;

  return (
    <figure className="relative overflow-hidden rounded-xl border bg-card">
      {hovered && (
        <div className="pointer-events-none absolute top-3 left-3 z-10 max-w-[70%] rounded-md border bg-popover px-2.5 py-1.5 text-sm shadow-sm">
          <p className="font-medium">{hovered.properties.Canton}, {hovered.properties.Provincia}</p>
          {hoveredRow ? (
            <p className="text-xs text-muted-foreground">
              {hoveredRow.crimeRatePer1000Electors ?? 0} delitos/1000 electores · {hoveredRow.crimes.toLocaleString('es-CR')} delitos · {hoveredRow.electors.toLocaleString('es-CR')} electores
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Sin datos para {year}</p>
          )}
        </div>
      )}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full"
        role="img"
        aria-label={`Mapa de tasa de delitos por 1000 electores, por cantón, ${year}`}
      >
        {geoQuery.data.features.map((feature) => {
          const key = `${normalizeText(feature.properties.Provincia)}::${normalizeText(feature.properties.Canton)}`;
          const row = rateByKey.get(key);
          const rate = row?.crimeRatePer1000Electors;
          const fill = rate == null ? NO_DATA_FILL : colorForValue(rate, maxRate);
          const isHovered = feature.properties.Codigo === hoveredCode;
          return (
            <path
              key={feature.properties.Codigo}
              d={featurePath(feature, project)}
              fill={fill}
              fillRule="evenodd"
              stroke={isHovered ? '#0b0b0b' : '#fcfcfb'}
              strokeWidth={isHovered ? 1.5 : 0.75}
              tabIndex={0}
              className="cursor-pointer outline-none"
              onPointerMove={() => setHoveredCode(feature.properties.Codigo)}
              onPointerLeave={() => setHoveredCode((current) => (current === feature.properties.Codigo ? null : current))}
              onFocus={() => setHoveredCode(feature.properties.Codigo)}
              onBlur={() => setHoveredCode((current) => (current === feature.properties.Codigo ? null : current))}
            >
              <title>{feature.properties.Canton}: {rate != null ? `${rate} delitos/1000 electores` : 'Sin datos'}</title>
            </path>
          );
        })}
      </svg>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t bg-card px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span>0</span>
          {SEQUENTIAL_RAMP.map((color) => (
            <span key={color} className="h-3 w-4" style={{ backgroundColor: color }} />
          ))}
          <span>{maxRate.toFixed(1)} delitos/1000 electores</span>
          <span className="ml-2 flex items-center gap-1">
            <span className="h-3 w-4" style={{ backgroundColor: NO_DATA_FILL }} /> Sin datos
          </span>
        </div>
        <span>
          Límites cantonales:{' '}
          <a href="https://github.com/schweini/CR_distritos_geojson" target="_blank" rel="noreferrer">IGN / CR_distritos_geojson</a>
        </span>
      </figcaption>
    </figure>
  );
}
