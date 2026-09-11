'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Download, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { oijApi } from '@/lib/api';

const number = (n: number) => n.toLocaleString('es-CR');
const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm';
const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function Bars({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.count));
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-4">
    {rows.map(row => <div key={row.name} className="space-y-1.5"><div className="flex justify-between gap-3 text-sm"><span>{row.name}</span><strong>{number(row.count)}</strong></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${100 * row.count / max}%` }} /></div></div>)}
    {!rows.length && <p className="text-sm text-muted-foreground">Sin registros para estos filtros.</p>}
  </CardContent></Card>;
}

export default function OijPage() {
  const client = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [filters, setFilters] = useState({ province: '', canton: '', crime: '' });
  const query = useQuery({ queryKey: ['oij', year, filters], queryFn: () => oijApi.overview({ year, ...filters }), retry: 1 });
  const sync = useMutation({ mutationFn: () => oijApi.sync(year), onSuccess: () => client.invalidateQueries({ queryKey: ['oij'] }) });
  const data = query.data;
  const meta = data?.metadata;
  const reset = () => setFilters({ province: '', canton: '', crime: '' });
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <PageHeader crumbs={[{ label: 'Datos OIJ' }]} title="Estadísticas policiales" />
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2"><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5" /> Seguridad en Costa Rica</CardTitle><p className="max-w-2xl text-sm text-muted-foreground">Explora los registros estadísticos del OIJ por territorio, delito y mes.</p></div><a className="inline-flex items-center gap-1 text-sm underline" href="https://datosabiertospj.poder-judicial.go.cr/dataset/estadisticas-policiales" target="_blank" rel="noreferrer">Fuente oficial <ExternalLink className="size-3" /></a></div></CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4"><div className="grid gap-2"><Label htmlFor="oij-year">Año del recurso</Label><select id="oij-year" className={selectClass} value={year} disabled={sync.isPending} onChange={e => { setYear(Number(e.target.value)); reset(); sync.reset(); }}>{Array.from({ length: new Date().getFullYear() - 2014 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y}>{y}</option>)}</select></div><Button disabled={sync.isPending} onClick={() => sync.mutate()}><Download className="size-4" />{sync.isPending ? 'Descargando y procesando…' : 'Sincronizar con OIJ'}</Button><p className="text-xs text-muted-foreground">Descarga real · caché de una hora · guardado en PostgreSQL</p></CardContent>
    </Card>
    {sync.isError && <Alert variant="destructive"><AlertDescription>{sync.error.message}</AlertDescription></Alert>}
    {query.isError && <Alert variant="destructive"><AlertDescription>{query.error.message}</AlertDescription></Alert>}
    {sync.isSuccess && <p role="status" className="text-sm text-muted-foreground">{number(sync.data.total)} registros procesados. {sync.data.cache ? 'Se utilizó la copia reciente.' : 'Datos actualizados desde la fuente oficial.'}</p>}
    {query.isPending ? <p role="status">Cargando estadísticas…</p> : !query.isError && !meta ? <Card><CardContent className="py-10 text-center"><h2 className="font-semibold">Este año todavía no tiene datos importados</h2><p className="mt-2 text-sm text-muted-foreground">Presiona “Sincronizar con OIJ” para descargar y analizar su CSV oficial.</p></CardContent></Card> : null}
    {meta && data && <>
      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-2"><Label htmlFor="oij-province">Provincia</Label><select id="oij-province" className={selectClass} value={filters.province} onChange={e => setFilters({ ...filters, province: e.target.value, canton: '' })}><option value="">Todas las provincias</option>{data.options.provinces.map(p => <option key={p}>{p}</option>)}</select></div>
        <div className="grid gap-2"><Label htmlFor="oij-canton">Cantón</Label><select id="oij-canton" className={selectClass} value={filters.canton} disabled={!filters.province} onChange={e => setFilters({ ...filters, canton: e.target.value })}><option value="">{filters.province ? 'Todos los cantones' : 'Selecciona una provincia'}</option>{data.options.cantons.map(p => <option key={p}>{p}</option>)}</select></div>
        <div className="grid gap-2"><Label htmlFor="oij-crime">Tipo de delito</Label><select id="oij-crime" className={selectClass} value={filters.crime} onChange={e => setFilters({ ...filters, crime: e.target.value })}><option value="">Todos los delitos</option>{data.options.crimes.map(p => <option key={p}>{p}</option>)}</select></div>
        <div className="flex items-end"><Button variant="outline" className="w-full" onClick={reset}>Limpiar filtros</Button></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">{[{ label: 'Registros en la selección', value: number(data.total) }, { label: 'Cantones en la selección', value: number(data.cantons.filter(r => r.canton !== 'DESCONOCIDO').length) }, { label: 'Tipos de delito', value: number(data.byCrime.length) }].map(m => <Card key={m.label}><CardHeader><CardTitle className="text-sm text-muted-foreground">{m.label}</CardTitle></CardHeader><CardContent className="text-3xl font-semibold tabular-nums">{m.value}</CardContent></Card>)}</div>
      <div className="grid gap-6 lg:grid-cols-2"><Bars title="Registros por provincia" rows={data.byProvince} /><Bars title="Distribución por delito" rows={data.byCrime} /></div>
      <Bars title="Evolución mensual · meses con registros" rows={data.byMonth.map(r => ({ ...r, name: `${months[Number(r.name.slice(5)) - 1]} ${year}` }))} />
      <Card><CardHeader><CardTitle>Comparación entre cantones</CardTitle></CardHeader><CardContent><div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-card"><tr className="border-b"><th className="p-3">Provincia</th><th className="p-3">Cantón</th><th className="p-3 text-right">Registros</th><th className="p-3 text-right">% de la selección</th></tr></thead><tbody>{data.cantons.map(r => <tr key={`${r.province}/${r.canton}`} className="border-b"><td className="p-3">{r.province}</td><td className="p-3">{r.canton}</td><td className="p-3 text-right tabular-nums">{number(r.count)}</td><td className="p-3 text-right">{(100 * r.count / data.total).toFixed(1)}%</td></tr>)}</tbody></table></div>{!data.total && <p className="py-4 text-sm text-muted-foreground">No hay registros que coincidan con los filtros.</p>}</CardContent></Card>
      <div className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground"><p><strong>Procedencia:</strong> Poder Judicial / OIJ · recurso {meta.year} · {number(meta.importedRecords)} filas importadas.</p><p>Fechas presentes en el archivo: {meta.firstDate} a {meta.lastDate}. Consulta: {new Date(meta.fetchedAt).toLocaleString('es-CR')}.</p><p><a className="underline" href={meta.sourceUrl} target="_blank" rel="noreferrer">Descargar el CSV utilizado</a></p><p className="mt-2">Son conteos de registros de la fuente, no tasas poblacionales ni estimaciones de riesgo individual. Un año o mes puede estar incompleto; la ausencia de registros no demuestra ausencia de delitos. No se almacenan perfiles personales.</p></div>
    </>}
  </div>;
}

