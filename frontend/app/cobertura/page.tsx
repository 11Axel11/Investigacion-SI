'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { ViabilityList } from '@/components/viability-list';
import { ViabilityPanel } from '@/components/viability-panel';
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
import { normalizeCantonKey } from '@/lib/viability';

const ViabilityMap = dynamic(() => import('@/components/viability-map').then((mod) => mod.ViabilityMap), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Cargando mapa…</div>,
});

export default function CoberturaPage() {
  const [province, setProvince] = useState('');
  const [canton, setCanton] = useState('');
  const [indexYear, setIndexYear] = useState(String(new Date().getFullYear()));
  const [viabilityProvince, setViabilityProvince] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const filters = { province: province || undefined, canton: canton || undefined };

  const healthQuery = useQuery({
    queryKey: ['coverage-health', filters],
    queryFn: () => api.coverage.health(filters),
  });
  const securityQuery = useQuery({
    queryKey: ['coverage-security', filters],
    queryFn: () => api.coverage.electoralSecurity(filters),
  });
  const businessTypesQuery = useQuery({
    queryKey: ['coverage-business-types', indexYear],
    queryFn: () => api.coverage.businessTypes({ year: Number(indexYear) }),
  });
  const viabilityQuery = useQuery({
    queryKey: ['coverage-viability-index', indexYear, businessType],
    queryFn: () => api.coverage.viabilityIndex({ year: Number(indexYear), businessType: businessType || undefined }),
  });

  const viabilityRows = viabilityQuery.data ?? [];
  const selectedRow = useMemo(
    () => viabilityRows.find((row) => normalizeCantonKey(row.province, row.canton) === selectedKey) ?? null,
    [viabilityRows, selectedKey],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="relative -mx-4 -mt-4 -mb-4 h-[calc(100vh-3.75rem)] overflow-hidden md:-mx-6 md:-mt-6 md:-mb-6">
        <div className="absolute inset-0">
          <ViabilityMap rows={viabilityRows} selectedKey={selectedKey} onSelect={setSelectedKey} province={viabilityProvince} />
        </div>

        <div className="absolute top-4 left-4 z-[1200] h-[calc(100%-2rem)] w-full max-w-xs">
          <ViabilityList
            rows={viabilityRows}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            year={indexYear}
            onYearChange={setIndexYear}
            province={viabilityProvince}
            onProvinceChange={setViabilityProvince}
            businessTypes={businessTypesQuery.data ?? []}
            businessType={businessType}
            onBusinessTypeChange={setBusinessType}
          />
        </div>

        {selectedRow && (
          <div className="absolute top-4 right-4 z-[1200] h-[calc(100%-2rem)] w-full max-w-sm">
            <ViabilityPanel row={selectedRow} onClose={() => setSelectedKey(null)} />
          </div>
        )}

        {viabilityQuery.isError && (
          <div className="absolute bottom-4 left-4 z-[1200] max-w-md">
            <Alert variant="destructive">
              <AlertDescription>{viabilityQuery.error.message}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
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
      </div>
    </div>
  );
}
