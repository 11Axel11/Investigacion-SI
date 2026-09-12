import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OijDataset } from '../oij/oij-dataset.entity';
import { OsmPlace } from '../osm/osm-place.entity';
import { TseElectoralSummary } from '../tse/tse-electoral-summary.entity';

const HEALTH_CATEGORIES = ['hospital', 'clinic', 'pharmacy'] as const;
const SECURITY_CATEGORIES = ['police', 'fire_station'] as const;
// Comercios sincronizables en /mapa. Solo informativos (competencia
// existente por cantón): no entran en el cálculo del score de Cobertura.
const BUSINESS_CATEGORIES = [
  'bank', 'bar', 'restaurant', 'fuel', 'place_of_worship', 'veterinary',
  'supermarket', 'jewelry', 'bakery', 'hardware', 'clothes', 'alcohol',
  'books', 'hairdresser', 'car', 'mobile_phone',
] as const;

interface OsmCategoryCount {
  province: string;
  canton: string;
  category: string;
  total: string;
}

// TSE guarda "SAN JOSE" (mayúsculas, sin tildes); OSM guarda "San José".
// Se normaliza para poder cruzar y filtrar ambas fuentes por provincia+cantón.
function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();
}

function locationKey(province: string, canton: string) {
  return `${normalizeText(province)}::${normalizeText(canton)}`;
}

// El TSE usa variantes de nombre distintas al nombre oficial INEC que usan
// OSM/OIJ/el geoJSON de cantones. Se amplía esta tabla según se detecten más
// casos al importar el resto de provincias.
const CANTON_ALIASES: Record<string, string> = {
  'LEON CORTES CASTRO': 'LEON CORTES',
};

// El TSE nombra el cantón cabecera de 6 provincias literalmente "CENTRAL"
// (San José -> "CENTRAL") en vez del nombre oficial INEC ("SAN JOSE"). Sin
// esto, esos 6 cantones nunca cruzan con las otras fuentes.
function canonicalCanton(province: string, canton: string) {
  const normalized = normalizeText(canton);
  if (normalized === 'CENTRAL') return province;
  return CANTON_ALIASES[normalized] ?? canton;
}

function matchesFilter(rowValue: string, filterValue?: string) {
  if (!filterValue?.trim()) return true;
  return normalizeText(rowValue) === normalizeText(filterValue);
}

function minMax(values: number[]) {
  return { min: Math.min(...values), max: Math.max(...values) };
}

// Min-max a 0-100. Si todos los cantones tienen el mismo valor (rango 0),
// no hay con qué diferenciarlos: se asume el máximo (100) en vez de NaN.
function normalize(value: number, range: { min: number; max: number }) {
  if (range.max === range.min) return 100;
  return ((value - range.min) / (range.max - range.min)) * 100;
}

function band(score: number) {
  if (score >= 75) return 'ALTO';
  if (score >= 55) return 'MEDIO-ALTO';
  if (score >= 40) return 'MEDIO-BAJO';
  return 'BAJO';
}

@Injectable()
export class CoverageService {
  constructor(
    @InjectRepository(TseElectoralSummary)
    private readonly tse: Repository<TseElectoralSummary>,
    @InjectRepository(OsmPlace)
    private readonly osm: Repository<OsmPlace>,
    @InjectRepository(OijDataset)
    private readonly oij: Repository<OijDataset>,
  ) {}

