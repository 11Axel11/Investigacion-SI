# Fases del proyecto final de desarrollo seguro

Guía de ejecución por etapa del proyecto final (fuente: `docs/documento-proyecto.docx`). Cada carpeta resume **qué se espera**, qué evidencia se conserva y en qué estado va la etapa. Las carpetas de fase solo contienen documentación y evidencias; el código, los workflows y la configuración viven donde corresponde (`backend/`, `frontend/`, `.github/`, etc.).

**Entrega:** viernes 13 de noviembre de 2026, 23:59:59 (hora de Costa Rica). **Equipo:** Frander, Axel, Daniel, José y Pablo ([Q-08](01-planificacion/kb/preguntas-abiertas.md#q-08), [Q-10](01-planificacion/kb/preguntas-abiertas.md#q-10)).

| Fase | Carpeta | Ítems | Dónde se ejecuta | Estado |
|---|---|---|---|---|
| 1. Planificación | [01-planificacion](01-planificacion/README.md) | 1.1 a 1.8 | Computadora del estudiante | Completa a falta de la revisión cruzada |
| 2. Desarrollo | [02-desarrollo](02-desarrollo/README.md) | 2.1 a 2.7 | Computadora del estudiante | Parcial |
| 3. Construcción e integración | [03-construccion-integracion](03-construccion-integracion/README.md) | 3.1 a 3.8 | GitHub Actions | No iniciada |
| 4. Pruebas | [04-pruebas](04-pruebas/README.md) | 4.1 a 4.10 | Local y GitHub Actions | Parcial (solo `npm run test:oij`) |
| 5. Preparación de la versión | [05-preparacion-version](05-preparacion-version/README.md) | 5.1 a 5.6 | GitHub Actions y Docker Hub | No iniciada |
| 6. Despliegue | [06-despliegue](06-despliegue/README.md) | 6.1 a 6.6 | GitHub Actions y VPS | No iniciada |
| 7. Operación y mejora continua | [07-operacion](07-operacion/README.md) | 7.1 a 7.8 | VPS y GitHub | No iniciada |

Estado verificado contra el repositorio el 2026-11-10 (no existen `.github/`, Dockerfiles, linting, Semgrep ni Gitleaks).

## Reglas transversales del documento

- Cada actividad tiene un **responsable**, y **otro integrante** la revisa. Nadie aprueba su propio trabajo.
- Un único **registro de hallazgos y excepciones** (GitHub Issues). Hoy no hay issues creados.
- Una comprobación **omitida, incompleta o que no pudo ejecutarse** se reporta como incompleta, nunca como aprobada.
- Cada etapa reutiliza scripts, pruebas y configuración de las anteriores; no se duplican implementaciones.
- Herramientas open source para las comprobaciones. GitHub, Actions y Docker Hub como servicios.
- Cada integrante contribuye de forma verificable y defiende su aporte.

## Cómo se relaciona con la base de conocimiento

La base de conocimiento viva está dentro de la fase 1, en [docs/fases/01-planificacion/kb/](01-planificacion/kb/README.md) (flujos, amenazas, permisos, preguntas). Las carpetas de fase **no la copian**: la referencian por ID (`F-nn`, `T-nn`, `Q-nn`). Si un cambio de comportamiento, datos, arquitectura o permisos aparece al trabajar una fase, se actualiza `docs/fases/01-planificacion/kb/` en el mismo PR ([reglas](01-planificacion/kb/README.md#reglas-de-mantenimiento)).
