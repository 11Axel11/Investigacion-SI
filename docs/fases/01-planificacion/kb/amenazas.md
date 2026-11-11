# Amenazas y medidas (ítems 1.3 y 1.4)

Modelo de amenazas con STRIDE sobre los flujos [F-01, F-02 y F-03](flujos.md) y la arquitectura de [arquitectura.md](arquitectura.md). El diagrama editable vive en Threat Dragon (ver [threat-model](../threat-model/README.md)); cada amenaza de este archivo debe existir también allí con el mismo ID.

Las medidas y sus comprobaciones se mantienen aquí, junto a cada amenaza. No hay un catálogo aparte.

**Estado de la medida:** `propuesta` (definida, con comprobación prevista), `implementada` (existe en el código, sin prueba que la demuestre) o `verificada` (existe y hay una prueba o evidencia reproducible).

**Responsable y revisor:** asignados el 2026-11-10 para T-01 a T-13 (resumen en [responsables.md](responsables.md)). El revisor es siempre otro integrante y deja constancia de su revisión en el PR. T-01 a T-13 tienen tratamiento decidido: mitigar. Ninguna se aplaza. T-14 se incorpora como propuesta en la revisión del 2026-11-11; su prioridad y tratamiento requieren validación humana.

Evidencia revisada al 2026-11-10 en el commit `e5a1990`. Las referencias a código son orientativas; si el archivo cambió, vale lo que diga el código vigente.

Revisión adicional del 2026-11-11 sobre `cdc70e6`: precisiones en T-01, T-02, T-05, T-07 y T-09, y nueva propuesta T-14. Alcance, evidencia y limitaciones en [revision-medidas.md](../evidencias/revision-medidas.md). No se implementaron ni se verificaron las mitigaciones mediante esta revisión.

## Resumen

