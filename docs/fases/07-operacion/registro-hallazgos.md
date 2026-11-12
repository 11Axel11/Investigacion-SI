# Registro único de hallazgos — Ítem 7.5

**Responsable de este aporte:** Daniel Elizondo. **Revisor:** pendiente de asignación. **Fecha de consulta:** 2026-11-12.

El registro oficial es [GitHub Issues](https://github.com/11Axel11/Investigacion-SI/issues), no una segunda lista de estados mantenida en Markdown. Este documento explica cómo usarlo y prepara mejoras de los registros existentes. Los archivos de `borradores/` son **propuestas para publicar**, no estados oficiales ni evidencia de publicación.

## Estado real de este aporte

- Creada [plantilla para nuevos hallazgos](../../../.github/ISSUE_TEMPLATE/hallazgo.md).
- Preparados textos completos para actualizar los issues #16 y #19 **sin crear duplicados**.
- Preparado borrador de T-14; antes de abrir un issue debe buscarse de nuevo si ya existe.
- Implementado [validador local](../../../scripts/hallazgos/validar.mjs) con [pruebas](../../../scripts/hallazgos/validar.test.mjs), sin dependencias adicionales.
- **Pendiente:** revisar y publicar las actualizaciones en GitHub, registrar la URL de T-14 si procede y conseguir revisión independiente. El 7.5 **no está completo** mientras solo existan plantillas y borradores.
- No se implementan aquí observabilidad, alertas, escáneres nuevos ni el cierre de un hallazgo del 7.7.

## Campos que debe contener cada hallazgo

| Campo | Qué se registra |
|---|---|
| Origen | Etapa, prueba, análisis, revisión o alerta que lo detectó |
| Versión afectada | SHA completo del código y digest de imagen cuando corresponda; declarar si no se evaluó una imagen |
| Descripción | Componente y comportamiento observado, sin afirmar una explotación no demostrada |
| Evidencia | Enlaces a código, ejecuciones, reportes o reproducciones; nunca secretos ni datos personales |
| Severidad y justificación | Crítica, Alta, Media, Baja o Informativa, con impacto y condiciones; requiere juicio humano |
| Responsable | Persona encargada del seguimiento; señalar una asignación propuesta o sin ratificar |
| Estado | Uno de los estados definidos abajo, con su justificación |
| Tratamiento | Acción acordada o propuesta, siguiente paso y limitaciones |
| Relaciones | IDs T-nn, M-nn, Q-nn, IA-nn y enlaces a issues, PR o excepciones; no copiar todo el modelo de amenazas |
| Comprobación posterior | Cómo se verificará y, si se afirma corregido, prueba y versión realmente comprobadas |

## Estados y reglas de seguimiento

- **Pendiente de investigación:** hipótesis o reproducción incompleta. No es un problema confirmado ni una corrección.
- **Confirmado:** evidencia suficiente del problema en la versión indicada; un PR correctivo abierto no lo vuelve corregido.
- **Falso positivo:** la investigación demuestra que el problema señalado no aplica; enlazar evidencia y explicación.
- **Corregido:** enlazar la corrección integrada, el SHA comprobado y la nueva ejecución que demuestra el resultado. El estado `closed` del issue por sí solo no lo acredita.
- **Riesgo aceptado temporalmente:** enlazar la decisión humana, justificación, responsable y fecha de vencimiento o revisión. Añadir secciones `Aprobación humana` y `Vencimiento o revisión` (fecha AAAA-MM-DD). No aceptarlo ni renovarlo automáticamente. Una excepción que cambia un requisito académico requiere la aprobación correspondiente del docente.

El estado abierto/cerrado de GitHub y el estado técnico del hallazgo son distintos. Conservar el issue abierto si la evidencia de corrección o la decisión está pendiente. No cerrar, reasignar ni aprobar el trabajo de otro integrante sin su revisión y el procedimiento del equipo. Si una credencial real se expuso, su rotación o revocación debe atenderse; eliminarla del texto o registrar una excepción no basta.

## Inventario observado y propuestas de actualización

Consulta de lectura a la API pública de GitHub el 2026-11-12. Volver a comprobar antes de publicar para no sobrescribir ediciones recientes. Los responsables de la base de conocimiento se distinguen de las cuentas asignadas; no se infiere identidad por el nombre de usuario.

| Registro canónico | Observación | Próxima acción |
|---|---|---|
| [#16 — T-02](https://github.com/11Axel11/Investigacion-SI/issues/16) | Abierto; describe objetivo, alcance y responsables, pero no tiene todos los campos del 7.5. El [PR #17](https://github.com/11Axel11/Investigacion-SI/pull/17) propone corrección. | Revisar y publicar [el borrador del mismo issue](borradores/issue-16-t02.md); no declarar corregido por tener un PR. |
| [#19 — T-11](https://github.com/11Axel11/Investigacion-SI/issues/19) | Abierto; descripción breve de filtros, sin todos los campos. Cuenta asignada: Dani-develop. El [PR #18](https://github.com/11Axel11/Investigacion-SI/pull/18) propone tratamiento. | Revisar y publicar [el borrador del mismo issue](borradores/issue-19-t11.md), conservando la asignación existente hasta que el equipo confirme la identidad. |
| [#3 — Prueba OIJ](https://github.com/11Axel11/Investigacion-SI/issues/3) | Tarea de verificación relacionada con T-07; sigue abierta. El [PR #5](https://github.com/11Axel11/Investigacion-SI/pull/5) ya se integró. | Que el responsable enlace la ejecución y versión comprobadas y decida el estado. No afirmar que el host permitido esté roto ni cerrar automáticamente una tarea por el título de un PR. |
| [#4 — SNIT](https://github.com/11Axel11/Investigacion-SI/issues/4) | Tarea de integración, no necesariamente hallazgo de seguridad. Sigue abierta pese al [PR #6](https://github.com/11Axel11/Investigacion-SI/pull/6) integrado. | Mantenerla como tarea; pedir evidencia de verificación al responsable antes de cerrarla. No convertir cada tarea en vulnerabilidad. |
| T-14, sin issue localizado en la consulta | Propuesta documentada y reproducción aislada; pendiente de ratificación y prueba con PostgreSQL. | Buscar duplicados y, si no existen, publicar [el borrador T-14](borradores/nuevo-t14.md) como pendiente de investigación. Agregar aquí su enlace real, nunca un número inventado. |

Este es un punto de partida, no un inventario exhaustivo de todas las amenazas. Los siguientes hallazgos deben agregarse al mismo registro de Issues, enlazando las excepciones o amenazas ya existentes en lugar de mantener estados divergentes en archivos nuevos.

## Uso del validador local

Desde la raíz `Investigacion-SI`, con Node.js 20 o superior:

```powershell
node --test scripts/hallazgos/validar.test.mjs
node scripts/hallazgos/validar.mjs docs/fases/07-operacion/borradores/issue-16-t02.md docs/fases/07-operacion/borradores/issue-19-t11.md docs/fases/07-operacion/borradores/nuevo-t14.md
```

No necesita npm install, Docker, tokens ni conexión a GitHub. Acepta rutas explícitas a archivos Markdown; no busca ni lee `.env`. No está conectado a CI y no se presenta como check obligatorio del repositorio.

| Salida | Significado |
|---|---|
| 0 | Estructura válida, no aprobación humana ni garantía de veracidad |
| 1 | Campos incompletos, estado inválido o evidencia estructural insuficiente |
| 2 | Comprobación no ejecutada por argumentos o lectura; no equivale a aprobación |

Comprueba campos, SHA, enlaces HTTPS, justificación mínima de severidad, relaciones y requisitos adicionales de estados sensibles. No comprueba contenido de enlaces ni identidad del aprobador, no realiza triaje, no verifica fechas vencidas contra el reloj ni demuestra correcciones. No sustituye Gitleaks: evitar incluir secretos depende también de la revisión y de los controles del proyecto.

La plantilla vacía **debe fallar** hasta completarse. Ejemplo de demostración controlada:

```powershell
node scripts/hallazgos/validar.mjs .github/ISSUE_TEMPLATE/hallazgo.md
$LASTEXITCODE
```

Se espera código 1. No se incluye ningún defecto en producción ni un secreto real para demostrarlo. Resultados en [evidencia 7.5](evidencias/7.5-registro-hallazgos.md).

## Publicación manual, sin push del agente

1. Subir esta rama y abrir un PR. Revisar los borradores con el responsable de cada hallazgo.
2. En GitHub abrir el issue #16, editar su descripción y usar el borrador correspondiente; preservar comentarios y asignaciones. Repetir con #19. No usar `New issue` para los que ya existen.
3. Buscar T-14 en los issues abiertos y cerrados; si no existe y se acuerda registrarlo, crear uno con el borrador como **Pendiente de investigación**. Si existe, actualizarlo en vez de duplicarlo.
4. Conservar en GitHub el historial de las ediciones y agregar enlaces a la evidencia de este PR. Registrar en la sección siguiente los enlaces reales una vez publicado, sin afirmar que ocurrió antes.
5. Solicitar revisión a otro integrante. Corregir las observaciones. Los PR correctivos deben enlazar el issue, pero su cierre depende de la nueva comprobación; un push de estos archivos no edita issues automáticamente.

La plantilla será visible en el formulario de nuevos issues al integrarse en la rama predeterminada; mientras esté solo en esta rama se puede copiar manualmente su estructura.

## Evidencia de publicación y revisión

| Acción | Estado | Evidencia |
|---|---|---|
| Publicar actualización del issue #16 | Pendiente | — |
| Publicar actualización del issue #19 | Pendiente | — |
| Registrar o enlazar T-14, sin duplicado | Pendiente | — |
| Verificar contenido publicado contra la plantilla | Pendiente | — |
| Revisión independiente del aporte 7.5 | Pendiente; revisor por asignar | — |

No completar estas filas por anticipado. El registro debe utilizarse realmente: plantilla, validador y borradores solos no satisfacen todo el 7.5.
