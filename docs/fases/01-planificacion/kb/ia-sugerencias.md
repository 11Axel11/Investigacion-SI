# Sugerencias de IA pendientes de validación (ítem 1.6)

Casos límite, escenarios de abuso y posibles omisiones que propuso un asistente de IA (Claude, sesión del 2026-11-10) al leer el código. **Ninguna es un requisito ni una amenaza aprobada** hasta que una persona la valide.

Cómo se distinguen los tipos de información en esta base de conocimiento:

| Tipo | Dónde vive |
|---|---|
| Regla aprobada | [flujos.md](flujos.md), con estado **[A]** |
| Comportamiento observado en el código | [flujos.md](flujos.md), con estado **[O]**, y [arquitectura.md](arquitectura.md) |
| Sugerencia pendiente de validación | Este archivo |

## Cómo se valida

1. Otro integrante, distinto de quien pidió la sugerencia, la contrasta con el código y la documentación de la fuente.
2. Se registra la decisión en la columna de estado: `aceptada`, `rechazada` o `falso positivo`, con fecha y nombre.
3. Si se acepta, se incorpora como criterio en [flujos.md](flujos.md), como amenaza en [amenazas.md](amenazas.md) o como pregunta en [preguntas-abiertas.md](preguntas-abiertas.md), en el mismo PR.

