# Resumen de cambios y limitaciones — Ítem 5.3

## Versión evaluada

- Commit: `05c1545aef6b6a0e8277fe014f4906e2d28d352e`
- Código evaluado: [árbol del commit](https://github.com/11Axel11/Investigacion-SI/tree/05c1545aef6b6a0e8277fe014f4906e2d28d352e).
- Fecha de comprobación: 2026-11-12, 21:57 UTC.
- Estado: revisión documental del candidato; no constituye aprobación de una versión.
- Responsable del resumen: Daniel Elizondo.
- Revisor: pendiente de asignación.

Este resumen cubre el estado acumulado del proyecto hasta ese commit, sin una versión publicada anterior tomada como base. No afirma que todo el trabajo incluido sea de su autor: el aporte del ítem 5.3 es contrastar los cambios, los resultados y las limitaciones. Los avances posteriores necesitan otro resumen o una actualización explícita del commit y de su evidencia.

## Cambios incluidos

| Cambio incluido | Referencia |
|---|---|
| Integración del módulo OIJ y prueba de rechazo de hosts no autorizados | [PR #1](https://github.com/11Axel11/Investigacion-SI/pull/1), [PR #5](https://github.com/11Axel11/Investigacion-SI/pull/5) |
| Integración de límites cantonales del IGN/SNIT | [PR #6](https://github.com/11Axel11/Investigacion-SI/pull/6) |
| Base de conocimiento, modelo de amenazas y correcciones de medidas; incorporación de T-14 como propuesta | [PR #2](https://github.com/11Axel11/Investigacion-SI/pull/2), [PR #7](https://github.com/11Axel11/Investigacion-SI/pull/7), [PR #8](https://github.com/11Axel11/Investigacion-SI/pull/8) |
| Guard de administración, modo operador, linting, pruebas, Semgrep, Gitleaks y mecanismos del agente | [PR #9](https://github.com/11Axel11/Investigacion-SI/pull/9), [PR #10](https://github.com/11Axel11/Investigacion-SI/pull/10) |
| Pipeline CI, construcción y análisis de imágenes, SBOM y políticas de contenedores | [PR #11](https://github.com/11Axel11/Investigacion-SI/pull/11) |
| Documentación de la ejecución posterior a la fusión e instrucciones para comprobar CI | [PR #13](https://github.com/11Axel11/Investigacion-SI/pull/13), [PR #14](https://github.com/11Axel11/Investigacion-SI/pull/14) |
| Incorporación de pruebas de la fase 4 y ajustes de CI | [Commit 4ac34ab](https://github.com/11Axel11/Investigacion-SI/commit/4ac34ab) |
| Registro de las revisiones documentales de Pablo | [PR #15](https://github.com/11Axel11/Investigacion-SI/pull/15) |

“Incluido” significa que el cambio pertenece al commit evaluado;
no implica que todos sus controles estén verificados o aprobados.

Se contrastó la fecha de fusión de cada PR mediante la API de GitHub y se comprobó con `git merge-base --is-ancestor` que su commit de fusión pertenece al candidato. También se comprobó la pertenencia del commit `4ac34ab` de la fase 4. El procedimiento y los resultados se registran en [la evidencia del resumen](evidencias/5.3-verificacion.md).

## Resultados de las comprobaciones

La ejecución [CI #43141820064](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064), intento 1, corresponde exactamente al commit evaluado. Fue iniciada por `push` y terminó con estado `completed` y conclusión `success`.

| Comprobación | Job y evidencia | Resultado registrado |
|---|---|---|
| Lint, compilación y pruebas del backend | [backend](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365838) | `success` |
| Lint, tipos, pruebas de operador y compilación del frontend | [frontend](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365919) | `success` |
| Semgrep, Gitleaks y OSV-Scanner con su compuerta | [seguridad](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365898) | `success` |
| Políticas Conftest/OPA | [politicas](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365889) | `success` |
| Construcción, Trivy y generación de SBOM | [imagenes](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365690) | `success` |
| Pruebas con base de datos aislada | [pruebas](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365846) | `success` |
| Recorridos E2E con Playwright | [e2e](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365908) | `success` |
| Análisis dinámico ZAP | [dast](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365814) | `success` |
| Experimento con Toxiproxy | [resiliencia](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130930365943) | `success` |
| Compuerta global | [resultado](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130931547311) | `success` |
| Registro del commit fusionado | [fusion](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/job/130931582786) | `success` |

El alcance de los jobs se contrastó con el [workflow del candidato](https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/.github/workflows/ci.yml). Los 11 jobs aparecen completados, ninguno omitido o cancelado. Esto actualiza las notas anteriores de la fase 4 que todavía indicaban que faltaba ejecutar sus jobs en GitHub.

### Reportes y artefactos

Se verificó en la API la existencia de los cinco artefactos siguientes, todos con `expired: false` en la fecha de consulta. Cada nombre termina con el SHA completo del candidato; no se copian los reportes en este documento.

| Artefacto (prefijo; sufijo = SHA completo) | Enlace | Alcance previsto según el workflow |
|---|---|---|
| `seguridad-` | [Artefacto 13910610063](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/artifacts/13910610063) | Reportes de análisis de código, secretos y dependencias |
| `e2e-` | [Artefacto 13910585310](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/artifacts/13910585310) | Informe de Playwright |
| `dast-` | [Artefacto 13910331081](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/artifacts/13910331081) | Reportes de ZAP |
| `imagenes-` | [Artefacto 13909971702](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/artifacts/13909971702) | Reportes de Trivy, SBOM y metadatos de imágenes |
| `fusion-` | [Artefacto 13909618799](https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064/artifacts/13909618799) | Registro de la fusión y referencias a sus artefactos |

No se descargaron ni revisaron individualmente sus archivos. No se atribuyen a esta ejecución los conteos de pruebas o de vulnerabilidades de informes locales anteriores. No se registró un digest de imagen publicada: el ítem 5.3 no sustituye el registro de versión del 5.1 ni la publicación del 5.5.

## Limitaciones conocidas

| Limitación del candidato | Evidencia | Consecuencia / pendiente |
|---|---|---|
| La compuerta de dependencias admite excepciones temporales cuya aceptación humana sigue pendiente en Q-12. El informe previo describe cuatro avisos exceptuados hasta 2026-12-31; no se afirma que ese sea el conteo del artefacto actual. | [Evidencia 3.2](../03-construccion-integracion/evidencias/3.2-seguridad-ci.md), [Q-12](../01-planificacion/kb/preguntas-abiertas.md#q-12) | `seguridad: success` no significa cero vulnerabilidades ni aprobación humana de las excepciones. No se acepta el riesgo en este resumen. |
| `main` no está protegida, según la API de GitHub al consultar; Q-13 documenta la falta de permisos para aplicar la configuración. | [Q-13](../01-planificacion/kb/preguntas-abiertas.md#q-13), [evidencia de consulta](evidencias/5.3-verificacion.md) | Una ejecución verde no demuestra que un check fallido impida fusionar. |
| Persisten CORS abierto y `synchronize: true` en el código del candidato; los cambios de endurecimiento de T-09 aún no están incluidos. | [`main.ts`](https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/backend/src/main.ts), [`app.module.ts`](https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/backend/src/app.module.ts), [PR #20](https://github.com/11Axel11/Investigacion-SI/pull/20) | No presentar el servidor como endurecido ni usar esta configuración como aprobación para producción. |
| La compuerta ZAP bloquea alertas altas; los avisos medios y bajos pueden coexistir con un job exitoso. El informe local anterior documenta cabeceras ausentes, CORS abierto y alcance activo reducido. | [DAST 4.7](../04-pruebas/evidencias/4.7-dast-zap.md), [compuerta del candidato](https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/scripts/pruebas/zap-compuerta.mjs) | No confundir el job exitoso con una auditoría completa. El triaje del reporte actual debe revisar su artefacto, no extrapolar el conteo local. |
| Hay escenarios conocidos sin cubrir o marcados `todo`, incluyendo ZIP adicionales/descompresión (T-03), avisos de truncamiento OSM y eventos de seguridad (T-08). | [Mapa de cobertura 4.8](../04-pruebas/evidencias/4.8-ia-escenarios.md), [amenazas](../01-planificacion/kb/amenazas.md) | Un conjunto de jobs exitosos no demuestra cobertura de todos los criterios. El mapa es documentación asistida por IA pendiente de revisión humana. |
| T-14 está documentada como propuesta y el importador conserva el bucle de `upsert` por lotes sin transacción global. | [`tse.service.ts`](https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/backend/src/tse/tse.service.ts#L109-L111), [T-14](../01-planificacion/kb/amenazas.md#t-14) | La reproducción aislada identifica un riesgo; no demuestra mitigación ni aprobación de su prioridad o tratamiento. |
| La documentación de la fase 3 indica que falta instalar Renovate y demostrar un PR real. | [Estado de la fase 3](../03-construccion-integracion/README.md) | Tener `renovate.json` no demuestra actualizaciones automáticas operativas. |
| El proveedor de IA de CI es DeepSeek, con ratificación y revisión de política de datos pendientes según Q-09/TP-12. | [Q-09](../01-planificacion/kb/preguntas-abiertas.md#q-09), [TP-12](../01-planificacion/kb/terceros-secretos.md#servicios-externos) | Este resumen no autoriza nuevas transferencias de código ni certifica las condiciones del proveedor. |
| No se aporta evidencia de publicación en Docker Hub, despliegue, HTTPS público o recuperación de una versión desplegada. El workflow evaluado es CI y no contiene esos pasos. | [Workflow del candidato](https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/.github/workflows/ci.yml), [preparación de versión](README.md), [despliegue](../06-despliegue/README.md) | Las etapas 5 y 6 no quedan completas por redactar este resumen; construir imágenes en CI no equivale a desplegar. |
| Hay revisiones humanas diferidas (Q-11) y este resumen aún no tiene revisión independiente. | [Q-11](../01-planificacion/kb/preguntas-abiertas.md#q-11), sección final de este documento | No se declara aprobada la versión ni completo el criterio humano del 5.3. |

Las limitaciones se refieren al SHA seleccionado. Las referencias locales corresponden a documentos presentes en ese candidato, pero algunos conservan notas históricas; cuando existe una comprobación nueva se distingue de lo documentado anteriormente. No se cambiaron controles, excepciones ni reglas para producir un resultado favorable.

## Cambios no incluidos

Los siguientes PR estaban abiertos y sin fecha de fusión al consultar GitHub. Sus mejoras **no se atribuyen** al candidato:

| PR | Trabajo fuera del candidato |
|---|---|
| [#17](https://github.com/11Axel11/Investigacion-SI/pull/17) | Límites de sincronización OSM/OIJ y pruebas de T-02 |
| [#18](https://github.com/11Axel11/Investigacion-SI/pull/18) | Validación de filtros de lectura de TSE, OIJ y cobertura (T-11) |
| [#20](https://github.com/11Axel11/Investigacion-SI/pull/20) | Endurecimiento del servidor (T-09), CORS, cabeceras y migraciones |
| [#21](https://github.com/11Axel11/Investigacion-SI/pull/21) | Revisión documental de Daniel del ítem 1.5 |

El [PR #12](https://github.com/11Axel11/Investigacion-SI/pull/12) es una demostración de fallo y corrección de CI, no un PR fusionado que deba presentarse como funcionalidad entregada. Su [evidencia 3.6](../03-construccion-integracion/evidencias/3.6-bloqueo-demostrado.md) no prueba bloqueo efectivo mientras la rama siga sin protección.

El estado de los PR puede cambiar después de esta consulta; lo que pertenece a este resumen sigue determinado por el SHA, no por el estado posterior de `main`. Tampoco se atribuyen al candidato este documento ni los futuros commits de la rama `docs/daniel-5-3-resumen-version`.

## Revisión humana

**Pendiente; no se ha solicitado una aprobación automática ni se firma en nombre de otra persona.** La elaboración y las comprobaciones mecánicas fueron asistidas por IA a solicitud de Daniel. Otro integrante distinto del autor debe contrastar el resumen con las fuentes y registrar su revisión en el PR.

| Aspecto que debe revisar | Estado |
|---|---|
| Los PR y commits incluidos pertenecen al SHA evaluado | Comprobación mecánica realizada; revisión humana pendiente |
| La ejecución y sus artefactos pertenecen al mismo SHA; sus límites están declarados | Metadatos consultados; revisión humana y lectura de reportes pendientes |
| Las limitaciones y los PR excluidos no se presentan como resueltos | Revisión humana pendiente |
| Las afirmaciones del resumen están respaldadas por las referencias | Revisión humana pendiente |

| Revisor | Fecha | Resultado | Enlace a revisión y observaciones |
|---|---|---|---|
| Pendiente de asignación | — | Pendiente | — |

Para completar el 5.3, el revisor debe dejar observaciones concretas o confirmar que las afirmaciones están respaldadas; cualquier corrección debe mantenerse en este mismo PR. Un job verde, la asistencia de IA o un commit de documentación no sustituyen ese juicio humano.
