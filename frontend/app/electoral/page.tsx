'use client';

import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';

export default function ElectoralPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File>();
  const [sourceDate, setSourceDate] = useState('');
  const [draftFilters, setDraftFilters] = useState({ province: '', canton: '', q: '' });
  const [filters, setFilters] = useState(draftFilters);

  const overviewQuery = useQuery({ queryKey: ['tse-overview'], queryFn: api.tse.overview });
  const districtsQuery = useQuery({
    queryKey: ['tse-districts', filters],
    queryFn: () => api.tse.districts(filters),
  });
  const importMutation = useMutation({
    mutationFn: ({ zip, date }: { zip: File; date?: string }) => api.tse.importZip(zip, date),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tse-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['tse-districts'] }),
      ]);
    },
  });

  const overview = overviewQuery.data;
  const maxElectors = useMemo(
    () => Math.max(...(overview?.provinces.map((province) => province.electors) ?? [1]), 1),
    [overview],
  );

  const importFile = (event: FormEvent) => {
    event.preventDefault();
    if (file) importMutation.mutate({ zip: file, date: sourceDate || undefined });
  };

  return (
    <>
      <header className="page-heading">
        <span className="eyebrow">Fuente 2 · Datos institucionales</span>
        <h1>Padrón Nacional Electoral agregado</h1>
        <p>
          El sistema procesa el ZIP oficial del TSE y conserva únicamente conteos por territorio.
          Las cédulas y los nombres nunca se guardan en la base de datos.
        </p>
      </header>

      <aside className="source-panel">
        <div><strong>Fuente:</strong> Tribunal Supremo de Elecciones de Costa Rica</div>
        <a href="https://www.tse.go.cr/descarga_padron.html" target="_blank" rel="noreferrer">
          Descargar ZIP oficial del padrón
        </a>
        {overview?.metadata.lastImport && (
          <div>
            Última importación: {new Date(overview.metadata.lastImport).toLocaleString('es-CR')}
            {overview.metadata.sourceDate ? ` · corte ${overview.metadata.sourceDate}` : ''}
          </div>
        )}
      </aside>

      <section className="import-panel">
        <div>
          <span className="eyebrow">ETL batch</span>
          <h2>Importar una provincia o cantón</h2>
          <p>
            Descarga un ZIP desde el TSE. Para una demostración ágil se recomienda empezar por un cantón.
            Debe contener el padrón, <code>DISTELEC.TXT</code> y <code>LEAME.TXT</code>.
          </p>
        </div>
        <form className="filters" onSubmit={importFile}>
          <label>
            Archivo ZIP (máximo 80 MB)
            <input type="file" accept=".zip,application/zip" required
              onChange={(event) => setFile(event.target.files?.[0])} />
          </label>
          <label>
            Fecha de corte publicada
            <input type="date" value={sourceDate} onChange={(event) => setSourceDate(event.target.value)} />
          </label>
          <button disabled={!file || importMutation.isPending}>
            {importMutation.isPending ? 'Procesando…' : 'Procesar y agregar'}
          </button>
        </form>
        {importMutation.isError && <div className="error">{importMutation.error.message}</div>}
        {importMutation.data && (
          <div className="success">
            {importMutation.data.processedElectors.toLocaleString('es-CR')} electores procesados en{' '}
            {importMutation.data.importedDistricts.toLocaleString('es-CR')} distritos. Los campos personales se descartaron.
          </div>
        )}
      </section>

      <section className="metric-grid">
        <article><span>Electores agregados</span><strong>{(overview?.metadata.electors ?? 0).toLocaleString('es-CR')}</strong></article>
        <article><span>Distritos cargados</span><strong>{(overview?.metadata.districts ?? 0).toLocaleString('es-CR')}</strong></article>
        <article><span>Provincias presentes</span><strong>{overview?.provinces.length ?? 0}</strong></article>
      </section>

      <section className="chart-panel">
        <div className="section-title"><div><span className="eyebrow">Comparación</span><h2>Electores por provincia</h2></div></div>
        <div className="bar-chart">
          {(overview?.provinces ?? []).map((province) => (
            <div className="bar-row" key={province.province}>
              <span>{province.province}</span>
              <div><i style={{ width: `${province.electors / maxElectors * 100}%` }} /></div>
              <strong>{province.electors.toLocaleString('es-CR')}</strong>
            </div>
          ))}
          {!overviewQuery.isLoading && !overview?.provinces.length && <p>Importa un ZIP para generar el resumen.</p>}
        </div>
      </section>

      <section>
        <div className="section-title"><div><span className="eyebrow">Detalle agregado</span><h2>Distritos electorales</h2></div></div>
        <form className="filters" onSubmit={(event) => { event.preventDefault(); setFilters({ ...draftFilters }); }}>
          <label>Provincia<input value={draftFilters.province}
            onChange={(event) => setDraftFilters({ ...draftFilters, province: event.target.value })} /></label>
          <label>Cantón<input value={draftFilters.canton}
            onChange={(event) => setDraftFilters({ ...draftFilters, canton: event.target.value })} /></label>
          <label>Distrito o código<input value={draftFilters.q}
            onChange={(event) => setDraftFilters({ ...draftFilters, q: event.target.value })} /></label>
          <button>Filtrar</button>
        </form>
        {districtsQuery.isError && <div className="error">{districtsQuery.error.message}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Código</th><th>Provincia</th><th>Cantón</th><th>Distrito</th><th>Electores</th><th>Juntas</th></tr></thead>
            <tbody>
              {(districtsQuery.data?.data ?? []).map((row) => (
                <tr key={row.id}>
                  <td>{row.electoralCode}</td><td>{row.province}</td><td>{row.canton}</td><td>{row.district}</td>
                  <td>{row.electors.toLocaleString('es-CR')}</td><td>{row.pollingStations.toLocaleString('es-CR')}</td>
                </tr>
              ))}
              {!districtsQuery.isLoading && !districtsQuery.data?.data.length && (
                <tr><td colSpan={6}>No hay datos agregados para mostrar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="privacy-note">
        <strong>Uso responsable:</strong> esta aplicación no ofrece búsquedas individuales. Durante el ETL solo lee
        código electoral y junta para producir conteos; el resto de campos se descarta en memoria.
      </aside>
    </>
  );
}
