'use client';

import { X } from 'lucide-react';

import { ViabilityIndexRow } from '@/lib/api';
import { bandColor } from '@/lib/viability';

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
          detail={`${row.seguridad.crimes.toLocaleString('es-CR')} delitos registrados · tasa ${row.seguridad.ratePer1000 ?? '—'} por 1000 electores`}
        />
        <SourceCard
          title="Cobertura"
          source="OSM"
          score={row.cobertura.score}
          detail={`${row.cobertura.healthPoints} puntos de salud · ${row.cobertura.policePoints} de seguridad · ${row.cobertura.per10kElectors ?? '—'} por 10 000 electores`}
        />
        <SourceCard
          title="Electoral"
          source="TSE"
          score={row.electoral.score}
          detail={`${row.electoral.pollingStations} juntas receptoras · ${row.electoral.per10kElectors ?? '—'} por 10 000 electores`}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Las tres fuentes se cruzan por provincia+cantón (TSE, OSM, Poder Judicial vía OIJ). El puntaje normaliza cada fuente contra los demás cantones con dato disponible ese año, no contra una escala absoluta.
      </p>
    </div>
  );
}
