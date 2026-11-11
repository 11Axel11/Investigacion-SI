import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

const SOURCE = 'https://geos.snitcr.go.cr/be/IGN_5_CO/wfs';
const PAGE_SIZE = 6;
const MAX_CANTONS = 120;
const MAX_PAGE_BYTES = 12 * 1024 * 1024;
const CACHE_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 60 * 1000;

interface WfsFeature {
  type: string;
  properties?: { 'CÓDIGO_CANTÓN'?: number; 'CANTÓN'?: string; PROVINCIA?: string };
  geometry?: { type: string; coordinates: unknown };
}

interface WfsPage {
  type: string;
  numberMatched: number;
  features: WfsFeature[];
}

class WfsPageTooLarge extends Error {}

function isRing(ring: unknown): boolean {
  return Array.isArray(ring) && ring.length >= 4 && ring.every((point: unknown) => {
    if (!Array.isArray(point) || point.length !== 2) return false;
    const [longitude, latitude] = point;
    return typeof longitude === 'number' && longitude >= -90 && longitude <= -80
      && typeof latitude === 'number' && latitude >= 0 && latitude <= 15;
  });
}

function isPolygon(polygon: unknown): boolean {
  return Array.isArray(polygon) && polygon.length > 0 && polygon.every(isRing);
}

function normalizeFeature(feature: WfsFeature) {
  const { properties, geometry } = feature ?? {};
  const code = properties?.['CÓDIGO_CANTÓN'];
  const canton = properties?.['CANTÓN'];
  const province = properties?.PROVINCIA;
  if (feature?.type !== 'Feature' || typeof code !== 'number' || !Number.isInteger(code)
    || typeof canton !== 'string' || !canton.trim() || typeof province !== 'string' || !province.trim()
    || !geometry || !validGeometry(geometry)) {
    throw new Error('Límite cantonal inválido');
  }

  return {
    type: 'Feature' as const,
    id: code,
    properties: { canton: canton.trim(), province: province.trim() },
    geometry: { type: geometry.type, coordinates: geometry.coordinates },
  };
}

function validGeometry({ type, coordinates }: NonNullable<WfsFeature['geometry']>): boolean {
  if (type === 'Polygon') return isPolygon(coordinates);
  return type === 'MultiPolygon' && Array.isArray(coordinates)
    && coordinates.length > 0 && coordinates.every(isPolygon);
}

async function getPage(startIndex: number, count: number): Promise<WfsPage> {
  const url = new URL(SOURCE);
  url.search = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'IGN_5_CO:limitecantonal_5k', srsName: 'EPSG:4326',
    outputFormat: 'application/json', propertyName: 'SHAPE,CÓDIGO_CANTÓN,CANTÓN,PROVINCIA',
    sortBy: 'OBJECTID', count: String(count), startIndex: String(startIndex),
  }).toString();

  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(90_000) });
  if (response.status === 504) throw new WfsPageTooLarge('El WFS agotó el tiempo de respuesta');
  if (!response.ok || !response.body) throw new Error(`El WFS respondió ${response.status}`);

  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.byteLength;
    if (bytes > MAX_PAGE_BYTES) throw new WfsPageTooLarge('Página WFS demasiado grande');
    chunks.push(Buffer.from(chunk));
  }

  const page: WfsPage = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (page?.type !== 'FeatureCollection' || !Array.isArray(page.features)
    || !Number.isInteger(page.numberMatched) || page.numberMatched < 1 || page.numberMatched > MAX_CANTONS
    || page.features.length !== Math.min(count, page.numberMatched - startIndex)) {
    throw new Error('Página WFS incompleta o inválida');
  }
  return page;
}

async function getRange(start: number, count: number): Promise<WfsPage> {
  try {
    return await getPage(start, count);
  } catch (error) {
    const canSplit = error instanceof WfsPageTooLarge
      || (error instanceof Error && error.name === 'TimeoutError');
    if (!canSplit || count === 1) throw error;
  }

  const half = Math.floor(count / 2);
  const first = await getRange(start, half);
  const remaining = Math.min(count - half, first.numberMatched - start - half);
  if (remaining <= 0) return first;
  const second = await getRange(start + half, remaining);
  if (first.numberMatched !== second.numberMatched) throw new Error('La capa cambió durante la descarga');
  return { ...first, features: [...first.features, ...second.features] };
}

async function downloadBoundaries() {
  const first = await getRange(0, PAGE_SIZE);
  const features = first.features.map(normalizeFeature);

  // Tres consultas concurrentes como máximo. Todas deben devolver el mismo total.
  for (let start = PAGE_SIZE; start < first.numberMatched; start += 3 * PAGE_SIZE) {
    const offsets = [start, start + PAGE_SIZE, start + 2 * PAGE_SIZE]
      .filter((offset) => offset < first.numberMatched);
    const pages = await Promise.all(offsets.map((offset) => getRange(offset, PAGE_SIZE)));
    for (const page of pages) {
      if (page.numberMatched !== first.numberMatched) throw new Error('La capa cambió durante la descarga');
      features.push(...page.features.map(normalizeFeature));
    }
  }

  if (new Set(features.map(({ id }) => id)).size !== first.numberMatched) {
    throw new Error('Códigos cantonales repetidos');
  }

  return { type: 'FeatureCollection' as const, features, fetchedAt: new Date().toISOString() };
}

type Boundaries = Awaited<ReturnType<typeof downloadBoundaries>>;

@Injectable()
export class CantonBoundariesService {
  private readonly logger = new Logger(CantonBoundariesService.name);
  private cached?: Boundaries;
  private pending?: Promise<void>;
  private nextAttempt = 0;

  async getBoundaries() {
    if (!this.pending && Date.now() >= this.nextAttempt) {
      this.pending = this.refresh();
    }
    if (!this.cached) await this.pending;
    if (!this.cached) {
      throw new ServiceUnavailableException('No fue posible cargar los límites del SNIT. Reintente más tarde.');
    }

    return { ...this.cached, stale: Date.now() - Date.parse(this.cached.fetchedAt) >= CACHE_MS };
  }

  private async refresh() {
    try {
      this.cached = await downloadBoundaries();
      this.nextAttempt = Date.now() + CACHE_MS;
    } catch (error) {
      this.logger.warn(`No se actualizaron los límites del SNIT: ${error instanceof Error ? error.message : 'error desconocido'}`);
      this.nextAttempt = Date.now() + RETRY_MS;
    } finally {
      this.pending = undefined;
    }
  }
}
