## Origen
Planificación, amenaza T-02 / medida M-02 y seguimiento existente en https://github.com/11Axel11/Investigacion-SI/issues/16. Texto preparado para actualizar ese mismo issue, no para crear otro.

## Versión afectada
Commit `05c1545aef6b6a0e8277fe014f4906e2d28d352e`. Se evalúa el código, no una imagen desplegada; digest no aplica a esta comprobación estática.

## Descripción
Las escrituras OSM/OIJ exigen clave, pero el candidato no limita la tasa de sincronizaciones. Un operador o quien obtenga su clave puede recorrer combinaciones no cubiertas por caché y agotar recursos propios o de terceros. No se afirma un ataque observado.

## Evidencia
- Código evaluado: https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/backend/src/osm/osm.controller.ts
- Configuración evaluada: https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/backend/src/app.module.ts
- Corrección propuesta, no incluida en ese commit: https://github.com/11Axel11/Investigacion-SI/pull/17

## Severidad y justificación
Alta. La ausencia de límite permite consumir recursos de la API y de fuentes con cuota. La caché reduce repeticiones idénticas, pero no todas las combinaciones. La clave administrativa reduce exposición frente a visitantes; la prioridad procede de T-02 y requiere revisión humana, no se deduce de un ataque real.

## Responsable
Pablo, según el issue #16 y responsables.md. Revisor: Axel. Este borrador conserva ese reparto, no modifica asignaciones en GitHub.

## Estado
Confirmado
Brecha observada en el commit indicado mediante revisión estática. Existe tratamiento en PR #17, pero no se declara corregida hasta verificar su integración y la versión resultante.

## Tratamiento
Mantener el issue #16 abierto mientras se revisa el PR #17. Comprobar límites por IP en OSM/OIJ y rechazos 429 sin llamadas extra a terceros. Registrar ejecución y SHA resultante antes de declarar corregido. No se acepta el riesgo temporalmente en este borrador.

## Relaciones
T-02, M-02, T-01. Issue #16: https://github.com/11Axel11/Investigacion-SI/issues/16. PR #17: https://github.com/11Axel11/Investigacion-SI/pull/17.

## Comprobación posterior
Revisar la suite de límites del PR y ejecutarla en un ambiente aislado con terceros simulados. Verificar permitidos bajo el límite, HTTP 429 al superarlo y ausencia de llamadas adicionales. Enlazar resultados y SHA comprobado; un PR abierto no basta para cerrar el hallazgo. Daniel no ha ejecutado esas pruebas mediante este aporte.
