# Modelo de amenazas en OWASP Threat Dragon (ítem 1.3)

El modelo de Threat Dragon es el mapa de arquitectura y el modelo de amenazas del proyecto. Se reutiliza como el mapa del ítem 1.2 para no duplicar trabajo. El contenido textual equivalente está en [arquitectura.md](../kb/arquitectura.md) y [amenazas.md](../kb/amenazas.md), que son la fuente de verdad del texto.

**Estado:** creado. [observatorio.json](observatorio.json) tiene 21 elementos (3 límites de confianza, 9 actores y procesos, 9 flujos) y 14 entradas de amenaza que cubren las 13 amenazas `T-01` a `T-13`. `T-07` aparece en dos flujos (OIJ y Overpass).

**Verificación (2026-11-10):** el archivo se importó en Threat Dragon web v2.6.2, en sesión local, sin errores. Se comprobó que se dibujan los 21 elementos y que los 13 IDs están presentes. Falta una revisión visual del diseño por parte de la persona revisora: las posiciones y los trazos de los flujos se fijaron por coordenadas y conviene ajustarlos a mano.

## Cómo abrirlo y editarlo

1. Abrir [Threat Dragon](https://www.threatdragon.com/) o la aplicación de escritorio. En la web, elegir "Sesión local" (no requiere cuenta ni envía el modelo a ningún servidor).
2. En "Abrir un modelo de amenazas existente", cargar `docs/fases/01-planificacion/threat-model/observatorio.json` o pegar su contenido.
3. Para cambiarlo, editar el diagrama y exportar el modelo de nuevo a este mismo archivo, en un PR revisado por otro integrante.
4. Si cambia el texto de una amenaza, actualizarlo también en [amenazas.md](../kb/amenazas.md) en el mismo PR. Cada `T-nn` del modelo debe existir en ese archivo y viceversa.

## Elementos del diagrama

| Tipo | Nombre | ID |
|---|---|---|
| Actor externo | Visitante anónimo | — |
| Actor externo | Operador | — |
| Actor externo | Portal TSE | TP-03 |
| Proceso | Frontend Next.js | C-01 |
| Proceso | API NestJS | C-02 |
| Almacén de datos | PostgreSQL | C-03 |
| Actor externo (tercero) | Overpass API | TP-01 |
| Actor externo (tercero) | Catálogo y CSV del OIJ | TP-02 |
| Actor externo (tercero) | Teselas OSM | TP-04 |

## Límites de confianza

1. Navegador del usuario.
2. Servidor propio (API y base de datos).
3. Terceros (Overpass, OIJ, teselas OSM).

## Flujos de datos y amenazas asociadas

| Etiqueta | Origen → destino | Contenido | Amenazas en el modelo |
|---|---|---|---|
| 1 | Visitante → Frontend | HTTP | — |
| 1b | Operador → Frontend | HTTP | — |
| 2 | Frontend → API | JSON por HTTP, CORS abierto | T-09, T-11 |
| 3 | Frontend → Teselas OSM | Teselas por HTTPS | — (ver TP-04) |
| 4 | Operador → API | ZIP del padrón (datos personales) | T-03, T-04, T-05 |
| 5 | API → PostgreSQL | SQL con `DATABASE_URL` | T-06, T-13 |
| 6 | API → Overpass | Overpass QL por HTTPS | T-07 |
| 7 | API → OIJ | Catálogo y CSV por HTTPS | T-07 |
| 0 | Portal TSE → Operador | Descarga manual del ZIP | — |

Las amenazas sobre procesos: API (C-02) con T-01, T-02, T-08 y T-12; Frontend (C-01) con T-10.
