# Flujos críticos (ítem 1.1)

Los tres flujos se eligen por el impacto de un fallo y por los datos que manejan. Los tres comparten una característica: **escriben en la base de datos y hoy no exigen ninguna credencial**. La decisión de [Q-01](preguntas-abiertas.md#q-01) es exigir la clave de administración del operador (medida [M-01](amenazas.md#t-01)).

Estado de cada criterio:

- **[A]** regla aprobada. El código puede no cumplirla todavía: la nota "Brecha actual" de cada criterio y el estado de la medida en [amenazas.md](amenazas.md) lo indican.
- **[O]** comportamiento observado en el código al 2026-11-10 (commit `e5a1990`). No implica que sea el deseado.
- **[P]** regla propuesta, pendiente de decisión humana. Al 2026-11-10 no queda ninguna: las nueve preguntas se resolvieron en [preguntas-abiertas.md](preguntas-abiertas.md).

Las comprobaciones previstas de cada medida están en [amenazas.md](amenazas.md).

| ID | Flujo | Por qué es crítico |
|---|---|---|
| F-01 | Importar el padrón electoral del TSE | Procesa datos personales (cédula, nombre) en memoria y reemplaza agregados de la BD |
| F-02 | Sincronizar estadísticas policiales del OIJ | Descarga hasta 40 MB de un tercero y reemplaza el dataset de un año completo |
| F-03 | Sincronizar y consultar lugares de OpenStreetMap | Depende de una API pública con cuota limitada y borra/reescribe datos por territorio |

---

## F-01 Importar el padrón del TSE

- **Actor:** operador ([Q-01](preguntas-abiertas.md#q-01)). Hoy cualquier visitante puede ejecutarlo (**[O]**).
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
| F01-AC7 | [A] Uso indebido | un visitante sin credencial o con una clave incorrecta | envía `POST /tse/import` | responde 401 y la BD no cambia. **Brecha actual: hoy se acepta (M-01, [T-01](amenazas.md#t-01)).** |
| F01-AC8 | [A] Uso indebido | un ZIP con archivos `.txt` adicionales o con descompresión desproporcionada | se importa | se rechaza sin alterar los conteos. **Brecha actual: no se valida (M-03, [T-03](amenazas.md#t-03), [IA-01](ia-sugerencias.md#ia-01)).** |

---

## F-02 Sincronizar el OIJ por año

- **Actor:** operador ([Q-01](preguntas-abiertas.md#q-01)). Hoy cualquier visitante (**[O]**).
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
| F02-AC5 | [A] Uso indebido | un visitante sin credencial o con una clave incorrecta | envía `POST /oij/sync` | responde 401 y no se hace ninguna descarga. **Brecha actual: hoy se acepta (M-01, [T-01](amenazas.md#t-01)).** |
| F02-AC6 | [A] Datos ([Q-06](preguntas-abiertas.md#q-06)) | el CSV incluye modalidad, categoría y tipo de objetivo | se guarda el agregado | se guardan solo conteos por delito, modalidad, categoría y tipo de objetivo, distrito y mes; nunca registros individuales, edad, sexo, nacionalidad ni fechas exactas. El código ya lo cumple |

---

## F-03 Sincronizar y consultar lugares de OpenStreetMap

- **Actor:** operador para sincronizar; visitante para consultar ([Q-01](preguntas-abiertas.md#q-01) y [Q-02](preguntas-abiertas.md#q-02)). Hoy ambos son anónimos (**[O]**).
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
| F03-AC5 | [A] Integridad | Overpass responde sin lugares, o falla entre borrar e insertar | se ejecuta `POST /osm/sync` | los lugares anteriores de esa combinación no se pierden. **Brecha actual: se borran antes de insertar, sin transacción (M-06, [T-06](amenazas.md#t-06)).** |
| F03-AC6 | [A] Consulta ([Q-02](preguntas-abiertas.md#q-02)) | cualquier visitante | consulta `GET /osm/places` o `GET /osm/by-category` | recibe los lugares guardados, sin autenticación |
| F03-AC7 | [A] Uso indebido | un visitante sin credencial o con una clave incorrecta | envía `POST /osm/sync` | responde 401 y no se llama a Overpass. **Brecha actual: hoy se acepta (M-01, [T-01](amenazas.md#t-01)).** |
| F03-AC8 | [A] Límite ([Q-07](preguntas-abiertas.md#q-07)) | más de 250 objetos en la respuesta | se sincroniza | la respuesta incluye `truncated: true` y la interfaz avisa que el conteo puede ser menor al real. **Brecha actual: se trunca sin avisar.** |

---

## Cobertura de las demás capacidades

Las consultas de `/coverage/*` y `/oij/overview` son lecturas derivadas de estos tres flujos. Quedan cubiertas por la matriz de acceso de [arquitectura.md](arquitectura.md#matriz-de-acceso) y por la amenaza [T-10](amenazas.md#t-10) (interpretación del índice de viabilidad).
