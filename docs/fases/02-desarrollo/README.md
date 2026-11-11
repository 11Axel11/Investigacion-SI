# Fase 2: Desarrollo

**Objetivo.** Preparar un entorno de programación agéntica que use la base de conocimiento, ejecute comprobaciones de calidad y seguridad y permita revisar sus resultados antes de integrar. Se demuestra con **un cambio acotado** en la aplicación.

**Dónde se ejecuta:** computadora del estudiante. **Herramientas:** agente con hook o wrapper, linter, compilador, pruebas unitarias, Semgrep CE, Gitleaks.

## Qué se espera (ítems)

| Ítem | Qué se espera | Estado hoy |
|---|---|---|
| 2.1 | `AGENTS.md` con dónde consultar requisitos, permisos, amenazas, convenciones y comandos. Demostrar que el agente consulta lo pertinente y señala dudas que requieren decisión humana | Parcial: `AGENTS.md` existe; falta la demostración |
| 2.2 | Comandos reproducibles de compilación, **linting** y pruebas unitarias; pruebas de una regla de negocio con errores y valores límite; README y `AGENTS.md` los referencian | Parcial: hay `build`, `test:oij`, `test:admin` y `test:operator` (reglas de la clave de administración con valores límite y errores); linting con `npm run lint` en ambos proyectos; faltan pruebas de más reglas de negocio |
| 2.3 | Semgrep CE (o equivalente) y Gitleaks; alcance documentado; demostración con un defecto controlado y un secreto ficticio | No iniciado |
| 2.4 | Hook o wrapper que ejecuta las verificaciones al terminar la tarea y devuelve resultados al agente; reintentos con límite; si persiste, se detiene y reporta | No iniciado |
| 2.5 | Límites del agente respaldados por permisos y mecanismos (no solo texto): archivos y herramientas permitidos, acciones con aprobación humana, no exponer secretos, no aprobar su propio trabajo ni desactivar controles; cambios en pruebas, reglas y scripts de verificación los revisa otro integrante | No iniciado |
| 2.6 | Revisión de código asistida por IA con requisitos y riesgos; cada observación con ubicación, justificación y comprobación sugerida; otro integrante la valida | No iniciado |
| 2.7 | Flujo completo con un cambio acotado: el agente consulta contexto, implementa, recibe resultados, corrige un fallo. Se conservan diff, comandos, resultados y revisión humana; se explica qué cubrió cada mecanismo y qué quedó fuera | En curso: el guard `X-Admin-Key` (M-01) y el modo operador (Q-02) están implementados y probados, también de extremo a extremo; falta el flujo con hook (2.4), Semgrep y Gitleaks (2.3) y la revisión humana |

## Criterio de cierre

El equipo reproduce el ciclo de desarrollo asistido: un fallo se detecta, vuelve al agente para corregirlo y requiere intervención humana cuando no se resuelve dentro de los límites. Las comprobaciones pasan a CI en la fase 3.

## Evidencia a conservar

Diff del cambio acotado, comandos y salidas, reporte de Semgrep y Gitleaks (con el defecto y el secreto ficticio detectados), registro del hook y de sus reintentos, revisión humana.

## Aprovechar de la fase 1

El cambio acotado puede ser el guard `X-Admin-Key` ([M-01](../01-planificacion/kb/amenazas.md#t-01), [Q-01](../01-planificacion/kb/preguntas-abiertas.md#q-01)): es la amenaza de mayor prioridad, está decidida y el agente debe consultar F-01 a F-03 y la matriz de acceso para implementarlo. Antes, leer los pasos de `AGENTS.md` para flujos críticos.
