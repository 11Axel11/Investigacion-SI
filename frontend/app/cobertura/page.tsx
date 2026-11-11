'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { PanelLeft } from 'lucide-react';

import { ViabilityList } from '@/components/viability-list';
import { ViabilityPanel } from '@/components/viability-panel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const ViabilityMap = dynamic(
  () => import('@/components/viability-map').then((mod) => mod.ViabilityMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
        Cargando mapa…
      </div>
    ),
  },
);

export default function CoberturaPage() {
  const [tab, setTab] = useState('mapa');
  const [province, setProvince] = useState('');
  const [canton, setCanton] = useState('');
  const [indexYear, setIndexYear] = useState(String(new Date().getFullYear()));
  const [viabilityProvince, setViabilityProvince] = useState('');
  const [viabilityCanton, setViabilityCanton] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const filters = { province: province || undefined, canton: canton || undefined };

  const healthQuery = useQuery({
    queryKey: ['coverage-health', filters],
    queryFn: () => api.coverage.health(filters),
    enabled: tab === 'salud',
  });
  const securityQuery = useQuery({
    queryKey: ['coverage-security', filters],
    queryFn: () => api.coverage.electoralSecurity(filters),
    enabled: tab === 'seguridad',
  });
  const businessTypesQuery = useQuery({
    queryKey: ['coverage-business-types', indexYear],
    queryFn: () => api.coverage.businessTypes({ year: Number(indexYear) }),
    enabled: tab === 'mapa',
  });
  const viabilityQuery = useQuery({
    queryKey: ['coverage-viability-index', indexYear, businessType],
    queryFn: () =>
      api.coverage.viabilityIndex({
        year: Number(indexYear),
        businessType: businessType || undefined,
      }),
    enabled: tab === 'mapa',
  });

  const viabilityRows = useMemo(() => viabilityQuery.data ?? [], [viabilityQuery.data]);
  const selectedRow = useMemo(
    () =>
      viabilityRows.find((row) => normalizeCantonKey(row.province, row.canton) === selectedKey) ??
      null,
    [viabilityRows, selectedKey],
  );

  return (
    <div className="relative h-svh w-full overflow-hidden">
      {/* Mapa a pantalla completa */}
      {tab === 'mapa' && (
        <div className="absolute inset-0">
          <ViabilityMap
            rows={viabilityRows}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            province={viabilityProvince}
            canton={viabilityCanton}
            businessType={businessType}
          />
        </div>
      )}

      {/* Barra superior flotante */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1300] flex items-start justify-between gap-3 p-3 md:p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <SidebarTrigger className="size-9 rounded-full bg-background/95 shadow-sm backdrop-blur-xl max-md:hidden" />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="size-9 rounded-full bg-background/95 shadow-sm backdrop-blur-xl md:hidden"
            aria-label={listOpen ? 'Ocultar lista' : 'Mostrar lista'}
            onClick={() => setListOpen((open) => !open)}
          >
            <PanelLeft className="size-4" />
          </Button>
        </div>

        <div className="pointer-events-auto rounded-full bg-background/95 p-1 shadow-sm backdrop-blur-xl">
          <Tabs value={tab} onValueChange={setTab} className="gap-0">
            <TabsList className="gap-0 border-0">
              {(['mapa', 'salud', 'seguridad'] as const).map((value) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="-mb-0 rounded-full border-0 px-3 py-1.5 pb-1.5 text-sm data-[state=active]:bg-foreground data-[state=active]:text-background"
                >
                  {value === 'mapa' ? 'Mapa' : value === 'salud' ? 'Salud' : 'Seguridad'}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="size-9 max-md:hidden" aria-hidden />
      </div>

      {tab === 'mapa' && listOpen && (
        <div className="absolute top-16 left-3 z-[1200] h-[calc(100%-5rem-var(--nav-reserve))] w-[min(calc(100%-1.5rem),18rem)] md:left-4 md:h-[calc(100%-5rem)]">
          <ViabilityList
            rows={viabilityRows}
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            year={indexYear}
            onYearChange={setIndexYear}
            province={viabilityProvince}
            onProvinceChange={setViabilityProvince}
            canton={viabilityCanton}
            onCantonChange={setViabilityCanton}
            businessTypes={businessTypesQuery.data ?? []}
            businessType={businessType}
            onBusinessTypeChange={setBusinessType}
          />
        </div>
      )}

      {tab === 'mapa' && selectedRow && (
        <div className="absolute top-16 right-3 z-[1200] hidden h-[calc(100%-5rem)] w-full max-w-sm md:right-4 md:block">
          <ViabilityPanel row={selectedRow} onClose={() => setSelectedKey(null)} />
        </div>
      )}

      {tab === 'mapa' && selectedRow && (
        <div className="absolute inset-x-3 bottom-[calc(var(--nav-reserve)+0.5rem)] z-[1200] max-h-[40%] overflow-hidden md:hidden">
          <ViabilityPanel row={selectedRow} onClose={() => setSelectedKey(null)} />
        </div>
      )}

      {tab === 'mapa' && viabilityQuery.isError && (
        <div className="absolute bottom-4 left-1/2 z-[1200] max-w-md -translate-x-1/2">
          <Alert variant="destructive">
            <AlertDescription>{viabilityQuery.error.message}</AlertDescription>
          </Alert>
        </div>
      )}

      {tab === 'salud' && (
        <div className="absolute inset-0 overflow-auto bg-background px-4 pt-16 pb-[calc(var(--nav-reserve)+4.5rem)] md:px-6 md:pb-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <form
              className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="coverage-province">Provincia</Label>
                <Input
                  id="coverage-province"
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="coverage-canton">Cantón</Label>
                <Input
                  id="coverage-canton"
                  value={canton}
                  onChange={(event) => setCanton(event.target.value)}
                />
              </div>
            </form>

            {healthQuery.isError && (
              <Alert variant="destructive">
                <AlertDescription>{healthQuery.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="overflow-hidden rounded-xl bg-card max-md:[&_th]:px-4 max-md:[&_td]:px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provincia</TableHead>
                    <TableHead>Cantón</TableHead>
                    <TableHead>Electores</TableHead>
                    <TableHead>Hospitales</TableHead>
                    <TableHead>Clínicas</TableHead>
                    <TableHead>Farmacias</TableHead>
                    <TableHead>Electores/punto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(healthQuery.data ?? []).map((row) => (
                    <TableRow key={`${row.province}-${row.canton}`}>
                      <TableCell>{row.province}</TableCell>
                      <TableCell className="font-medium">{row.canton}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.electors.toLocaleString('es-CR')}
                      </TableCell>
                      <TableCell className="tabular-nums">{row.hospitals}</TableCell>
                      <TableCell className="tabular-nums">{row.clinics}</TableCell>
                      <TableCell className="tabular-nums">{row.pharmacies}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.electorsPerHealthPoint?.toLocaleString('es-CR') ?? 'Sin datos'}
                      </TableCell>
                      <TableCell>
                        {row.deficit ? (
                          <Badge
                            variant="outline"
                            className={
                              row.osmSynced
                                ? 'border-transparent bg-red-50 text-red-700'
                                : 'border-transparent bg-amber-50 text-amber-700'
                            }
                          >
                            {row.osmSynced ? 'Déficit' : 'Sincronizar OSM'}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-transparent bg-emerald-50 text-emerald-700"
                          >
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
          </div>
        </div>
      )}

      {tab === 'seguridad' && (
        <div className="absolute inset-0 overflow-auto bg-background px-4 pt-16 pb-[calc(var(--nav-reserve)+4.5rem)] md:px-6 md:pb-8">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <form
              className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="security-province">Provincia</Label>
                <Input
                  id="security-province"
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="security-canton">Cantón</Label>
                <Input
                  id="security-canton"
                  value={canton}
                  onChange={(event) => setCanton(event.target.value)}
                />
              </div>
            </form>

            {securityQuery.isError && (
              <Alert variant="destructive">
                <AlertDescription>{securityQuery.error.message}</AlertDescription>
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
                    <TableHead>Policía</TableHead>
                    <TableHead>Bomberos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(securityQuery.data?.districts ?? []).map((row) => (
                    <TableRow key={row.electoralCode}>
                      <TableCell className="font-medium">{row.electoralCode}</TableCell>
                      <TableCell>{row.province}</TableCell>
                      <TableCell>{row.canton}</TableCell>
                      <TableCell>{row.district}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.electors.toLocaleString('es-CR')}
                      </TableCell>
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
              <div className="overflow-hidden rounded-xl bg-card max-md:[&_th]:px-4 max-md:[&_td]:px-4">
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
                          <Badge variant="outline" className="border-transparent bg-muted">
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
          </div>
        </div>
      )}
    </div>
  );
}
