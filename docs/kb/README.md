# Base de conocimiento del proyecto (ítem 1.7)

Documentación versionada de planificación segura del Observatorio Territorial y Electoral de Costa Rica. Orienta al equipo y al agente de IA durante el desarrollo y la revisión de cambios. Corresponde a la etapa 1 (Planificación) del proyecto final de desarrollo seguro.

Estado: fase 1 completa a falta de la revisión cruzada humana. Contenido del 2026-11-10 sobre el commit `e5a1990`; responsables y revisores asignados en [responsables.md](responsables.md).

## Contenido

| Archivo | Qué contiene | Ítem |
|---|---|---|
| [flujos.md](flujos.md) | Tres flujos críticos con criterios Dado/Cuando/Entonces | 1.1 |
| [arquitectura.md](arquitectura.md) | Componentes, límites de confianza, datos sensibles, endpoints y matriz de acceso | 1.2 |
| [amenazas.md](amenazas.md) | Amenazas STRIDE, prioridad, medida, componente, comprobación y responsable | 1.3 y 1.4 |
| [terceros-secretos.md](terceros-secretos.md) | Servicios externos, dependencias críticas y secretos (sin valores) | 1.5 |
| [preguntas-abiertas.md](preguntas-abiertas.md) | Dudas de permisos y comportamiento, con su decisión | 1.6 |
| [ia-sugerencias.md](ia-sugerencias.md) | Casos límite y abusos propuestos por IA, pendientes de validar | 1.6 |
| [responsables.md](responsables.md) | Integrantes, fuentes, responsable y revisor de cada ítem y amenaza | 1.4 |
| [../threat-model/observatorio.json](../threat-model/observatorio.json) | Modelo de Threat Dragon (diagrama y amenazas) | 1.3 |
| [../threat-model/README.md](../threat-model/README.md) | Cómo abrir y mantener el modelo de Threat Dragon | 1.3 |
| [../../AGENTS.md](../../AGENTS.md) | Cómo debe consultar y mantener esta información el agente | 1.8 |

## Identificadores

Se usan IDs cortos para relacionar la información sin repetirla.

| Prefijo | Significado | Dónde se define |
|---|---|---|
| `F-nn` | Flujo crítico | [flujos.md](flujos.md) |
| `FnnACm` | Criterio de aceptación del flujo `F-nn` | [flujos.md](flujos.md) |
| `C-nn` | Componente | [arquitectura.md](arquitectura.md) |
| `D-nn` | Dato protegido | [arquitectura.md](arquitectura.md) |
| `T-nn` | Amenaza (con su medida y comprobación) | [amenazas.md](amenazas.md) |
| `TP-nn` | Tercero o servicio externo | [terceros-secretos.md](terceros-secretos.md) |
| `S-nn` | Secreto | [terceros-secretos.md](terceros-secretos.md) |
| `Q-nn` | Pregunta y decisión | [preguntas-abiertas.md](preguntas-abiertas.md) |
| `IA-nn` | Sugerencia de IA pendiente de validar | [ia-sugerencias.md](ia-sugerencias.md) |
| `M-nn` | Medida de la amenaza `T-nn` del mismo número | [amenazas.md](amenazas.md) |

Los IDs no se reutilizan. Una amenaza o pregunta resuelta se marca como tal; no se borra ni se renumera. Las referencias a tareas y hallazgos usarán el registro único del proyecto (GitHub Issues), citando el ID de esta base de conocimiento.

## Estados que se usan

- **Criterios de aceptación:** **[A]** regla aprobada (el código puede no cumplirla aún; se indica como "Brecha actual"); **[O]** comportamiento observado en el código, no necesariamente deseado; **[P]** propuesta pendiente de una pregunta `Q-nn` (hoy no queda ninguna).
- **Medidas:** `propuesta`, `implementada` (existe, sin prueba) o `verificada` (con prueba o evidencia reproducible).
- **Sugerencias de IA:** `pendiente`, `aceptada`, `rechazada` o `falso positivo`.

## Reglas de mantenimiento

1. Un cambio de comportamiento, datos, arquitectura o permisos actualiza el contenido afectado **en el mismo PR**. La descripción del PR lista los IDs tocados.
2. El revisor del PR comprueba que el cambio respeta los criterios, la matriz de acceso y las medidas vigentes, o que los actualiza.
3. Un hecho nuevo del código se registra como **[O]**. Pasa a **[A]** solo cuando una persona lo aprueba.
4. Una duda de permisos o comportamiento se registra como `Q-nn` con un responsable. No se resuelve por suposición.
5. No se incluyen valores secretos ni datos personales en ningún archivo de esta carpeta.
6. Cuando una medida se implemente, se agrega la referencia al código (archivo y PR) y la evidencia de la comprobación en la misma amenaza, y su estado pasa a `implementada` o `verificada`.

## Formatos opcionales

YAML, JSON o un grafo de contexto se agregarán solo si facilitan una consulta o automatización concreta. Por ahora el Markdown es la fuente.

## Estado de cierre de la fase 1

La planificación se considera completa cuando:

- [x] Los tres flujos tienen comportamiento y permisos definidos ([flujos.md](flujos.md), [matriz de acceso](arquitectura.md#matriz-de-acceso); Q-01 y Q-02 resueltas).
- [x] Cada amenaza tiene decisión de tratamiento (mitigar), medida, comprobación prevista y responsable ([amenazas.md](amenazas.md), [responsables.md](responsables.md)).
- [x] Las dudas que impedían definir el comportamiento correcto están resueltas (Q-01 a Q-09).
- [x] El diagrama de Threat Dragon existe y contiene los 13 IDs de [amenazas.md](amenazas.md) ([observatorio.json](../threat-model/observatorio.json)).
- [ ] **Otro integrante revisó este contenido** y ratificó las decisiones delegadas ([preguntas-abiertas.md](preguntas-abiertas.md)). Es lo único pendiente; lo hace cada revisor en el PR.