Todas las sugerencias parten como **pendiente**. Validadores asignados el 2026-11-10 ([responsables.md](responsables.md#validadores-de-las-sugerencias-de-ia)): IA-01 y IA-02, Daniel; IA-03 y IA-04, Frander; IA-05 a IA-07, José; IA-08 e IA-12, Pablo; IA-09 a IA-11, Axel (reparto con Pablo propuesto en [Q-10](preguntas-abiertas.md#q-10)). Cuando el asistente comprobó el hecho leyendo el código, la tabla lo indica; eso no sustituye la validación humana.

| ID | Flujo | Sugerencia | Estado |
|---|---|---|---|
| [IA-01](#ia-01) | F-01 | Cualquier `.txt` del ZIP se trata como padrón | pendiente (hecho confirmado en el código) |
| [IA-02](#ia-02) | F-01 | Un ZIP por cantón deja fechas de corte mezcladas | pendiente (hecho confirmado en el código) |
| [IA-03](#ia-03) | F-01 | Territorios desconocidos en los agregados | pendiente (hecho confirmado en el código) |
| [IA-04](#ia-04) | F-02 | Más de un recurso del catálogo coincide con el año | pendiente |
| [IA-05](#ia-05) | F-02 | Filtros que no coinciden devuelven cero en lugar de error | pendiente |
| [IA-06](#ia-06) | F-03 | Sincronizaciones simultáneas de la misma combinación | pendiente (hecho confirmado en el código) |
| [IA-07](#ia-07) | F-03 | Cantones sin límite administrativo en OSM | pendiente |
| [IA-08](#ia-08) | F-03 | Colisión de nombres entre provincia y cantón | pendiente |
| [IA-09](#ia-09) | Cobertura | Cantones con cero electores o todos con el mismo valor | pendiente |
| [IA-10](#ia-10) | Cobertura | Datos de fuentes con fechas distintas en un mismo índice | pendiente |
| [IA-11](#ia-11) | Cobertura | Alias de cantones incompletos | pendiente |
| [IA-12](#ia-12) | Frontend | Visitantes pueden iniciar importaciones desde la interfaz | pendiente; cubierta por la decisión de Q-02 |

---

## IA-01

- **Observación:** `tse.service.ts` trata como padrón todo archivo `.txt` que no sea `leame.txt` ni `distelec.txt`. Un ZIP con varios TXT los suma todos.
- **Escenario de abuso:** un ZIP con el padrón duplicado o con un TXT ajeno infla los conteos sin que se detecte.
- **Comprobación sugerida:** ZIP ficticio con dos TXT de padrón; debería rechazarse o aceptar solo el nombre esperado.
- **Relacionada con:** [T-03](amenazas.md#t-03), [F01-AC8](flujos.md#f-01-importar-el-padrón-del-tse).

## IA-02

- **Observación:** la importación hace `upsert` por `electoralCode`. Importar un ZIP de un cantón deja los demás distritos con su fecha anterior, y el resumen global mezcla fechas de corte.
- **Comprobación sugerida:** importar dos ZIP ficticios de fechas distintas y revisar qué muestra `/tse/overview` en `sourceDate`.
- **Relacionada con:** [T-05](amenazas.md#t-05).

## IA-03

- **Observación:** los códigos sin entrada en `DISTELEC.TXT` se guardan como provincia `DESCONOCIDA` y los nombres vacíos como `SIN PROVINCIA`. Esas filas participan en los totales y pueden aparecer en el índice de viabilidad.
- **Comprobación sugerida:** ZIP ficticio con un código de distrito ausente en `DISTELEC.TXT`; verificar cómo lo muestra la interfaz y cómo lo trata `/coverage/viability-index`.

## IA-04

- **Observación:** el OIJ busca el recurso con una expresión regular sobre el nombre (`\b<año>\b`) y toma el primer CSV que coincide. Si el catálogo publica dos recursos del mismo año, se usa uno sin criterio explícito.
- **Comprobación sugerida:** prueba con un catálogo simulado que tenga dos recursos para 2026.

## IA-05

- **Observación:** en `/oij/overview` y `/coverage/*`, un delito, cantón o tipo de objetivo inexistente produce resultados vacíos o cero, no un error. El usuario no distingue "sin delitos" de "filtro mal escrito".
- **Comprobación sugerida:** consultar con un valor inexistente y definir el comportamiento esperado.

## IA-06

- **Observación:** el OIJ comparte la descarga en curso entre solicitudes simultáneas (`pending`), pero OSM y TSE no. Dos `POST /osm/sync` simultáneos de la misma combinación llaman dos veces a Overpass y compiten por borrar e insertar.
- **Comprobación sugerida:** dos sincronizaciones simultáneas contra un Overpass simulado; contar las llamadas y revisar el resultado en la BD.
- **Relacionada con:** [T-02](amenazas.md#t-02), [T-06](amenazas.md#t-06).

## IA-07

- **Observación:** la lista `LOCATIONS` incluye cantones recientes como Monteverde y Puerto Jiménez. Si OpenStreetMap no los tiene como límite administrativo de nivel 6, la sincronización responde 404 aunque el cantón sea válido. **Hipótesis: no se verificó contra OSM.**
- **Comprobación sugerida:** sincronizar cada cantón de la lista y registrar cuáles devuelven 404.

## IA-08

- **Observación:** hay cantones con el mismo nombre que su provincia (San José, Alajuela, Cartago, Heredia, Limón, Puntarenas). Las claves de caché y de agrupación usan el nombre normalizado y `canonicalCanton` convierte "CENTRAL" en el nombre de la provincia; una colisión podría mezclar datos.
- **Comprobación sugerida:** prueba con datos ficticios de provincia y cantón homónimos.

## IA-09

- **Observación:** si todos los cantones tienen el mismo valor, la normalización devuelve 100. Con un solo cantón con datos, el índice puede ser 100 o 0 sin significado. La tasa por elector no se calcula si `electors` es 0.
- **Comprobación sugerida:** pruebas unitarias de `normalize` y `band` con rango cero y un solo elemento.
- **Relacionada con:** [T-10](amenazas.md#t-10).

## IA-10

- **Observación:** el índice combina el padrón de una fecha, lugares de OSM sincronizados en otras y delitos de un año del OIJ que puede estar incompleto (por ejemplo, hasta septiembre). No se muestra la fecha de cada componente junto al puntaje.
- **Comprobación sugerida:** mostrar la procedencia y la fecha de cada fuente junto al índice.
- **Relacionada con:** [T-10](amenazas.md#t-10).

## IA-11

- **Observación:** `CANTON_ALIASES` contiene solo dos alias y su comentario dice que se amplía "según se detecten más casos". Cantones con nombres distintos entre fuentes no cruzan y aparecen sin datos.
- **Comprobación sugerida:** comparar los cantones de TSE, OSM, OIJ y el GeoJSON y listar los que no coinciden.

## IA-12

- **Observación:** el frontend público incluye las acciones de sincronizar e importar (`frontend/lib/api.ts`). Aunque se protejan en el backend, un visitante vería botones que no puede usar.
- **Comprobación sugerida:** verificar la vista de operador decidida en [Q-02](preguntas-abiertas.md#q-02): las acciones solo se habilitan con la clave, que no se persiste.
- **Relacionada con:** [T-01](amenazas.md#t-01).
