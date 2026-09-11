import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OsmPlace } from '../osm/osm-place.entity';
import { TseElectoralSummary } from '../tse/tse-electoral-summary.entity';

const HEALTH_CATEGORIES = ['hospital', 'clinic', 'pharmacy'] as const;
const SECURITY_CATEGORIES = ['police', 'fire_station'] as const;

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

function matchesFilter(rowValue: string, filterValue?: string) {
  if (!filterValue?.trim()) return true;
  return normalizeText(rowValue) === normalizeText(filterValue);
}

@Injectable()
export class CoverageService {
  constructor(
    @InjectRepository(TseElectoralSummary)
    private readonly tse: Repository<TseElectoralSummary>,
    @InjectRepository(OsmPlace)
    private readonly osm: Repository<OsmPlace>,
  ) {}

  async healthCoverage(province?: string, canton?: string) {
    const tseRows = await this.tse.createQueryBuilder('summary')
      .select('summary.province', 'province')
      .addSelect('summary.canton', 'canton')
      .addSelect('SUM(summary.electors)', 'electors')
      .addSelect('COUNT(*)', 'districts')
      .groupBy('summary.province')
      .addGroupBy('summary.canton')
      .getRawMany<{ province: string; canton: string; electors: string; districts: string }>();

    const osmByKey = await this.osmCountsByCanton(HEALTH_CATEGORIES);

    return tseRows
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
