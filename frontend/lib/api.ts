const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    throw new Error(message || `Error ${response.status}`);
  }
  return response.json();
}

export interface OsmSearch {
  province: string;
  canton: string;
  category: string;
}

export interface OsmPlace {
  id: string;
  osmType: 'node' | 'way' | 'relation';
  osmId: string;
  province: string;
  canton: string;
  category: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  sourceUpdatedAt?: string;
  syncedAt: string;
}

export interface TseDistrict {
  id: string;
  electoralCode: string;
  province: string;
  canton: string;
  district: string;
  electors: number;
  pollingStations: number;
  sourceFile: string;
  sourceDate?: string;
  importedAt: string;
}

export interface TseProvinceSummary {
  province: string;
  electors: number;
  pollingStations: number;
  districts: number;
}

export interface HealthCoverageRow {
  province: string;
  canton: string;
  electors: number;
  districts: number;
  hospitals: number;
  clinics: number;
  pharmacies: number;
  healthPoints: number;
  electorsPerHealthPoint: number | null;
  osmSynced: boolean;
  deficit: boolean;
}

export interface ElectoralSecurityDistrict {
  electoralCode: string;
  province: string;
  canton: string;
  district: string;
  electors: number;
  pollingStations: number;
  police: number;
  fireStations: number;
}

export interface SecurityStation {
  id: string;
  category: string;
  name: string;
  canton: string;
  province: string;
  latitude: number;
  longitude: number;
  phone?: string;
}

const queryString = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(
    Object.entries(params)
      .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== '')
      .map(([key, value]) => [key, String(value)]),
  ).toString();

export const api = {
  osm: {
    sync: (body: OsmSearch) =>
      request<{
        guardados: number;
        encontrados: number;
        cache: boolean;
        fetchedAt: string;
        sourceUpdatedAt?: string;
        center: { latitude: number; longitude: number };
      }>('/osm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }),
    places: (params: OsmSearch & { q?: string }) =>
      request<{
        data: OsmPlace[];
        total: number;
        province: string;
        canton?: string;
        center: { latitude: number; longitude: number };
      }>(`/osm/places?${queryString({
        province: params.province,
        canton: params.canton,
        category: params.category,
        q: params.q,
      })}`),
    locations: () =>
      request<Array<{ province: string; cantons: string[] }>>('/osm/locations'),
  },
  tse: {
    importZip: (file: File, sourceDate?: string) => {
      const form = new FormData();
      form.append('file', file);
      return request<{
        importedDistricts: number;
        processedElectors: number;
        discardedPersonalFields: boolean;
        sourceFile: string;
        sourceDate?: string;
        importedAt: string;
      }>(`/tse/import?${queryString({ sourceDate })}`, { method: 'POST', body: form });
    },
    districts: (params: { province?: string; canton?: string; q?: string }) =>
      request<{ data: TseDistrict[]; total: number }>(`/tse/districts?${queryString(params)}`),
    overview: () =>
      request<{
        provinces: TseProvinceSummary[];
        metadata: { lastImport?: string; sourceDate?: string; districts: number; electors: number };
      }>('/tse/overview'),
  },
  coverage: {
    health: (params: { province?: string; canton?: string }) =>
      request<HealthCoverageRow[]>(`/coverage/health?${queryString(params)}`),
    electoralSecurity: (params: { province?: string; canton?: string }) =>
      request<{ districts: ElectoralSecurityDistrict[]; stations: SecurityStation[] }>(
        `/coverage/electoral-security?${queryString(params)}`,
      ),
  },
};

export interface OijOverview {
  total: number;
  years: number[];
  byProvince: { name: string; count: number }[];
  byCrime: { name: string; count: number }[];
  byMonth: { name: string; count: number }[];
  cantons: { province: string; canton: string; count: number }[];
  options: { provinces: string[]; cantons: string[]; crimes: string[] };
  metadata: { year: number; source: string; sourceUrl: string; fetchedAt: string; firstDate: string; lastDate: string; importedRecords: number } | null;
}
export const oijApi = {
  overview: (params: { year: number; province: string; canton: string; crime: string }) => request<OijOverview>(`/oij/overview?${queryString(params)}`),
  sync: (year: number) => request<{ total: number; cache: boolean }>('/oij/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year }) }),
};
