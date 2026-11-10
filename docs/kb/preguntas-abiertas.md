# Preguntas abiertas (ítem 1.6)

Dudas que afectan permisos, comportamiento esperado o alcance. **El agente no debe asumir la respuesta**: si un cambio depende de una de estas preguntas, se detiene y lo reporta (ver [AGENTS.md](../../AGENTS.md)).

Cada pregunta tiene un responsable de resolverla. Hasta que el equipo los designe figuran como "por asignar". Al resolver una, se anota la decisión, la fecha y quién decidió, y se actualizan los archivos afectados en el mismo PR.

**Estado:** `abierta` o `resuelta`.

| ID | Pregunta | Bloquea | Estado |
|---|---|---|---|
| [Q-01](#q-01) | ¿Quién puede ejecutar los endpoints de escritura? | Medida de T-01 y T-02, criterios F01-AC7, F02-AC5, F03-AC7 | abierta |
| [Q-02](#q-02) | ¿Qué roles existen y las lecturas siguen siendo públicas? | Matriz de acceso | abierta |
| [Q-03](#q-03) | ¿Cuánto se conservan los logs de seguridad y quién los consulta? | Medida de T-08 | abierta |
| [Q-04](#q-04) | ¿Qué metodología y advertencias acompañan al índice de viabilidad? | Medida de T-10 | abierta |
| [Q-05](#q-05) | ¿Se usa npm o pnpm? | Medida de T-12, instalación en CI | abierta |
| [Q-06](#q-06) | ¿El OIJ puede guardar modalidad y tipo de objetivo? | Criterio F02-AC6 | abierta |
| [Q-07](#q-07) | ¿Qué debe pasar cuando Overpass devuelve más de 250 objetos? | Criterio F03-AC8 | abierta |
| [Q-08](#q-08) | ¿Cuántos integrantes hay y quién es responsable de cada fuente? | Cumplimiento de la investigación OSINT y reparto de ítems | abierta |
| [Q-09](#q-09) | ¿Dónde se despliega y qué proveedor de IA se usa? | Fases 5 a 7, TP-07 y TP-08 | abierta |

---

## Q-01

**¿`POST /osm/sync`, `POST /oij/sync` y `POST /tse/import` deben restringirse a un operador autorizado?**

- Hoy cualquier visitante puede ejecutarlos y la interfaz pública tiene los botones para hacerlo (`frontend/lib/api.ts`).
- Opciones: (a) clave de administración en una cabecera validada en el backend, (b) inicio de sesión con roles, (c) dejar abiertos y aceptar el riesgo, con justificación y fecha de revisión.
- Recomendación del agente, sujeta a validación: la opción (a) como mínimo viable para esta entrega.
- **Responsable de resolverla:** por asignar (responsable de requisitos).
- **Afecta:** [T-01](amenazas.md#t-01), [T-02](amenazas.md#t-02), [T-08](amenazas.md#t-08), [F01-AC7](flujos.md#f-01-importar-el-padrón-del-tse), [F02-AC5](flujos.md#f-02-sincronizar-el-oij-por-año), [F03-AC7](flujos.md#f-03-sincronizar-y-consultar-lugares-de-openstreetmap) y la fila de operador de la matriz de acceso.
- **Decisión:** pendiente.

## Q-02

**¿Qué roles existen, y los endpoints de lectura y la interfaz siguen siendo públicos?**

- Hoy solo hay un visitante anónimo. La matriz de [arquitectura.md](arquitectura.md#matriz-de-acceso) propone visitante y operador.
- Pregunta adicional: ¿los botones de sincronizar e importar deben ocultarse a los visitantes? Ocultarlos mejora la experiencia, pero no sustituye la protección del backend.
- **Responsable de resolverla:** por asignar.
- **Decisión:** pendiente.

## Q-03

**¿Cuánto tiempo se conservan los eventos de seguridad y quién puede consultarlos?**

- Necesaria para el ítem 7.2 y para la medida de [T-08](amenazas.md#t-08).
- **Responsable de resolverla:** por asignar (responsable de operación).
- **Decisión:** pendiente.

## Q-04

**¿Qué debe decir la interfaz de `/cobertura` sobre el índice de viabilidad y la tasa por 1 000 electores?**

- El índice normaliza min-max contra los demás cantones y usa electores, no habitantes. `/oij` ya aclara que son conteos y no tasas; `/cobertura` no.
- El README afirma que no se calculan tasas poblacionales, pero `crimeRatePer1000Electors` es una tasa por elector. Hay que decidir si el README se corrige o si la métrica cambia.
- **Responsable de resolverla:** por asignar.
- **Afecta:** [T-10](amenazas.md#t-10).
- **Decisión:** pendiente.

## Q-05

**¿Cuál es el gestor de paquetes oficial?**

- `backend/` y `frontend/` tienen `package-lock.json` y `pnpm-lock.yaml` a la vez, ambos versionados. El README y `AGENTS.md` indican `npm`; un commit reciente actualizó `pnpm-lock.yaml`.
- **Responsable de resolverla:** por asignar.
- **Afecta:** [T-12](amenazas.md#t-12) y la instalación reproducible en CI.
- **Decisión:** pendiente. Mientras tanto se usa `npm`, como indica el README.

## Q-06

**¿El módulo OIJ puede guardar modalidad, categoría y tipo de objetivo?**

- El README dice que no se almacenan modalidad ni detalles individuales. El código guarda `modality`, `targetCategory` y `targetType` en `OijDataset.groups`, y el índice de viabilidad usa `targetType` para filtrar por tipo de negocio.
- Son agregados, no personas. Falta decidir qué regla vale y corregir el README o el código.
- **Responsable de resolverla:** por asignar.
- **Afecta:** [F02-AC6](flujos.md#f-02-sincronizar-el-oij-por-año).
- **Decisión:** pendiente.

## Q-07

**¿Cómo debe comportarse la sincronización de OSM cuando hay más de 250 objetos?**

- La consulta usa `out center tags 251` y guarda como máximo 250. Hoy el truncamiento no se informa, de modo que los conteos de cobertura pueden quedar por debajo de la realidad sin aviso.
- Opciones: informar el truncamiento, subir el límite o paginar.
- **Responsable de resolverla:** por asignar.
- **Afecta:** [F03-AC8](flujos.md#f-03-sincronizar-y-consultar-lugares-de-openstreetmap) y [T-10](amenazas.md#t-10).
- **Decisión:** pendiente.

## Q-08

**¿Cuántos integrantes tiene el equipo y quién es responsable de cada fuente?**

- El historial de git muestra cuatro autores. La investigación OSINT pide una fuente distinta por integrante. El README lista tres (OSM, OIJ, TSE) y deja sin completar la columna de responsable. Con cuatro integrantes falta una fuente; el módulo de cobertura cruza las tres anteriores y no cuenta como fuente nueva.
- El proyecto final exige 12 ítems para cuatro integrantes y 15 para cinco, con un responsable y un revisor por ítem.
- **Responsable de resolverla:** el equipo, antes de asignar responsables en este documento.
- **Decisión:** pendiente.

## Q-09

**¿En qué plataforma se despliega y qué proveedor de IA se usa?**

- Define los servicios externos TP-07 y TP-08 y los secretos S-03 a S-05.
- **Responsable de resolverla:** por asignar.
- **Decisión:** pendiente.
