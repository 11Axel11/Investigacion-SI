# Fase 2: Desarrollo

**Objetivo.** Preparar un entorno de programación agéntica que use la base de conocimiento, ejecute comprobaciones de calidad y seguridad y permita revisar sus resultados antes de integrar. Se demuestra con **un cambio acotado** en la aplicación.

**Dónde se ejecuta:** computadora del estudiante. **Herramientas:** agente con hook o wrapper, linter, compilador, pruebas unitarias, Semgrep CE, Gitleaks.

## Estado de cierre (2026-11-11)

**Cerrada en lo técnico; la revisión humana está diferida, no hecha.** Frander, el único integrante disponible hoy, pidió dejar de lado la revisión humana para terminar el trabajo ([Q-11](../01-planificacion/kb/preguntas-abiertas.md#q-11) sigue abierta, sin revisor asignado). Eso significa que **ningún ítem tiene todavía la validación de un integrante distinto del autor**, que el criterio 2.5 ("otro integrante revisa los cambios a pruebas, reglas y scripts") y la validación de 2.6 **no se cumplen** y que no se firmó ni aprobó nada en nombre de nadie. Quien revise después debe leer el tratamiento de R-01 a R-09 en [2.6](evidencias/2.6-revision-ia.md), no solo las observaciones.

`scripts/verificar.sh` (completo) pasa el 2026-11-11: lint y build del backend, `test:admin` (17), `test:tse` (18 y 2 `todo`), `test:oij` (8), lint, tipos y build del frontend, `test:operator` (9), Semgrep y Gitleaks.

## Qué se espera (ítems)

| Ítem | Qué se espera | Estado hoy |
|---|---|---|
| 2.1 | `AGENTS.md` con dónde consultar requisitos, permisos, amenazas, convenciones y comandos. Demostrar que el agente consulta lo pertinente y señala dudas que requieren decisión humana | **Hecho.** Recorrido por los cinco pasos y dudas enviadas a una persona (Q-11) en [evidencias/2.7-flujo-completo.md](evidencias/2.7-flujo-completo.md). Confirmación de otro integrante: diferida |
| 2.2 | Comandos reproducibles de compilación, **linting** y pruebas unitarias; pruebas de una regla de negocio con errores y valores límite; README y `AGENTS.md` los referencian | **Hecho.** `build`, `lint`, `test:admin`, `test:tse`, `test:oij`, `test:operator` y `tsc`. Reglas de negocio con errores y valores límite: la clave de administración (T-01) y el importador del padrón (F-01: fechas, línea de 2 000/2 001, lotes de 500/501, privacidad, idempotencia). Las pruebas hallaron un defecto real en F-01 (R-08) y se corrigió. Quedan sin probar F02/F03 salvo el parser del OIJ, y F01-AC8/AC9 como `todo` (brechas conocidas) |
| 2.3 | Semgrep CE (o equivalente) y Gitleaks; alcance documentado; demostración con un defecto controlado y un secreto ficticio | **Hecho.** 5 reglas propias y Gitleaks (historial y árbol), `scripts/seguridad.sh`; demostración de 5 defectos y 1 secreto ficticio; 0 hallazgos en el repo real. Ajustes del 2026-11-11: regla con guard de clase (R-06) y `.env` locales (R-09). Detalle en [evidencias/2.3-semgrep-gitleaks.md](evidencias/2.3-semgrep-gitleaks.md) |
| 2.4 | Hook o wrapper que ejecuta las verificaciones al terminar la tarea y devuelve resultados al agente; reintentos con límite; si persiste, se detiene y reporta | **Hecho.** `scripts/verificar.sh` y hook `Stop` (`scripts/hook-stop.sh`, 3 reintentos y se detiene). Probado con un defecto controlado. Ahora también ejecuta `test:tse` y los tipos del frontend (R-07) |
| 2.5 | Límites del agente respaldados por permisos y mecanismos (no solo texto); cambios en pruebas, reglas y scripts de verificación los revisa otro integrante | **Mecanismos hechos; revisión de otro integrante diferida.** `.claude/settings.json` niega leer/editar `.env`, `git push` a `main`, `--force`, `--no-verify`, `gh pr merge` y aprobar PR, y exige aprobación para editar scripts, pruebas, ESLint, `AGENTS.md`, dependencias, `commit`, `push` y `docker`. Comprobado en la sesión: `rm -rf` fue denegado. Los patrones se pueden esquivar (R-04) y la protección de rama de GitHub no está activa |
| 2.6 | Revisión de código asistida por IA con requisitos y riesgos; cada observación con ubicación, justificación y comprobación sugerida; otro integrante la valida | **Hecha por la IA y tratada** (R-01 a R-09: 6 corregidas, 1 mitigada, 1 parcial, 1 aceptada) en [evidencias/2.6-revision-ia.md](evidencias/2.6-revision-ia.md). **Validación humana: diferida** |
| 2.7 | Flujo completo con un cambio acotado: el agente consulta contexto, implementa, recibe resultados, corrige un fallo. Se conservan diff, comandos, resultados y revisión humana; se explica qué cubrió cada mecanismo y qué quedó fuera | **Hecho** en [evidencias/2.7-flujo-completo.md](evidencias/2.7-flujo-completo.md) (consulta, implementación, fallos corregidos —incluido R-08—, comandos y cobertura). **Revisión humana: diferida** |

## Criterio de cierre

El equipo reproduce el ciclo de desarrollo asistido: un fallo se detecta, vuelve al agente para corregirlo y requiere intervención humana cuando no se resuelve dentro de los límites. Las comprobaciones pasan a CI en la fase 3.

**Cumplido:** el fallo se detecta y vuelve al agente (hook `Stop`, `test:tse` y lint), el agente lo corrige y el hook se detiene y reporta tras 3 reintentos. **No cumplido:** la intervención humana real sobre un caso no resuelto y la revisión por un integrante distinto (Q-11).

## Evidencia a conservar

Diff del cambio acotado, comandos y salidas, reporte de Semgrep y Gitleaks (con el defecto y el secreto ficticio detectados), registro del hook y de sus reintentos, revisión humana (pendiente).

## Pendiente fuera del trabajo técnico

1. **Designar revisor** de scripts, reglas, pruebas y permisos del agente, y validador de 2.6 (Q-11).
2. **Activar la protección de la rama `main`** en GitHub cuando haya más de un integrante (R-04).
3. **Rate limiting** (T-02 / R-01) y los límites de F01-AC8 y F01-AC9: decisiones de diseño para las fases siguientes.
4. Pasar `scripts/verificar.sh` a CI en la fase 3.
5. Firmas y ratificación de la fase 1 ([REVISION.md](../01-planificacion/REVISION.md)), que siguen en blanco.

## Aprovechar de la fase 1

El cambio acotado fue el guard `X-Admin-Key` ([M-01](../01-planificacion/kb/amenazas.md#t-01), [Q-01](../01-planificacion/kb/preguntas-abiertas.md#q-01)): es la amenaza de mayor prioridad, está decidida y el agente debió consultar F-01 a F-03 y la matriz de acceso para implementarlo.
