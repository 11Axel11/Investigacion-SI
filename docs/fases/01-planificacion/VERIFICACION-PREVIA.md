# Verificación previa de la fase 1

**Quién la hizo:** Claude (asistente de IA), a pedido de Frander, el 2026-11-11, sobre el commit `88b88e2`.

**Qué es y qué no es.** Son las comprobaciones objetivas que se pueden ejecutar sobre el repositorio, con su evidencia. **No es una revisión cruzada**: no sustituye la firma de [REVISION.md](REVISION.md) ni la ratificación de las decisiones `Q-nn`, que las hace cada integrante. Las casillas y tablas de firma de `REVISION.md` no se modificaron. Sirve para que cada revisor parta de evidencia y no repita las comprobaciones mecánicas.

## 1. Comprobaciones automáticas

| Comprobación | Resultado |
|---|---|
| Enlaces relativos y anclas en todos los `.md` de `docs/`, `AGENTS.md` y `README.md` | 0 enlaces rotos |
| [observatorio.json](threat-model/observatorio.json) contiene T-01 a T-13 (T-14 se incorporó después con el PR #7) | Sí, los 13 (T-07 aparece dos veces, como indica `amenazas.md`). Tras integrar el PR #7 son 14 y coinciden con `amenazas.md` |
| IDs `T`, `TP`, `S`, `Q`, `IA`, `F`, `C`, `D` sin duplicados ni saltos | Correcto (T-01 a T-13 en el commit verificado, y T-14 tras el PR #7; TP-01 a TP-09, S-01 a S-05, Q-01 a Q-10, IA-01 a IA-12, F-01 a F-03, C-01 a C-05, D-01 a D-06) |
| Valores secretos en `docs/`, `AGENTS.md` y `README.md` | Ninguno. Solo hay dos archivos `.env*` versionados y son los de ejemplo (`backend/.env.example`, `frontend/.env.local.example`) |
| Cada amenaza T-01 a T-13 (y T-14, propuesta) tiene medida, componente, comprobación prevista, responsable/revisor, tratamiento y estado | Sí ([amenazas.md](kb/amenazas.md)) |
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

## 4. Actualización del 2026-11-11 (después de esta verificación)

Por indicación de Frander, que fue el único integrante disponible, se completó lo que no dependía de una firma ajena:

- **Diagrama:** se rehízo el diseño de [observatorio.json](threat-model/observatorio.json) (flujos ortogonales, sin cruces, texto dentro de las figuras) y se exportó [observatorio.png](threat-model/observatorio.png). El contenido (21 elementos y las amenazas) no cambió.
- **Q-10:** resuelta de forma provisional (se acepta el reparto propuesto).
- **IA-01 a IA-12:** estado provisional decidido con la evidencia de la sección 3. Las aceptadas están como criterios en [flujos.md](kb/flujos.md#casos-límite-aceptados-de-las-sugerencias-de-ia) (F01-AC9, F02-AC7, F02-AC8, F03-AC9, COV-AC1, COV-AC2) o en las comprobaciones de T-05 y T-07. IA-08 quedó como falso positivo.

## 5. Lo que no se puede completar sin una persona

Estos puntos **siguen abiertos** y la fase 1 no puede darse por cerrada hasta cumplirlos ([kb/README.md](kb/README.md#estado-de-cierre-de-la-fase-1)). Se hacen en la revisión presencial del equipo:

1. **Las cinco firmas** de [REVISION.md](REVISION.md), cada una por quien revisa y no por quien escribió el ítem.
2. **Ratificación o cambio de Q-01 a Q-10** (decididas por delegación a la IA, con Q-10 provisional).
3. **Ratificación o cambio del estado provisional de IA-01 a IA-12** por los validadores de [responsables.md](kb/responsables.md#validadores-de-las-sugerencias-de-ia). Si cambia alguno, se ajusta el criterio de `flujos.md` que incorporó.
4. **Revisión visual del diagrama** por Pablo (ítem 1.3).
5. **Pasos de cierre** de `REVISION.md`: columna "Revisión" de `responsables.md`, estado de `kb/README.md` y estado en [../README.md](../README.md). Los hace la última persona en firmar.
