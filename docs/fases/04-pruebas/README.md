# Fase 4: Pruebas

**Objetivo.** Suite reproducible de pruebas de calidad y seguridad, con apoyo de IA para identificar escenarios, que detecte fallos relevantes y permita comprobar su corrección usando los requisitos y riesgos de la fase 1.

**Dónde se ejecuta:** local (Docker, Playwright, Artillery, Toxiproxy) y GitHub Actions. **Herramientas:** Supertest o Playwright API tests, Playwright, ZAP Automation Framework, Toxiproxy, Artillery, Nuclei (opcional).

## Qué se espera (ítems)

| Ítem | Qué se espera |
|---|---|
| 4.1 | Ambiente aislado y datos controlados: comandos para iniciar, crear cuentas con distintos permisos, cargar datos ficticios y limpiar; repetible; reutilizable desde CI |
| 4.2 | Pruebas unitarias de reglas de negocio con errores y valores límite; la cobertura solo señala áreas sin explorar |
| 4.3 | Integración API + base de datos de pruebas (Supertest o equivalente): persistencia, errores, limpieza |
| 4.4 | E2E con Playwright de los **tres flujos críticos** (F-01, F-02, F-03): éxito y al menos un rechazo esperado; relacionados con los criterios F0nACm |
| 4.5 | Autorización: accesos permitidos y denegados por rol, propiedad y ausencia de sesión; también directo a la API; los rechazos no exponen ni modifican datos |
| 4.6 | Rutas alternativas a los mismos datos (búsquedas, exportaciones, descargas, operaciones masivas) respetan las mismas condiciones |
| 4.7 | DAST con ZAP Automation Framework: rutas públicas y autenticadas, rastreo, análisis pasivo y activo acotado; CI lo ejecuta contra el candidato |
| 4.8 | IA contrasta requisitos y riesgos con las pruebas y propone escenarios faltantes; otro integrante revisa; **no se cambia la expectativa de una prueba para que coincida con el código** |
| 4.9 | Demostrar que las pruebas detectan fallos: un defecto funcional y uno de seguridad, con evidencia de fallo, corrección y aprobación |
| 4.10 | Experimento de resiliencia con Toxiproxy (latencia o corte de una dependencia crítica): comportamiento esperado, duración, recuperación, timeouts y consistencia; Artillery puede generar carga |

## Estado

**Construida y ejecutada en local (2026-11-11); falta ejecutarla en GitHub y la revisión de otro integrante.** Sin Docker, la parte con BD, E2E, DAST y resiliencia queda **incompleta** (salida 2), nunca aprobada. Los jobs `pruebas`, `e2e`, `dast` y `resiliencia` ya están en `ci.yml` y `resultado` los exige, pero **no se han corrido en GitHub**: la primera ejecución real puede pedir ajustes (por ejemplo `host.docker.internal` en Linux o la instalación de Chromium).

| Ítem | Estado | Evidencia |
|---|---|---|
| 4.1 | Hecho: BD efímera en Docker, datos ficticios, `up/seed/limpiar/down`, reutilizado por CI | [4.1](evidencias/4.1-ambiente.md) |
| 4.2 | Hecho: 14 pruebas de reglas de `/coverage` (12 pasan, 2 `todo`) y las 25 del importador | [4.2 a 4.6](evidencias/4.2-4.6-pruebas.md) |
| 4.3 | Hecho: 13 pruebas con la aplicación y PostgreSQL reales, terceros simulados | [4.2 a 4.6](evidencias/4.2-4.6-pruebas.md) |
| 4.4 | Hecho: 9 pruebas de Playwright (éxito y rechazo de F-01, F-02 y F-03) | [4.4](evidencias/4.4-e2e.md) |
| 4.5 | Hecho: matriz de acceso directo a la API, 10 pruebas | [4.2 a 4.6](evidencias/4.2-4.6-pruebas.md) |
| 4.6 | Hecho: variantes de ruta, inventario de rutas, privacidad y filtros | [4.2 a 4.6](evidencias/4.2-4.6-pruebas.md) |
| 4.7 | Ejecutado: sin riesgos altos, 3 medios y 3 bajos (IA-14); el análisis activo fue muy corto | [4.7](evidencias/4.7-dast-zap.md) |
| 4.8 | Elaborado por IA; **pendiente de revisión humana** | [4.8](evidencias/4.8-ia-escenarios.md) |
| 4.9 | Demostrado: un defecto real (F03-AC5, corregido) y dos controlados (funcional y de seguridad) | [4.9](evidencias/4.9-defectos-controlados.md) |
| 4.10 | Ejecutado: 7 de 7 hipótesis; hallazgo F03-AC9 | [4.10](evidencias/4.10-resiliencia.md) |

**Hallazgos de esta fase:** F03-AC5 (pérdida de datos de OSM, **corregido**), F03-AC9 (consultas duplicadas a Overpass, medido), cabeceras de seguridad y CORS ([IA-14](../01-planificacion/kb/ia-sugerencias.md#ia-14)), y la clave única de `OsmPlace` sin categoría ([IA-13](../01-planificacion/kb/ia-sugerencias.md#ia-13)). Siguen sin pruebas los criterios que son brecha conocida (`todo`), logs, T-02 y T-08 ([4.8](evidencias/4.8-ia-escenarios.md)).

## Cómo reproducirlo

```bash
scripts/pruebas/ejecutar.sh          # 4.1, 4.2, 4.3, 4.5, 4.6 (necesita Docker)
scripts/pruebas/e2e.sh               # 4.4 (la primera vez: cd e2e && npm ci && npx playwright install chromium)
scripts/pruebas/zap.sh               # 4.7
scripts/pruebas/resiliencia.sh       # 4.10
scripts/pruebas/defecto-controlado.sh funcional   # 4.9 (también: seguridad)
```

## Criterio de cierre

Otro integrante reproduce las pruebas, identifica qué requisitos y riesgos cubren y observa la detección y corrección de los fallos demostrados. Una prueba omitida, una sesión inválida o un análisis que no corrió se reportan como **incompletos**.

## Cómo se aprovecha la fase 1

- Autorización (4.5): la [matriz de acceso](../01-planificacion/kb/arquitectura.md#matriz-de-acceso) y [T-01](../01-planificacion/kb/amenazas.md#t-01) dictan los casos: sin clave, clave incorrecta y clave válida en los tres `POST`.
- E2E (4.4): un caso por criterio de [flujos.md](../01-planificacion/kb/flujos.md), incluidos los de uso indebido.
- Resiliencia (4.10): candidata natural, Overpass u OIJ ([T-02](../01-planificacion/kb/amenazas.md#t-02), [T-07](../01-planificacion/kb/amenazas.md#t-07)).
- Datos: ZIP **ficticios** del TSE; nunca datos reales del padrón.
- Lo que ya existe: `backend/scripts/oij.test.cjs` y `oij.integration.cjs`.

## Evidencia a conservar

Mapa prueba → requisito/amenaza, ejecuciones fallida y aprobada de los defectos controlados, reportes de ZAP, resultados del experimento de Toxiproxy.
