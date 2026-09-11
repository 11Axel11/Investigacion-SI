'use client';

import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export default function CoberturaPage() {
  const [province, setProvince] = useState('');
  const [canton, setCanton] = useState('');
  const filters = { province: province || undefined, canton: canton || undefined };

  const healthQuery = useQuery({
    queryKey: ['coverage-health', filters],
    queryFn: () => api.coverage.health(filters),
  });
  const securityQuery = useQuery({
    queryKey: ['coverage-security', filters],
    queryFn: () => api.coverage.electoralSecurity(filters),
  });

  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">Cruce de fuentes</span>
        <h1>Cobertura territorial de salud y seguridad electoral</h1>
        <p>
          Combina los electores agregados del TSE con la infraestructura pública registrada en OpenStreetMap.
          El cruce se hace por cantón, que es el nivel geográfico en común entre ambas fuentes.
        </p>
      </header>

      <aside className="privacy-note">
        <strong>Requisito previo:</strong> los conteos de OSM solo aparecen si ya sincronizaste esa provincia/cantón
        y categoría en <a href="/mapa">Mapa OSM</a> (hospital, clinic, pharmacy, police, fire_station). Sin
        sincronizar, la fila muestra cero infraestructura, no significa que no exista.
      </aside>

      <form className="filters" onSubmit={(event) => event.preventDefault()}>
        <label>Provincia<input value={province} onChange={(event) => setProvince(event.target.value)} /></label>
        <label>Cantón<input value={canton} onChange={(event) => setCanton(event.target.value)} /></label>
      </form>

      <section>
        <div className="section-title">
          <div>
            <span className="eyebrow">1 · Diagnóstico de cobertura de salud</span>
            <h2>Electores por cantón vs. infraestructura sanitaria</h2>
          </div>
        </div>
        <p>
          Detecta cantones con muchos electores y poca infraestructura de salud cercana, útil para priorizar
          inversión municipal o del ministerio de salud.
        </p>
        {healthQuery.isError && <div className="error">{healthQuery.error.message}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Provincia</th><th>Cantón</th><th>Electores</th><th>Hospitales</th><th>Clínicas</th>
                <th>Farmacias</th><th>Electores/punto de salud</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(healthQuery.data ?? []).map((row) => (
                <tr key={`${row.province}-${row.canton}`}>
                  <td>{row.province}</td><td>{row.canton}</td>
                  <td>{row.electors.toLocaleString('es-CR')}</td>
                  <td>{row.hospitals}</td><td>{row.clinics}</td><td>{row.pharmacies}</td>
                  <td>{row.electorsPerHealthPoint?.toLocaleString('es-CR') ?? 'Sin datos'}</td>
                  <td>
                    {row.deficit
                      ? (row.osmSynced ? 'Déficit: sin infraestructura registrada' : 'Sincronizar OSM')
                      : 'Con cobertura'}
                  </td>
                </tr>
              ))}
              {!healthQuery.isLoading && !healthQuery.data?.length && (
                <tr><td colSpan={8}>Importa el padrón del TSE para esta zona primero.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="section-title">
          <div>
            <span className="eyebrow">2 · Logística y seguridad electoral</span>
            <h2>Electores y juntas por distrito vs. policía y bomberos del cantón</h2>
          </div>
        </div>
        <p>
          Apoya la planificación de contingencia el día de elecciones: distritos con muchas juntas receptoras y
          poca cobertura de policía o bomberos en su cantón requieren refuerzo o ruta de emergencia definida.
        </p>
        {securityQuery.isError && <div className="error">{securityQuery.error.message}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Provincia</th><th>Cantón</th><th>Distrito</th><th>Electores</th>
                <th>Juntas</th><th>Policía (cantón)</th><th>Bomberos (cantón)</th>
              </tr>
            </thead>
            <tbody>
              {(securityQuery.data?.districts ?? []).map((row) => (
                <tr key={row.electoralCode}>
                  <td>{row.electoralCode}</td><td>{row.province}</td><td>{row.canton}</td><td>{row.district}</td>
                  <td>{row.electors.toLocaleString('es-CR')}</td><td>{row.pollingStations}</td>
                  <td>{row.police}</td><td>{row.fireStations}</td>
                </tr>
              ))}
              {!securityQuery.isLoading && !securityQuery.data?.districts.length && (
                <tr><td colSpan={8}>Importa el padrón del TSE para esta zona primero.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!!securityQuery.data?.stations.length && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tipo</th><th>Nombre</th><th>Cantón</th><th>Teléfono</th></tr></thead>
              <tbody>
                {securityQuery.data.stations.map((station) => (
                  <tr key={station.id}>
                    <td>{station.category === 'police' ? 'Policía' : 'Bomberos'}</td>
                    <td>{station.name}</td><td>{station.canton}</td><td>{station.phone ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
