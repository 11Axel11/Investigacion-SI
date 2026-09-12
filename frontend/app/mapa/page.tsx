'use client';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, OsmSearch } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useMemo, useState } from 'react';

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
    syncMutation.mutate(next);
  };

  const changeProvince = (province: string) => {
    const firstCanton = locationsQuery.data?.find((item) => item.province === province)?.cantons[0] ?? '';
    setDraft({ ...draft, province, canton: firstCanton });
  };

  const places = placesQuery.data?.data ?? [];
  const center = placesQuery.data?.center ?? { latitude: 9.9281, longitude: -84.0907 };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader crumbs={[{ label: 'Mapa' }]} title="Mapa" />

      <form className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
        <div className="grid gap-2">
          <Label>Provincia</Label>
          <Select value={draft.province} onValueChange={changeProvince}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Provincia" />
            </SelectTrigger>
            <SelectContent>
              {(locationsQuery.data ?? []).map((item) => (
                <SelectItem key={item.province} value={item.province}>{item.province}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Cantón</Label>
          <Select
            value={draft.canton || ALL_CANTONS}
            onValueChange={(value) => setDraft({ ...draft, canton: value === ALL_CANTONS ? '' : value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Cantón" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CANTONS}>Toda la provincia</SelectItem>
              {availableCantons.map((canton) => (
                <SelectItem key={canton} value={canton}>{canton}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Tipo de servicio</Label>
          <Select value={draft.category} onValueChange={(value) => setDraft({ ...draft, category: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button className="w-full" type="submit" disabled={syncMutation.isPending || locationsQuery.isLoading}>
            {syncMutation.isPending ? 'Consultando Overpass…' : 'Consultar y guardar'}
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

      <OsmMap latitude={center.latitude} longitude={center.longitude} places={places} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Lugares</h2>
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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
      </section>
    </div>
  );
}
