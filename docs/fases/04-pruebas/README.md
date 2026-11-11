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
