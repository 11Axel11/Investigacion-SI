'use client';

import { Button } from '@/components/ui/button';
import { OsmPlace } from '@/lib/api';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

const WIDTH = 760;
const HEIGHT = 460;
const TILE_SIZE = 256;
const MIN_ZOOM = 6;
const MAX_ZOOM = 16;

type ViewCenter = { latitude: number; longitude: number };

function project(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const boundedLatitude = Math.max(-85.0511, Math.min(85.0511, latitude));
  const sine = Math.sin(boundedLatitude * Math.PI / 180);
  return {
    x: (longitude + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
  };
}

function unproject(x: number, y: number, zoom: number): ViewCenter {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = x / scale * 360 - 180;
  const mercator = Math.PI - 2 * Math.PI * y / scale;
  const latitude = 180 / Math.PI * Math.atan(Math.sinh(mercator));
  return { latitude, longitude };
}

function fitZoom(latitude: number, longitude: number, places: OsmPlace[]) {
  if (places.length === 0) return 9;
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const center = project(latitude, longitude, zoom);
    const fits = places.every((place) => {
      const point = project(place.latitude, place.longitude, zoom);
      return Math.abs(point.x - center.x) <= WIDTH / 2 - 24
        && Math.abs(point.y - center.y) <= HEIGHT / 2 - 24;
    });
    if (fits) return zoom;
  }
  return MIN_ZOOM;
}

function shiftCenter(center: ViewCenter, zoom: number, dx: number, dy: number): ViewCenter {
  const point = project(center.latitude, center.longitude, zoom);
  return unproject(point.x - dx, point.y - dy, zoom);
}

export function OsmMap({
  latitude,
  longitude,
  places,
}: {
  latitude: number;
  longitude: number;
  places: OsmPlace[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const placeSignature = places.map((place) => place.id).join('|');
  const initialView = useMemo(
    () => ({
      zoom: fitZoom(latitude, longitude, places),
      center: { latitude, longitude },
    }),
    // placeSignature stands in for the places array so an empty result does not reset the view every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [latitude, longitude, placeSignature],
  );
  const [zoom, setZoom] = useState(initialView.zoom);
  const [center, setCenter] = useState<ViewCenter>(initialView.center);
  const [selectedId, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setZoom(initialView.zoom);
    setCenter(initialView.center);
    setSelected(null);
  }, [initialView]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + (event.deltaY < 0 ? 1 : -1)));
      if (nextZoom === zoom) return;
      const rect = svg.getBoundingClientRect();
      const scale = WIDTH / rect.width;
      const px = (event.clientX - rect.left) * scale;
      const py = (event.clientY - rect.top) * scale;
      const projected = project(center.latitude, center.longitude, zoom);
      const world = unproject(projected.x - WIDTH / 2 + px, projected.y - HEIGHT / 2 + py, zoom);
      const nextPoint = project(world.latitude, world.longitude, nextZoom);
      setCenter(unproject(nextPoint.x - px + WIDTH / 2, nextPoint.y - py + HEIGHT / 2, nextZoom));
      setZoom(nextZoom);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [center, zoom]);

  const projectedCenter = project(center.latitude, center.longitude, zoom);
  const left = projectedCenter.x - WIDTH / 2;
  const top = projectedCenter.y - HEIGHT / 2;
  const firstTileX = Math.floor(left / TILE_SIZE);
  const lastTileX = Math.floor((left + WIDTH) / TILE_SIZE);
  const firstTileY = Math.floor(top / TILE_SIZE);
  const lastTileY = Math.floor((top + HEIGHT) / TILE_SIZE);
  const tileCount = 2 ** zoom;
  const tiles = [];

  for (let tileX = firstTileX; tileX <= lastTileX; tileX += 1) {
    for (let tileY = firstTileY; tileY <= lastTileY; tileY += 1) {
      if (tileY < 0 || tileY >= tileCount) continue;
      const wrappedX = ((tileX % tileCount) + tileCount) % tileCount;
      tiles.push({
        key: `${zoom}-${tileX}-${tileY}`,
        href: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
        x: tileX * TILE_SIZE - left,
        y: tileY * TILE_SIZE - top,
      });
    }
  }

  const scaleOf = (event: PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return WIDTH / rect.width;
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const scale = scaleOf(event);
    const dx = (event.clientX - drag.current.x) * scale;
    const dy = (event.clientY - drag.current.y) * scale;
    drag.current = { x: event.clientX, y: event.clientY };
    setCenter((current) => shiftCenter(current, zoom, dx, dy));
  };

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const selected = places.find((place) => `${place.osmType}-${place.osmId}` === selectedId);

  return (
    <figure className="relative overflow-hidden rounded-xl border bg-muted">
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label="Acercar"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 1))}
        >
          <Plus />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label="Alejar"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 1))}
        >
          <Minus />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          aria-label="Centrar"
          onClick={() => {
            setZoom(initialView.zoom);
            setCenter(initialView.center);
          }}
        >
          <LocateFixed />
        </Button>
      </div>

      {selected && (
        <div className="absolute bottom-10 left-3 z-10 max-w-[70%] rounded-md border bg-card px-2.5 py-1.5 text-sm shadow-sm">
          <p className="font-medium">{selected.name}</p>
          {selected.address && <p className="text-xs text-muted-foreground">{selected.address}</p>}
        </div>
      )}

      <svg
        ref={svgRef}
        className="block w-full cursor-grab touch-none active:cursor-grabbing"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-label="Mapa de resultados"
        role="application"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <rect width={WIDTH} height={HEIGHT} fill="#dbe7e2" />
        {tiles.map((tile) => (
          <image
            key={tile.key}
            href={tile.href}
            x={tile.x}
            y={tile.y}
            width={TILE_SIZE}
            height={TILE_SIZE}
          />
        ))}
        {places.map((place) => {
          const id = `${place.osmType}-${place.osmId}`;
          const point = project(place.latitude, place.longitude, zoom);
          const active = id === selectedId;
          return (
            <g
              key={id}
              className="cursor-pointer"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setSelected(id)}
            >
              <circle cx={point.x - left} cy={point.y - top} r={active ? 11 : 8} fill="white" opacity="0.9" />
              <circle
                cx={point.x - left}
                cy={point.y - top}
                r={active ? 6.5 : 5}
                fill="#2a2603"
                stroke="white"
                strokeWidth="1.5"
              >
                <title>{place.name}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <figcaption className="bg-card px-3 py-1.5 text-right text-[11px] text-muted-foreground">
        ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
      </figcaption>
    </figure>
  );
}