| ID | STRIDE | Flujo | Componente | Prioridad | Estado de la medida |
|---|---|---|---|---|---|
| [T-01](#t-01) | Elevación de privilegios, Manipulación | F-01, F-02, F-03 | API (endpoints de escritura) | Alta | propuesta |
| [T-02](#t-02) | Denegación de servicio | F-02, F-03 | API, Overpass, OIJ | Alta | propuesta |
| [T-03](#t-03) | Denegación de servicio | F-01 | Importador del TSE | Media | propuesta |
| [T-04](#t-04) | Divulgación de información | F-01 | Importador del TSE | Alta | implementada |
| [T-05](#t-05) | Manipulación | F-01 | Datos del TSE | Media | propuesta |
| [T-06](#t-06) | Manipulación | F-03 | Sincronización OSM | Media | propuesta |
| [T-07](#t-07) | Suplantación, Manipulación | F-02, F-03 | Consumo de fuentes externas | Media | implementada |
| [T-08](#t-08) | Repudio | F-01, F-02, F-03 | API | Media | propuesta |
| [T-09](#t-09) | Divulgación de información | Todos | API y configuración | Media | propuesta |
| [T-10](#t-10) | Uso indebido (integridad de la inferencia) | Lecturas de `/coverage` | Índice de viabilidad | Media | propuesta |
| [T-11](#t-11) | Manipulación, Divulgación | Todos | Validación de entradas | Baja | propuesta |
| [T-12](#t-12) | Manipulación (cadena de suministro) | Todos | Dependencias y CI | Media | propuesta |
| [T-13](#t-13) | Divulgación de información | Todos | Secretos | Media | propuesta |
| [T-14](#t-14) | Manipulación | F-01 | Persistencia de agregados TSE | Media (propuesta) | propuesta; pendiente de validación humana |

---

## T-01

- **Amenaza:** cualquiera puede ejecutar `POST /tse/import`, `POST /oij/sync` y `POST /osm/sync`. No hay autenticación ni roles.
- **Recurso afectado:** agregados D-02, D-03 y D-04.
- **Impacto:** un atacante reemplaza o falsea los datos que el sistema presenta como oficiales. El índice de viabilidad y los conteos pasan a ser incorrectos sin que nadie lo note.
- **Prioridad:** Alta. Es la brecha de mayor alcance y la más simple de explotar; afecta los tres flujos críticos.
- **Medida (propuesta):** exigir una credencial de administración en los tres endpoints de escritura, validada en el backend con un guard de NestJS. Comparación en tiempo constante. La credencial viene del entorno y no está en el repositorio. Decisión de [Q-01](preguntas-abiertas.md#q-01): cabecera `X-Admin-Key` contra la variable `ADMIN_API_KEY` (S-02), con falla cerrada si no está definida.
- **Componente:** `backend/src/osm/osm.controller.ts`, `backend/src/tse/tse.controller.ts`, `backend/src/oij/oij.controller.ts`.
- **Comprobación prevista:** prueba de autorización por API. Sin credencial y con credencial incorrecta, los tres endpoints responden 401, conforme a Q-01, y las filas de la BD no cambian. Con credencial válida responden como hoy. La prueba usa peticiones directas, no la interfaz.
- **Responsable / revisor:** Frander / José.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-02

- **Amenaza:** solicitudes repetidas de sincronización agotan la cuota de Overpass, provocan el bloqueo de la IP del servidor o saturan CPU, memoria y BD.
- **Recurso afectado:** API, Overpass (TP-01) y catálogo del OIJ (TP-02).
- **Impacto:** el servicio deja de poder sincronizar y puede ser vetado por el tercero.
- **Prioridad:** Alta. Depende de T-01 y de la falta de límite de peticiones. La caché (15 min en OSM, 1 h en OIJ) limita la repetición de una misma combinación, pero no impide recorrer las combinaciones distintas: la lista `LOCATIONS` contiene 7 provincias y 84 cantones, y `CATEGORY_DEFS` define 22 categorías (código revisado el 2026-11-11).
- **Medida (propuesta):** autenticación (T-01) más límite de peticiones por IP (por ejemplo `@nestjs/throttler`) en los endpoints de escritura, con un tope de sincronizaciones por hora.
- **Componente:** módulos `osm` y `oij`; configuración global de `backend/src/app.module.ts`.
- **Comprobación prevista:** prueba de carga con Artillery en el ambiente de pruebas. Al superar el límite el servidor responde 429 y no se generan llamadas adicionales a los terceros (se verifican con un servidor simulado).
- **Responsable / revisor:** Pablo / Axel.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-03

- **Amenaza:** un ZIP diseñado para consumir recursos. `multer` guarda hasta 80 MB en memoria por solicitud. El límite de 5 000 000 filas solo cuenta las líneas válidas del padrón; las líneas vacías o inválidas no cuentan, así que un archivo descomprimido enorme no alcanza el límite.
- **Recurso afectado:** importador del TSE (`backend/src/tse/tse.service.ts`).
- **Impacto:** agotamiento de memoria o CPU que deja la API sin servicio.
- **Prioridad:** Media. Requiere enviar archivos pesados, pero hoy no hay ninguna barrera de acceso.
- **Medida (propuesta):** limitar los bytes descomprimidos y el tiempo total de procesamiento, contar todas las líneas leídas (no solo las válidas) y aceptar solo los nombres de archivo esperados del TSE. Considerar almacenamiento temporal en disco en lugar de memoria.
- **Componente:** `backend/src/tse/tse.service.ts`, `backend/src/tse/tse.controller.ts`.
- **Comprobación prevista:** prueba con un ZIP ficticio con millones de líneas vacías y otro con `.txt` adicionales. Ambos se rechazan en un tiempo acotado y la BD no cambia.
- **Responsable / revisor:** Axel / Daniel.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta. Relacionada con [IA-01](ia-sugerencias.md#ia-01).

## T-04

- **Amenaza:** exposición de los datos personales del padrón (cédula, nombre, vencimiento) en la BD, en las respuestas, en los logs o en los mensajes de error.
- **Recurso afectado:** D-01.
- **Impacto:** violación de la privacidad de personas reales y del propósito declarado del proyecto.
- **Prioridad:** Alta por el impacto, aunque la probabilidad es baja: el código solo lee `CODELEC` y `JUNTA`, y solo persiste conteos.
- **Medida (implementada):** el importador descarta los campos personales y devuelve `discardedPersonalFields: true`. Falta demostrarlo con una prueba.
- **Componente:** `backend/src/tse/tse.service.ts` (`importZip`, `readLines`).
- **Comprobación prevista:** importar un ZIP **ficticio** con cédulas y nombres inventados. Verificar con consultas SQL que ninguna cédula ni nombre está en la BD y que la respuesta, los logs y los mensajes de error no los contienen.
- **Responsable / revisor:** Axel / José.
- **Tratamiento decidido:** mitigar.
- **Estado:** implementada, sin verificar.

## T-05

- **Amenaza:** el ZIP importado no se autentica contra el TSE y `sourceDate` es un dato que escribe una persona. Un archivo manipulado, o de otra fecha, sobrescribe los conteos oficiales. Reimportar un ZIP parcial deja distritos con fechas de corte distintas.
- **Recurso afectado:** D-02.
- **Impacto:** conteos falsos o mezclados presentados con la procedencia del TSE.
- **Prioridad:** Media. La probabilidad depende de T-01.
- **Medida (propuesta):** calcular y guardar el SHA-256 del ZIP importado junto a la procedencia, y mostrar la fecha de corte por cada distrito. Procedimiento: el operador compara el hash con el de una copia obtenida directamente del sitio oficial por HTTPS. **Límite:** el hash permite identificar el archivo y detectar diferencias respecto de esa copia; por sí solo no autentica al TSE como emisor ni demuestra que el contenido sea correcto. Calcular dos veces el hash del mismo archivo no valida su procedencia.
- **Componente:** `backend/src/tse/tse.service.ts`, `backend/src/tse/tse-electoral-summary.entity.ts`.
- **Comprobación prevista:** prueba que importa un ZIP ficticio y confirma que el hash queda registrado y cambia si cambia el contenido; importar dos ZIP ficticios de fechas distintas y verificar que la fecha de corte se muestra por distrito ([IA-02](ia-sugerencias.md#ia-02)); revisión manual del procedimiento por otro integrante, sin presentar el hash como firma oficial.
- **Responsable / revisor:** Axel / Daniel.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-06

- **Amenaza:** `POST /osm/sync` borra los lugares de una combinación y después inserta los nuevos, sin transacción. Si Overpass responde sin elementos, o falla entre ambos pasos, se pierden los datos anteriores.
- **Recurso afectado:** D-04 (`backend/src/osm/osm.service.ts`, llamada a `places.delete` seguida de `upsert`).
- **Impacto:** el mapa y los indicadores de cobertura quedan vacíos hasta una nueva sincronización exitosa.
- **Prioridad:** Media. Pérdida recuperable, pero visible.
- **Medida (propuesta):** hacer el reemplazo en una transacción y no borrar si el resultado normalizado está vacío.
- **Componente:** `backend/src/osm/osm.service.ts`.
- **Comprobación prevista:** prueba de integración con Overpass simulado que devuelve cero elementos y otra que fuerza un error de inserción. En ambas los datos previos permanecen.
- **Responsable / revisor:** Frander / Axel.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-07

- **Amenaza:** una fuente externa (catálogo del OIJ, CSV, Overpass) cambia de esquema, apunta a otro host o entrega contenido inesperado.
- **Recurso afectado:** D-03 y D-04.
- **Impacto:** datos corruptos o conexión a un destino no previsto.
- **Prioridad:** Media.
- **Medida (implementada):** en el OIJ se restringe el recurso CSV a `https` y al host `pjcrdatosabiertos.blob.core.windows.net`, se prohíben redirecciones de esa descarga, se limita a 40 MB y 60 s, se valida la estructura y se conservan los datos previos si falla. **Alcance real:** la consulta al catálogo CKAN tiene timeout de 20 s, pero no configura `redirect: 'error'` ni límite de bytes; no se le deben atribuir los controles del CSV. En OSM se validan provincia, cantón y categoría contra listas fijas antes de armar la consulta. Existe `backend/scripts/oij.test.cjs` (`npm run test:oij`).
- **Componente:** `backend/src/oij/oij.service.ts`, `backend/src/oij/oij.parser.ts`, `backend/src/osm/osm.service.ts`.
- **Comprobación:** `npm run test:oij` verifica el parser y que un CSV de un host distinto se rechaza antes de la descarga con 503, sin modificar el agregado anterior (F02-AC4). Queda ejecutar el comando en CI, comprobar las redirecciones del CSV y el comportamiento del catálogo por separado, comprobar una respuesta inesperada de OSM y recorrer los cantones de `LOCATIONS` registrando los que OSM responde con 404 ([IA-07](ia-sugerencias.md#ia-07)). Las pruebas del parser por sí solas no verifican los controles de red; la prueba de host usa un servicio y una descarga simulados, no una BD real.
- **Responsable / revisor:** José / Daniel.
- **Tratamiento decidido:** mitigar.
- **Estado:** implementada; verificados el parser y el rechazo de un host distinto en el OIJ. Falta completar las comprobaciones de OSM.

## T-08

- **Amenaza:** no queda registro de quién ejecutó una importación o sincronización ni con qué resultado. Solo hay marcas de tiempo en los datos.
- **Recurso afectado:** API.
- **Impacto:** no se puede investigar un cambio sospechoso ni atribuirlo.
- **Prioridad:** Media. Se vuelve importante en cuanto existan credenciales (T-01).
- **Medida (propuesta):** registrar un evento de seguridad por cada operación de escritura y por cada acceso denegado, con actor, operación, resultado y fecha, sin contenido sensible. Retención de 90 días y acceso solo del operador y del responsable de operación ([Q-03](preguntas-abiertas.md#q-03)); el evento incluye la huella de la clave, no la clave.
- **Componente:** API (interceptor o middleware global).
- **Comprobación prevista:** prueba que ejecuta un acceso denegado y una importación válida y comprueba que cada una deja un evento con los campos esperados y sin datos personales.
- **Responsable / revisor:** Daniel / José.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-09

- **Amenaza:** configuración débil del servidor: CORS abierto a cualquier origen, errores que devuelven al cliente el detalle interno (por ejemplo el error de Overpass o del ZIP), sin cabeceras de seguridad y con `synchronize: true` de TypeORM.
- **Recurso afectado:** API y base de datos (`backend/src/main.ts`, `backend/src/app.module.ts`).
- **Impacto:** filtración de detalles internos, uso de la API desde sitios ajenos y cambios de esquema no controlados en producción.
- **Prioridad:** Media.
- **Medida (propuesta):** CORS con lista blanca de orígenes por entorno, mensajes genéricos al cliente con el detalle solo en el log, cabeceras de seguridad (helmet) y migraciones en lugar de `synchronize`. **Límite:** CORS es una política del navegador para acceso entre orígenes; no autentica al cliente ni impide peticiones directas a la API. La autorización de escritura se comprueba por separado en T-01.
- **Componente:** `backend/src/main.ts`, `backend/src/app.module.ts`.
- **Comprobación prevista:** prueba que verifica las cabeceras de seguridad y que CORS no autoriza un origen no permitido mediante `Access-Control-Allow-Origin`; comprobar también un origen permitido. No asumir que la ausencia de esa cabecera equivale a un 401 o impide una escritura. Simular una falla de Overpass y comprobar que la respuesta no devuelve texto interno. ZAP (ítem 4.7), si se selecciona y ejecuta, complementa estas pruebas; no demuestra por sí solo el uso de migraciones, que requiere revisar la configuración y ejecutar el procedimiento en una BD de pruebas.
- **Responsable / revisor:** Pablo / Frander.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-10

- **Amenaza:** el índice de viabilidad (0–100) y la tasa de delitos por 1 000 electores se leen como mediciones absolutas o como causalidad. Los puntajes se normalizan min-max contra los demás cantones, y los electores no son habitantes ni residentes. La interfaz de `/cobertura` no declara estas limitaciones; la de `/oij` sí.
- **Recurso afectado:** `backend/src/coverage/coverage.service.ts` y `frontend/app/cobertura/page.tsx`.
- **Impacto:** conclusiones engañosas sobre zonas o personas, contra el uso responsable de OSINT del proyecto.
- **Prioridad:** Media. No hay pérdida de datos, pero afecta la credibilidad y el criterio responsable que se evalúa.
- **Medida (propuesta):** mostrar en `/cobertura` la metodología, el denominador usado y la advertencia de que es un puntaje relativo y no causal. Reconciliar el README, que dice que no se calculan tasas poblacionales. Contenido definido en [Q-04](preguntas-abiertas.md#q-04): fórmula, denominador (electores), carácter relativo, no causalidad y fuente y fecha de cada componente. El README ya se corrigió.
- **Componente:** `frontend/app/cobertura/page.tsx`, `frontend/components/viability-panel.tsx`, `README.md`.
- **Comprobación prevista:** prueba E2E que verifica que el aviso es visible en `/cobertura`, y revisión del README por otro integrante.
- **Responsable / revisor:** Frander / Pablo.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-11

- **Amenaza:** validación de entradas desigual. No hay `ValidationPipe` global; los parámetros de consulta de `/tse/districts`, `/oij/overview` y `/coverage/*` llegan como texto sin límites, y `ILIKE` en `/tse/districts` acepta comodines (`%`, `_`) escritos por el usuario. Las consultas están parametrizadas, así que no hay inyección SQL.
- **Recurso afectado:** controladores y servicios de `tse`, `oij` y `coverage`.
- **Impacto:** consultas más costosas de lo previsto y resultados inesperados.
- **Prioridad:** Baja.
- **Medida (propuesta):** DTOs con `class-validator`, longitud máxima y escape de comodines.
- **Componente:** controladores de `tse`, `oij` y `coverage`.
- **Comprobación prevista:** prueba de integración con parámetros largos y con comodines; deben rechazarse o tratarse como texto literal.
- **Responsable / revisor:** José / Axel.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-12

- **Amenaza:** dependencias vulnerables o comprometidas, y manejo ambiguo de versiones. `backend/package.json` usa `multer` en la rama 1.x. Backend y frontend tienen a la vez `package-lock.json` y `pnpm-lock.yaml`; se decidió usar solo npm ([Q-05](preguntas-abiertas.md#q-05)).
- **Recurso afectado:** cadena de suministro del backend y del frontend.
- **Impacto:** ejecución de código no confiable o vulnerabilidades heredadas.
- **Prioridad:** Media. Por confirmar con un análisis: no se ha ejecutado ningún escáner todavía.
- **Medida (propuesta):** usar `npm` y un único lockfile por proyecto (eliminar `pnpm-lock.yaml`), ejecutar OSV-Scanner en CI y configurar Renovate para actualizaciones.
- **Componente:** `backend/package.json`, `frontend/package.json` y sus lockfiles.
- **Comprobación prevista:** OSV-Scanner sin hallazgos críticos o altos sin tratamiento, y un PR real de Renovate sujeto a los mismos controles.
- **Responsable / revisor:** Daniel / Pablo.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

## T-13

- **Amenaza:** una credencial real (`DATABASE_URL`, clave de administración, token de despliegue) termina en Git, en una imagen, en un log o en un prompt.
- **Recurso afectado:** secretos S-01 y siguientes de [terceros-secretos.md](terceros-secretos.md).
- **Impacto:** acceso a la base de datos o a la cadena de entrega.
- **Prioridad:** Media. Hoy solo existe una contraseña de ejemplo para una base local; crece al desplegar.
- **Medida (propuesta):** Gitleaks en el entorno de desarrollo y en CI, `.env` fuera de Git (ya está en `.gitignore`), y un gestor de secretos en el despliegue. Una credencial real expuesta se rota; no basta con borrarla del código.
- **Componente:** repositorio, pipeline y despliegue.
- **Comprobación prevista:** Gitleaks detecta un secreto ficticio controlado en un PR y bloquea la integración.
- **Responsable / revisor:** Daniel / Frander.
- **Tratamiento decidido:** mitigar.
- **Estado:** propuesta.

---

## T-14

- **Amenaza propuesta (STRIDE: Manipulación):** una importación TSE queda aplicada parcialmente si falla la persistencia de un lote posterior. `importZip` ejecuta varios `summaries.upsert` de hasta 500 distritos, sin una transacción que abarque toda la importación. Una interrupción de la BD después del primer lote puede dejar parte de los conteos nuevos junto a los anteriores.
- **Recurso y flujo afectados:** agregados electorales D-02, F-01 y cruce API → PostgreSQL (flujo 5 del modelo).
- **Impacto:** aunque la petición termine con error, los resúmenes electorales y el índice de cobertura pueden utilizar un conjunto parcialmente actualizado. No implica exposición de datos personales.
- **Prioridad propuesta:** Media. Afecta la integridad de un conjunto compartido y puede ocurrir por una falla operativa, incluso con un operador autorizado. Requiere más de un lote y un fallo durante la escritura; los datos son recuperables mediante una importación completa. No se afirma una explotación observada.
- **Evidencia observada [O]:** bucle de persistencia en `backend/src/tse/tse.service.ts`, `importZip` (líneas 109–111 en `cdc70e6`). La reproducción aislada del bucle con un repositorio simulado confirma que, si falla el segundo lote de 501 distritos ficticios, ya se escribieron 500. Ver [revision-medidas.md](../evidencias/revision-medidas.md). No es una prueba de integración con PostgreSQL.
- **Medida M-14 (propuesta, no implementada):** persistir todos los lotes en una sola transacción de TypeORM, usando el repositorio del administrador transaccional para cada `upsert`; confirmar solo al finalizar y revertir todos los lotes si alguno falla. Mantener la lectura y validación del ZIP antes de abrir la transacción para no prolongarla innecesariamente.
- **Componente:** `backend/src/tse/tse.service.ts`, método `importZip`.
- **Comprobación prevista:** prueba de integración con PostgreSQL aislado y un ZIP ficticio que produzca al menos 501 distritos. Precargar agregados conocidos, forzar una excepción en la escritura del segundo lote y consultar la BD después del error: todas las filas, incluidos los metadatos, deben conservar su estado anterior y no deben quedar filas nuevas. Repetir sin el fallo y comprobar la persistencia completa; repetir el mismo archivo y comprobar que no duplica filas. Limpiar la BD al terminar.
- **Responsable / revisor propuestos:** Daniel / Axel (mismo revisor del ítem 1.4; asignación pendiente de ratificación).
- **Tratamiento propuesto:** mitigar; pendiente de revisión humana. No se convierte en criterio [A] ni se declara corregida por añadir este texto.
- **Estado de la medida:** propuesta, sin implementar ni verificar. La simulación reproduce el riesgo, no demuestra su mitigación.
- **Diferencia respecto a otras amenazas:** T-05 trata procedencia y mezcla de fechas por importaciones parciales intencionales; T-06 trata el reemplazo de lugares OSM. T-14 trata fallos entre lotes de una misma importación TSE.

---

## Aceptación o aplazamiento de riesgo

Ninguna amenaza está aplazada ni aceptada. T-14 tiene una propuesta de mitigación pendiente de validación humana, no una aceptación de riesgo. Si el equipo decide posponer una amenaza, debe registrarse aquí la justificación, quién acepta el riesgo y la fecha de revisión.

## Modelo en Threat Dragon

El diagrama y las amenazas están en [observatorio.json](../threat-model/observatorio.json). `T-07` aparece en los flujos 6 y 7, por lo que el archivo contiene 15 entradas para 14 amenazas (T-14 es una propuesta pendiente de validación humana).
