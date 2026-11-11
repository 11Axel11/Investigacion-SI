# Preguntas y decisiones (ítem 1.6)

Dudas que afectan permisos, comportamiento esperado o alcance, con la decisión tomada. **El agente no debe asumir la respuesta a una pregunta abierta**: si un cambio depende de una, se detiene y lo reporta (ver [AGENTS.md](../../../../AGENTS.md)).

**Cómo se tomaron las decisiones de este archivo.** El 2026-11-10 la persona usuaria del repositorio delegó en el asistente de IA (Claude) la resolución de las nueve preguntas para completar la fase 1, y el 2026-11-11 hizo lo mismo con Q-10 porque, por ahora, solo ella pudo participar. Son decisiones vigentes pero **provisionales**: el equipo las ratifica o modifica en la revisión presencial. Cada integrante del equipo las **ratifica o modifica al revisar el PR** de la fase 1; si alguna cambia, se actualiza este archivo y los afectados en el mismo PR. Los responsables de resolver cada pregunta figuran en [responsables.md](responsables.md).

**Estado:** `abierta` o `resuelta`. Una pregunta resuelta no se borra ni se renumera.

| ID | Pregunta | Decisión en una línea | Estado |
|---|---|---|---|
| [Q-01](#q-01) | ¿Quién puede ejecutar los endpoints de escritura? | Solo el operador, con clave de administración en cabecera | resuelta |
| [Q-02](#q-02) | ¿Qué roles existen y las lecturas siguen públicas? | Visitante (lectura pública) y operador (escritura) | resuelta |
| [Q-03](#q-03) | ¿Retención y acceso a logs de seguridad? | 90 días; solo el operador y el responsable de operación | resuelta |
| [Q-04](#q-04) | ¿Qué advertencias lleva el índice de viabilidad? | Metodología, denominador, fechas y aviso de no causalidad | resuelta |
| [Q-05](#q-05) | ¿npm o pnpm? | npm | resuelta |
| [Q-06](#q-06) | ¿El OIJ puede guardar modalidad y tipo de objetivo? | Sí, solo como agregados; se corrige el README | resuelta |
| [Q-07](#q-07) | ¿Qué pasa con más de 250 objetos de OSM? | Se mantiene el límite y se informa el truncamiento | resuelta |
| [Q-08](#q-08) | ¿Tamaño del equipo y responsable de cada fuente? | 4 integrantes; SNIT como cuarta fuente | resuelta |
| [Q-09](#q-09) | ¿Plataforma de despliegue y proveedor de IA? | VPS con Docker Compose y Caddy; Claude | resuelta |
| [Q-10](#q-10) | ¿Cómo se reparte la fase 1 con Pablo como quinto integrante? | Reparto parejo; Pablo sin fuente propia | resuelta (provisional) |
| [Q-11](#q-11) | ¿Quién revisa los cambios a scripts, reglas y permisos del agente, y quién valida la revisión de código asistida por IA? | Sin revisor asignado; revisión humana diferida por Frander (2026-11-11) | **abierta** |
| [Q-12](#q-12) | ¿Qué avisos de OSV-Scanner pueden exceptuarse de la compuerta de CI y por cuánto tiempo? | Propuesta: bloquear CVSS ≥ 7.0; 4 excepciones temporales hasta 2026-12-31 | **abierta** |
| [Q-13](#q-13) | ¿Existe la rama `development` y cómo se protege `main` con un solo integrante disponible? | Decidida (2026-11-11); falta aplicarla | **decidida, pendiente de aplicar** |

---

## Q-01

**¿`POST /osm/sync`, `POST /oij/sync` y `POST /tse/import` deben restringirse a un operador autorizado?**

- **Contexto:** hoy cualquier visitante puede ejecutarlos y la interfaz pública llama directamente a esos endpoints (`frontend/lib/api.ts`).
- **Opciones evaluadas:** (a) clave de administración en una cabecera validada en el backend, (b) inicio de sesión con usuarios y roles, (c) dejarlos abiertos aceptando el riesgo.
- **Decisión (2026-11-10): opción (a).**
  - Los tres endpoints de escritura exigen la cabecera `X-Admin-Key`, validada en el backend por un guard de NestJS.
  - La clave viene de la variable de entorno `ADMIN_API_KEY` (secreto S-02), con al menos 32 caracteres aleatorios, y se compara en tiempo constante.
  - Si la variable falta o está vacía, todos los endpoints de escritura rechazan la petición (falla cerrada). Los espacios o saltos de línea en los extremos del valor configurado se ignoran (aclaración operativa del 2026-11-11, R-02 de 2.6); la clave que envía el cliente se compara exacta. Sin clave o con una incorrecta responden 401 y no cambian datos.
  - Rotación: manual; se cambia la variable y se reinicia el servicio.
- **Por qué no (b):** el sistema no tiene cuentas ni recursos con dueño; un esquema de usuarios añade superficie y trabajo que no corresponden al riesgo ni al plazo. **Por qué no (c):** deja sin resolver la amenaza de mayor prioridad (T-01).
- **Responsable de resolverla:** Frander. **Revisor:** José.
- **Afecta:** [T-01](amenazas.md#t-01), [T-02](amenazas.md#t-02), [T-08](amenazas.md#t-08), F01-AC7, F02-AC5, F03-AC7 y la matriz de acceso.
- **Estado:** resuelta. Implementación pendiente (medida M-01).

## Q-02

**¿Qué roles existen, y los endpoints de lectura y la interfaz siguen siendo públicos?**

- **Decisión (2026-11-10):**
  - Hay dos roles: **visitante** (sin credencial) y **operador** (quien posee la clave de administración).
  - Las lecturas (`GET`) y todas las páginas de consulta siguen **públicas**: el proyecto es un observatorio de datos abiertos.
  - Las acciones de importar y sincronizar de la interfaz solo se habilitan en una vista de operador, que pide la clave. La clave se mantiene únicamente en la memoria del navegador (no en `localStorage`, ni en cookies, ni en variables `NEXT_PUBLIC_*`). Ocultar los botones no sustituye la validación del backend.
- **Responsable de resolverla:** Axel. **Revisor:** Daniel.
- **Afecta:** matriz de acceso de [arquitectura.md](arquitectura.md#matriz-de-acceso), F03-AC6, [IA-12](ia-sugerencias.md#ia-12).
- **Estado:** resuelta e implementada (modo operador en el frontend, rama `docs/fase-2-inicio`).

## Q-03

**¿Cuánto se conservan los eventos de seguridad y quién puede consultarlos?**

- **Decisión (2026-11-10):**
  - Retención de **90 días**.
  - Solo pueden consultarlos el operador y el responsable de operación del equipo.
  - Cada evento registra: fecha y hora, operación, resultado (permitido o denegado), huella de la clave (los primeros 8 caracteres hexadecimales de su SHA-256, nunca la clave) y la IP con el último octeto en cero.
  - No se registran cuerpos de petición, contenido de archivos, claves ni datos personales.
- **Responsable de resolverla:** Daniel. **Revisor:** José.
- **Afecta:** [T-08](amenazas.md#t-08) e ítem 7.2.
- **Estado:** resuelta.

## Q-04

**¿Qué debe decir la interfaz de `/cobertura` sobre el índice de viabilidad y la tasa por 1 000 electores?**

- **Contexto:** el índice normaliza min-max contra los demás cantones y usa electores, no habitantes. `/oij` ya aclara que son conteos y no tasas; `/cobertura` no.
- **Decisión (2026-11-10):** se mantiene la métrica y se agrega transparencia. `/cobertura` debe mostrar de forma visible:
  1. La fórmula: tercio de seguridad, tercio de cobertura de servicios y tercio electoral, cada uno normalizado min-max contra los cantones con datos ese año.
  2. Que el denominador son **electores inscritos**, no habitantes ni residentes.
  3. Que el puntaje es **relativo** entre cantones y no una escala absoluta.
  4. Que **no demuestra causalidad ni riesgo individual**.
  5. La fuente y la fecha de cada componente (padrón del TSE, lugares de OSM y año del OIJ con su último dato).
  6. Que la cobertura de OSM depende de aportes comunitarios y puede ser incompleta.
- El README se corrige para distinguir el módulo OIJ (conteos, sin tasas) de `/coverage` (indicador relativo por 1 000 electores). Ya está corregido en este PR.
- **Responsable de resolverla:** Frander. **Revisor:** Daniel.
- **Afecta:** [T-10](amenazas.md#t-10), [IA-09](ia-sugerencias.md#ia-09), [IA-10](ia-sugerencias.md#ia-10).
- **Estado:** resuelta. Implementación del aviso pendiente (medida M-10).

## Q-05

**¿Cuál es el gestor de paquetes oficial?**

- **Contexto:** `backend/` y `frontend/` tienen `package-lock.json` y `pnpm-lock.yaml` versionados a la vez. El README usa `npm`. El `package-lock.json` del frontend ya incluye Leaflet, así que está al día.
- **Decisión (2026-11-10): `npm`.** Es lo que documenta el README y permite `npm ci` en CI con un único lockfile. Se eliminarán `pnpm-lock.yaml` y `frontend/pnpm-workspace.yaml` al configurar los comandos reproducibles (ítem 2.2), comprobando antes que `npm ci` funcione en ambos proyectos.
- **Responsable de resolverla:** Daniel. **Revisor:** Axel.
- **Afecta:** [T-12](amenazas.md#t-12) y la instalación en CI.
- **Estado:** resuelta y aplicada (2026-11-11, rama `docs/fase-2-inicio`): se eliminaron `backend/pnpm-lock.yaml`, `frontend/pnpm-lock.yaml` y `frontend/pnpm-workspace.yaml`. Se comprobó `npm ci` en copias aisladas de ambos proyectos y las pruebas y el build pasan con las dependencias reinstaladas con npm.

## Q-06

**¿El módulo OIJ puede guardar modalidad, categoría y tipo de objetivo?**

- **Contexto:** `oij.parser.ts` agrega delito, modalidad, categoría y tipo de objetivo, distrito y mes. El README decía lo contrario.
- **Decisión (2026-11-10):** **sí, solo como agregados** (conteos por combinación). Nunca se guardan registros individuales, edad, sexo, nacionalidad ni fechas exactas (solo el mes). El tipo de objetivo alimenta el filtro "tipo de negocio" de `/cobertura`. El README se corrigió en este PR.
- **Responsable de resolverla:** José. **Revisor:** Frander.
- **Afecta:** [F02-AC6](flujos.md#f-02-sincronizar-el-oij-por-año).
- **Estado:** resuelta.

## Q-07

**¿Cómo debe comportarse la sincronización de OSM cuando hay más de 250 objetos?**

- **Decisión (2026-11-10):** se mantiene el límite de 250 (protege a Overpass y a la BD), pero **no se trunca en silencio**: la respuesta de `POST /osm/sync` incluye `truncated: true` cuando hay más objetos y la interfaz muestra un aviso de que el conteo puede estar por debajo de lo real. Los indicadores de cobertura que dependen de ese conteo deben declararlo (ver Q-04).
- **Responsable de resolverla:** Frander. **Revisor:** Axel.
- **Afecta:** [F03-AC8](flujos.md#f-03-sincronizar-y-consultar-lugares-de-openstreetmap), [T-10](amenazas.md#t-10).
- **Estado:** resuelta. Implementación pendiente.

## Q-08

**¿Cuántos integrantes tiene el equipo y quién es responsable de cada fuente?**

- **Decisión (2026-11-10):**
  - El equipo tiene **4 integrantes**: Frander, Axel, Daniel y José (los cuatro autores del historial de git; confirmar al ratificar el PR). Corresponden **12 ítems** del proyecto final.
  - Fuentes y responsables: **OSM/Overpass: Frander**, **TSE: Axel**, **OIJ: José** (autores de los módulos según git) y **SNIT: Daniel**.
  - **SNIT** es la cuarta fuente: los límites cantonales se consumirán por WFS y se normalizarán a GeoJSON, reemplazando el archivo estático `frontend/public/cantones-cr.geojson`. Aporta una capacidad demostrable (la capa territorial del mapa) y el backend ya cruza datos por cantón. BCCR queda descartada porque exige token de suscripción, y SICOP por el volumen de datos para el plazo.
  - El módulo de cobertura cruza las tres fuentes originales y no cuenta como fuente.
- **Responsable de resolverla:** el equipo. **Revisor:** Frander.
- **Nota (Q-10):** Pablo se suma como quinto integrante; el número de integrantes y el reparto pasan a [Q-10](#q-10).
- **Afecta:** README (fuentes), reparto de ítems, [C-05](arquitectura.md#componentes) y [TP-09](terceros-secretos.md#servicios-externos).
- **Estado:** resuelta. La capa del IGN/SNIT se sirve por `GET /coverage/canton-boundaries`.

## Q-09

**¿En qué plataforma se despliega y qué proveedor de IA se usa?**

- **Decisión (2026-11-10):**
  - **Despliegue:** un único VPS con Docker Compose y Caddy como proxy inverso con HTTPS automático. La BD y los servicios internos no se publican; solo Caddy expone 80 y 443. El stack de observabilidad corre en el mismo Compose.
  - **Imágenes:** Docker Hub, referenciadas por digest.
  - **IA:** Claude (API de Anthropic) para la revisión asistida de PR, con la clave como secreto protegido de GitHub Actions. No se envían secretos ni datos personales en los prompts.
- **Responsable de resolverla:** Daniel. **Revisor:** José.
- **Afecta:** TP-05 a TP-08, S-03 a S-05 y las fases 5 a 7.
- **Estado:** resuelta.
- **Actualización (2026-11-11):** Frander indicó que se puede usar una clave de DeepSeek (`DEEPSEEK_API_KEY`) para la revisión de IA de la fase 3. El script `scripts/ci/revision-ia.mjs` admite ambos proveedores. Esto **cambia el proveedor de IA decidido aquí (Claude) para ese uso**: queda como alternativa autorizada por una persona y **pendiente de ratificar por el equipo**. Antes de activarla hay que revisar la política de datos de DeepSeek (TP-12): el diff del PR saldría hacia otro proveedor y otra jurisdicción.

## Q-10

**¿Cómo se reparte la fase 1 con Pablo como quinto integrante?**

- **Contexto:** [Q-08](#q-08) fijó un equipo de 4 con las fuentes OSM, TSE, OIJ y SNIT. Pablo también forma parte del equipo y no figura en el historial de git. El responsable del repositorio indicó el 2026-11-11 que el reparto debe ser parejo y que Pablo no tiene fuente OSINT propia.
- **Decisión (2026-11-11): se acepta la propuesta siguiente**, tomada por delegación de Frander (el único integrante que pudo participar). El equipo la ratifica o la modifica en la revisión presencial:
  - **Fuentes:** sin cambios (Frander OSM, Axel TSE, José OIJ, Daniel SNIT). Pablo no tiene fuente propia.
  - **Ítems (responsable / revisor):** 1.1 Axel / Pablo; 1.2 Frander / José; 1.3 José / Pablo; 1.4 Daniel / Axel; 1.5 Frander / Daniel; 1.6 Axel / José; 1.7 Pablo / Axel; 1.8 Pablo / Frander. Los ítems 1.7 y 1.8 ya estaban redactados; Pablo los asume como responsable.
  - **Amenazas:** Pablo asume T-02 y T-09 (antes Frander y Daniel) y revisa T-10 y T-12. Resto sin cambios.
  - **Secretos:** S-02 pasa a Axel y S-04 a Pablo.
  - **Validadores de IA:** IA-01 y IA-02 Daniel; IA-03 y IA-04 Frander; IA-05 a IA-07 José; IA-08 e IA-12 Pablo; IA-09 a IA-11 Axel.
- **Alternativas descartadas:** dejar a Pablo sin ítems formales (solo contribuye) o repartir por afinidad técnica en vez de por conteo. Se eligió el reparto parejo porque es lo que indicó el responsable del repositorio y evita que alguien cargue más ítems que el resto.
- **Responsable de resolverla:** el equipo. **Revisor:** José.
- **Afecta:** [responsables.md](responsables.md), [amenazas.md](amenazas.md) (responsable y revisor de T-02, T-09, T-10 y T-12), [terceros-secretos.md](terceros-secretos.md) (S-02 y S-04), [ia-sugerencias.md](ia-sugerencias.md), [observatorio.json](../threat-model/observatorio.json), [REVISION.md](../REVISION.md).
- **Estado:** resuelta (provisional). La ratificación presencial del equipo está pendiente. Si cambia algún punto, se corrige este archivo y los afectados en el mismo PR.

---

## Q-11

**¿Qué integrante revisa los cambios a las pruebas, reglas de Semgrep, `.gitleaks.toml`, `scripts/` y `.claude/settings.json`, y quién valida las observaciones de la revisión de código asistida por IA (ítems 2.5 y 2.6)?**

- **Contexto:** la fase 2 exige que esos cambios los revise un integrante distinto del autor y que otra persona valide la revisión de IA ([docs/fases/02-desarrollo/README.md](../../02-desarrollo/README.md)). Los escribió el asistente por indicación de Frander, el único integrante disponible; el reparto de la fase 2 no está definido en [responsables.md](responsables.md).
- **Qué se necesita decidir:** una persona (o rotación) que revise esos archivos en cada PR, y una persona que valide cada observación de [la revisión 2.6](../../02-desarrollo/evidencias/2.6-revision-ia.md). No puede ser quien pidió o integró el cambio.
- **Por qué no se asumió:** las reglas del proyecto prohíben suponer una respuesta ([AGENTS.md](../../../../AGENTS.md)). Mientras tanto, las observaciones quedan en `pendiente` y los cambios en el PR sin aprobar.
- **Responsable de resolverla:** el equipo. **Revisor:** por asignar.
- **Afecta:** ítems 2.5 y 2.6; sin cambios en flujos, amenazas ni permisos.
- **Actualización (2026-11-11):** Frander, único integrante disponible hoy, indicó **dejar de lado la revisión humana** para cerrar el trabajo técnico de la fase 2. Eso **no designa revisor ni valida nada**: es solo el aplazamiento de la revisión. Consecuencias aplicadas: las observaciones de [2.6](../../02-desarrollo/evidencias/2.6-revision-ia.md) quedan con validación humana `Diferida` (no `Validada`), la fase 2 se declara cerrada **en lo técnico** y no en lo humano, y no se falsifican firmas ni aprobaciones.
- **Qué sigue pendiente:** designar la persona que revisa los cambios a pruebas, reglas de Semgrep, `.gitleaks.toml`, `scripts/` y `.claude/settings.json`, y la que valida R-01 a R-09 de 2.6. Debe hacerlo antes de integrar a `main` o, a más tardar, en la revisión presencial del equipo.
- **Estado:** abierta (revisión humana diferida por decisión de Frander; sin revisor asignado).

---

## Q-12

**¿Qué avisos de OSV-Scanner pueden exceptuarse de la compuerta de CI (ítem 3.2) y hasta cuándo?**

- **Contexto:** el primer escaneo del 2026-11-11 dio 71 avisos, 35 de gravedad alta o crítica. Se corrigieron con actualizaciones compatibles (`npm audit fix`, `multer` ^2.5.0 y `overrides` de `multer`, `body-parser` y `lodash`) hasta dejar 4 que exigen saltos mayores de NestJS/TypeORM: `glob`, `picomatch` y `tmp` (solo desarrollo, vía `@nestjs/cli`) y `uuid` (producción, no alcanzable según el análisis de [3.2](../../03-construccion-integracion/evidencias/3.2-seguridad-ci.md)).
- **Qué se necesita decidir:** (1) si el umbral de bloqueo es CVSS ≥ 7.0 (alta y crítica) como se propuso; (2) si se aceptan esas 4 excepciones y su vencimiento (propuesto: 2026-12-31); (3) quién las revisa al vencer.
- **Por qué no se asumió:** aceptar un riesgo de seguridad es una decisión humana y [AGENTS.md](../../../../AGENTS.md) prohíbe suponer la respuesta. **Mientras tanto** las excepciones están en `osv-excepciones.json` como **propuestas**, con motivo y fecha; al vencer vuelven a bloquear.
- **Responsable de resolverla:** Daniel (T-12). **Revisor:** Pablo.
- **Afecta:** ítem 3.2; [T-12](amenazas.md#t-12); `osv-excepciones.json`.
- **Estado:** abierta.

---

## Q-13

**¿Existe la rama `development` y cómo se protege `main` mientras solo haya un integrante disponible (ítem 3.5)?**

- **Contexto:** el documento del proyecto habla de PR hacia `development` o `main`, pero el repositorio solo tiene `main` y esta **no está protegida** (verificado con `gh api` el 2026-11-11). El ítem 3.5 pide aprobación de otro integrante; con una sola persona disponible, `APROBACIONES=1` con administradores sujetos a las reglas impide fusionar (GitHub no deja aprobar un PR propio).
- **Qué se necesita decidir:** (1) si se crea `development` o se trabaja solo con `main` (los workflows ya cubren ambas); (2) cómo proteger `main` hoy: esperar a otro integrante, o aplicar las reglas con `ENFORCE_ADMINS=false` dejando constancia; (3) quién aplica `scripts/ci/proteger-ramas.sh --aplicar`.
- **Por qué no se asumió:** cambiar la protección de ramas modifica el repositorio remoto y define quién puede fusionar; no es una decisión del agente.
- **Decisión (2026-11-11, Frander):** (1) se trabaja solo con `main`; `development` no se crea por ahora; (2) proteger `main` con PR obligatorio, check `resultado` obligatorio, **0 aprobaciones** y administradores **no** sujetos a las reglas (`APROBACIONES=0 ENFORCE_ADMINS=false`), porque hoy solo hay una persona disponible; (3) queda como **deuda**: subir a 1 aprobación y `ENFORCE_ADMINS=true` cuando haya otro integrante (Q-11).
- **Intento de aplicación (2026-11-11):** `scripts/ci/proteger-ramas.sh --aplicar` falló con HTTP 404 (protección de `main`) y 403 (permisos de Actions): la cuenta `FranderCT` tiene permiso **WRITE** sobre `11Axel11/Investigacion-SI`, no ADMIN. **Debe aplicarlo el dueño o un administrador del repositorio**, o concederle ADMIN a quien lo aplique.
- **Responsable de resolverla:** el equipo. **Revisor:** por asignar (ligada a [Q-11](#q-11)).
- **Afecta:** ítems 3.5 y 3.6; [R-04 de 2.6](../../02-desarrollo/evidencias/2.6-revision-ia.md); `scripts/ci/proteger-ramas.sh`.
- **Estado:** decidida; **pendiente de aplicar** por una cuenta con ADMIN: `APROBACIONES=0 ENFORCE_ADMINS=false scripts/ci/proteger-ramas.sh --aplicar`.
