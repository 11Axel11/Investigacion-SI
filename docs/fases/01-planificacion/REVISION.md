# Revisión cruzada de la fase 1

La fase 1 está escrita, pero **no se considera cerrada hasta que otro integrante revise cada ítem** (regla del proyecto: quien revisa no escribió lo que revisa). Este archivo indica qué le toca a cada quien y es donde se deja constancia.

Fecha límite sugerida: **miércoles 11 de noviembre de 2026**, para dejar margen antes de la entrega del viernes 13.

**Estado al 2026-11-11.** Todo el contenido está escrito y las decisiones pendientes (Q-10 y el estado de IA-01 a IA-12) se tomaron de forma **provisional** por delegación de Frander, que fue el único integrante que pudo participar. Estas firmas y ratificaciones se hacen en la **revisión presencial del equipo**; las tablas de abajo siguen vacías a propósito. Si alguien cambia una decisión provisional, se corrige el archivo afectado de [kb/](kb/README.md) en el mismo PR.

Las comprobaciones mecánicas (enlaces, IDs, secretos, el JSON de Threat Dragon y las brechas contra el código) ya están ejecutadas en [VERIFICACION-PREVIA.md](VERIFICACION-PREVIA.md). Úsalo como evidencia de partida; no sustituye tu lectura ni tu firma.

## Cómo hacer tu revisión

1. Ve a tu sección (Daniel, José, Frander, Axel o Pablo) más abajo.
2. Lee cada archivo que te toca y marca lo que comprobaste en la lista de verificación.
3. Si algo está mal o falta, **corrígelo en este mismo PR** y anótalo en "Observaciones". Si el cambio toca comportamiento, datos, arquitectura o permisos, actualiza también el archivo afectado de [kb/](kb/README.md) y menciona sus IDs en el PR.
4. Completa tu tabla de firma: escribe tu **nombre**, la **fecha** y el **resultado** (`Aprobado`, `Aprobado con cambios` o `Rechazado`).
5. Ratifica o cambia las decisiones `Q-nn` que te tocan y valida las sugerencias `IA-nn` asignadas (tablas de tu sección).
6. En GitHub, deja tu revisión en el PR (**Approve** o **Request changes**). No firmes ni apruebes lo que tú mismo escribiste.

Reglas: escribe solo tu sección. Los nombres van en texto plano, sin menciones de GitHub. No pegues secretos ni datos personales en este archivo.

## Qué significa cada resultado

| Resultado | Cuándo |
|---|---|
| Aprobado | El contenido cumple lo que pide el ítem y no encontraste errores |
| Aprobado con cambios | Corregiste algo menor en este PR y lo anotaste |
| Rechazado | Falta algo importante; el responsable debe rehacerlo antes de cerrar |

---

## Daniel

**Ítems a revisar:** 1.5.

### Verificación

**1.5 [terceros-secretos.md](kb/terceros-secretos.md)**
- [ ] Cada tercero (TP-nn) indica su función, qué datos o permisos recibe y cómo se tratan sus riesgos.
- [ ] Cada secreto (S-nn) indica propósito, consumidores, permisos, responsable y dónde se almacenará.
- [ ] **No hay ningún valor secreto** en el archivo.
- [ ] Los paquetes se referencian por manifiestos y lockfiles, sin copiar el inventario.

### Firma

| Ítem | Nombre | Fecha | Resultado | Observaciones |
|---|---|---|---|---|
| 1.5 | | | | |

### Decisiones a ratificar ([preguntas-abiertas.md](kb/preguntas-abiertas.md))

| Q | Tema | Decisión vigente | Ratifico (sí/no) | Si no, qué cambia |
|---|---|---|---|---|
| Q-02 | Roles y lecturas públicas | Visitante y operador; lecturas públicas | | |
| Q-04 | Advertencias del índice de viabilidad | Fórmula, denominador, fechas, no causalidad | | |

### Sugerencias de IA a validar ([ia-sugerencias.md](kb/ia-sugerencias.md))

| IA | Tema | Decisión (aceptada / rechazada / falso positivo) | Justificación breve |
|---|---|---|---|
| IA-01 | `.txt` arbitrario del ZIP tratado como padrón | | |
| IA-02 | ZIP por cantón con fechas de corte mezcladas | | |

---

## José

**Ítems a revisar:** 1.2 y 1.6.

### Verificación

