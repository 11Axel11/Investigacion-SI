'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { CantonHeatmap } from '@/components/canton-heatmap';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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

export default function CoberturaPage() {
  const [province, setProvince] = useState('');
  const [canton, setCanton] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const filters = { province: province || undefined, canton: canton || undefined };

  const healthQuery = useQuery({
    queryKey: ['coverage-health', filters],
    queryFn: () => api.coverage.health(filters),
  });
  const securityQuery = useQuery({
    queryKey: ['coverage-security', filters],
    queryFn: () => api.coverage.electoralSecurity(filters),
  });
  const crimeQuery = useQuery({
    queryKey: ['coverage-crime-rate', filters, year],
    queryFn: () => api.coverage.crimeRate({ ...filters, year: Number(year) }),
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader crumbs={[{ label: 'Cobertura' }]} title="Cobertura" />

      <form className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
        <div className="grid gap-2">
          <Label htmlFor="coverage-province">Provincia</Label>
          <Input id="coverage-province" value={province} onChange={(event) => setProvince(event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="coverage-canton">Cantón</Label>
          <Input id="coverage-canton" value={canton} onChange={(event) => setCanton(event.target.value)} />
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Salud</h2>
        {healthQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>{healthQuery.error.message}</AlertDescription>
          </Alert>
        )}
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provincia</TableHead>
                <TableHead>Cantón</TableHead>
                <TableHead>Electores</TableHead>
                <TableHead>Hospitales</TableHead>
                <TableHead>Clínicas</TableHead>
                <TableHead>Farmacias</TableHead>
                <TableHead>Electores/punto de salud</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(healthQuery.data ?? []).map((row) => (
                <TableRow key={`${row.province}-${row.canton}`}>
                  <TableCell>{row.province}</TableCell>
                  <TableCell className="font-medium">{row.canton}</TableCell>
                  <TableCell className="tabular-nums">{row.electors.toLocaleString('es-CR')}</TableCell>
                  <TableCell className="tabular-nums">{row.hospitals}</TableCell>
                  <TableCell className="tabular-nums">{row.clinics}</TableCell>
                  <TableCell className="tabular-nums">{row.pharmacies}</TableCell>
                  <TableCell className="tabular-nums">{row.electorsPerHealthPoint?.toLocaleString('es-CR') ?? 'Sin datos'}</TableCell>
                  <TableCell>
                    {row.deficit ? (
                      <Badge
                        variant="outline"
                        className={row.osmSynced
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'}
                      >
                        {row.osmSynced ? 'Déficit' : 'Sincronizar OSM'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Con cobertura
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!healthQuery.isLoading && !healthQuery.data?.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    Sin datos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Seguridad</h2>
        {securityQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>{securityQuery.error.message}</AlertDescription>
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
                <TableHead>Policía (cantón)</TableHead>
                <TableHead>Bomberos (cantón)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(securityQuery.data?.districts ?? []).map((row) => (
                <TableRow key={row.electoralCode}>
                  <TableCell className="font-medium">{row.electoralCode}</TableCell>
                  <TableCell>{row.province}</TableCell>
                  <TableCell>{row.canton}</TableCell>
                  <TableCell>{row.district}</TableCell>
                  <TableCell className="tabular-nums">{row.electors.toLocaleString('es-CR')}</TableCell>
                  <TableCell className="tabular-nums">{row.pollingStations}</TableCell>
                  <TableCell className="tabular-nums">{row.police}</TableCell>
                  <TableCell className="tabular-nums">{row.fireStations}</TableCell>
                </TableRow>
              ))}
              {!securityQuery.isLoading && !securityQuery.data?.districts.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground">
                    Sin datos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {!!securityQuery.data?.stations.length && (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cantón</TableHead>
                  <TableHead>Teléfono</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityQuery.data.stations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {station.category === 'police' ? 'Policía' : 'Bomberos'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell>{station.canton}</TableCell>
                    <TableCell>{station.phone ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">Seguridad ciudadana (OIJ + TSE + OSM)</h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="crime-year" className="text-xs text-muted-foreground">Año</Label>
            <Input
              id="crime-year"
              className="w-24"
              type="number"
              min={2015}
              max={new Date().getFullYear()}
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
        </div>
        {crimeQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>{crimeQuery.error.message}</AlertDescription>
          </Alert>
        )}
        <CantonHeatmap rows={crimeQuery.data ?? []} year={year} />
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provincia</TableHead>
                <TableHead>Cantón</TableHead>
                <TableHead>Electores</TableHead>
                <TableHead>Delitos ({year})</TableHead>
                <TableHead>Tasa /1000 electores</TableHead>
                <TableHead>Policía (OSM)</TableHead>
                <TableHead>Electores/policía</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(crimeQuery.data ?? []).map((row) => (
                <TableRow key={`${row.province}-${row.canton}`}>
                  <TableCell>{row.province}</TableCell>
                  <TableCell className="font-medium">{row.canton}</TableCell>
                  <TableCell className="tabular-nums">{row.electors.toLocaleString('es-CR')}</TableCell>
                  <TableCell className="tabular-nums">{row.crimes.toLocaleString('es-CR')}</TableCell>
                  <TableCell className="tabular-nums">{row.crimeRatePer1000Electors ?? 'Sin datos'}</TableCell>
                  <TableCell className="tabular-nums">{row.police}</TableCell>
                  <TableCell className="tabular-nums">{row.electorsPerPolice?.toLocaleString('es-CR') ?? 'Sin datos'}</TableCell>
                </TableRow>
              ))}
              {!crimeQuery.isLoading && !crimeQuery.data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Sin datos. {!crimeQuery.data?.some((row) => row.oijSynced) && 'Sincronice el OIJ para este año en la sección OIJ.'}
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
