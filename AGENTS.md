# AGENTS.md

Instrucciones para agentes de IA (y para quien los supervise) en este repositorio: Observatorio Territorial y Electoral de Costa Rica. Backend NestJS + TypeORM + PostgreSQL en `backend/`; frontend Next.js en `frontend/`. Descripción general en [README.md](README.md).

Este archivo solo indica **dónde consultar y qué reglas seguir**. El contenido vive en [docs/fases/01-planificacion/kb/](docs/fases/01-planificacion/kb/README.md); no lo copies aquí.

## Antes de modificar un flujo crítico

Los flujos críticos son F-01 (importar padrón TSE), F-02 (sincronizar OIJ) y F-03 (sincronizar y consultar OSM). Antes de tocar su código o el de cualquier endpoint de escritura:

1. Lee el flujo y sus criterios en [docs/fases/01-planificacion/kb/flujos.md](docs/fases/01-planificacion/kb/flujos.md).
2. Lee los permisos que le aplican en la matriz de [docs/fases/01-planificacion/kb/arquitectura.md](docs/fases/01-planificacion/kb/arquitectura.md#matriz-de-acceso).
3. Lee las amenazas, medidas y comprobaciones previstas en [docs/fases/01-planificacion/kb/amenazas.md](docs/fases/01-planificacion/kb/amenazas.md).
4. Revisa [docs/fases/01-planificacion/kb/preguntas-abiertas.md](docs/fases/01-planificacion/kb/preguntas-abiertas.md). Si tu cambio depende de una pregunta abierta, **detente**.
5. Para terceros y secretos, usa [docs/fases/01-planificacion/kb/terceros-secretos.md](docs/fases/01-planificacion/kb/terceros-secretos.md).

Cambios en `coverage` o en las vistas de `/cobertura` y `/oij`: lee además [T-10](docs/fases/01-planificacion/kb/amenazas.md#t-10).

## Qué es regla y qué no

- Un criterio **[A]** es una regla aprobada: debes respetarla, aunque el código aún no la cumpla (la "Brecha actual" indica qué falta).
- Un criterio **[O]** describe lo que hace el código hoy. No lo trates como requisito ni lo uses para justificar un cambio de comportamiento.
- Un criterio **[P]** y las entradas de [docs/fases/01-planificacion/kb/ia-sugerencias.md](docs/fases/01-planificacion/kb/ia-sugerencias.md) están pendientes de validación humana. No los implementes como si fueran reglas.

## Dudas que requieren una decisión humana

Las nueve preguntas iniciales están resueltas ([docs/fases/01-planificacion/kb/preguntas-abiertas.md](docs/fases/01-planificacion/kb/preguntas-abiertas.md)); aplica esas decisiones. Si surge una duda nueva y no puedes determinar con la documentación el permiso o comportamiento correcto:

- **No asumas la respuesta.** Ni siquiera la recomendada en la pregunta.
- Registra la duda como una nueva `Q-nn` en [docs/fases/01-planificacion/kb/preguntas-abiertas.md](docs/fases/01-planificacion/kb/preguntas-abiertas.md), con un responsable de resolverla ([docs/fases/01-planificacion/kb/responsables.md](docs/fases/01-planificacion/kb/responsables.md)).
- Detén el cambio afectado y repórtalo en tu resultado, indicando qué necesitas que se decida.

## Mantenimiento de la base de conocimiento

Todo cambio de **comportamiento, datos, arquitectura o permisos** actualiza el contenido afectado de `docs/fases/01-planificacion/kb/` en el mismo PR. Enumera los IDs modificados en la descripción del PR. Reglas completas en [docs/fases/01-planificacion/kb/README.md](docs/fases/01-planificacion/kb/README.md#reglas-de-mantenimiento).

## Reglas de seguridad

- **Datos personales del padrón del TSE.** Nunca los persistas, registres, devuelvas ni envíes a un servicio externo. El importador solo conserva conteos por distrito. Para pruebas usa ZIP **ficticios** con datos inventados.
- **Escritura.** Los endpoints `POST /osm/sync`, `POST /oij/sync` y `POST /tse/import` exigen la cabecera `X-Admin-Key` ([Q-01](docs/fases/01-planificacion/kb/preguntas-abiertas.md#q-01)). No agregues endpoints de escritura sin protección ni expongas la clave en el frontend (nunca `NEXT_PUBLIC_*`).
  Esta es una **regla aprobada**, no una garantía del código actual: consulta la brecha y el estado de [T-01](docs/fases/01-planificacion/kb/amenazas.md#t-01). Antes de afirmar que una ruta está protegida, comprueba su implementación y las pruebas de autorización.
- **Secretos.** No leas, imprimas ni incluyas en prompts, logs o commits el contenido de `.env`, `.env.local` ni credenciales. No escribas valores secretos en ningún archivo. Las variables se documentan con nombre y propósito en [docs/fases/01-planificacion/kb/terceros-secretos.md](docs/fases/01-planificacion/kb/terceros-secretos.md).
- **Fuentes externas.** No evadas autenticación, CAPTCHA, límites de uso ni controles de protección. No amplíes el consumo de una fuente (frecuencia, tamaño, hosts) sin registrarlo.
- **Controles.** No desactives, debilites ni omitas pruebas, análisis, reglas o protecciones para conseguir que algo pase. No cambies la expectativa de una prueba solo para que coincida con el código.
- **Aprobación.** No apruebes ni fusiones tu propio trabajo. Un integrante distinto del autor revisa cada PR.
- **Producción.** `synchronize: true` de TypeORM es solo para el laboratorio local ([T-09](docs/fases/01-planificacion/kb/amenazas.md#t-09)). No lo uses como justificación de cambios de esquema en un ambiente desplegado.

## Convenciones del proyecto

- Respuestas y documentación en español, con tildes y signos correctos.
- Módulos del backend por dominio en `backend/src/<módulo>/` (`osm`, `tse`, `oij`, `coverage`).
- El frontend llama a la API solo mediante `frontend/lib/api.ts`.
- No agregues dependencias nuevas sin justificarlas en el PR.

## Comandos de comprobación

Se usa `npm` ([Q-05](docs/fases/01-planificacion/kb/preguntas-abiertas.md#q-05)); no regeneres ni edites `pnpm-lock.yaml`. Detalle de ejecución en [README.md](README.md#configuración-y-ejecución).

| Qué | Dónde | Comando |
|---|---|---|
| Compilar el backend | `backend/` | `npm run build` |
| Pruebas del módulo OIJ | `backend/` | `npm run test:oij` |
| Pruebas de la clave de administración (T-01) | `backend/` | `npm run test:admin` |
| Pruebas del modo operador (Q-02) | `frontend/` | `npm run test:operator` |
| Compilar el frontend y comprobar tipos | `frontend/` | `npm run build` |

Aún no existen comandos de linting, pruebas unitarias generales ni análisis de seguridad. Se agregarán en las etapas de Desarrollo y Construcción; cuando existan se listarán aquí, sin duplicar sus instrucciones.

## Alcance de esta versión

Este archivo corresponde a la etapa de Planificación. Los hooks, scripts, límites de ejecución del agente y checks de CI se definirán en las etapas posteriores y se referenciarán aquí.
