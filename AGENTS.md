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

Se usa `npm` ([Q-05](docs/fases/01-planificacion/kb/preguntas-abiertas.md#q-05)); el único lockfile es `package-lock.json` de cada proyecto (los de pnpm se eliminaron); instala con `npm ci`, no con `pnpm`. Detalle de ejecución en [README.md](README.md#configuración-y-ejecución).

| Qué | Dónde | Comando |
|---|---|---|
| Linting del backend | `backend/` | `npm run lint` |
| Compilar el backend | `backend/` | `npm run build` |
| Pruebas del módulo OIJ | `backend/` | `npm run test:oij` |
| Pruebas de la clave de administración (T-01) | `backend/` | `npm run test:admin` |
| Pruebas del importador del padrón (F-01, ZIP ficticios; incluye multipart HTTP) | `backend/` | `npm run test:tse` |
| Pruebas de `GET /health` (healthcheck del contenedor) | `backend/` | `npm run test:health` |
| Políticas de contenedores (Conftest/OPA, ítem 3.4) | raíz | `scripts/politicas.sh` |
| Pruebas de cabeceras y CORS (T-09) | `backend/` | `npm run test:t09` |
| Seguridad como en CI (Semgrep, Gitleaks y OSV-Scanner con compuerta) | raíz | `scripts/ci/seguridad-ci.sh` |
| Imágenes candidatas, Trivy y SBOM (requiere Docker y `brew install trivy`) | raíz | `scripts/ci/imagenes-ci.sh` |
| Pruebas del modo operador (Q-02) | `frontend/` | `npm run test:operator` |
| Reglas de negocio de `/coverage` (4.2) | `backend/` | `npm run test:coverage` |
| Pruebas con BD de pruebas: unitarias, integración y autorización (4.1 a 4.6; Docker) | raíz | `scripts/pruebas/ejecutar.sh` |
| E2E con Playwright de F-01, F-02 y F-03 (4.4; Docker) | raíz | `scripts/pruebas/e2e.sh` |
| DAST con ZAP contra las imágenes candidatas (4.7; Docker) | raíz | `scripts/pruebas/zap.sh` |
| Resiliencia con Toxiproxy (4.10; Docker) | raíz | `scripts/pruebas/resiliencia.sh` |
| Defecto controlado: las pruebas deben detectarlo (4.9) | raíz | `scripts/pruebas/defecto-controlado.sh funcional\|seguridad` |
| Semgrep CE y Gitleaks (requiere `brew install semgrep gitleaks`) | raíz | `scripts/seguridad.sh` |
| Todas las verificaciones (las ejecuta el hook `Stop`) | raíz | `scripts/verificar.sh` (`--rapido` omite la compilación del frontend) |
| Linting del frontend | `frontend/` | `npm run lint` |
| Compilar el frontend y comprobar tipos | `frontend/` | `npm run build` |

La integración continua vive en `.github/workflows/` (`ci.yml` y `revision-ia.yml`); el único check obligatorio es `resultado`. Decisiones y evidencias en [docs/fases/03-construccion-integracion/](docs/fases/03-construccion-integracion/README.md). Reglas para el agente en CI:

- No fijes una acción de terceros por etiqueta: va por SHA de commit. No agregues acciones ajenas a GitHub sin justificarlo en el PR.
- No amplíes `permissions:` de un workflow ni uses `pull_request_target`.
- No agregues excepciones a `osv-excepciones.json` ni cambies el umbral de la compuerta: es una decisión humana ([Q-12](docs/fases/01-planificacion/kb/preguntas-abiertas.md#q-12)).
- No apliques `scripts/ci/proteger-ramas.sh --aplicar` ni cambies la protección de ramas ([Q-13](docs/fases/01-planificacion/kb/preguntas-abiertas.md#q-13)).
- Un análisis que no se pudo ejecutar es incompleto y bloquea; nunca lo reportes como aprobado.

## Alcance de esta versión

Este archivo cubre Planificación (fase 1), Desarrollo (fase 2), Construcción e integración (fase 3) y Pruebas (fase 4). La preparación de la versión, el despliegue y la operación se agregarán en las fases 5 a 7.
