## Origen
Planificación, amenaza T-11 / medida M-11 y seguimiento existente en https://github.com/11Axel11/Investigacion-SI/issues/19. Actualizar ese issue, no duplicarlo.

## Versión afectada
Commit `05c1545aef6b6a0e8277fe014f4906e2d28d352e`. Revisión de código; no se identifica una imagen desplegada y no aplica un digest para esta observación.

## Descripción
Los filtros de lectura de TSE/OIJ/cobertura no tienen validación uniforme de longitud y tipo; TSE acepta comodines de ILIKE como parte del patrón de búsqueda. Puede producir consultas y resultados distintos de la intención del usuario. Las consultas TSE usan parámetros: este hallazgo no afirma inyección SQL.

## Evidencia
- Filtros del TSE evaluados: https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/backend/src/tse/tse.service.ts#L123-L134
- Controlador OIJ evaluado: https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/backend/src/oij/oij.controller.ts
- Corrección propuesta: https://github.com/11Axel11/Investigacion-SI/pull/18

## Severidad y justificación
Baja. Afecta robustez y semántica de consultas públicas; existen consultas parametrizadas y no se ha demostrado acceso a información protegida ni modificación de datos. Se conserva la prioridad de T-11, sujeta a revisión humana.

## Responsable
José según responsables.md; revisor Axel. GitHub tiene asignada la cuenta Dani-develop: el equipo debe confirmar la correspondencia con la persona, sin deducirla del nombre ni reasignarla automáticamente. Se conserva la asignación remota existente.

## Estado
Confirmado
Brecha de validación observada en el commit indicado. El PR #18 propone tratamiento; no se declara corregida ni fusionada su solución en este borrador.

## Tratamiento
Validar filtros de TSE, OIJ y cobertura con límites, tratar comodines de búsqueda como literales donde corresponde y revisar las pruebas del PR #18. Actualizar este mismo issue con versión y evidencia después de comprobarlo. No se cambia una expectativa de prueba para hacerla coincidir con código defectuoso.

## Relaciones
T-11, M-11. Issue #19: https://github.com/11Axel11/Investigacion-SI/issues/19. PR #18: https://github.com/11Axel11/Investigacion-SI/pull/18.

## Comprobación posterior
Ejecutar pruebas con filtros válidos, tipos y longitudes inválidos, porcentajes y guiones bajos, sin usar datos reales. Comprobar resultados y que las lecturas no mutan datos. Enlazar ejecución y SHA probado antes de declarar corregido. Este aporte no ejecuta ni aprueba las pruebas de José.
