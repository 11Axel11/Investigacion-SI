'use client';

import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, MapPinned, Users } from 'lucide-react';
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

  const metrics = [
    {
      title: 'Electores agregados',
      value: (overview?.metadata.electors ?? 0).toLocaleString('es-CR'),
      icon: Users,
    },
    {
      title: 'Distritos cargados',
      value: (overview?.metadata.districts ?? 0).toLocaleString('es-CR'),
      icon: MapPinned,
    },
    {
      title: 'Provincias presentes',
      value: String(overview?.provinces.length ?? 0),
      icon: Landmark,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader crumbs={[{ label: 'Padrón' }]} title="Padrón" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Importar</CardTitle>
          <a
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            href="https://www.tse.go.cr/descarga_padron.html"
            target="_blank"
            rel="noreferrer"
          >
            ZIP del TSE
          </a>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto]" onSubmit={importFile}>
            <div className="grid gap-2">
              <Label htmlFor="tse-zip">Archivo ZIP (máximo 80 MB)</Label>
              <Input
                id="tse-zip"
                type="file"
                accept=".zip,application/zip"
                required
                onChange={(event) => setFile(event.target.files?.[0])}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source-date">Fecha de corte publicada</Label>
              <Input
                id="source-date"
                type="date"
                value={sourceDate}
                onChange={(event) => setSourceDate(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={!file || importMutation.isPending}>
                {importMutation.isPending ? 'Procesando…' : 'Procesar y agregar'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {importMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{importMutation.error.message}</AlertDescription>
        </Alert>
      )}
      {importMutation.data && (
        <p className="text-sm text-muted-foreground">
          {importMutation.data.processedElectors.toLocaleString('es-CR')} electores ·{' '}
          {importMutation.data.importedDistricts.toLocaleString('es-CR')} distritos
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {metrics.map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Por provincia</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {(overview?.provinces ?? []).map((province) => (
            <div key={province.province} className="grid grid-cols-[110px_minmax(0,1fr)_96px] items-center gap-3 text-sm">
              <span className="truncate">{province.province}</span>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(province.electors / maxElectors) * 100}%` }}
                />
              </div>
              <strong className="text-right font-medium tabular-nums">
                {province.electors.toLocaleString('es-CR')}
              </strong>
            </div>
          ))}
          {!overviewQuery.isLoading && !overview?.provinces.length && (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          )}
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Distritos</h2>
        <form
          className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({ ...draftFilters });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="filter-province">Provincia</Label>
            <Input
              id="filter-province"
              value={draftFilters.province}
              onChange={(event) => setDraftFilters({ ...draftFilters, province: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-canton">Cantón</Label>
            <Input
              id="filter-canton"
              value={draftFilters.canton}
              onChange={(event) => setDraftFilters({ ...draftFilters, canton: event.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-q">Distrito o código</Label>
            <Input
              id="filter-q"
              value={draftFilters.q}
              onChange={(event) => setDraftFilters({ ...draftFilters, q: event.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full">Filtrar</Button>
          </div>
        </form>
        {districtsQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>{districtsQuery.error.message}</AlertDescription>
          </Alert>
        )}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Provincia</TableHead>
                <TableHead>Cantón</TableHead>
                <TableHead>Distrito</TableHead>
                <TableHead>Electores</TableHead>
                <TableHead>Juntas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(districtsQuery.data?.data ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.electoralCode}</TableCell>
                  <TableCell>{row.province}</TableCell>
                  <TableCell>{row.canton}</TableCell>
                  <TableCell>{row.district}</TableCell>
                  <TableCell className="tabular-nums">{row.electors.toLocaleString('es-CR')}</TableCell>
                  <TableCell className="tabular-nums">{row.pollingStations.toLocaleString('es-CR')}</TableCell>
                </TableRow>
              ))}
              {!districtsQuery.isLoading && !districtsQuery.data?.data.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Sin datos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
