import { ViabilityBand } from '@/lib/api';

// Paleta de estado (semáforo) — fija, nunca reutilizada para series categóricas.
export const BAND_COLORS: Record<ViabilityBand, string> = {
  ALTO: '#0ca30c',
  'MEDIO-ALTO': '#fab219',
  'MEDIO-BAJO': '#ec835a',
  BAJO: '#d03b3b',
};

export const NO_DATA_COLOR = '#c3c2b7';

export function bandColor(band: ViabilityBand | null) {
  return band ? BAND_COLORS[band] : NO_DATA_COLOR;
}

export function normalizeCantonKey(province: string, canton: string) {
  const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
  return `${normalize(province)}::${normalize(canton)}`;
}
