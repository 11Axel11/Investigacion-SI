# Terceros, dependencias y secretos (ítem 1.5)

Alcance: los flujos [F-01, F-02 y F-03](flujos.md). Este archivo **no contiene valores secretos**. Los paquetes se consultan en los manifiestos y lockfiles, sin copiar el inventario.

## Servicios externos

| ID | Servicio | Función | Datos o permisos que recibe | Riesgos principales y tratamiento |
|---|---|---|---|---|
| TP-01 | Overpass API (`overpass-api.de`, configurable con `OVERPASS_URL`) | Entrega lugares de OpenStreetMap | Consulta con provincia, cantón y categoría validados; `User-Agent` informativo. Sin credenciales | Cuota limitada y bloqueo por abuso ([T-02](amenazas.md#t-02)); respuesta vacía o parcial ([T-06](amenazas.md#t-06)); cambio de forma ([T-07](amenazas.md#t-07)). Tratamiento: caché de 15 minutos, timeout de 35 s, validación previa de entradas |
| TP-02 | Catálogo CKAN y blob de Azure del Poder Judicial | Metadatos y CSV de estadísticas policiales | Solo peticiones `GET`; no recibe datos propios | Recurso apuntando a otro host o con otro esquema ([T-07](amenazas.md#t-07)). Controles del CSV: host permitido, `https`, sin redirecciones, 40 MB y 60 s, validación de estructura. Catálogo: URL fija y timeout de 20 s; no configura rechazo de redirecciones ni límite de bytes |
| TP-03 | Portal de descarga del TSE | ZIP mensual del padrón | Ninguno: lo descarga una persona. El ZIP contiene datos personales | Manejo del dato sensible ([T-04](amenazas.md#t-04)); autenticidad del archivo ([T-05](amenazas.md#t-05)). Tratamiento: la persona sube el ZIP; el backend descarta los campos personales |
| TP-04 | `tile.openstreetmap.org` | Teselas del mapa | El navegador del visitante envía su IP y la zona consultada | Privacidad del visitante y política de uso de teselas de OSM. Tratamiento: atribución visible; revisar la política de uso si crece el tráfico |
| TP-05 | GitHub y GitHub Actions *(en uso desde la fase 3)* | Repositorio, PR, CI y registro de hallazgos | Código, workflows, secretos del pipeline | Permisos de tokens y acciones de terceros ([T-12](amenazas.md#t-12)). Tratamiento aplicado: `permissions: contents: read`, solo 3 acciones de GitHub fijadas por SHA de commit, sin `pull_request_target`; protección de ramas preparada y **no aplicada** ([Q-13](preguntas-abiertas.md#q-13)) |
| TP-06 | Docker Hub *(previsto)* | Publicación de imágenes | Imágenes y un token de publicación | Publicar una imagen no aprobada. Tratamiento: publicar solo la imagen aprobada por digest (fase 5) |
| TP-07 | VPS único con Docker Compose y Caddy *(decidido en [Q-09](preguntas-abiertas.md#q-09))* | Ejecuta backend, frontend, BD y observabilidad | Imágenes, variables de entorno, secretos | Exposición de la BD y de secretos. Tratamiento: solo Caddy publica los puertos 80 y 443, HTTPS automático, BD en red interna (fase 6) |
| TP-08 | Claude, API de Anthropic *(decidido en [Q-09](preguntas-abiertas.md#q-09); **no se usa en CI por indicación de Frander del 2026-11-11**, que eligió DeepSeek: TP-12)* | Revisión de código y apoyo al desarrollo | Código y contexto del proyecto | Fuga de código o secretos en prompts. Tratamiento: no enviar secretos ni datos personales; ver [AGENTS.md](../../../../AGENTS.md) |
| TP-12 | API de DeepSeek (`api.deepseek.com`) *(alternativa autorizada por Frander el 2026-11-11; pendiente de ratificar por el equipo, ver [Q-09](preguntas-abiertas.md#q-09))* | Revisión de IA automatizada de cada PR en CI ([3.7](../../03-construccion-integracion/evidencias/3.7-revision-ia.md)) | El diff del PR (sin lockfiles ni `.env`) y `AGENTS.md` | El código sale hacia un proveedor distinto del decidido en Q-09, con otra jurisdicción y política de datos (**no revisadas**). Tratamiento: no se envían secretos, datos del padrón ni variables de entorno; Gitleaks corre en el mismo PR; la revisión es informativa. **Antes de activarla, una persona debe leer la política de datos de DeepSeek y confirmar que acepta que el código del repositorio salga hacia allá** |
| TP-09 | [WFS del IGN/SNIT](https://geos.snitcr.go.cr/be/IGN_5_CO/wfs?service=WFS&request=GetCapabilities) | Entrega la capa pública `IGN_5_CO:limitecantonal_5k` | Peticiones `GET` fijas desde el backend, sin credenciales ni datos de visitantes | Formato inesperado o fuente no disponible ([T-07](amenazas.md#t-07)). HTTPS sin redirecciones, paginación con límites de tiempo y tamaño, validación de la capa y caché en memoria de 24 horas con última copia en caso de fallo |
| TP-10 | Descargas de herramientas de análisis en CI (releases de GitHub de Gitleaks, OSV-Scanner, Conftest y Trivy; PyPI para Semgrep) | Ejecutar los análisis de la fase 3 | Ninguno: solo descargas `GET` | Binario alterado o release comprometida ([T-12](amenazas.md#t-12)). Tratamiento: versión fija y checksum SHA-256 verificado (`scripts/ci/instalar-herramienta.sh`); el checksum viene de la misma release, así que no cubre una release comprometida en origen |
| TP-11 | Docker Hub como origen de imágenes base (`node:22-alpine`, `postgres:17-alpine`) | Base de las imágenes candidatas y de la BD | Ninguno: solo descargas | Imagen base alterada o con vulnerabilidades. Tratamiento: fijadas por digest y analizadas con Trivy; Renovate propone los cambios |

## Dependencias críticas

Se justifica por qué cada una importa; la lista completa está en `backend/package.json`, `frontend/package.json` y sus lockfiles. Hay dos lockfiles por proyecto; se decidió conservar solo `package-lock.json` ([Q-05](preguntas-abiertas.md#q-05)).

| Dependencia | Dónde | Por qué es crítica | Riesgo y tratamiento |
|---|---|---|---|
| `multer` (2.5.0 desde la fase 3; antes rama 1.x) | Backend | Recibe el ZIP con datos personales (`FileInterceptor`) | OSV-Scanner mostró avisos altos en la rama 1.x y en la 2.0.2 anidada; se actualizó y se fijó con `overrides` ([3.2](../../03-construccion-integracion/evidencias/3.2-seguridad-ci.md)) |
| `unzipper` | Backend | Descomprime el archivo subido | Entrada no confiable; límites de tamaño y de lectura ([T-03](amenazas.md#t-03)) |
| `csv-parse`, `iconv-lite` | Backend | Procesan el CSV del OIJ y los TXT del TSE | Entrada de terceros; validación de estructura |
| `typeorm`, `pg` | Backend | Acceso a la BD | Consultas parametrizadas; `synchronize` activo ([T-09](amenazas.md#t-09)) |
| `@nestjs/*` | Backend | Framework de la API | Actualizaciones periódicas |
| `next`, `react`, `react-dom` | Frontend | Renderizado de la interfaz | Actualizaciones periódicas |
| `leaflet`, `react-leaflet` | Frontend | Mapas con teselas de TP-04 | Carga recursos de un tercero |
| `embedded-postgres` | Backend (desarrollo) | PostgreSQL portátil local | Solo desarrollo; no debe llegar a producción |

## Secretos y configuración sensible

Solo propósito, consumidores, permisos, responsable y ubicación prevista. Nunca valores.

| ID | Secreto | Propósito | Consumidores | Permisos | Ubicación prevista | Responsable |
|---|---|---|---|---|---|---|
| S-01 | `DATABASE_URL` | Conexión a PostgreSQL | Backend | Lectura y escritura sobre la BD de la aplicación | Local: `backend/.env` (fuera de Git). Despliegue: gestor de secretos | Frander |
| S-02 | `ADMIN_API_KEY`, clave de administración *(decidida en [Q-01](preguntas-abiertas.md#q-01); validada por `AdminKeyGuard`)* | Autorizar `POST /osm/sync`, `/oij/sync` y `/tse/import` mediante la cabecera `X-Admin-Key` | Backend y operador | Solo los endpoints de escritura. Mínimo 32 caracteres aleatorios | Variable de entorno en el servidor; en el frontend solo en memoria del navegador, nunca `NEXT_PUBLIC_*` | Axel |
| S-03 | Token de Docker Hub *(previsto)* | Publicar imágenes | Pipeline de GitHub Actions | Solo escritura del repositorio de imágenes | Secreto protegido de GitHub Actions | Daniel |
| S-04 | Credencial de despliegue *(previsto)* | Desplegar en el VPS o la nube | Pipeline | Solo el despliegue | Secreto protegido de GitHub Actions | Pablo |
| S-05 | `DEEPSEEK_API_KEY`, clave del proveedor de IA *(workflow de la fase 3; **`DEEPSEEK_API_KEY` rotada el 2026-11-11: la clave de la prueba temporal se revocó en la consola del proveedor y el secreto usa la clave `observatorio-ci-deepseek`**)* | Revisión asistida por IA de cada PR ([3.7](../../03-construccion-integracion/evidencias/3.7-revision-ia.md)) | Workflow `revision-ia.yml` | Solo la API del proveedor | Secreto de GitHub Actions; nunca en prompts, en el repositorio ni en PR desde forks. Se recomienda un límite de gasto en la consola del proveedor | José |

**Configuración que no es secreta:** `PORT`, `OVERPASS_URL`, `OVERPASS_USER_AGENT` (debe incluir un medio de contacto antes de publicar) y `NEXT_PUBLIC_API_URL`. `NEXT_PUBLIC_*` se incluye en el código del navegador: ningún secreto puede llamarse así.

**Valor de ejemplo existente:** `backend/.env.example` y `backend/scripts/local-db.mjs` incluyen la contraseña de la base local de desarrollo (`127.0.0.1:5433`). Es un valor académico, solo para esa base, y no debe reutilizarse en ningún otro ambiente.
