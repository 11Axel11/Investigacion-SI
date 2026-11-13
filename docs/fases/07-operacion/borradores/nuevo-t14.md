## Origen
Revisión de medidas de planificación, propuesta T-14 / M-14 de Daniel. Al consultar los issues públicos no se identificó un issue dedicado a T-14. Este texto es una propuesta de alta; volver a buscar duplicados antes de publicar.

## Versión afectada
Commit `05c1545aef6b6a0e8277fe014f4906e2d28d352e`. La reproducción original se documentó sobre `cdc70e6`; el bucle de persistencia continúa en el candidato citado. No se ha probado una imagen desplegada y no se declara digest.

## Descripción
La importación TSE ejecuta upserts de hasta 500 distritos sin una transacción global. Una falla en un lote posterior puede dejar agregados nuevos junto a los anteriores aunque la petición termine con error. La confirmación con PostgreSQL y la ratificación humana de prioridad y tratamiento siguen pendientes.

## Evidencia
- Bucle del candidato: https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/backend/src/tse/tse.service.ts#L109-L111
- Propuesta incorporada: https://github.com/11Axel11/Investigacion-SI/pull/7
- Reproducción aislada original: https://github.com/11Axel11/Investigacion-SI/blob/05c1545aef6b6a0e8277fe014f4906e2d28d352e/docs/fases/01-planificacion/evidencias/revision-medidas.md

## Severidad y justificación
Media. Prioridad propuesta por impacto en integridad: requiere al menos dos lotes y una falla de persistencia, incluso con operador legítimo. Los datos pueden recuperarse mediante una importación completa. No se demuestra exposición de datos personales ni explotación real.

## Responsable
Daniel, propuesto en T-14; revisor propuesto Axel. Ratificación humana pendiente. No se crea ni acepta una asignación en nombre de ellos mediante este texto.

## Estado
Pendiente de investigación
El bucle está observado y existe una simulación en memoria. Falta validar la amenaza propuesta y reproducir fallo y rollback con PostgreSQL aislado. La simulación no prueba una corrección.

## Tratamiento
Revisar la propuesta de persistir todos los lotes mediante un único repositorio transaccional, después de validar el ZIP. No implementar ni presentar una propuesta como requisito aprobado sin ratificación. Mantener este estado hasta registrar la decisión humana y la comprobación correspondiente.

## Relaciones
T-14, M-14, F-01. Origen: https://github.com/11Axel11/Investigacion-SI/pull/7. No confundir con T-05 (procedencia y fechas) ni T-06 (reemplazo OSM).

## Comprobación posterior
En una BD aislada precargar datos y procesar un ZIP ficticio de al menos 501 distritos. Forzar falla en el segundo lote; comprobar filas y metadatos previos intactos y ausencia de nuevas filas. Repetir sin la falla y comprobar éxito e idempotencia. Aún no ejecutado contra PostgreSQL por este aporte; no se registra como corregido.
