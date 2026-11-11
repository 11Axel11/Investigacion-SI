# Terceros, dependencias y secretos (ítem 1.5)

Alcance: los flujos [F-01, F-02 y F-03](flujos.md). Este archivo **no contiene valores secretos**. Los paquetes se consultan en los manifiestos y lockfiles, sin copiar el inventario.

## Servicios externos

| ID | Servicio | Función | Datos o permisos que recibe | Riesgos principales y tratamiento |
|---|---|---|---|---|
| TP-01 | Overpass API (`overpass-api.de`, configurable con `OVERPASS_URL`) | Entrega lugares de OpenStreetMap | Consulta con provincia, cantón y categoría validados; `User-Agent` informativo. Sin credenciales | Cuota limitada y bloqueo por abuso ([T-02](amenazas.md#t-02)); respuesta vacía o parcial ([T-06](amenazas.md#t-06)); cambio de forma ([T-07](amenazas.md#t-07)). Tratamiento: caché de 15 minutos, timeout de 35 s, validación previa de entradas |
| TP-02 | Catálogo CKAN y blob de Azure del Poder Judicial | Metadatos y CSV de estadísticas policiales | Solo peticiones `GET`; no recibe datos propios | Recurso apuntando a otro host o con otro esquema ([T-07](amenazas.md#t-07)). Tratamiento: host fijo, `https`, sin redirecciones, 40 MB y 60 s, validación de estructura |
| TP-03 | Portal de descarga del TSE | ZIP mensual del padrón | Ninguno: lo descarga una persona. El ZIP contiene datos personales | Manejo del dato sensible ([T-04](amenazas.md#t-04)); autenticidad del archivo ([T-05](amenazas.md#t-05)). Tratamiento: la persona sube el ZIP; el backend descarta los campos personales |
| TP-04 | `tile.openstreetmap.org` | Teselas del mapa | El navegador del visitante envía su IP y la zona consultada | Privacidad del visitante y política de uso de teselas de OSM. Tratamiento: atribución visible; revisar la política de uso si crece el tráfico |
| TP-05 | GitHub y GitHub Actions *(previsto)* | Repositorio, PR, CI y registro de hallazgos | Código, workflows, secretos del pipeline | Permisos de tokens y acciones de terceros ([T-12](amenazas.md#t-12)). Tratamiento: permisos mínimos, acciones fijadas por SHA, protección de ramas (fase 3) |
| TP-06 | Docker Hub *(previsto)* | Publicación de imágenes | Imágenes y un token de publicación | Publicar una imagen no aprobada. Tratamiento: publicar solo la imagen aprobada por digest (fase 5) |
| TP-07 | VPS único con Docker Compose y Caddy *(decidido en [Q-09](preguntas-abiertas.md#q-09))* | Ejecuta backend, frontend, BD y observabilidad | Imágenes, variables de entorno, secretos | Exposición de la BD y de secretos. Tratamiento: solo Caddy publica los puertos 80 y 443, HTTPS automático, BD en red interna (fase 6) |
| TP-08 | Claude, API de Anthropic *(decidido en [Q-09](preguntas-abiertas.md#q-09))* | Revisión de código y apoyo al desarrollo | Código y contexto del proyecto | Fuga de código o secretos en prompts. Tratamiento: no enviar secretos ni datos personales; ver [AGENTS.md](../../../../AGENTS.md) |

## Dependencias críticas

Se justifica por qué cada una importa; la lista completa está en `backend/package.json`, `frontend/package.json` y sus lockfiles. Hay dos lockfiles por proyecto; se decidió conservar solo `package-lock.json` ([Q-05](preguntas-abiertas.md#q-05)).

| Dependencia | Dónde | Por qué es crítica | Riesgo y tratamiento |
|---|---|---|---|
| `multer` (rama 1.x) | Backend | Recibe el ZIP con datos personales (`FileInterceptor`) | Verificar con OSV-Scanner si la versión tiene avisos de seguridad y valorar actualizarla ([T-12](amenazas.md#t-12)) |
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
| S-02 | `ADMIN_API_KEY`, clave de administración *(decidida en [Q-01](preguntas-abiertas.md#q-01))* | Autorizar `POST /osm/sync`, `/oij/sync` y `/tse/import` mediante la cabecera `X-Admin-Key` | Backend y operador | Solo los endpoints de escritura. Mínimo 32 caracteres aleatorios | Variable de entorno en el servidor; en el frontend solo en memoria del navegador, nunca `NEXT_PUBLIC_*` | Frander |
| S-03 | Token de Docker Hub *(previsto)* | Publicar imágenes | Pipeline de GitHub Actions | Solo escritura del repositorio de imágenes | Secreto protegido de GitHub Actions | Daniel |
| S-04 | Credencial de despliegue *(previsto)* | Desplegar en el VPS o la nube | Pipeline | Solo el despliegue | Secreto protegido de GitHub Actions | Daniel |
| S-05 | Clave del proveedor de IA *(previsto)* | Revisión asistida por IA | Pipeline o herramienta local | Solo la API del proveedor | Secreto protegido, nunca en prompts ni en el repositorio | José |

**Configuración que no es secreta:** `PORT`, `OVERPASS_URL`, `OVERPASS_USER_AGENT` (debe incluir un medio de contacto antes de publicar) y `NEXT_PUBLIC_API_URL`. `NEXT_PUBLIC_*` se incluye en el código del navegador: ningún secreto puede llamarse así.

**Valor de ejemplo existente:** `backend/.env.example` y `backend/scripts/local-db.mjs` incluyen la contraseña de la base local de desarrollo (`127.0.0.1:5433`). Es un valor académico, solo para esa base, y no debe reutilizarse en ningún otro ambiente.
