# Fase 5: Preparación de la versión

**Objetivo.** Proceso reproducible para preparar y aprobar una versión, relacionando el artefacto que se entrega con sus cambios, comprobaciones y limitaciones. La aprobación depende de condiciones definidas y de evidencia.

**Dónde se ejecuta:** GitHub Actions y Docker Hub.

## Qué se espera (ítems)

| Ítem | Qué se espera |
|---|---|
| 5.1 | Registro de la versión candidata: SHA del commit, digest de la imagen, cambios incluidos y enlaces a reportes de pruebas, seguridad y SBOM (enlaces, no copias) |
| 5.2 | El workflow comprueba lint, build, pruebas y seguridad del commit fusionado. Un check fallido, omitido o sin resultados impide aprobar; solo se aceptan hallazgos concretos con una excepción vigente y revisada |
| 5.3 | Resumen de cambios y limitaciones conocidas basado en los PR y resultados; otro integrante verifica que nada pendiente se presente como resuelto |
| 5.4 | Versión de recuperación: imagen anterior por digest, pasos de reversión y comprobaciones. Para la primera entrega, cómo retirar el despliegue y volver al estado inicial |
| 5.5 | Publicar en Docker Hub **la misma imagen** que pasó las comprobaciones, automatizado y condicionado; etiqueta con el SHA; el despliegue usa el digest |
| 5.6 | Excepciones de seguridad abiertas en el registro único: hallazgo, alcance, evidencia, justificación, responsable, aprobación humana, vencimiento. Una credencial real expuesta se **rota o revoca** |

## Criterio de cierre

Se identifica la versión aprobada, se consulta la evidencia que la respalda, se explican limitaciones y recuperación, y se demuestra que un check obligatorio fallido impide publicarla como aprobada.

## Dependencias

Requiere la fase 3 (artefactos aprobados y SBOM) y la decisión de [Q-09](../01-planificacion/kb/preguntas-abiertas.md#q-09): Docker Hub con imágenes por digest. Secretos implicados: S-03 (token de Docker Hub, responsable Daniel).
