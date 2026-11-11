# Responsables y reparto de la fase 1

**Supuesto de partida.** El equipo se infiere del historial de git (cuatro autores: FranderCT, 11Axel11, Daniel y José Núñez Villalobos) y se confirma al ratificar el PR de la fase 1 ([Q-08](preguntas-abiertas.md#q-08)). Los nombres se escriben sin menciones de GitHub a propósito. Si alguien del equipo es distinto o la asignación no es equilibrada, se corrige este archivo y los que lo referencian en el mismo PR.

**Regla.** Cada ítem y cada amenaza tiene un responsable y un revisor distinto. Quien revisa no escribió lo que revisa. La columna "Revisión" se actualiza cuando la persona revisora deja constancia en el PR.

## Integrantes y fuentes OSINT

| Integrante | Fuente OSINT | Estado |
|---|---|---|
| Frander | OpenStreetMap / Overpass | Integrada |
| Axel | TSE (padrón electoral) | Integrada |
| José | OIJ (estadísticas policiales) | Integrada |
| Daniel | SNIT (límites cantonales por WFS) | Planificada ([Q-08](preguntas-abiertas.md#q-08)) |

## Ítems de la fase 1

| Ítem | Entregable | Responsable | Revisor | Revisión |
|---|---|---|---|---|
| 1.1 | [flujos.md](flujos.md) | Axel | Daniel | Pendiente |
| 1.2 | [arquitectura.md](arquitectura.md) | Frander | José | Pendiente |
| 1.3 | [amenazas.md](amenazas.md) y [observatorio.json](../threat-model/observatorio.json) | José | Frander | Pendiente |
| 1.4 | Medidas dentro de [amenazas.md](amenazas.md) | Daniel | Axel | Pendiente |
| 1.5 | [terceros-secretos.md](terceros-secretos.md) | Frander | Daniel | Pendiente |
| 1.6 | [preguntas-abiertas.md](preguntas-abiertas.md) e [ia-sugerencias.md](ia-sugerencias.md) | Axel | José | Pendiente |
| 1.7 | Esta carpeta versionada y [README.md](README.md) | José | Axel | Pendiente |
| 1.8 | [AGENTS.md](../../../../AGENTS.md) | Daniel | Frander | Pendiente |

Cada integrante responde por dos ítems y revisa dos.

## Responsables de las amenazas

Resumen; el detalle de cada medida y su comprobación está en [amenazas.md](amenazas.md).

| Amenaza | Responsable | Revisor | Tratamiento |
|---|---|---|---|
| [T-01](amenazas.md#t-01) | Frander | José | Mitigar |
| [T-02](amenazas.md#t-02) | Frander | Axel | Mitigar |
| [T-03](amenazas.md#t-03) | Axel | Daniel | Mitigar |
| [T-04](amenazas.md#t-04) | Axel | José | Mitigar (ya implementada; falta verificar) |
| [T-05](amenazas.md#t-05) | Axel | Daniel | Mitigar |
| [T-06](amenazas.md#t-06) | Frander | Axel | Mitigar |
| [T-07](amenazas.md#t-07) | José | Daniel | Mitigar (ya implementada; falta ampliar pruebas) |
| [T-08](amenazas.md#t-08) | Daniel | José | Mitigar |
| [T-09](amenazas.md#t-09) | Daniel | Frander | Mitigar |
| [T-10](amenazas.md#t-10) | Frander | Daniel | Mitigar |
| [T-11](amenazas.md#t-11) | José | Axel | Mitigar |
| [T-12](amenazas.md#t-12) | Daniel | Axel | Mitigar |
| [T-13](amenazas.md#t-13) | Daniel | Frander | Mitigar |

No se aplaza ninguna amenaza ni se acepta ningún riesgo sin tratamiento.

## Responsables de los secretos

| Secreto | Responsable |
|---|---|
| S-01 `DATABASE_URL` | Frander |
| S-02 Clave de administración | Frander |
| S-03 Token de Docker Hub | Daniel |
| S-04 Credencial de despliegue | Daniel |
| S-05 Clave del proveedor de IA | José |

## Validadores de las sugerencias de IA

| Sugerencias | Validador |
|---|---|
| IA-01 a IA-04 | Daniel |
| IA-05 a IA-08 | José |
| IA-09 a IA-12 | Axel |

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
