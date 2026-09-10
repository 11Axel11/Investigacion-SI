import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { OsmPlace } from './osm-place.entity';
import { OsmQueryCache } from './osm-query-cache.entity';

const CATEGORY_LABELS = {
  hospital: 'Hospital',
  clinic: 'Clínica',
  pharmacy: 'Farmacia',
  school: 'Centro educativo',
  police: 'Policía',
  fire_station: 'Estación de bomberos',
} as const;

const LOCATIONS = [
  {
    province: 'San José', relationId: 3223004, center: [9.9281, -84.0907],
    cantons: ['San José', 'Escazú', 'Desamparados', 'Puriscal', 'Tarrazú', 'Aserrí', 'Mora', 'Goicoechea', 'Santa Ana', 'Alajuelita', 'Vázquez de Coronado', 'Acosta', 'Tibás', 'Moravia', 'Montes de Oca', 'Turrubares', 'Dota', 'Curridabat', 'Pérez Zeledón', 'León Cortés Castro'],
  },
  {
    province: 'Alajuela', relationId: 3222933, center: [10.3916, -84.4383],
    cantons: ['Alajuela', 'San Ramón', 'Grecia', 'San Mateo', 'Atenas', 'Naranjo', 'Palmares', 'Poás', 'Orotina', 'San Carlos', 'Zarcero', 'Sarchí', 'Upala', 'Los Chiles', 'Guatuso', 'Río Cuarto'],
  },
  {
    province: 'Cartago', relationId: 3223054, center: [9.8000, -83.6530],
    cantons: ['Cartago', 'Paraíso', 'La Unión', 'Jiménez', 'Turrialba', 'Alvarado', 'Oreamuno', 'El Guarco'],
  },
  {
    province: 'Heredia', relationId: 3221947, center: [10.4735, -84.0167],
    cantons: ['Heredia', 'Barva', 'Santo Domingo', 'Santa Bárbara', 'San Rafael', 'San Isidro', 'Belén', 'Flores', 'San Pablo', 'Sarapiquí'],
  },
  {
    province: 'Guanacaste', relationId: 3222919, center: [10.6267, -85.4437],
    cantons: ['Liberia', 'Nicoya', 'Santa Cruz', 'Bagaces', 'Carrillo', 'Cañas', 'Abangares', 'Tilarán', 'Nandayure', 'La Cruz', 'Hojancha'],
  },
  {
    province: 'Puntarenas', relationId: 3223028, center: [9.2167, -83.7833],
    cantons: ['Puntarenas', 'Esparza', 'Buenos Aires', 'Montes de Oro', 'Osa', 'Quepos', 'Golfito', 'Coto Brus', 'Parrita', 'Corredores', 'Garabito', 'Monteverde', 'Puerto Jiménez'],
  },
  {
    province: 'Limón', relationId: 3223056, center: [10.0000, -83.2167],
    cantons: ['Limón', 'Pococí', 'Siquirres', 'Talamanca', 'Matina', 'Guácimo'],
  },
] as const;

export type OsmCategory = keyof typeof CATEGORY_LABELS;

export interface OsmSearchParams {
  province: string;
  canton?: string;
  category: string;
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  osm3s?: { timestamp_osm_base?: string };
  elements?: OverpassElement[];
}

@Injectable()
export class OsmService {
  constructor(
    @InjectRepository(OsmPlace)
    private readonly places: Repository<OsmPlace>,
    @InjectRepository(OsmQueryCache)
    private readonly cache: Repository<OsmQueryCache>,
    private readonly config: ConfigService,
  ) {}