  async healthCoverage(province?: string, canton?: string) {
    const tseRows = await this.tseElectorsByCanton();
    const osmByKey = await this.osmCountsByCanton(HEALTH_CATEGORIES);

    return tseRows
      .map((row) => ({ ...row, canton: canonicalCanton(row.province, row.canton) }))
      .filter((row) => matchesFilter(row.province, province) && matchesFilter(row.canton, canton))
      .map((row) => {
        const key = locationKey(row.province, row.canton);
        const counts = osmByKey.get(key) ?? {};
        const hospitals = counts.hospital ?? 0;
        const clinics = counts.clinic ?? 0;
        const pharmacies = counts.pharmacy ?? 0;
        const healthPoints = hospitals + clinics + pharmacies;
        const electors = Number(row.electors);
        return {
          province: row.province,
          canton: row.canton,
          electors,
          districts: Number(row.districts),
          hospitals,
          clinics,
          pharmacies,
          healthPoints,
          electorsPerHealthPoint: healthPoints > 0 ? Math.round(electors / healthPoints) : null,
          osmSynced: osmByKey.has(key),
          deficit: healthPoints === 0,
        };
      })
      .sort((a, b) => (b.electorsPerHealthPoint ?? Infinity) - (a.electorsPerHealthPoint ?? Infinity));
  }

  async electoralSecurity(province?: string, canton?: string) {
    const districts = await this.tse.createQueryBuilder('summary')
      .select([
        'summary.electoralCode AS "electoralCode"',
        'summary.province AS province',
        'summary.canton AS canton',
        'summary.district AS district',
        'summary.electors AS electors',
        'summary.pollingStations AS "pollingStations"',
      ])
      .getRawMany<{
        electoralCode: string; province: string; canton: string; district: string;
        electors: string; pollingStations: string;
      }>();

    const osmByKey = await this.osmCountsByCanton(SECURITY_CATEGORIES);
    const stations = (await this.osm.createQueryBuilder('place')
      .where('place.category IN (:...categories)', { categories: SECURITY_CATEGORIES })
      .orderBy('place.name', 'ASC')
      .getMany())
      .filter((place) => matchesFilter(place.province, province) && matchesFilter(place.canton, canton))
      .slice(0, 250);

    const districtRows = districts
      .map((row) => ({ ...row, canton: canonicalCanton(row.province, row.canton) }))
      .filter((row) => matchesFilter(row.province, province) && matchesFilter(row.canton, canton))
      .map((row) => {
        const counts = osmByKey.get(locationKey(row.province, row.canton)) ?? {};
        return {
          electoralCode: row.electoralCode,
          province: row.province,
          canton: row.canton,
          district: row.district,
          electors: Number(row.electors),
          pollingStations: Number(row.pollingStations),
          police: counts.police ?? 0,
          fireStations: counts.fire_station ?? 0,
        };
      })
      .sort((a, b) => b.electors - a.electors)
      .slice(0, 250);

    return { districts: districtRows, stations };
  }

  async crimeRate(province?: string, canton?: string, year?: string, businessType?: string) {
    const targetYear = this.year(year ?? new Date().getFullYear());
    const dataset = await this.oij.findOneBy({ year: targetYear });
    const crimesByKey = this.crimesByCantonKey(dataset?.groups, businessType);

    const tseRows = await this.tseElectorsByCanton();
    const policeByKey = await this.osmCountsByCanton(['police']);

    return tseRows
      .map((row) => ({ ...row, canton: canonicalCanton(row.province, row.canton) }))
      .filter((row) => matchesFilter(row.province, province) && matchesFilter(row.canton, canton))
      .map((row) => {
        const key = locationKey(row.province, row.canton);
        const electors = Number(row.electors);
        const crimes = crimesByKey.get(key) ?? 0;
        const police = policeByKey.get(key)?.police ?? 0;
        return {
          province: row.province,
          canton: row.canton,
          year: targetYear,
          electors,
          crimes,
          crimeRatePer1000Electors: electors > 0 ? Math.round((crimes / electors) * 1000 * 100) / 100 : null,
          police,
          electorsPerPolice: police > 0 ? Math.round(electors / police) : null,
          oijSynced: dataset != null,
        };
      })
      .sort((a, b) => (b.crimeRatePer1000Electors ?? -1) - (a.crimeRatePer1000Electors ?? -1));
  }

