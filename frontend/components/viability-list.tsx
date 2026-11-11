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
  province,
  onProvinceChange,
  canton,
  onCantonChange,
  businessTypes,
  businessType,
  onBusinessTypeChange,
}: {
  rows: ViabilityIndexRow[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  year: string;
  onYearChange: (year: string) => void;
  province: string;
  onProvinceChange: (province: string) => void;
  canton: string;
  onCantonChange: (canton: string) => void;
  businessTypes: string[];
  businessType: string;
  onBusinessTypeChange: (businessType: string) => void;
}) {
  const provinces = [...new Set(rows.map((row) => row.province))].sort();
  const cantons = [...new Set(rows.filter((row) => !province || row.province === province).map((row) => row.canton))].sort();
  const visibleRows = rows.filter((row) => (!province || row.province === province) && (!canton || row.canton === canton));

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-background/95 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] backdrop-blur-xl">
      <div className="flex shrink-0 flex-col gap-2 border-b border-border/60 p-3">
        <div className="flex items-center justify-between gap-2">
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
        <div className="grid gap-1.5">
          <Label htmlFor="index-province" className="sr-only">Provincia</Label>
          <select
            id="index-province"
            className="field-select"
            value={province}
            onChange={(event) => { onProvinceChange(event.target.value); onCantonChange(''); }}
          >
            <option value="">Todas las provincias</option>
            {provinces.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="index-canton" className="sr-only">Cantón</Label>
          <select
            id="index-canton"
            className="field-select"
            value={canton}
            disabled={!province}
            onChange={(event) => onCantonChange(event.target.value)}
          >
            <option value="">{province ? 'Todos los cantones' : 'Selecciona una provincia'}</option>
            {cantons.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="index-business-type" className="sr-only">Tipo de negocio</Label>
          <select
            id="index-business-type"
            className="field-select"
            value={businessType}
            onChange={(event) => onBusinessTypeChange(event.target.value)}
          >
            <option value="">Seguridad general (todo delito)</option>
            {businessTypes.map((t) => <option key={t} value={t}>Enfocado a: {t}</option>)}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
      {visibleRows.map((row) => {
        const key = normalizeCantonKey(row.province, row.canton);
        const isSelected = key === selectedKey;
        return (
          <button
            key={JSON.stringify([row.province, row.canton])}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted ${isSelected ? 'bg-muted' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: bandColor(row.band) }} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{row.canton}</span>
                <span className="text-xs text-muted-foreground">{row.electors.toLocaleString('es-CR')} empadronados</span>
              </span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{row.score ?? '—'}</span>
          </button>
        );
      })}
      {!visibleRows.length && <p className="p-3 text-sm text-muted-foreground">Sin cantones para esta provincia.</p>}
      </div>
    </div>
  );
}
