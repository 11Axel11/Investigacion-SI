# Amenazas y medidas (ítems 1.3 y 1.4)

Modelo de amenazas con STRIDE sobre los flujos [F-01, F-02 y F-03](flujos.md) y la arquitectura de [arquitectura.md](arquitectura.md). El diagrama editable vive en Threat Dragon (ver [threat-model](../threat-model/README.md)); cada amenaza de este archivo debe existir también allí con el mismo ID.

Las medidas y sus comprobaciones se mantienen aquí, junto a cada amenaza. No hay un catálogo aparte.

**Estado de la medida:** `propuesta` (definida, con comprobación prevista), `implementada` (existe en el código, sin prueba que la demuestre) o `verificada` (existe y hay una prueba o evidencia reproducible).

**Responsable y revisor:** quedan como "por asignar" hasta que el equipo los designe. Ninguna amenaza puede quedar sin responsable antes de cerrar la fase 1.

Evidencia revisada al 2026-11-10 en el commit `e5a1990`. Las referencias a código son orientativas; si el archivo cambió, vale lo que diga el código vigente.

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

---

## T-01

- **Amenaza:** cualquiera puede ejecutar `POST /tse/import`, `POST /oij/sync` y `POST /osm/sync`. No hay autenticación ni roles.
- **Recurso afectado:** agregados D-02, D-03 y D-04.
- **Impacto:** un atacante reemplaza o falsea los datos que el sistema presenta como oficiales. El índice de viabilidad y los conteos pasan a ser incorrectos sin que nadie lo note.
- **Prioridad:** Alta. Es la brecha de mayor alcance y la más simple de explotar; afecta los tres flujos críticos.
- **Medida (propuesta):** exigir una credencial de administración en los tres endpoints de escritura, validada en el backend con un guard de NestJS. Comparación en tiempo constante. La credencial viene del entorno y no está en el repositorio. **Bloqueada por [Q-01](preguntas-abiertas.md#q-01).**
- **Componente:** `backend/src/osm/osm.controller.ts`, `backend/src/tse/tse.controller.ts`, `backend/src/oij/oij.controller.ts`.
- **Comprobación prevista:** prueba de autorización por API. Sin credencial y con credencial incorrecta, los tres endpoints responden 401 o 403 y las filas de la BD no cambian. Con credencial válida responden como hoy. La prueba usa peticiones directas, no la interfaz.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-02

- **Amenaza:** solicitudes repetidas de sincronización agotan la cuota de Overpass, provocan el bloqueo de la IP del servidor o saturan CPU, memoria y BD.
- **Recurso afectado:** API, Overpass (TP-01) y catálogo del OIJ (TP-02).
- **Impacto:** el servicio deja de poder sincronizar y puede ser vetado por el tercero.
- **Prioridad:** Alta. Depende de T-01 y de la falta de límite de peticiones. La caché (15 min en OSM, 1 h en OIJ) limita la repetición de una misma combinación, pero no impide recorrer las combinaciones distintas: 7 provincias, más de cien cantones y 22 categorías.
- **Medida (propuesta):** autenticación (T-01) más límite de peticiones por IP (por ejemplo `@nestjs/throttler`) en los endpoints de escritura, con un tope de sincronizaciones por hora.
- **Componente:** módulos `osm` y `oij`; configuración global de `backend/src/app.module.ts`.
- **Comprobación prevista:** prueba de carga con Artillery en el ambiente de pruebas. Al superar el límite el servidor responde 429 y no se generan llamadas adicionales a los terceros (se verifican con un servidor simulado).
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-03

- **Amenaza:** un ZIP diseñado para consumir recursos. `multer` guarda hasta 80 MB en memoria por solicitud. El límite de 5 000 000 filas solo cuenta las líneas válidas del padrón; las líneas vacías o inválidas no cuentan, así que un archivo descomprimido enorme no alcanza el límite.
- **Recurso afectado:** importador del TSE (`backend/src/tse/tse.service.ts`).
- **Impacto:** agotamiento de memoria o CPU que deja la API sin servicio.
- **Prioridad:** Media. Requiere enviar archivos pesados, pero hoy no hay ninguna barrera de acceso.
- **Medida (propuesta):** limitar los bytes descomprimidos y el tiempo total de procesamiento, contar todas las líneas leídas (no solo las válidas) y aceptar solo los nombres de archivo esperados del TSE. Considerar almacenamiento temporal en disco en lugar de memoria.
- **Componente:** `backend/src/tse/tse.service.ts`, `backend/src/tse/tse.controller.ts`.
- **Comprobación prevista:** prueba con un ZIP ficticio con millones de líneas vacías y otro con `.txt` adicionales. Ambos se rechazan en un tiempo acotado y la BD no cambia.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta. Relacionada con [IA-01](ia-sugerencias.md#ia-01).

## T-04

- **Amenaza:** exposición de los datos personales del padrón (cédula, nombre, vencimiento) en la BD, en las respuestas, en los logs o en los mensajes de error.
- **Recurso afectado:** D-01.
- **Impacto:** violación de la privacidad de personas reales y del propósito declarado del proyecto.
- **Prioridad:** Alta por el impacto, aunque la probabilidad es baja: el código solo lee `CODELEC` y `JUNTA`, y solo persiste conteos.
- **Medida (implementada):** el importador descarta los campos personales y devuelve `discardedPersonalFields: true`. Falta demostrarlo con una prueba.
- **Componente:** `backend/src/tse/tse.service.ts` (`importZip`, `readLines`).
- **Comprobación prevista:** importar un ZIP **ficticio** con cédulas y nombres inventados. Verificar con consultas SQL que ninguna cédula ni nombre está en la BD y que la respuesta, los logs y los mensajes de error no los contienen.
- **Responsable / revisor:** por asignar.
- **Estado:** implementada, sin verificar.

## T-05

- **Amenaza:** el ZIP importado no se autentica contra el TSE y `sourceDate` es un dato que escribe una persona. Un archivo manipulado, o de otra fecha, sobrescribe los conteos oficiales. Reimportar un ZIP parcial deja distritos con fechas de corte distintas.
- **Recurso afectado:** D-02.
- **Impacto:** conteos falsos o mezclados presentados con la procedencia del TSE.
- **Prioridad:** Media. La probabilidad depende de T-01.
- **Medida (propuesta):** calcular y guardar el SHA-256 del ZIP importado junto a la procedencia, y mostrar la fecha de corte por cada distrito. Procedimiento: el operador compara el hash con el de su descarga oficial.
- **Componente:** `backend/src/tse/tse.service.ts`, `backend/src/tse/tse-electoral-summary.entity.ts`.
- **Comprobación prevista:** prueba que importa un ZIP ficticio y confirma que el hash queda registrado; revisión manual del procedimiento por otro integrante.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-06

- **Amenaza:** `POST /osm/sync` borra los lugares de una combinación y después inserta los nuevos, sin transacción. Si Overpass responde sin elementos, o falla entre ambos pasos, se pierden los datos anteriores.
- **Recurso afectado:** D-04 (`backend/src/osm/osm.service.ts`, llamada a `places.delete` seguida de `upsert`).
- **Impacto:** el mapa y los indicadores de cobertura quedan vacíos hasta una nueva sincronización exitosa.
- **Prioridad:** Media. Pérdida recuperable, pero visible.
- **Medida (propuesta):** hacer el reemplazo en una transacción y no borrar si el resultado normalizado está vacío.
- **Componente:** `backend/src/osm/osm.service.ts`.
- **Comprobación prevista:** prueba de integración con Overpass simulado que devuelve cero elementos y otra que fuerza un error de inserción. En ambas los datos previos permanecen.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-07

- **Amenaza:** una fuente externa (catálogo del OIJ, CSV, Overpass) cambia de esquema, apunta a otro host o entrega contenido inesperado.
- **Recurso afectado:** D-03 y D-04.
- **Impacto:** datos corruptos o conexión a un destino no previsto.
- **Prioridad:** Media.
- **Medida (implementada):** en el OIJ se restringe el recurso a `https` y al host `pjcrdatosabiertos.blob.core.windows.net`, se prohíben redirecciones, se limita a 40 MB y 60 s, se valida la estructura y se conservan los datos previos si falla. En OSM se validan provincia, cantón y categoría contra listas fijas antes de armar la consulta. Existe `backend/scripts/oij.test.cjs` (`npm run test:oij`).
- **Componente:** `backend/src/oij/oij.service.ts`, `backend/src/oij/oij.parser.ts`, `backend/src/osm/osm.service.ts`.
- **Comprobación prevista:** ejecutar `npm run test:oij` en CI. Falta una prueba equivalente para OSM (respuesta con forma inesperada) y una para el host del OIJ.
- **Responsable / revisor:** por asignar.
- **Estado:** implementada; verificada solo en parte (el parser del OIJ).

## T-08

- **Amenaza:** no queda registro de quién ejecutó una importación o sincronización ni con qué resultado. Solo hay marcas de tiempo en los datos.
- **Recurso afectado:** API.
- **Impacto:** no se puede investigar un cambio sospechoso ni atribuirlo.
- **Prioridad:** Media. Se vuelve importante en cuanto existan credenciales (T-01).
- **Medida (propuesta):** registrar un evento de seguridad por cada operación de escritura y por cada acceso denegado, con actor, operación, resultado y fecha, sin contenido sensible. Retención y acceso según [Q-03](preguntas-abiertas.md#q-03).
- **Componente:** API (interceptor o middleware global).
- **Comprobación prevista:** prueba que ejecuta un acceso denegado y una importación válida y comprueba que cada una deja un evento con los campos esperados y sin datos personales.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-09

- **Amenaza:** configuración débil del servidor: CORS abierto a cualquier origen, errores que devuelven al cliente el detalle interno (por ejemplo el error de Overpass o del ZIP), sin cabeceras de seguridad y con `synchronize: true` de TypeORM.
- **Recurso afectado:** API y base de datos (`backend/src/main.ts`, `backend/src/app.module.ts`).
- **Impacto:** filtración de detalles internos, uso de la API desde sitios ajenos y cambios de esquema no controlados en producción.
- **Prioridad:** Media.
- **Medida (propuesta):** CORS con lista blanca de orígenes por entorno, mensajes genéricos al cliente con el detalle solo en el log, cabeceras de seguridad (helmet) y migraciones en lugar de `synchronize`.
- **Componente:** `backend/src/main.ts`, `backend/src/app.module.ts`.
- **Comprobación prevista:** prueba que verifica cabeceras y CORS con un origen no permitido, y que una falla simulada de Overpass no devuelve texto interno. El análisis DAST con ZAP (ítem 4.7) cubre el resto.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-10

- **Amenaza:** el índice de viabilidad (0–100) y la tasa de delitos por 1 000 electores se leen como mediciones absolutas o como causalidad. Los puntajes se normalizan min-max contra los demás cantones, y los electores no son habitantes ni residentes. La interfaz de `/cobertura` no declara estas limitaciones; la de `/oij` sí.
- **Recurso afectado:** `backend/src/coverage/coverage.service.ts` y `frontend/app/cobertura/page.tsx`.
- **Impacto:** conclusiones engañosas sobre zonas o personas, contra el uso responsable de OSINT del proyecto.
- **Prioridad:** Media. No hay pérdida de datos, pero afecta la credibilidad y el criterio responsable que se evalúa.
- **Medida (propuesta):** mostrar en `/cobertura` la metodología, el denominador usado y la advertencia de que es un puntaje relativo y no causal. Reconciliar el README, que dice que no se calculan tasas poblacionales. Contenido pendiente de [Q-04](preguntas-abiertas.md#q-04).
- **Componente:** `frontend/app/cobertura/page.tsx`, `frontend/components/viability-panel.tsx`, `README.md`.
- **Comprobación prevista:** prueba E2E que verifica que el aviso es visible en `/cobertura`, y revisión del README por otro integrante.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-11

- **Amenaza:** validación de entradas desigual. No hay `ValidationPipe` global; los parámetros de consulta de `/tse/districts`, `/oij/overview` y `/coverage/*` llegan como texto sin límites, y `ILIKE` en `/tse/districts` acepta comodines (`%`, `_`) escritos por el usuario. Las consultas están parametrizadas, así que no hay inyección SQL.
- **Recurso afectado:** controladores y servicios de `tse`, `oij` y `coverage`.
- **Impacto:** consultas más costosas de lo previsto y resultados inesperados.
- **Prioridad:** Baja.
- **Medida (propuesta):** DTOs con `class-validator`, longitud máxima y escape de comodines.
- **Componente:** controladores de `tse`, `oij` y `coverage`.
- **Comprobación prevista:** prueba de integración con parámetros largos y con comodines; deben rechazarse o tratarse como texto literal.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-12

- **Amenaza:** dependencias vulnerables o comprometidas, y manejo ambiguo de versiones. `backend/package.json` usa `multer` en la rama 1.x. Backend y frontend tienen a la vez `package-lock.json` y `pnpm-lock.yaml` ([Q-05](preguntas-abiertas.md#q-05)).
- **Recurso afectado:** cadena de suministro del backend y del frontend.
- **Impacto:** ejecución de código no confiable o vulnerabilidades heredadas.
- **Prioridad:** Media. Por confirmar con un análisis: no se ha ejecutado ningún escáner todavía.
- **Medida (propuesta):** definir un único gestor de paquetes y lockfile, ejecutar OSV-Scanner en CI y configurar Renovate para actualizaciones.
- **Componente:** `backend/package.json`, `frontend/package.json` y sus lockfiles.
- **Comprobación prevista:** OSV-Scanner sin hallazgos críticos o altos sin tratamiento, y un PR real de Renovate sujeto a los mismos controles.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

## T-13

- **Amenaza:** una credencial real (`DATABASE_URL`, clave de administración, token de despliegue) termina en Git, en una imagen, en un log o en un prompt.
- **Recurso afectado:** secretos S-01 y siguientes de [terceros-secretos.md](terceros-secretos.md).
- **Impacto:** acceso a la base de datos o a la cadena de entrega.
- **Prioridad:** Media. Hoy solo existe una contraseña de ejemplo para una base local; crece al desplegar.
- **Medida (propuesta):** Gitleaks en el entorno de desarrollo y en CI, `.env` fuera de Git (ya está en `.gitignore`), y un gestor de secretos en el despliegue. Una credencial real expuesta se rota; no basta con borrarla del código.
- **Componente:** repositorio, pipeline y despliegue.
- **Comprobación prevista:** Gitleaks detecta un secreto ficticio controlado en un PR y bloquea la integración.
- **Responsable / revisor:** por asignar.
- **Estado:** propuesta.

---

## Aceptación o aplazamiento de riesgo

Ninguna amenaza está aplazada. Si el equipo decide posponer una, debe registrarse aquí la justificación, quién acepta el riesgo y la fecha de revisión.
