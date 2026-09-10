import { OsmPlace } from '@/lib/api';

const WIDTH = 760;
const HEIGHT = 400;
const TILE_SIZE = 256;

function project(latitude: number, longitude: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const boundedLatitude = Math.max(-85.0511, Math.min(85.0511, latitude));
  const sine = Math.sin(boundedLatitude * Math.PI / 180);
  return {
    x: (longitude + 180) / 360 * scale,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale,
  };
}

function fitZoom(latitude: number, longitude: number, places: OsmPlace[]) {
  if (places.length === 0) return 9;
  for (let zoom = 15; zoom >= 7; zoom -= 1) {
    const center = project(latitude, longitude, zoom);
    const fits = places.every((place) => {
      const point = project(place.latitude, place.longitude, zoom);
      return Math.abs(point.x - center.x) <= WIDTH / 2 - 24
        && Math.abs(point.y - center.y) <= HEIGHT / 2 - 24;
    });
    if (fits) return zoom;
  }
  return 7;
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
  const zoom = fitZoom(latitude, longitude, places);
  const center = project(latitude, longitude, zoom);
  const left = center.x - WIDTH / 2;
  const top = center.y - HEIGHT / 2;
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
        key: `${tileX}-${tileY}`,
        href: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
        x: tileX * TILE_SIZE - left,
        y: tileY * TILE_SIZE - top,
      });
    }
  }

  return (
    <figure className="map-shell">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-label="Mapa de resultados de OpenStreetMap" role="img">
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
          const point = project(place.latitude, place.longitude, zoom);
          return (
            <g key={`${place.osmType}-${place.osmId}`}>
              <circle cx={point.x - left} cy={point.y - top} r="8" className="map-marker-halo" />
              <circle cx={point.x - left} cy={point.y - top} r="5" className="map-marker">
                <title>{place.name}</title>
              </circle>
            </g>
          );
        })}
        <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="6" className="map-center" />
      </svg>
      <figcaption>
        Teselas ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          colaboradores de OpenStreetMap
        </a>
      </figcaption>
    </figure>
  );
}
