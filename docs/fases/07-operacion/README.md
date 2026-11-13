# Fase 7: Operación y mejora continua

**Objetivo.** Observar la aplicación desplegada, detectar problemas de calidad y señales de seguridad, investigar con apoyo de IA y dar seguimiento a las correcciones. Se demuestra cómo un hallazgo se convierte en una mejora verificable.

**Dónde se ejecuta:** VPS (Grafana, Prometheus, Loki, Tempo en el mismo Compose; [Q-09](../01-planificacion/kb/preguntas-abiertas.md#q-09)) y GitHub (Issues, Renovate).

## Qué se espera (ítems)

| Ítem | Qué se espera |
|---|---|
| 7.1 | Observabilidad de un flujo crítico: Grafana OSS, Prometheus, Loki, OpenTelemetry + Tempo; dashboard de tráfico, errores y latencia; relacionar logs y trazas de una solicitud por identificador de correlación |
| 7.2 | Eventos de seguridad sin datos sensibles (accesos denegados, cambios de privilegio si existen); identifican operación, resultado y actor; definir quién los consulta y cuánto se conservan. Decidido: 90 días y solo operador y responsable de operación ([Q-03](../01-planificacion/kb/preguntas-abiertas.md#q-03), [T-08](../01-planificacion/kb/amenazas.md#t-08)) |
| 7.3 | Una alerta de calidad (p. ej. errores de la API) y una de seguridad (p. ej. accesos denegados repetidos), con umbral, ventana, destinatario y respuesta; demostrar activación, notificación y retorno a la normalidad |
| 7.4 | IA apoya la investigación de una alerta con logs sanitizados: resumen, hipótesis y qué comprobar; una persona contrasta y registra la decisión; la IA no cambia permisos ni bloquea usuarios |
| 7.5 | Registro único de hallazgos (GitHub Issues o DefectDojo): origen, versión, evidencia, severidad, responsable, estado y tratamiento; enlaza amenazas y excepciones por ID |
| 7.6 | Renovate con un PR real sujeto a los mismos controles; reescaneos programados de dependencias y de la imagen desplegada por digest, que generan o actualizan hallazgos |
| 7.7 | Seguir un hallazgo hasta su cierre: PR correctivo y nueva comprobación; si el riesgo se acepta, justificación, responsable y fecha de revisión |
| 7.8 | Incorporar un aprendizaje al siguiente ciclo: actualizar un requisito, medida, instrucción del agente o prueba de regresión, explicando qué se aprendió |

## Criterio de cierre

Se investiga una solicitud mediante su telemetría, se demuestran las dos alertas, se valida un análisis asistido por IA y se sigue un hallazgo hasta su corrección comprobada. La mejora queda en la base de conocimiento o en las verificaciones.

## Nota

El registro único (7.5) se necesita desde la fase 1: es donde viven las tareas derivadas listadas en [responsables.md](../01-planificacion/kb/responsables.md#trabajo-derivado-de-las-decisiones-fuera-de-la-fase-1).

## Avance del ítem 7.5

Daniel preparó la [guía del registro único](registro-hallazgos.md), plantilla de issues, validador local con pruebas y borradores para completar los registros existentes. La fuente canónica sigue siendo GitHub Issues. Publicó [T-14 en el issue #27](https://github.com/11Axel11/Investigacion-SI/issues/27); el cuerpo publicado pasó la validación estructural el 2026-11-13. [Evidencia técnica y de publicación](evidencias/7.5-registro-hallazgos.md). **Pendientes:** coordinar mejoras de los registros existentes y revisión humana; no se declaran hallazgos cerrados ni el ítem terminado. El resto de esta etapa no se considera implementado por este aporte.
