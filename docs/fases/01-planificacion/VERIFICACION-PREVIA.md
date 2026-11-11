# Verificación previa de la fase 1

**Quién la hizo:** Claude (asistente de IA), a pedido de Frander, el 2026-11-11, sobre el commit `88b88e2`.

**Qué es y qué no es.** Son las comprobaciones objetivas que se pueden ejecutar sobre el repositorio, con su evidencia. **No es una revisión cruzada**: no sustituye la firma de [REVISION.md](REVISION.md) ni la ratificación de las decisiones `Q-nn`, que las hace cada integrante. Las casillas y tablas de firma de `REVISION.md` no se modificaron. Sirve para que cada revisor parta de evidencia y no repita las comprobaciones mecánicas.

## 1. Comprobaciones automáticas

| Comprobación | Resultado |
|---|---|
| Enlaces relativos y anclas en todos los `.md` de `docs/`, `AGENTS.md` y `README.md` | 0 enlaces rotos |
| [observatorio.json](threat-model/observatorio.json) contiene T-01 a T-13 | Sí, los 13 (T-07 aparece dos veces, como indica `amenazas.md`) |
| IDs `T`, `TP`, `S`, `Q`, `IA`, `F`, `C`, `D` sin duplicados ni saltos | Correcto (T-01 a T-13, TP-01 a TP-09, S-01 a S-05, Q-01 a Q-10, IA-01 a IA-12, F-01 a F-03, C-01 a C-05, D-01 a D-06) |
| Valores secretos en `docs/`, `AGENTS.md` y `README.md` | Ninguno. Solo hay dos archivos `.env*` versionados y son los de ejemplo (`backend/.env.example`, `frontend/.env.local.example`) |
| Cada amenaza T-01 a T-13 tiene medida, componente, comprobación prevista, responsable/revisor, tratamiento y estado | Sí ([amenazas.md](kb/amenazas.md)) |
| Ninguna amenaza aplazada sin justificación | Correcto: las 13 están en "mitigar" |
| Responsable y revisor distintos en cada ítem y amenaza ([responsables.md](kb/responsables.md)) | Correcto |
| Los endpoints de escritura exigen `X-Admin-Key` en la matriz de acceso | Sí; el acceso sin sesión está descrito ([arquitectura.md](kb/arquitectura.md#matriz-de-acceso)) |
| Rutas de `AGENTS.md` apuntan a `docs/fases/01-planificacion/kb/` | Correcto |

## 2. Brechas descritas en la KB contrastadas con el código

Cada "Brecha actual" y cada estado `propuesta` de la KB coincide con el código vigente.

| Afirmación de la KB | Evidencia en el código |
|---|---|
| No existe guard de administración (T-01, F01-AC7, F02-AC5, F03-AC7) | `grep` de `X-Admin-Key`, `ADMIN_API_KEY`, `UseGuards`: sin resultados en `backend/src` |
| Sin límite de peticiones, helmet ni `ValidationPipe` (T-02, T-09, T-11) | `grep` de `Throttler`, `helmet`, `ValidationPipe`: sin resultados |
| CORS abierto y `synchronize: true` (T-09) | `backend/src/main.ts:6` (`app.enableCors()`); `backend/src/app.module.ts:18` |
| OSM borra antes de insertar, sin transacción (T-06, F03-AC5) | `backend/src/osm/osm.service.ts:159-166` (`places.delete` y luego `upsert`) |
| Truncamiento silencioso a 250 (F03-AC8) | `osm.service.ts:133` (`out ... 251`) y `:199` (`take: 250`), sin `truncated` en la respuesta |
| El importador solo conserva conteos (T-04, F01-AC2) | `tse.service.ts:57-72` solo lee `fields[1]` (código) y `fields[4]` (junta); la cédula y el nombre no se leen ni guardan. **Falta la prueba** (la medida sigue `implementada`, sin verificar) |

## 3. Sugerencias de IA: hechos contrastados con el código

Es evidencia para los validadores. **El estado de cada sugerencia sigue en `pendiente`**; decide la persona asignada.

| ID | Hecho | Evidencia | Observación para quien valida |
|---|---|---|---|
| IA-01 | Confirmado | `tse.service.ts:57`: todo `.txt` salvo `leame.txt` y `distelec.txt` cuenta como padrón y suma | Coherente con T-03 y F01-AC8 |
| IA-02 | Confirmado | `tse.service.ts:110` hace `upsert` por `electoralCode`; `:152` muestra `MAX(sourceDate)` | El resumen muestra la fecha más reciente aunque haya distritos con otra |
| IA-03 | Confirmado | `tse.service.ts:93-97`: `DESCONOCIDA` / `DESCONOCIDO`; `:51` `SIN PROVINCIA` | Falta comprobar cómo las trata `/coverage/viability-index` |
| IA-04 | Confirmado | `oij.service.ts:36`: `resources.find(...)` toma el primer CSV cuyo nombre contiene el año | Sin criterio de desempate |
| IA-05 | No contrastado | Requiere ejecutar consultas con valores inexistentes | Falta una prueba |
| IA-06 | Confirmado | `pending` existe solo en `oij.service.ts:12`; OSM y TSE no lo tienen | Dos sincronizaciones OSM simultáneas llaman dos veces a Overpass |
| IA-07 | No contrastado | Hipótesis sobre OSM; `LOCATIONS` incluye Monteverde y Puerto Jiménez (`osm.service.ts:62`) y el código responde 404 si no halla el límite (`:141-145`) | Requiere consultar Overpass; no se ejecutó |
| IA-08 | Parcialmente desmentido | Las claves incluyen provincia: `osm.service.ts:255-257` (`provincia:cantón:categoría`) y `coverage.service.ts:35-37` (`PROVINCIA::CANTÓN`). Un cantón homónimo de su provincia no choca con otra provincia | Queda por probar la conversión de `CENTRAL` a la provincia (`coverage.service.ts:51-55`) con datos ficticios. Candidata a `falso positivo` o a prueba acotada |
| IA-09 | Confirmado | `coverage.service.ts:66-71`: rango cero devuelve 100; la tasa es `null` si `electors` es 0 (`:190`, `:243-246`) | El comentario del código documenta el criterio; falta decidir si se declara en la interfaz (Q-04) |
| IA-10 | No contrastado | Depende de la interfaz de `/cobertura`, cuyo aviso es la medida M-10 | Cubierta por Q-04 punto 5 |
| IA-11 | Confirmado | `coverage.service.ts:42-46`: solo dos alias | Falta el listado de cantones sin cruce entre fuentes |
| IA-12 | Cubierta | Decisión de Q-02 | Implementación pendiente (vista de operador) |

## 4. Lo que no se puede completar sin una persona

Estos puntos **siguen abiertos** y la fase 1 no puede darse por cerrada hasta cumplirlos ([kb/README.md](kb/README.md#estado-de-cierre-de-la-fase-1)):

1. **Las cinco firmas** de [REVISION.md](REVISION.md), cada una por quien revisa y no por quien escribió el ítem.
2. **Ratificación o cambio de Q-01 a Q-09** (decididas por delegación a la IA) y **resolución de Q-10** (reparto con Pablo).
3. **Validación de IA-01 a IA-12** por los validadores de [responsables.md](kb/responsables.md#validadores-de-las-sugerencias-de-ia).
4. **Captura o exportación del diagrama de Threat Dragon.** El `observatorio.json` es el modelo, pero no hay una imagen. Se obtiene abriendo el JSON en Threat Dragon (ver [threat-model/README.md](threat-model/README.md)).
5. **Pasos de cierre** de `REVISION.md`: columna "Revisión" de `responsables.md`, estado de `kb/README.md` y estado en [../README.md](../README.md). Los hace la última persona en firmar.
