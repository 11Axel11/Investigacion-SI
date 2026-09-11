# Observatorio Territorial y Electoral de Costa Rica

Sistema web académico que consume, transforma y visualiza tres fuentes OSINT relacionadas con Costa Rica. La aplicación permite explorar servicios cercanos publicados en OpenStreetMap y producir estadísticas territoriales agregadas a partir del Padrón Nacional Electoral del TSE.

## Problema y objetivo

Los datos públicos suelen estar dispersos en APIs y archivos institucionales difíciles de interpretar. Este proyecto los convierte en tres capacidades demostrables:

1. Un mapa e inventario de hospitales, clínicas, farmacias, centros educativos, policía y bomberos por provincia o cantón.
2. Un proceso ETL que lee un ZIP oficial del padrón y presenta conteos de electores y juntas por provincia, cantón y distrito electoral.

3. Un panel de estadísticas policiales del OIJ con descarga oficial, filtros y gráficos territoriales y mensuales.

## Fuentes OSINT

| Fuente | Consumo | Transformación y capacidad | Responsable |
| ---|---|---|---|
| [OpenStreetMap / Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Consulta POST en Overpass QL sobre límites administrativos; respuesta JSON | Normaliza nodos, vías y relaciones, almacena caché y dibuja resultados sobre teselas OSM | Completar nombre |
| [OIJ / Estadísticas Policiales](https://datosabiertospj.poder-judicial.go.cr/dataset/estadisticas-policiales) | Catálogo CKAN y descarga automatizada CSV | Agrupa por provincia, cantón, delito y mes; conserva procedencia en PostgreSQL | Completar nombre |
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


## Módulo OIJ

Ruta visible: `/oij`, también en Inicio y en el menú **Datos OIJ**.

Flujo: catálogo CKAN → CSV oficial → validación y normalización en NestJS → agregados en PostgreSQL → API propia → filtros, tarjetas, gráficos y tabla en Next.js.

- `POST /oij/sync`, cuerpo `{ "year": 2026 }`: descubre el CSV en `https://datosabiertospj.poder-judicial.go.cr/api/3/action/package_show?id=estadisticas-policiales`, descarga y procesa el recurso. No acepta URLs arbitrarias del navegador.
- `GET /oij/overview?year=2026&province=SAN%20JOSE&canton=SAN%20JOSE&crime=HURTO`: indicadores y opciones de filtros.
- El CSV oficial V1 contiene 11 columnas y **no tiene encabezado**. Se conserva la primera fila y se admiten campos entre comillas y UTF-8 o Windows-1252. Se extraen delito (0), fecha (2), provincia (8) y cantón (9).
- Cada fila cuenta como un registro de la fuente. No se deduplican filas idénticas porque podrían representar registros distintos. No se afirma que cada fila identifique un evento único.
- `OijDataset` guarda un registro por año, con agregados JSONB y procedencia. Reimportar reemplaza ese año sin duplicar los conteos.
- Caché de una hora y reutilización de descargas simultáneas por año. Límites de 40 MB y 60 segundos para el CSV. Si falla la fuente o cambia el esquema se conservan los datos anteriores.
- Se muestra el intervalo de fechas del archivo. Los meses sin registros no se convierten artificialmente en ceros. Los territorios desconocidos permanecen en los totales y la tabla, pero no cuentan como cantones identificados en la tarjeta.
- No se almacenan modalidad, edad, sexo, nacionalidad ni detalles individuales. No se calculan tasas poblacionales, riesgo individual ni causalidad.
- El catálogo declara Creative Commons Attribution; el panel atribuye los datos al Poder Judicial/OIJ y enlaza el catálogo y el CSV utilizado.

### Ejecución local sin instalar PostgreSQL como servicio

Se incluye PostgreSQL portátil para desarrollo académico mediante `embedded-postgres`. La base persiste en `backend/.local-postgres`, excluida de Git. Escucha solamente en `127.0.0.1:5433`; la contraseña del ejemplo es únicamente para esta base local.

En una terminal desde `backend`:

```powershell
npm install
npm run db:local
```

En otra terminal desde `backend`:

```powershell
Copy-Item .env.example .env
npm run start:dev
```

En una tercera terminal desde `frontend`:

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev -- -p 3000
```

Abrir http://localhost:3000/oij. Backend: puerto 3001. No iniciar otra instancia si los puertos están ocupados. Para PostgreSQL propio, cambiar `DATABASE_URL` y omitir `db:local`.

### Verificación y exposición

Desde `backend`, `npm run test:oij` compila y prueba agrupación, primera fila, comillas, codificación, estructura, años y fechas inválidas. Con backend activo y 2026 sincronizado, `node scripts/oij.integration.cjs` verifica sumas, filtros, vacío, validación, caché y respuestas de las APIs existentes. Desde `frontend`, `npm run build` valida TypeScript y genera las páginas.

Guion de un minuto:

> Agregué una tercera fuente OSINT al observatorio: las estadísticas policiales del OIJ. El backend consulta el catálogo público, descarga el CSV del año elegido y transforma sus filas en conteos por provincia, cantón, delito y mes. Guarda esos agregados y su procedencia en PostgreSQL. El frontend consulta nuestra API y presenta filtros, gráficos y comparaciones. Usamos caché para no descargar repetidamente y conservamos la última importación si la fuente falla. Son registros estadísticos, no perfiles de personas ni tasas de criminalidad.

Demostración: abrir Datos OIJ, mostrar 2026, elegir SAN JOSE → SAN JOSE → HURTO, observar los cambios, limpiar filtros y mostrar la procedencia. La importación verificada el 11 de septiembre de 2026 contenía 23.859 filas y fechas del 1 de enero al 3 de septiembre; una descarga posterior puede variar. Completar el nombre del responsable en la tabla de fuentes antes de entregar.

Corrección de CSV históricos: se reconocen nacionalidades con comas sin escapar (sufijos ISLAS, CIUDAD DEL y REPUBLICA DEL/DEMOCRATICA DEL), validando su posición y la provincia antes de reparar la fila. Las demás estructuras inesperadas se rechazan con HTTP 400 y se conserva la importación anterior.


