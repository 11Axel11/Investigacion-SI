'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { OsmMap } from '@/components/osm-map';
import { PageHeader } from '@/components/page-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, OsmSearch } from '@/lib/api';
import { useOperatorMode } from '@/lib/operator';

const ALL_CANTONS = '__all__';

const DEFAULT_SEARCH: OsmSearch = {
  province: 'San José',
  canton: 'San José',
  category: 'hospital',
};

const CATEGORIES = [
  ['hospital', 'Hospitales'],
  ['clinic', 'Clínicas'],
  ['pharmacy', 'Farmacias'],
  ['school', 'Centros educativos'],
  ['police', 'Policía'],
  ['fire_station', 'Estaciones de bomberos'],
  ['bank', 'Bancos'],
  ['bar', 'Bares'],
  ['restaurant', 'Restaurantes/sodas'],
  ['fuel', 'Gasolineras'],
  ['place_of_worship', 'Iglesias/templos'],
  ['veterinary', 'Veterinarias'],
  ['supermarket', 'Supermercados'],
  ['jewelry', 'Joyerías'],
  ['bakery', 'Panaderías'],
  ['hardware', 'Ferreterías'],
  ['clothes', 'Tiendas de ropa'],
  ['alcohol', 'Licoreras'],
  ['books', 'Librerías'],
  ['hairdresser', 'Salones de belleza'],
  ['car', 'Venta de autos'],
  ['mobile_phone', 'Venta de celulares'],
];

export default function MapaPage() {
  const queryClient = useQueryClient();
  const operator = useOperatorMode();
  const [draft, setDraft] = useState(DEFAULT_SEARCH);
  const [search, setSearch] = useState(DEFAULT_SEARCH);

  const locationsQuery = useQuery({ queryKey: ['osm-locations'], queryFn: api.osm.locations });
  const availableCantons = useMemo(
    () => locationsQuery.data?.find((item) => item.province === draft.province)?.cantons ?? [],
    [draft.province, locationsQuery.data],
  );
  const placesQuery = useQuery({
    queryKey: ['osm-places', search],
    queryFn: () => api.osm.places(search),
  });
  const syncMutation = useMutation({
    mutationFn: api.osm.sync,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['osm-places'] }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = { ...draft };
    setSearch(next);
    // Consultar lo guardado es público; sincronizar con Overpass es una escritura del operador (Q-02).
    if (operator) syncMutation.mutate(next);
  };

  const changeProvince = (province: string) => {
    const firstCanton =
      locationsQuery.data?.find((item) => item.province === province)?.cantons[0] ?? '';
    setDraft({ ...draft, province, canton: firstCanton });
  };

  const places = placesQuery.data?.data ?? [];
  const center = placesQuery.data?.center ?? { latitude: 9.9281, longitude: -84.0907 };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        crumb="Mapa"
        title="Mapa OSM"
        description="Consulta servicios y lugares por provincia y cantón."
      />

      <form className="grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2" onSubmit={submit}>
        <div className="grid gap-1.5">
          <Label>Provincia</Label>
          <Select value={draft.province} onValueChange={changeProvince}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Provincia" />
            </SelectTrigger>
            <SelectContent>
              {(locationsQuery.data ?? []).map((item) => (
                <SelectItem key={item.province} value={item.province}>
                  {item.province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Cantón</Label>
          <Select
            value={draft.canton || ALL_CANTONS}
            onValueChange={(value) =>
              setDraft({ ...draft, canton: value === ALL_CANTONS ? '' : value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Cantón" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CANTONS}>Toda la provincia</SelectItem>
              {availableCantons.map((canton) => (
                <SelectItem key={canton} value={canton}>
                  {canton}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Tipo de servicio</Label>
          <Select
            value={draft.category}
            onValueChange={(value) => setDraft({ ...draft, category: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            type="submit"
            disabled={syncMutation.isPending || locationsQuery.isLoading}
          >
            {syncMutation.isPending ? 'Consultando Overpass…' : operator ? 'Consultar y guardar' : 'Consultar'}
          </Button>
        </div>
      </form>

      {syncMutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>{syncMutation.error.message}</AlertDescription>
        </Alert>
      )}
      {placesQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>{placesQuery.error.message}</AlertDescription>
        </Alert>
      )}
      {syncMutation.data && (
        <p className="text-sm text-muted-foreground">
          {syncMutation.data.encontrados.toLocaleString('es-CR')} lugares
          {syncMutation.data.cache ? ' · caché' : ''}
        </p>
      )}

      <Tabs defaultValue="mapa">
        <TabsList>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
          <TabsTrigger value="lugares">Lugares</TabsTrigger>
        </TabsList>

        <TabsContent value="mapa">
          <OsmMap latitude={center.latitude} longitude={center.longitude} places={places} />
        </TabsContent>

        <TabsContent value="lugares">
          <div className="overflow-hidden rounded-xl bg-card max-md:[&_th]:px-4 max-md:[&_td]:px-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lugar</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Provincia</TableHead>
                  <TableHead>Cantón</TableHead>
                  <TableHead>Objeto OSM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {places.map((place) => (
                  <TableRow key={place.id}>
                    <TableCell className="font-medium">{place.name}</TableCell>
                    <TableCell>{place.address || '—'}</TableCell>
                    <TableCell>{place.province}</TableCell>
                    <TableCell>{place.canton || 'Toda la provincia'}</TableCell>
                    <TableCell>
                      <a
                        className="underline-offset-4 hover:underline"
                        href={`https://www.openstreetmap.org/${place.osmType}/${place.osmId}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {place.osmType} {place.osmId}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
                {!placesQuery.isLoading && places.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      Sin resultados.
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
