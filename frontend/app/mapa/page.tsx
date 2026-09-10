'use client';

import { OsmMap } from '@/components/osm-map';
import { api, OsmSearch } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';

const DEFAULT_SEARCH: OsmSearch = {
  province: 'San José',
  canton: 'San José',
  category: 'hospital',
};

const CATEGORIES = [
  ['hospital', 'Hospitales'],
  ['clinic', 'Clínicas'],
  ['pharmacy', 'Farmacias'],
  ['school', 'Centros educativos'],
  ['police', 'Policía'],
  ['fire_station', 'Estaciones de bomberos'],
];

export default function MapaPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(DEFAULT_SEARCH);
  const [search, setSearch] = useState(DEFAULT_SEARCH);

  const locationsQuery = useQuery({ queryKey: ['osm-locations'], queryFn: api.osm.locations });
  const availableCantons = useMemo(
    () => locationsQuery.data?.find((item) => item.province === draft.province)?.cantons ?? [],
    [draft.province, locationsQuery.data],
  );
  const placesQuery = useQuery({
    queryKey: ['osm-places', search],
    queryFn: () => api.osm.places(search),
  });
  const syncMutation = useMutation({
    mutationFn: api.osm.sync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['osm-places'] }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = { ...draft };
    setSearch(next);
    syncMutation.mutate(next);
  };

  const changeProvince = (province: string) => {
    const firstCanton = locationsQuery.data?.find((item) => item.province === province)?.cantons[0] ?? '';
    setDraft({ ...draft, province, canton: firstCanton });
  };

  const places = placesQuery.data?.data ?? [];
  const center = placesQuery.data?.center ?? { latitude: 9.9281, longitude: -84.0907 };

  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">Fuente 1 · Geodatos comunitarios</span>
        <h1>Servicios por provincia y cantón</h1>
        <p>
          Selecciona una división administrativa de Costa Rica. Overpass busca los objetos que están
          dentro de su límite geográfico y el backend guarda una versión normalizada.
        </p>
      </header>

      <aside className="source-panel">
        <div><strong>Fuente:</strong> OpenStreetMap mediante Overpass API</div>
        <a href="https://wiki.openstreetmap.org/wiki/Costa_Rica" target="_blank" rel="noreferrer">
          Divisiones administrativas en OSM
        </a>
        {syncMutation.data && (
          <div>
            Consulta: {new Date(syncMutation.data.fetchedAt).toLocaleString('es-CR')}
            {syncMutation.data.cache ? ' · resultado servido desde caché' : ''}
          </div>
        )}
      </aside>

      <form className="filters search-grid" onSubmit={submit}>
        <label>
          Provincia
          <select value={draft.province} onChange={(event) => changeProvince(event.target.value)}>
            {(locationsQuery.data ?? []).map((item) => (
              <option key={item.province} value={item.province}>{item.province}</option>
            ))}
          </select>
        </label>
        <label>
          Cantón
          <select value={draft.canton} onChange={(event) => setDraft({ ...draft, canton: event.target.value })}>
            <option value="">Toda la provincia</option>
            {availableCantons.map((canton) => <option key={canton} value={canton}>{canton}</option>)}
          </select>
        </label>
        <label>
          Tipo de servicio
          <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
            {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="submit" disabled={syncMutation.isPending || locationsQuery.isLoading}>
          {syncMutation.isPending ? 'Consultando Overpass…' : 'Consultar y guardar'}
        </button>
      </form>

      {syncMutation.isError && <div className="error">{syncMutation.error.message}</div>}
      {placesQuery.isError && <div className="error">{placesQuery.error.message}</div>}
      {syncMutation.data && (
        <div className="success">
          {syncMutation.data.encontrados.toLocaleString('es-CR')} lugares encontrados en{' '}
          {search.canton || `la provincia de ${search.province}`}.
        </div>
      )}

      <section className="result-grid">
        <div>
          <div className="section-title">
            <div><span className="eyebrow">Visualización</span><h2>Mapa de resultados</h2></div>
            <strong>{places.length} lugares</strong>
          </div>
          <OsmMap latitude={center.latitude} longitude={center.longitude} places={places} />
        </div>
      </section>

      <section>
        <div className="section-title"><h2>Inventario normalizado</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Lugar</th><th>Dirección</th><th>Provincia</th><th>Cantón</th><th>Objeto OSM</th></tr></thead>
            <tbody>
              {places.map((place) => (
                <tr key={place.id}>
                  <td><strong>{place.name}</strong></td>
                  <td>{place.address || '—'}</td>
                  <td>{place.province}</td>
                  <td>{place.canton || 'Toda la provincia'}</td>
                  <td>
                    <a href={`https://www.openstreetmap.org/${place.osmType}/${place.osmId}`} target="_blank" rel="noreferrer">
                      {place.osmType} {place.osmId}
                    </a>
                  </td>
                </tr>
              ))}
              {!placesQuery.isLoading && places.length === 0 && (
                <tr><td colSpan={5}>No hay datos guardados. Ejecuta una consulta para esta zona.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="result-note">Cada consulta devuelve como máximo 250 objetos para respetar los recursos de la instancia pública.</p>
      </section>
    </>
  );
}
