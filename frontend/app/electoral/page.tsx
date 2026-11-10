'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, MapPinned, Users } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';

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
      title: 'Electores',
      value: (overview?.metadata.electors ?? 0).toLocaleString('es-CR'),
      icon: Users,
    },
    {
      title: 'Distritos',
      value: (overview?.metadata.districts ?? 0).toLocaleString('es-CR'),
      icon: MapPinned,
    },
    {
      title: 'Provincias',
      value: String(overview?.provinces.length ?? 0),
      icon: Landmark,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumb="Padrón"
        title="Padrón electoral"
        description="Importa el ZIP del TSE y consulta electores por distrito."
      />

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="distritos">Distritos</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          <div className="grid gap-3 sm:grid-cols-3">
            {metrics.map(({ title, value, icon: Icon }) => (
              <Card key={title} className="bg-muted/40">
                <CardHeader className="flex flex-row items-center justify-between pb-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                  <Icon className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-muted/40">
            <CardHeader>
              <CardTitle>Por provincia</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(overview?.provinces ?? []).map((province) => (
                <div
                  key={province.province}
                  className="grid grid-cols-[110px_minmax(0,1fr)_96px] items-center gap-3 text-sm"
                >
                  <span className="truncate">{province.province}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-background">
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
        </TabsContent>

        <TabsContent value="importar">
          <form className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2" onSubmit={importFile}>
            <div className="grid gap-1.5 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="tse-zip">Archivo ZIP (máximo 80 MB)</Label>
                <a
                  className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  href="https://www.tse.go.cr/descarga_padron.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  ZIP del TSE
                </a>
              </div>
              <Input
                id="tse-zip"
                type="file"
                accept=".zip,application/zip"
                required
                onChange={(event) => setFile(event.target.files?.[0])}
              />
            </div>
            <div className="grid gap-1.5">
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
        </TabsContent>

        <TabsContent value="distritos">
          <form
            className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              setFilters({ ...draftFilters });
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="filter-province">Provincia</Label>
              <Input
                id="filter-province"
                value={draftFilters.province}
                onChange={(event) =>
                  setDraftFilters({ ...draftFilters, province: event.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-canton">Cantón</Label>
              <Input
                id="filter-canton"
                value={draftFilters.canton}
                onChange={(event) =>
                  setDraftFilters({ ...draftFilters, canton: event.target.value })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-q">Distrito o código</Label>
              <Input
                id="filter-q"
                value={draftFilters.q}
                onChange={(event) => setDraftFilters({ ...draftFilters, q: event.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" variant="outline">
                Filtrar
              </Button>
            </div>
          </form>

          {districtsQuery.isError && (
            <Alert variant="destructive">
              <AlertDescription>{districtsQuery.error.message}</AlertDescription>
            </Alert>
          )}

          <div className="overflow-hidden rounded-xl bg-card max-md:[&_th]:px-4 max-md:[&_td]:px-4">
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
                    <TableCell className="tabular-nums">
                      {row.electors.toLocaleString('es-CR')}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.pollingStations.toLocaleString('es-CR')}
                    </TableCell>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
