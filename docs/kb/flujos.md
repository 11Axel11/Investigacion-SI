# Flujos críticos (ítem 1.1)

Los tres flujos se eligen por el impacto de un fallo y por los datos que manejan. Los tres comparten una característica: **escriben en la base de datos y hoy no exigen ninguna credencial** (ver [Q-01](preguntas-abiertas.md#q-01)).

Estado de cada criterio:

- **[A]** regla aprobada: el equipo la confirmó y el código la cumple.
- **[O]** comportamiento observado en el código al 2026-11-10 (commit `e5a1990`). No implica que sea el deseado.
- **[P]** regla propuesta, pendiente de decisión humana. Depende de la pregunta indicada.

Las comprobaciones previstas de cada medida están en [amenazas.md](amenazas.md).

| ID | Flujo | Por qué es crítico |
|---|---|---|
| F-01 | Importar el padrón electoral del TSE | Procesa datos personales (cédula, nombre) en memoria y reemplaza agregados de la BD |
| F-02 | Sincronizar estadísticas policiales del OIJ | Descarga hasta 40 MB de un tercero y reemplaza el dataset de un año completo |
| F-03 | Sincronizar y consultar lugares de OpenStreetMap | Depende de una API pública con cuota limitada y borra/reescribe datos por territorio |

---

## F-01 Importar el padrón del TSE

- **Actor:** operador. Hoy cualquier visitante puede ejecutarlo (**[O]**, ver [Q-01](preguntas-abiertas.md#q-01)).
- **Objetivo:** cargar el ZIP oficial del padrón y obtener conteos de electores y juntas por distrito electoral.
- **Resultado esperado:** una fila por `electoralCode` con `electors`, `pollingStations`, `sourceFile`, `sourceDate` e `importedAt`. Ningún dato personal queda guardado.
- **Entradas:** archivo ZIP (`multipart/form-data`, campo `file`) y `sourceDate` opcional (`AAAA-MM-DD`).
- **Endpoint:** `POST /tse/import`. Código: `backend/src/tse/tse.controller.ts`, `backend/src/tse/tse.service.ts`.
- **Datos:** ZIP con datos personales (sensible, solo en memoria). Agregados por distrito (público, de integridad crítica).

| ID | Estado | Dado | Cuando | Entonces |
|---|---|---|---|---|
| F01-AC1 | [A] Éxito | un ZIP oficial con el TXT del padrón y `DISTELEC.TXT` | el operador lo envía a `POST /tse/import` | responde `importedDistricts` y `processedElectors` mayores que 0 y `discardedPersonalFields: true`, y la BD contiene solo conteos y nombres territoriales |
| F01-AC2 | [A] Privacidad | cualquier ZIP procesado | termina la importación, con éxito o con error | cédula, nombre y vencimiento no están en la BD, en la respuesta, en los logs ni en los mensajes de error |
| F01-AC3 | [A] Error | un archivo que no es ZIP, o sin `DISTELEC.TXT`, o sin TXT de padrón, o sin registros válidos | se envía a `POST /tse/import` | responde 400 y los datos anteriores no cambian |
| F01-AC4 | [A] Límites | un padrón de más de 5 000 000 de filas, una línea de más de 2 000 caracteres o un archivo de más de 80 MB | se importa | se rechaza y los datos anteriores no cambian |
| F01-AC5 | [A] Error | `sourceDate` que no cumple `AAAA-MM-DD` | se importa | responde 400 |
| F01-AC6 | [A] Idempotencia | el mismo ZIP importado dos veces | se repite la importación | los conteos se actualizan por `electoralCode` sin duplicar filas |
| F01-AC7 | [P Q-01] Uso indebido | un visitante sin sesión ni credencial | envía `POST /tse/import` | responde 401 o 403 y la BD no cambia. **Hoy [O]: se acepta.** |
| F01-AC8 | [P Q-01] Uso indebido | un ZIP con archivos `.txt` adicionales o con descompresión desproporcionada | se importa | se rechaza sin alterar los conteos (ver [T-03](amenazas.md#t-03), [IA-01](ia-sugerencias.md#ia-01)) |

---

## F-02 Sincronizar el OIJ por año

- **Actor:** operador. Hoy cualquier visitante (**[O]**).
- **Objetivo:** obtener las estadísticas policiales de un año y dejarlas agregadas por territorio, delito y mes.
- **Resultado esperado:** un registro `OijDataset` por año con agregados JSONB y procedencia (`sourceUrl`, `fetchedAt`, fechas del archivo). Reimportar reemplaza ese año.
- **Entradas:** `{ "year": 2026 }` en el cuerpo JSON.
- **Endpoint:** `POST /oij/sync`. Código: `backend/src/oij/oij.service.ts`, `backend/src/oij/oij.parser.ts`.
- **Datos:** CSV público con registros estadísticos (sin personas identificables en las columnas que se leen). Agregados por año (público, de integridad crítica).

| ID | Estado | Dado | Cuando | Entonces |
|---|---|---|---|---|
| F02-AC1 | [A] Éxito | un año entre 2015 y el año actual con CSV publicado en el catálogo CKAN | se ejecuta `POST /oij/sync` | descarga el CSV del host permitido, lo agrega y guarda un registro del año con su procedencia |
| F02-AC2 | [A] Caché | el mismo año consultado en menos de una hora | se ejecuta `POST /oij/sync` | responde con `cache: true` sin descargar; las solicitudes simultáneas del mismo año comparten una sola descarga |
| F02-AC3 | [A] Error | un año fuera de rango, no entero, o sin CSV en el catálogo | se ejecuta `POST /oij/sync` | responde 400 |
| F02-AC4 | [A] Fuente | el catálogo falla, el recurso apunta a otro host, redirige, supera 40 MB o 60 s, o el CSV cambia de estructura | se ejecuta `POST /oij/sync` | responde 503 (o 400 si cambió la estructura) y se conservan los datos previos |
| F02-AC5 | [P Q-01] Uso indebido | un visitante sin credencial | envía `POST /oij/sync` | responde 401 o 403 y no se hace ninguna descarga. **Hoy [O]: se acepta.** |
| F02-AC6 | [P Q-06] Datos | el CSV incluye modalidad y tipo de objetivo | se guarda el agregado | solo se guardan los campos que la regla aprobada permita. **Hoy [O]: se guardan `modality`, `targetCategory` y `targetType`; el README dice lo contrario.** |

---

## F-03 Sincronizar y consultar lugares de OpenStreetMap

- **Actor:** operador para sincronizar; visitante para consultar. Hoy ambos son anónimos (**[O]**).
- **Objetivo:** obtener lugares (hospitales, farmacias, comercios y otros) por provincia, cantón y categoría, y mostrarlos en el mapa.
- **Resultado esperado:** filas `OsmPlace` normalizadas (máximo 250 por consulta), una entrada de caché por combinación y respuesta con `fetchedAt` y `sourceUpdatedAt`.
- **Entradas:** `{ province, canton?, category }`.
- **Endpoints:** `POST /osm/sync`, `GET /osm/places`, `GET /osm/by-category`, `GET /osm/locations`. Código: `backend/src/osm/osm.controller.ts`, `backend/src/osm/osm.service.ts`.
- **Datos:** objetos públicos de OSM. `phone` y `website` pueden corresponder a personas físicas con negocio (riesgo bajo).

| ID | Estado | Dado | Cuando | Entonces |
|---|---|---|---|---|
| F03-AC1 | [A] Éxito | una provincia, un cantón de esa provincia (opcional) y una categoría permitidos | se ejecuta `POST /osm/sync` | consulta Overpass, guarda los lugares normalizados y devuelve `guardados`, `encontrados`, `fetchedAt`, `sourceUpdatedAt` y `center` |
| F03-AC2 | [A] Caché | la misma combinación consultada hace menos de 15 minutos | se ejecuta `POST /osm/sync` | responde `cache: true` sin llamar a Overpass |
| F03-AC3 | [A] Validación | provincia, cantón o categoría fuera de las listas permitidas | se ejecuta `POST /osm/sync` o `GET /osm/places` | responde 400, y ningún valor sin validar llega a la consulta Overpass |
| F03-AC4 | [A] Fuente | Overpass no responde, tarda más de 35 s o responde con error | se ejecuta `POST /osm/sync` | responde 503 con mensaje comprensible y los datos previos siguen intactos |
| F03-AC5 | [P] Integridad | Overpass responde sin lugares, o falla entre borrar e insertar | se ejecuta `POST /osm/sync` | los lugares anteriores de esa combinación no se pierden (ver [T-06](amenazas.md#t-06)). **Hoy [O]: se borran antes de insertar, sin transacción.** |
| F03-AC6 | [O Q-02] Consulta | cualquier visitante | consulta `GET /osm/places` o `GET /osm/by-category` | recibe los lugares guardados, sin autenticación |
| F03-AC7 | [P Q-01] Uso indebido | un visitante sin credencial | envía `POST /osm/sync` | responde 401 o 403 y no se llama a Overpass. **Hoy [O]: se acepta.** |
| F03-AC8 | [P Q-07] Límite | más de 250 objetos en la respuesta | se sincroniza | el resultado indica que fue truncado. **Hoy [O]: se trunca sin avisar.** |

---

## Cobertura de las demás capacidades

Las consultas de `/coverage/*` y `/oij/overview` son lecturas derivadas de estos tres flujos. Quedan cubiertas por la matriz de acceso de [arquitectura.md](arquitectura.md#matriz-de-acceso) y por la amenaza [T-10](amenazas.md#t-10) (interpretación del índice de viabilidad).
