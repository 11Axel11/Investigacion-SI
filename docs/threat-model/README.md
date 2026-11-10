# Modelo de amenazas en OWASP Threat Dragon (ítem 1.3)

El diagrama de Threat Dragon es el mapa de arquitectura del proyecto y el modelo de amenazas. Se reutiliza como el mapa del ítem 1.2 para no duplicar trabajo. El contenido textual equivalente está en [arquitectura.md](../kb/arquitectura.md) y [amenazas.md](../kb/amenazas.md).

**Estado: pendiente.** El archivo del modelo (`observatorio.json`) aún no existe. Debe crearlo una persona con la aplicación de Threat Dragon y exportarlo a esta carpeta. No se generó a mano para evitar un archivo que la herramienta no pueda abrir.

## Cómo crearlo

1. Abrir [OWASP Threat Dragon](https://www.threatdragon.com/) (aplicación web o de escritorio) y crear un modelo nuevo llamado `Observatorio Territorial CR`, con un diagrama de tipo **STRIDE**.
2. Dibujar los elementos de abajo, con los mismos IDs que usa [arquitectura.md](../kb/arquitectura.md).
3. Para cada amenaza de [amenazas.md](../kb/amenazas.md), agregarla al elemento o flujo indicado, con el mismo ID (`T-01` a `T-13`), la categoría STRIDE, la prioridad y la mitigación.
4. Guardar el modelo y exportarlo como `docs/threat-model/observatorio.json`. Hacer el cambio en un PR revisado por otro integrante.
5. Comprobar que cada `T-nn` del archivo exista en `amenazas.md` y viceversa.

## Elementos del diagrama

| Tipo | Nombre | ID |
|---|---|---|
| Actor externo | Visitante anónimo | — |
| Actor externo | Operador | — |
| Proceso | Frontend Next.js | C-01 |
| Proceso | API NestJS | C-02 |
| Almacén de datos | PostgreSQL | C-03 |
| Actor externo (tercero) | Overpass API | TP-01 |
| Actor externo (tercero) | Catálogo CKAN y blob del OIJ | TP-02 |
| Actor externo (tercero) | Portal del TSE | TP-03 |
| Actor externo (tercero) | Teselas OSM | TP-04 |

## Límites de confianza

1. Navegador del visitante o del operador.
2. Servidor propio (API y base de datos).
3. Terceros (Overpass, OIJ, teselas OSM).

## Flujos de datos

| # | Origen → destino | Contenido | Amenazas |
|---|---|---|---|
| 1 | Visitante u operador → Frontend | HTTP | T-01, T-09 |
| 2 | Frontend → API | JSON por HTTP, CORS abierto | T-01, T-02, T-09, T-11 |
| 3 | Frontend → Teselas OSM | Teselas por HTTPS | — (ver TP-04) |
| 4 | Operador → API | ZIP del padrón (datos personales) | T-01, T-03, T-04, T-05 |
| 5 | API → PostgreSQL | SQL con `DATABASE_URL` | T-06, T-09, T-13 |
| 6 | API → Overpass | Overpass QL por HTTPS | T-02, T-06, T-07 |
| 7 | API → OIJ | Catálogo y CSV por HTTPS | T-02, T-07 |

Las amenazas T-08 (repudio), T-10 (uso indebido de la inferencia) y T-12 (cadena de suministro) se asocian al proceso de la API, a la interfaz de `/cobertura` y al repositorio respectivamente.