  // Índice compuesto 0-100 por cantón: 1/3 Seguridad (OIJ+TSE), 1/3 Cobertura
  // de servicios (OSM salud+seguridad por elector), 1/3 Electoral (juntas
  // receptoras por elector, proxy de infraestructura institucional). Cada
  // sub-score se normaliza min-max contra los cantones con dato disponible
  // ese año, no contra una escala absoluta.
  async viabilityIndex(year?: string, businessType?: string) {
    const targetYear = this.year(year ?? new Date().getFullYear());
    const dataset = await this.oij.findOneBy({ year: targetYear });
    const crimesByKey = this.crimesByCantonKey(dataset?.groups, businessType);

    const tseRows = await this.tseElectorsByCanton();
    const serviceByKey = await this.osmCountsByCanton([...HEALTH_CATEGORIES, ...SECURITY_CATEGORIES]);
    const businessByKey = await this.osmCountsByCanton(BUSINESS_CATEGORIES);

    const raw = tseRows.map((row) => {
      const province = row.province;
      const canton = canonicalCanton(row.province, row.canton);
      const key = locationKey(province, canton);
      const electors = Number(row.electors);
      const pollingStations = Number(row.pollingStations);
      const counts = serviceByKey.get(key) ?? {};
      const hospitals = counts.hospital ?? 0;
      const clinics = counts.clinic ?? 0;
      const pharmacies = counts.pharmacy ?? 0;
      const police = counts.police ?? 0;
      const fireStations = counts.fire_station ?? 0;
      const healthPoints = hospitals + clinics + pharmacies;
      const policePoints = police + fireStations;
      const crimes = crimesByKey.get(key) ?? 0;
      const businessCounts = businessByKey.get(key) ?? {};
      const businesses = Object.fromEntries(BUSINESS_CATEGORIES.map((c) => [c, businessCounts[c] ?? 0])) as Record<typeof BUSINESS_CATEGORIES[number], number>;
      return {
        province,
        canton,
        electors,
        pollingStations,
        hospitals,
        clinics,
        pharmacies,
        police,
        fireStations,
        healthPoints,
        policePoints,
        businesses,
        crimeRatePer1000Electors: electors > 0 ? (crimes / electors) * 1000 : null,
        crimes,
        coberturaPer10k: electors > 0 ? ((healthPoints + policePoints) / electors) * 10000 : null,
        electoralPer10k: electors > 0 ? (pollingStations / electors) * 10000 : null,
        oijSynced: dataset != null,
      };
    });

    const seguridadValues = raw.filter((r) => r.oijSynced && r.crimeRatePer1000Electors != null).map((r) => r.crimeRatePer1000Electors as number);
    const coberturaValues = raw.filter((r) => r.coberturaPer10k != null).map((r) => r.coberturaPer10k as number);
    const electoralValues = raw.filter((r) => r.electoralPer10k != null).map((r) => r.electoralPer10k as number);
    const seguridadRange = minMax(seguridadValues);
    const coberturaRange = minMax(coberturaValues);
    const electoralRange = minMax(electoralValues);

    const results = raw.map((row) => {
      const seguridadScore = row.oijSynced && row.crimeRatePer1000Electors != null
        ? 100 - normalize(row.crimeRatePer1000Electors, seguridadRange)
        : null;
      const coberturaScore = row.coberturaPer10k != null ? normalize(row.coberturaPer10k, coberturaRange) : null;
      const electoralScore = row.electoralPer10k != null ? normalize(row.electoralPer10k, electoralRange) : null;
      const subScores = [seguridadScore, coberturaScore, electoralScore];
      const dataComplete = subScores.every((value) => value != null);
      const score = dataComplete
        ? Math.round(((seguridadScore! + coberturaScore! + electoralScore!) / 3) * 10) / 10
        : null;
      return {
        province: row.province,
        canton: row.canton,
        year: targetYear,
        electors: row.electors,
        score,
        band: score == null ? null : band(score),
        dataComplete,
        seguridad: {
          score: seguridadScore == null ? null : Math.round(seguridadScore * 10) / 10,
          crimes: row.crimes,
          electors: row.electors,
          ratePer1000: row.crimeRatePer1000Electors == null ? null : Math.round(row.crimeRatePer1000Electors * 100) / 100,
          oijSynced: row.oijSynced,
          businessType: businessType ?? null,
        },
        cobertura: {
          score: coberturaScore == null ? null : Math.round(coberturaScore * 10) / 10,
          healthPoints: row.healthPoints,
          policePoints: row.policePoints,
          hospitals: row.hospitals,
          clinics: row.clinics,
          pharmacies: row.pharmacies,
          police: row.police,
          fireStations: row.fireStations,
          per10kElectors: row.coberturaPer10k == null ? null : Math.round(row.coberturaPer10k * 10) / 10,
        },
        electoral: {
          score: electoralScore == null ? null : Math.round(electoralScore * 10) / 10,
          pollingStations: row.pollingStations,
          electors: row.electors,
          per10kElectors: row.electoralPer10k == null ? null : Math.round(row.electoralPer10k * 10) / 10,
        },
        businesses: row.businesses,
      };
    });

    return results.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }

  // Tipos de negocio/edificación que el OIJ registra como objetivo del
  // delito (ej. FARMACIA, BANCO, BAR), para el filtro "tipo de negocio" del
  // mapa de viabilidad. Solo categoría EDIFICACION: PERSONA/VEHICULO/VIVIENDA
  // no son rubros de negocio.
  async businessTypes(year?: string) {
    const targetYear = this.year(year ?? new Date().getFullYear());
    const dataset = await this.oij.findOneBy({ year: targetYear });
    const types = new Set<string>();
    for (const group of dataset?.groups ?? []) {
      if (group.targetCategory === 'EDIFICACION' && group.targetType !== 'DESCONOCIDO') types.add(group.targetType);
    }
    return [...types].sort();
  }

  private year(value: unknown) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 2015 || year > new Date().getFullYear()) throw new BadRequestException('Seleccione un año válido desde 2015.');
    return year;
  }

  // Suma delitos por cantón, opcionalmente restringido a un tipo de objetivo
  // (ej. "FARMACIA") tomado del campo subvíctima del OIJ.
  private crimesByCantonKey(groups: OijDataset['groups'] | undefined, businessType?: string) {
    const crimesByKey = new Map<string, number>();
    for (const group of groups ?? []) {
      if (businessType && normalizeText(group.targetType) !== normalizeText(businessType)) continue;
      const key = locationKey(group.province, group.canton);
      crimesByKey.set(key, (crimesByKey.get(key) ?? 0) + group.count);
    }
    return crimesByKey;
  }

  private async tseElectorsByCanton() {
    return this.tse.createQueryBuilder('summary')
      .select('summary.province', 'province')
      .addSelect('summary.canton', 'canton')
      .addSelect('SUM(summary.electors)', 'electors')
      .addSelect('SUM(summary.pollingStations)', 'pollingStations')
      .addSelect('COUNT(*)', 'districts')
      .groupBy('summary.province')
      .addGroupBy('summary.canton')
      .getRawMany<{ province: string; canton: string; electors: string; pollingStations: string; districts: string }>();
  }

  private async osmCountsByCanton(categories: readonly string[]) {
    const rows = await this.osm.createQueryBuilder('place')
      .select('place.province', 'province')
      .addSelect('place.canton', 'canton')
      .addSelect('place.category', 'category')
      .addSelect('COUNT(*)', 'total')
      .where('place.category IN (:...categories)', { categories })
      .groupBy('place.province')
      .addGroupBy('place.canton')
      .addGroupBy('place.category')
      .getRawMany<OsmCategoryCount>();

    const byKey = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const key = locationKey(row.province, row.canton);
      const bucket = byKey.get(key) ?? {};
      bucket[row.category] = Number(row.total);
      byKey.set(key, bucket);
    }
    return byKey;
  }
}
