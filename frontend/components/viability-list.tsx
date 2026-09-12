'use client';

import { ViabilityIndexRow } from '@/lib/api';
import { bandColor, normalizeCantonKey } from '@/lib/viability';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ViabilityList({
  rows,
  selectedKey,
  onSelect,
  year,
  onYearChange,
}: {
  rows: ViabilityIndexRow[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  year: string;
  onYearChange: (year: string) => void;
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card shadow-lg">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b p-3">
        <div>
          <h2 className="text-sm font-medium">Índice de Viabilidad</h2>
          <p className="text-xs text-muted-foreground">Seguridad · Cobertura · Electoral</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="index-year" className="sr-only">Año</Label>
          <Input
            id="index-year"
            className="w-20"
            type="number"
            min={2015}
            max={new Date().getFullYear()}
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
      {rows.map((row) => {
        const key = normalizeCantonKey(row.province, row.canton);
        const isSelected = key === selectedKey;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-accent ${isSelected ? 'bg-accent' : ''}`}
          >
            <span className="flex items-center gap-2 truncate">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bandColor(row.band) }} />
              <span className="truncate">{row.canton}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{row.score ?? '—'}</span>
          </button>
        );
      })}
      {!rows.length && <p className="p-3 text-sm text-muted-foreground">Sin datos.</p>}
      </div>
    </div>
  );
}
