'use client';

import { X } from 'lucide-react';

import { BUSINESS_CATEGORY_LABELS, ViabilityIndexRow } from '@/lib/api';
import { bandColor } from '@/lib/viability';

function perPointLabel(electors: number, count: number) {
  return count > 0 ? `${Math.round(electors / count).toLocaleString('es-CR')} empadronados/punto` : 'Sin datos';
}

function ServiceRow({ label, electors, count }: { label: string; electors: number; count: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="tabular-nums">{count}</span>
        <span className="text-muted-foreground">{perPointLabel(electors, count)}</span>
      </span>
    </div>
  );
}

function SourceCard({
  title,
  source,
  score,
  detail,
}: {
  title: string;
  source: string;
  score: number | null;
  detail: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">{title} · {source}</p>
        <p className="tabular-nums text-sm font-medium">{score ?? '—'}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function ViabilityPanel({ row, onClose }: { row: ViabilityIndexRow; onClose: () => void }) {
  const color = bandColor(row.band);
  const businesses = Object.entries(row.businesses).sort((a, b) => b[1] - a[1]);
  const businessesWithData = businesses.filter(([, count]) => count > 0);

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto rounded-xl border bg-card p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{row.province}</p>
          <h3 className="text-sm font-semibold">{row.canton} · Índice de Viabilidad</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <p className="text-sm">
        <span className="font-semibold tabular-nums">{row.electors.toLocaleString('es-CR')}</span>{' '}
        <span className="text-muted-foreground">empadronados</span>
      </p>

      <div className="rounded-lg p-3" style={{ backgroundColor: `${color}1a` }}>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums" style={{ color }}>{row.score ?? '—'}</span>
          {row.band && (
            <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${color}33`, color }}>
              {row.band}
            </span>
          )}
        </div>
        {row.dataComplete ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            = 33.3% × {row.seguridad.score} (Seguridad) + 33.3% × {row.cobertura.score} (Cobertura) + 33.3% × {row.electoral.score} (Electoral)
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Datos incompletos para {row.year}{!row.seguridad.oijSynced && ' — sincronice el OIJ en la sección OIJ'}.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">RESUMEN POR FUENTE</p>
        <SourceCard
          title="Seguridad"
          source="OIJ + TSE"
          score={row.seguridad.score}
          detail={
            row.seguridad.businessType
              ? `${row.seguridad.crimes.toLocaleString('es-CR')} delitos contra ${row.seguridad.businessType.toLowerCase()} · tasa ${row.seguridad.ratePer1000 ?? '—'} por 1000 electores`
              : `${row.seguridad.crimes.toLocaleString('es-CR')} delitos registrados · tasa ${row.seguridad.ratePer1000 ?? '—'} por 1000 electores`
          }
        />
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Cobertura · OSM</p>
            <p className="tabular-nums text-sm font-medium">{row.cobertura.score ?? '—'}</p>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            <ServiceRow label="Hospitales" electors={row.electors} count={row.cobertura.hospitals} />
            <ServiceRow label="Clínicas" electors={row.electors} count={row.cobertura.clinics} />
            <ServiceRow label="Farmacias" electors={row.electors} count={row.cobertura.pharmacies} />
            <ServiceRow label="Policía" electors={row.electors} count={row.cobertura.police} />
            <ServiceRow label="Bomberos" electors={row.electors} count={row.cobertura.fireStations} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{row.cobertura.per10kElectors ?? '—'} puntos por 10 000 empadronados (total)</p>
        </div>
        <SourceCard
          title="Electoral"
          source="TSE"
          score={row.electoral.score}
          detail={`${row.electoral.pollingStations} juntas receptoras · ${row.electoral.per10kElectors ?? '—'} por 10 000 electores`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground">COMERCIOS (OSM) · no entra en el puntaje</p>
        <div className="rounded-lg border p-3">
          {businessesWithData.length > 0 ? (
            <div className="flex flex-col gap-1">
              {businesses.map(([key, count]) => (
                <ServiceRow key={key} label={BUSINESS_CATEGORY_LABELS[key] ?? key} electors={row.electors} count={count} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Sin comercios sincronizados en este cantón. Sincronícelos desde /mapa (Bancos, Bares, Supermercados, Joyerías, etc.).</p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Las tres fuentes se cruzan por provincia+cantón (TSE, OSM, Poder Judicial vía OIJ). El puntaje normaliza cada fuente contra los demás cantones con dato disponible ese año, no contra una escala absoluta.
      </p>
    </div>
  );
}