  async sync(raw: OsmSearchParams) {
    const params = this.validate(raw);
    const queryKey = this.queryKey(params);
    const cached = await this.cache.findOneBy({ queryKey });
    const cacheAge = cached ? Date.now() - cached.fetchedAt.getTime() : Infinity;
    if (cached && cacheAge < 15 * 60 * 1000) {
      const result = await this.findAll(params);
      return {
        guardados: 0,
        encontrados: result.total,
        cache: true,
        fetchedAt: cached.fetchedAt,
        sourceUpdatedAt: cached.sourceUpdatedAt,
        center: result.center,
      };
    }

    const areaSetup = params.canton
      ? `area(${3_600_000_000 + params.provinceInfo.relationId})->.provinceArea;
rel(area.provinceArea)["boundary"="administrative"]["admin_level"="6"]["name"="${params.canton}"]->.boundary;
.boundary map_to_area ->.searchArea;`
      : `rel(${params.provinceInfo.relationId})->.boundary;
area(${3_600_000_000 + params.provinceInfo.relationId})->.searchArea;`;
    const boundaryLevel = params.canton ? '6' : '4';
    const query = `[out:json][timeout:30];
${areaSetup}
(
  .boundary;
  nwr["amenity"="${params.category}"](area.searchArea);
);
out center tags 251;`;

    const payload = await this.fetchOverpass(query);
    const boundary = (payload.elements ?? []).find((element) =>
      element.type === 'relation'
      && element.tags?.boundary === 'administrative'
      && element.tags?.admin_level === boundaryLevel,
    );
    if (!boundary) {
      throw new NotFoundException(
        `OpenStreetMap no encontró el límite administrativo de ${params.canton || params.province}.`,
      );
    }

    const boundaryCenter = boundary.center;
    const center = {
      latitude: boundaryCenter?.lat ?? params.provinceInfo.center[0],
      longitude: boundaryCenter?.lon ?? params.provinceInfo.center[1],
    };
    const sourceUpdatedAt = this.toDate(payload.osm3s?.timestamp_osm_base);
    const fetchedAt = new Date();
    const normalized = (payload.elements ?? [])
      .filter((element) => element !== boundary && element.tags?.amenity === params.category)
      .map((element) => this.normalize(element, params, sourceUpdatedAt, fetchedAt))
      .filter((place) => place !== undefined);

    await this.places.delete({
      province: params.province,
      canton: params.canton,
      category: params.category,
    });
    if (normalized.length > 0) {
      await this.places.upsert(normalized, ['osmType', 'osmId', 'province', 'canton']);
    }
    await this.cache.upsert(
      {
        queryKey,
        category: params.category,
        province: params.province,
        canton: params.canton,
        centerLatitude: center.latitude,
        centerLongitude: center.longitude,
        sourceUpdatedAt,
        fetchedAt,
      },
      ['queryKey'],
    );

    return {
      guardados: normalized.length,
      encontrados: normalized.length,
      cache: false,
      fetchedAt,
      sourceUpdatedAt,
      center,
    };
  }

  async findAll(raw: OsmSearchParams & { q?: string }) {
    const params = this.validate(raw);
    const where = {
      province: params.province,
      canton: params.canton,
      category: params.category,
      ...(raw.q?.trim() ? { name: ILike(`%${raw.q.trim()}%`) } : {}),
    };
    const data = await this.places.find({ where, order: { name: 'ASC' }, take: 250 });
    const cached = await this.cache.findOneBy({ queryKey: this.queryKey(params) });
    return {
      data,
      total: data.length,
      province: params.province,
      canton: params.canton || undefined,
      center: {
        latitude: cached?.centerLatitude ?? params.provinceInfo.center[0],
        longitude: cached?.centerLongitude ?? params.provinceInfo.center[1],
      },
    };
  }

  locations() {
    return LOCATIONS.map(({ province, cantons }) => ({ province, cantons: [...cantons] }));
  }

  private validate(raw: OsmSearchParams) {
    const province = raw.province?.trim();
    const canton = raw.canton?.trim() ?? '';
    const provinceInfo = LOCATIONS.find((item) => item.province === province);
    if (!provinceInfo) throw new BadRequestException('Seleccione una provincia válida de Costa Rica.');
    if (canton && !(provinceInfo.cantons as readonly string[]).includes(canton)) {
      throw new BadRequestException(`El cantón indicado no pertenece a ${province}.`);
    }
    if (!(raw.category in CATEGORY_LABELS)) {
      throw new BadRequestException('La categoría de OpenStreetMap no está permitida.');
    }
    return {
      province: provinceInfo.province,
      canton,
      provinceInfo,
      category: raw.category as OsmCategory,
    };
  }

  private queryKey(params: { province: string; canton: string; category: OsmCategory }) {
    return [params.province, params.canton || '*', params.category].join(':');
  }

  private async fetchOverpass(query: string) {
    const endpoint = this.config.get<string>('OVERPASS_URL')
      ?? 'https://overpass-api.de/api/interpreter';
    const userAgent = this.config.get<string>('OVERPASS_USER_AGENT')
      ?? 'observatorio-territorial-cr/0.1';
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 35_000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': userAgent,
        },
        body: new URLSearchParams({ data: query }),
        signal: abort.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as OverpassResponse;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'error desconocido';
      throw new ServiceUnavailableException(`Overpass no está disponible en este momento: ${detail}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalize(
    element: OverpassElement,
    params: { province: string; canton: string; category: OsmCategory },
    sourceUpdatedAt: Date | undefined,
    syncedAt: Date,
  ) {
    const latitude = element.lat ?? element.center?.lat;
    const longitude = element.lon ?? element.center?.lon;
    if (latitude === undefined || longitude === undefined) return undefined;
    const tags = element.tags ?? {};
    const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']]
      .filter(Boolean)
      .join(', ');
    return {
      osmType: element.type,
      osmId: String(element.id),
      province: params.province,
      canton: params.canton,
      category: params.category,
      name: tags.name ?? tags['name:es'] ?? `${CATEGORY_LABELS[params.category]} sin nombre`,
      latitude,
      longitude,
      address: address || undefined,
      phone: tags.phone ?? tags['contact:phone'],
      website: tags.website ?? tags['contact:website'],
      sourceUpdatedAt,
      syncedAt,
    };
  }

  private toDate(value?: string) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
}
