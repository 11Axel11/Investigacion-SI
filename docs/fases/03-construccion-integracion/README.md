# Fase 3: Construcción e integración

**Objetivo.** Pipeline de integración continua que ejecuta comprobaciones de calidad y seguridad, construye artefactos candidatos y **bloquea la integración** cuando no se cumplen las condiciones. Los resultados quedan asociados al commit evaluado.

**Dónde se ejecuta:** GitHub Actions. **Herramientas:** linter, compilador, pruebas, Semgrep CE, Gitleaks, OSV-Scanner, Docker, Trivy, Conftest + OPA/Rego, revisor de IA.

## Qué se espera (ítems)

| Ítem | Qué se espera |
|---|---|
| 3.1 | Workflow de GitHub Actions para cada PR hacia `development` o `main`: instala con lockfiles, ejecuta lint, build y suites obligatorias; ambiente aislado con datos ficticios cuando haga falta |
| 3.2 | Semgrep CE, Gitleaks y **OSV-Scanner** en CI; documentar qué hallazgos bloquean y los códigos de salida; un análisis que no pudo ejecutarse se considera incompleto, no aprobado |
| 3.3 | Construir la imagen candidata; Trivy (imagen, Dockerfile, IaC); SBOM en CycloneDX o SPDX; reportes que identifican commit e imagen |
| 3.4 | Dos políticas Conftest/OPA: sin contenedores privilegiados y usuario no root explícito; un caso permitido y uno rechazado |
| 3.5 | `development` y `main` protegidas: PR, aprobación de otro integrante, checks obligatorios; permisos mínimos de tokens; acciones de terceros fijadas por SHA; el agente no puede saltarse las protecciones |
| 3.6 | Demostrar que un check fallido, omitido o incompleto impide fusionar; reportes como artefactos asociados al commit; CI detecta el fallo aunque se omitan las verificaciones locales |
| 3.7 | Revisión asistida por IA automatizada sobre el PR (reutiliza instrucciones de la fase 2); informativa, no aprueba; otro integrante valida las observaciones |
| 3.8 | Verificar el commit resultante de la fusión y construir sus artefactos; la versión reutiliza esos resultados y conserva la identidad de las imágenes aprobadas |

## Estado (2026-11-11)

**Construido, probado en local y ejecutado en GitHub (PR #11 en verde; PR #12 de demostración en rojo y luego en verde).** Falta lo que solo hace una persona sobre el repositorio remoto: aplicar la protección de ramas, fusionar #11 y ver la ejecución de la fusión. Revisión humana de todo lo de esta fase: **diferida** ([Q-11](../01-planificacion/kb/preguntas-abiertas.md#q-11)).

| Ítem | Estado | Evidencia |
|---|---|---|
| 3.1 | Workflow `ci.yml` hecho; `actionlint` sin errores; **ejecutado en GitHub: todos los jobs en éxito** | [3.1](evidencias/3.1-workflow-ci.md) |
| 3.2 | Semgrep, Gitleaks y OSV-Scanner con compuerta y códigos de salida; ejecutado en local: limpio. 71 avisos de OSV reducidos a 4 con excepción **propuesta** ([Q-12](../01-planificacion/kb/preguntas-abiertas.md#q-12)) | [3.2](evidencias/3.2-seguridad-ci.md) |
| 3.3 | Dockerfiles, imagen candidata, Trivy (imagen e IaC) y SBOM CycloneDX ejecutados en local; un hallazgo real corregido | [3.3 y 3.4](evidencias/3.3-3.4-imagenes-y-politicas.md) |
| 3.4 | Dos políticas Conftest/OPA, 12 pruebas Rego, un caso permitido y tres rechazados | [3.3 y 3.4](evidencias/3.3-3.4-imagenes-y-politicas.md) |
| 3.5 | Script `proteger-ramas.sh` (simulacro) y permisos mínimos y SHA ya aplicados en los workflows. **Protección de ramas NO aplicada**: `main` sigue sin protección y `development` no existe ([Q-13](../01-planificacion/kb/preguntas-abiertas.md#q-13)) | [3.5](evidencias/3.5-proteccion-ramas.md) |
| 3.6 | `resultado` falla si algo falló, se omitió o se canceló; **demostrado en GitHub rojo → corrección → verde** (PR #12). **No se probó el bloqueo efectivo de la fusión**: sin protección de ramas el botón seguía habilitado | [3.6](evidencias/3.6-bloqueo-demostrado.md) |
| 3.7 | Workflow y script informativos con DeepSeek o Anthropic; probados en seco y ejecutados en GitHub sin clave (informan "NO ejecutada"); **sin clave configurada** | [3.7](evidencias/3.7-revision-ia.md) |
| 3.8 | Job `fusion` y artefactos por commit definidos; artefactos verificados en PR; **falta la ejecución tras fusionar** | [3.8](evidencias/3.8-commit-fusionado.md) |

## Acciones que solo puede hacer una persona

1. Crear el secreto `DEEPSEEK_API_KEY` (o `ANTHROPIC_API_KEY`) en *Settings → Secrets and variables → Actions*, tras revisar la política de datos del proveedor (TP-12).
2. Instalar la aplicación Renovate en el repositorio.
3. Decidir [Q-12](../01-planificacion/kb/preguntas-abiertas.md#q-12) y [Q-13](../01-planificacion/kb/preguntas-abiertas.md#q-13) y, según Q-13, ejecutar `scripts/ci/proteger-ramas.sh --aplicar`.
4. Validar las observaciones de la revisión de IA y revisar los cambios a scripts, reglas y políticas ([Q-11](../01-planificacion/kb/preguntas-abiertas.md#q-11)).

## Criterio de cierre

Se demuestra un PR bloqueado por un fallo, su corrección y su integración posterior, y se identifican los resultados y artefactos del commit fusionado.

## Pendientes derivados de la fase 1

- ~~Eliminar `pnpm-lock.yaml` y `frontend/pnpm-workspace.yaml`; comprobar `npm ci`~~ Hecho en la fase 2 ([Q-05](../01-planificacion/kb/preguntas-abiertas.md#q-05), [T-12](../01-planificacion/kb/amenazas.md#t-12)).
- ~~Dockerfiles de backend y frontend~~ Hechos en la fase 3 (`backend/Dockerfile`, `frontend/Dockerfile`).
- ~~Gitleaks, OSV-Scanner~~ Hechos (fase 2 y 3). Renovate: configuración lista (`renovate.json`), **falta instalar la aplicación** ([M-12, M-13](../01-planificacion/kb/amenazas.md#t-12)).

## Evidencia a conservar

Enlaces a ejecuciones de Actions, artefactos de reportes por commit, SBOM, captura de la regla de protección de rama, PR bloqueado y PR corregido.
