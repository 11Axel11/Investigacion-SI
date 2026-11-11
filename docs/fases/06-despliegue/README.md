# Fase 6: Despliegue

**Objetivo.** Despliegue automático y reproducible hacia un ambiente de pruebas, usando la versión aprobada y una configuración segura; comprobar el funcionamiento y demostrar la recuperación de una versión anterior.

**Dónde se ejecuta:** GitHub Actions y VPS. **Plataforma decidida ([Q-09](../01-planificacion/kb/preguntas-abiertas.md#q-09)):** un VPS con Docker Compose y Caddy (HTTPS automático).

## Qué se espera (ítems)

| Ítem | Qué se espera |
|---|---|
| 6.1 | Despliegue de frontend y backend con Actions; la fusión en `development` lo inicia, pero solo si el commit y sus artefactos cumplen las condiciones; sin reconstruir artefactos |
| 6.2 | Documentar plataforma, componentes, servicios e instrucciones para reproducir; configuración versionada sin secretos |
| 6.3 | Verificar identidad y configuración: imágenes por digest aprobado, HTTPS, permisos mínimos, solo los servicios necesarios expuestos; BD y servicios internos no públicos |
| 6.4 | Credenciales: secretos protegidos del pipeline y gestor de secretos para la app; documentar quién accede y cómo se reemplazan; ningún valor en Git, imágenes, artefactos, logs, prompts ni código del navegador |
| 6.5 | Health checks, smoke tests y E2E de los flujos críticos; reutilizar DAST acotado y pruebas de autorización contra el destino; cuentas y datos exclusivos de prueba |
| 6.6 | Procedimiento de recuperación implementado y demostrado: el workflow reporta el fallo y permite reversión automática o acción manual documentada; repetir comprobaciones básicas |

## Criterio de cierre

Se despliega la versión aprobada, se verifica su identidad y funcionamiento, se detecta un fallo y se demuestra la recuperación, con evidencia del workflow, las comprobaciones y la reversión.

## Puntos de la fase 1 que aplican

- Solo Caddy expone 80 y 443; la BD no se publica ([arquitectura.md](../01-planificacion/kb/arquitectura.md)).
- `synchronize: true` de TypeORM no se usa en un ambiente desplegado: hacen falta migraciones ([T-09](../01-planificacion/kb/amenazas.md#t-09)).
- `ADMIN_API_KEY` (S-02) y `DATABASE_URL` (S-01) deben llegar por el gestor de secretos; nunca `NEXT_PUBLIC_*` ([T-13](../01-planificacion/kb/amenazas.md#t-13)).
- CORS y `helmet` con configuración explícita ([T-09](../01-planificacion/kb/amenazas.md#t-09)).
