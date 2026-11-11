# Responsables y reparto de la fase 1

**Supuesto de partida.** El equipo se infiere del historial de git (cuatro autores: FranderCT, 11Axel11, Daniel y José Núñez Villalobos) y se confirma al ratificar el PR de la fase 1 ([Q-08](preguntas-abiertas.md#q-08)). Pablo se suma como quinto integrante y todavía no aparece en el historial; el reparto con él es una propuesta pendiente de ratificar ([Q-10](preguntas-abiertas.md#q-10)). Los nombres se escriben sin menciones de GitHub a propósito. Si alguien del equipo es distinto o la asignación no es equilibrada, se corrige este archivo y los que lo referencian en el mismo PR.

**Regla.** Cada ítem y cada amenaza tiene un responsable y un revisor distinto. Quien revisa no escribió lo que revisa. La columna "Revisión" se actualiza cuando la persona revisora deja constancia en el PR.

## Integrantes y fuentes OSINT

| Integrante | Fuente OSINT | Estado |
|---|---|---|
| Frander | OpenStreetMap / Overpass | Integrada |
| Axel | TSE (padrón electoral) | Integrada |
| José | OIJ (estadísticas policiales) | Integrada |
| Daniel | SNIT (límites cantonales por WFS) | Integrada en cobertura ([Q-08](preguntas-abiertas.md#q-08)) |
| Pablo | Sin fuente propia | Propuesta pendiente de ratificar ([Q-10](preguntas-abiertas.md#q-10)) |

## Ítems de la fase 1

| Ítem | Entregable | Responsable | Revisor | Revisión |
|---|---|---|---|---|
| 1.1 | [flujos.md](flujos.md) | Axel | Pablo | Pendiente |
| 1.2 | [arquitectura.md](arquitectura.md) | Frander | José | Pendiente |
| 1.3 | [amenazas.md](amenazas.md) y [observatorio.json](../threat-model/observatorio.json) | José | Pablo | Pendiente |
| 1.4 | Medidas dentro de [amenazas.md](amenazas.md) | Daniel | Axel | Pendiente |
| 1.5 | [terceros-secretos.md](terceros-secretos.md) | Frander | Daniel | Pendiente |
| 1.6 | [preguntas-abiertas.md](preguntas-abiertas.md) e [ia-sugerencias.md](ia-sugerencias.md) | Axel | José | Pendiente |
| 1.7 | Esta carpeta versionada y [README.md](README.md) | Pablo | Axel | Pendiente |
| 1.8 | [AGENTS.md](../../../../AGENTS.md) | Pablo | Frander | Pendiente |

Son 8 ítems entre 5 personas: Axel, Frander y Pablo responden por dos; José y Daniel, por uno. Revisan dos Pablo, José y Axel; uno, Daniel y Frander. Los ítems 1.7 y 1.8 ya estaban redactados por otras personas; Pablo los asume como responsable y los revisan Axel y Frander.

## Responsables de las amenazas

Resumen; el detalle de cada medida y su comprobación está en [amenazas.md](amenazas.md).

| Amenaza | Responsable | Revisor | Tratamiento |
|---|---|---|---|
| [T-01](amenazas.md#t-01) | Frander | José | Mitigar |
| [T-02](amenazas.md#t-02) | Pablo | Axel | Mitigar |
| [T-03](amenazas.md#t-03) | Axel | Daniel | Mitigar |
| [T-04](amenazas.md#t-04) | Axel | José | Mitigar (ya implementada; falta verificar) |
| [T-05](amenazas.md#t-05) | Axel | Daniel | Mitigar |
| [T-06](amenazas.md#t-06) | Frander | Axel | Mitigar |
| [T-07](amenazas.md#t-07) | José | Daniel | Mitigar (ya implementada; falta ampliar pruebas) |
| [T-08](amenazas.md#t-08) | Daniel | José | Mitigar |
| [T-09](amenazas.md#t-09) | Pablo | Frander | Mitigar |
| [T-10](amenazas.md#t-10) | Frander | Pablo | Mitigar |
| [T-11](amenazas.md#t-11) | José | Axel | Mitigar |
| [T-12](amenazas.md#t-12) | Daniel | Pablo | Mitigar |
| [T-13](amenazas.md#t-13) | Daniel | Frander | Mitigar |
| [T-14](amenazas.md#t-14) | Daniel (propuesto) | Axel (propuesto) | Mitigación propuesta; pendiente de validación humana |

No se aplaza ninguna amenaza ni se acepta ningún riesgo sin tratamiento.

T-14 se propuso durante la [revisión de medidas del 2026-11-11](../evidencias/revision-medidas.md). No se registra como revisión humana realizada ni como medida implementada. Daniel y Axel deben ratificar la asignación, prioridad y tratamiento en el PR.

## Responsables de los secretos

| Secreto | Responsable |
|---|---|
| S-01 `DATABASE_URL` | Frander |
| S-02 Clave de administración | Axel |
| S-03 Token de Docker Hub | Daniel |
| S-04 Credencial de despliegue | Pablo |
| S-05 Clave del proveedor de IA | José |

## Validadores de las sugerencias de IA

| Sugerencias | Validador |
|---|---|
| IA-01 y IA-02 | Daniel |
| IA-03 y IA-04 | Frander |
| IA-05 a IA-07 | José |
| IA-08 e IA-12 | Pablo |
| IA-09 a IA-11 | Axel |

## Trabajo derivado de las decisiones (fuera de la fase 1)

Tareas que surgen de las medidas y decisiones. Cada una se convierte en una tarea del registro único (GitHub Issues) citando su ID, y se cubre en las etapas siguientes. Cuáles forman parte de los 12 ítems evaluables se decide al repartir las etapas 2 a 7.

| Tarea | Origen | Etapa |
|---|---|---|
| Guard de administración y vista de operador | M-01, Q-01, Q-02 | 2 y 4 |
| Límite de peticiones, ZIP seguro, transacción en OSM, aviso de truncamiento | M-02, M-03, M-06, Q-07 | 2 |
| Eventos de seguridad con retención de 90 días | M-08, Q-03 | 7 |
| Aviso de metodología en `/cobertura` | M-10, Q-04 | 2 |
| Eliminar `pnpm-lock.yaml` y comprobar `npm ci` | Q-05 | 2 y 3 |
| Integrar SNIT y reemplazar el GeoJSON estático | Q-08 | 2 |
| CORS, helmet, migraciones, DTOs | M-09, M-11 | 2 y 3 |
| Gitleaks, OSV-Scanner, Renovate | M-12, M-13 | 2, 3 y 7 |
| Docker Compose con Caddy y despliegue en el VPS | Q-09 | 6 |