**1.2 [arquitectura.md](kb/arquitectura.md)**
- [ ] Están los componentes, servicios externos, datos protegidos y los flujos que cruzan límites de confianza.
- [ ] Se identifica qué datos son sensibles y qué pasaría si se exponen, modifican o pierden.
- [ ] La [matriz de acceso](kb/arquitectura.md#matriz-de-acceso) tiene actor/rol → recurso → acción → condición, incluido el acceso **sin sesión**.
- [ ] Los endpoints de escritura (`POST /osm/sync`, `POST /oij/sync`, `POST /tse/import`) exigen `X-Admin-Key` en la matriz.

**1.6 [preguntas-abiertas.md](kb/preguntas-abiertas.md) e [ia-sugerencias.md](kb/ia-sugerencias.md)**
- [ ] Cada `Q-nn` tiene decisión, responsable y revisor, y qué IDs afecta.
- [ ] Las sugerencias de IA están separadas de las reglas aprobadas y marcadas con su estado.
- [ ] Nada que dependa de una duda abierta se presenta como regla.

### Firma

| Ítem | Nombre | Fecha | Resultado | Observaciones |
|---|---|---|---|---|
| 1.2 | | | | |
| 1.6 | | | | |

### Decisiones a ratificar

| Q | Tema | Decisión vigente | Ratifico (sí/no) | Si no, qué cambia |
|---|---|---|---|---|
| Q-01 | Quién ejecuta los endpoints de escritura | Solo el operador, con `X-Admin-Key` | | |
| Q-03 | Retención y acceso a logs de seguridad | 90 días; operador y responsable de operación | | |
| Q-09 | Plataforma de despliegue y proveedor de IA | VPS con Docker Compose y Caddy; Claude | | |

### Sugerencias de IA a validar

| IA | Tema | Decisión (aceptada / rechazada / falso positivo) | Justificación breve |
|---|---|---|---|
| IA-05 | Filtros del OIJ sin coincidencia devuelven cero en vez de error | | |
| IA-06 | Sincronizaciones simultáneas de la misma combinación | | |
| IA-07 | Cantones sin límite administrativo en OSM | | |

---

## Frander

**Ítems a revisar:** 1.8.

### Verificación

**1.8 [AGENTS.md](../../../AGENTS.md)**
- [ ] Indica qué leer antes de modificar un flujo crítico: flujos, permisos, amenazas, preguntas y terceros/secretos.
- [ ] Explica la diferencia entre criterios **[A]**, **[O]** y **[P]**.
- [ ] Dice que ante una duda nueva el agente **no asume la respuesta** y la registra como `Q-nn`.
- [ ] Pide actualizar la base de conocimiento en el mismo PR y que el revisor lo compruebe.
- [ ] Las rutas y enlaces apuntan a `docs/fases/01-planificacion/kb/` (movidos en este PR).

### Firma

| Ítem | Nombre | Fecha | Resultado | Observaciones |
|---|---|---|---|---|
| 1.8 | | | | |

### Decisiones a ratificar

| Q | Tema | Decisión vigente | Ratifico (sí/no) | Si no, qué cambia |
|---|---|---|---|---|
| Q-06 | OIJ guarda modalidad y tipo de objetivo | Sí, solo como agregados | | |
| Q-08 | Equipo de 4 integrantes y SNIT como cuarta fuente | Frander OSM, Axel TSE, José OIJ, Daniel SNIT | | |
| Q-10 | Reparto de la fase 1 con Pablo como quinto integrante | Reparto parejo (decisión provisional del 2026-11-11); Pablo sin fuente propia | | |

### Sugerencias de IA a validar

| IA | Tema | Decisión (aceptada / rechazada / falso positivo) | Justificación breve |
|---|---|---|---|
| IA-03 | Territorios desconocidos en los agregados | | |
| IA-04 | Varios recursos del catálogo coinciden con el año | | |

---

## Axel

**Ítems a revisar:** 1.4 y 1.7.

### Verificación

**1.4 Medidas en [amenazas.md](kb/amenazas.md) y [responsables.md](kb/responsables.md)**
- [ ] Cada amenaza T-01 a T-13 tiene medida, componente, comprobación prevista y responsable. T-14 (propuesta de la revisión del 2026-11-11) también la tiene, pero su prioridad, tratamiento y asignación (Daniel / Axel) hay que ratificarlos.
- [ ] Cada medida tiene estado (`propuesta`, `implementada` o `verificada`) y es coherente con el código.
- [ ] Ninguna amenaza se pospone sin justificación, responsable que acepta el riesgo y fecha de revisión.
- [ ] Las comprobaciones previstas son concretas (qué se hace y qué debe ocurrir), no genéricas.

**1.7 [kb/](kb/README.md)**
- [ ] Los IDs (F, C, D, T, TP, S, Q, IA, M) se usan sin repetirse ni reutilizarse.
- [ ] Hay reglas de mantenimiento: cambio de comportamiento, datos, arquitectura o permisos actualiza la base en el mismo PR.
- [ ] Los enlaces entre archivos funcionan.
- [ ] No hay valores secretos ni datos personales.

### Firma

| Ítem | Nombre | Fecha | Resultado | Observaciones |
|---|---|---|---|---|
| 1.4 | | | | |
| 1.7 | | | | |

### Decisiones a ratificar

| Q | Tema | Decisión vigente | Ratifico (sí/no) | Si no, qué cambia |
|---|---|---|---|---|
| Q-05 | Gestor de paquetes | `npm`; se eliminarán los `pnpm-lock.yaml` | | |
| Q-07 | Más de 250 objetos en OSM | Se mantiene el límite y se informa `truncated: true` | | |

### Sugerencias de IA a validar

| IA | Tema | Decisión (aceptada / rechazada / falso positivo) | Justificación breve |
|---|---|---|---|
| IA-09 | Cantones con cero electores o todos con el mismo valor | | |
| IA-10 | Fuentes con fechas distintas en un mismo índice | | |
| IA-11 | Alias de cantones incompletos | | |

---

## Pablo

**Ítems a revisar:** 1.1 y 1.3.

### Verificación

**1.1 [flujos.md](kb/flujos.md)**
- [X] Hay tres flujos críticos (F-01, F-02, F-03) y se justifica por qué son críticos (datos o impacto de un fallo).
- [X] Cada flujo indica actor, objetivo y resultado esperado.
- [X] Los criterios Dado/Cuando/Entonces cubren éxito, errores y uso indebido.
- [X] Cada criterio está marcado **[A]** (aprobado), **[O]** (observado en el código) o **[P]** (propuesto), y los **[A]** indican su "Brecha actual".

**1.3 [amenazas.md](kb/amenazas.md) y [observatorio.json](threat-model/observatorio.json)**
- [X] Las amenazas usan STRIDE e indican recurso o flujo afectado, impacto y prioridad justificada (hay 14, el mínimo es 3).
- [X] El JSON abre en OWASP Threat Dragon (instrucciones en [threat-model/README.md](threat-model/README.md)) y contiene los 14 IDs T-01 a T-14.
- [X] El diagrama se reutiliza como mapa de arquitectura (no hay un diagrama duplicado).

### Firma

| Ítem | Nombre | Fecha | Resultado | Observaciones |
|---|---|---|---|---|
| 1.1 | Pablo Obando Cortés | 2026-11-11 | Aprobado | Revisión documental de F-01, F-02 y F-03: actores, criterios, errores, uso indebido y brechas actuales identificadas. |
| 1.3 | Pablo Obando Cortés | 2026-11-11 | Aprobado | Revisé el análisis STRIDE y el modelo Threat Dragon; contiene las amenazas T-01 a T-14. |

### Decisiones a ratificar

Pablo no ratifica [Q-10](kb/preguntas-abiertas.md#q-10), que es su propia asignación; la ratifica Frander. Las demás decisiones las ratifica quien las revisa en su sección.

### Sugerencias de IA a validar

| IA-08 | Colisión de nombres entre provincia y cantón | Falso positivo | Las claves incluyen provincia y cantón; no se identificó una colisión de datos. |
| IA-12 | Visitantes inician importaciones desde la interfaz (cubierta por Q-02) | Aceptada | El modo operador exige clave en memoria y evita habilitar las acciones de escritura para visitantes. |

---

## Cierre de la fase 1

Cuando los cinco hayan firmado con resultado `Aprobado` o `Aprobado con cambios`:

1. La última persona en firmar actualiza la columna "Revisión" en [responsables.md](kb/responsables.md) a "Aprobada" con la fecha.
2. Se marca el último punto de [Estado de cierre](kb/README.md#estado-de-cierre-de-la-fase-1) y se actualiza la línea "Estado" de ese archivo.
3. Se actualiza el estado de la fase 1 en el [índice de fases](../README.md).
4. Las sugerencias IA validadas pasan en [ia-sugerencias.md](kb/ia-sugerencias.md) a `aceptada`, `rechazada` o `falso positivo`, y las aceptadas se incorporan como requisito, amenaza o comprobación.

Si algún resultado es `Rechazado`, la fase sigue abierta hasta que el responsable corrija y el revisor vuelva a firmar.
