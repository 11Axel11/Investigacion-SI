# Observatorio Territorial y Electoral de Costa Rica

Sistema web académico que consume, transforma y visualiza dos fuentes OSINT relacionadas con Costa Rica. La aplicación permite explorar servicios cercanos publicados en OpenStreetMap y producir estadísticas territoriales agregadas a partir del Padrón Nacional Electoral del TSE.

## Problema y objetivo

Los datos públicos suelen estar dispersos en APIs y archivos institucionales difíciles de interpretar. Este proyecto los convierte en dos capacidades demostrables:

1. Un mapa e inventario de hospitales, clínicas, farmacias, centros educativos, policía y bomberos por provincia o cantón.
2. Un proceso ETL que lee un ZIP oficial del padrón y presenta conteos de electores y juntas por provincia, cantón y distrito electoral.

## Fuentes OSINT

| Fuente | Consumo | Transformación y capacidad | Responsable |
| ---|---|---|---|
| [OpenStreetMap / Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Consulta POST en Overpass QL sobre límites administrativos; respuesta JSON | Normaliza nodos, vías y relaciones, almacena caché y dibuja resultados sobre teselas OSM | Completar nombre |
| [TSE / Padrón Nacional Electoral](https://www.tse.go.cr/descarga_padron.html) | Carga batch de ZIP con archivos TXT | Relaciona `CODELEC` con `DISTELEC.TXT` y genera conteos agregados por territorio | Completar nombre |

No se evade autenticación, CAPTCHA ni controles de acceso. Overpass se consulta por áreas administrativas, limita cada respuesta a 250 objetos y usa caché de 15 minutos.

## Privacidad del padrón

El archivo del TSE incluye datos personales. La aplicación no los guarda ni ofrece búsquedas individuales. Durante la lectura en memoria utiliza solamente:

- `CODELEC`, para agrupar por distrito electoral.
- `JUNTA`, para contar juntas distintas.

Los campos de cédula, vencimiento y nombre se descartan. En PostgreSQL solo se almacenan conteos y nombres territoriales procedentes de `DISTELEC.TXT`.

## Arquitectura

```text
Overpass API ----> NestJS ----> normalización/caché ----> PostgreSQL
                                                            |
ZIP del TSE -----> NestJS ----> ETL agregado --------------+----> API propia ----> Next.js
```

- Frontend: Next.js, React, TypeScript y TanStack Query.
- Backend: NestJS, TypeScript, TypeORM y PostgreSQL.
- Formatos externos: JSON de Overpass y ZIP/TXT del TSE.
- Visualizaciones: mapa con teselas OSM, inventario territorial, indicadores y gráfico provincial.

## Requisitos

- Node.js 20 o superior.
- npm.
- PostgreSQL disponible en `localhost:5432` o en otra URL configurable.

## Configuración y ejecución

### Backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run start:dev
```

Variables de `backend/.env`:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/osint?schema=public"
PORT=3001
OVERPASS_URL=https://overpass-api.de/api/interpreter
OVERPASS_USER_AGENT=observatorio-territorial-cr/0.1
```

Antes de publicar, `OVERPASS_USER_AGENT` debe identificar el proyecto e incluir un medio de contacto. No se debe subir el `.env` con credenciales reales.

### Frontend

En otra terminal:

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Variable de `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Abre la URL indicada por Next.js, normalmente `http://localhost:3000`. Si el puerto está ocupado puede utilizar otro, como `3002`.

## Demostración sugerida

1. Iniciar PostgreSQL, backend y frontend.
2. En **Mapa OSM**, elegir provincia, cantón y categoría; ejecutar la consulta y mostrar el mapa, el enlace al objeto original y la fecha de obtención.
3. Descargar desde el TSE el ZIP de un cantón para que la demostración sea rápida.
4. En **Datos TSE**, indicar la fecha de corte publicada, importar el ZIP y mostrar la cantidad procesada, el resumen y los filtros territoriales.
5. Explicar que el proceso descarta datos personales y conserva exclusivamente agregaciones.

## API propia

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/osm/sync` | Consulta Overpass y guarda lugares normalizados |
| `GET` | `/osm/places` | Filtra lugares por provincia, cantón y categoría |
| `GET` | `/osm/locations` | Lista las provincias y cantones permitidos |
| `POST` | `/tse/import` | Procesa un ZIP oficial del padrón |
| `GET` | `/tse/overview` | Devuelve indicadores agregados por provincia |
| `GET` | `/tse/districts` | Busca agregaciones por provincia, cantón o distrito |

## Manejo de errores y limitaciones

- Overpass puede estar saturado; el backend limita la respuesta a 250 objetos, aplica un tiempo máximo y presenta un error comprensible.
- Las instancias públicas de Overpass tienen recursos limitados; la caché evita repetir la misma consulta durante 15 minutos.
- La cobertura de OSM depende de aportes comunitarios y puede ser incompleta.
- El importador acepta ZIP de hasta 80 MB y cinco millones de filas. Se recomienda usar archivos por cantón o provincia.
- La fecha de corte del TSE se registra manualmente porque forma parte de la procedencia del conjunto descargado.
- `synchronize: true` de TypeORM simplifica este laboratorio, pero debe sustituirse por migraciones antes de usar el sistema en producción.
