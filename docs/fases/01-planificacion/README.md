# Fase 1: Planificación

**Objetivo.** Construir una base de conocimiento breve y versionada con el comportamiento esperado, los permisos y los principales riesgos. Orienta al equipo y al agente de IA durante el desarrollo y la revisión.

**Dónde se ejecuta:** computadora del estudiante. **Herramientas:** OWASP Threat Dragon, agente de IA para proponer casos límite.

## Qué se espera (ítems)

| Ítem | Qué se espera | Entregable | Revisión |
|---|---|---|---|
| 1.1 | Tres flujos críticos con actor, objetivo y resultado; criterios Dado/Cuando/Entonces de éxito, error y uso indebido | [flujos.md](kb/flujos.md) | Pendiente |
| 1.2 | Mapa de arquitectura, datos sensibles y tabla actor → recurso → acción → condición | [arquitectura.md](kb/arquitectura.md) | Pendiente |
| 1.3 | Amenazas STRIDE en Threat Dragon (mínimo 3) con recurso, impacto y prioridad | [amenazas.md](kb/amenazas.md), [observatorio.json](threat-model/observatorio.json) | Pendiente |
| 1.4 | Por amenaza: medida, componente, comprobación prevista y responsable | [amenazas.md](kb/amenazas.md), [responsables.md](kb/responsables.md) | Pendiente |
| 1.5 | Terceros y secretos (propósito, consumidores, responsable, ubicación; sin valores) | [terceros-secretos.md](kb/terceros-secretos.md) | Pendiente |
| 1.6 | IA propone casos límite; el equipo valida; dudas con responsable | [preguntas-abiertas.md](kb/preguntas-abiertas.md), [ia-sugerencias.md](kb/ia-sugerencias.md) | Pendiente |
| 1.7 | Base de conocimiento en Markdown, con IDs, versionada | [kb/](kb/README.md) | Pendiente |
| 1.8 | `AGENTS.md`: cómo consultar y mantener la información | [AGENTS.md](../../../AGENTS.md) | Pendiente |

## Criterio de cierre

Los flujos tienen comportamiento y permisos definidos; los riesgos principales tienen decisión de tratamiento; cada medida tiene comprobación prevista y responsable; las dudas que impiden definir el comportamiento están resueltas.

## Estado

**Cada integrante debe revisar sus ítems y firmar en [REVISION.md](REVISION.md).**

Todo el contenido está escrito (PR #2 y la finalización del 2026-11-11). **Pendiente: revisión cruzada presencial del equipo.** Las decisiones Q-10 e IA-01 a IA-12 están tomadas de forma provisional por delegación de Frander, y el diagrama de Threat Dragon ya tiene su imagen ([observatorio.png](threat-model/observatorio.png)).

| Revisor | Revisa | Debe ratificar |
|---|---|---|
| Daniel | 1.5 | Decisiones Q-xx que le toquen |
| José | 1.2 y 1.6 | Idem |
| Frander | 1.8 | Idem |
| Axel | 1.4 y 1.7 | Idem |
| Pablo | 1.1 y 1.3 | Idem |

Además: ratificar las decisiones Q-01 a Q-10 (las tomó la IA por delegación) y ratificar o cambiar el estado provisional de IA-01 a IA-12.

Comprobaciones objetivas ya ejecutadas el 2026-11-11 (no son una revisión cruzada): [VERIFICACION-PREVIA.md](VERIFICACION-PREVIA.md).

## Evidencia a conservar

- Constancia de cada revisión (comentario de PR o issue) y actualización de la columna "Revisión" en [responsables.md](kb/responsables.md).
- Captura o exportación del diagrama de Threat Dragon: [observatorio.png](threat-model/observatorio.png) (hecha el 2026-11-11).
