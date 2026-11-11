# Fase 3: pendientes del administrador (Axel)

Lo que falta para cerrar la fase 3 y que solo puede hacer quien tiene permiso **ADMIN** sobre `11Axel11/Investigacion-SI` (la cuenta `FranderCT` tiene WRITE y el agente no debe hacerlo: [AGENTS.md](../../../AGENTS.md)). Estado al 2026-11-11.

## 1. Proteger `main` y fijar permisos de Actions (ítem 3.5, [Q-13](../01-planificacion/kb/preguntas-abiertas.md#q-13))

Decisión ya tomada: trabajar solo con `main`, PR obligatorio, check `resultado` obligatorio, 0 aprobaciones y administradores exentos.

- [ ] Ver primero qué hará (no cambia nada): `scripts/ci/proteger-ramas.sh`
- [ ] Aplicar: `APROBACIONES=0 ENFORCE_ADMINS=false scripts/ci/proteger-ramas.sh --aplicar`
  - Protege `main` (sin force push ni borrado, ramas al día, conversaciones resueltas) y deja los permisos de Actions por defecto en solo lectura y sin poder aprobar PR.
  - Alternativa a mano: *Settings → Branches* y *Settings → Actions → General → Workflow permissions*.
- [ ] Comprobar: `gh api repos/11Axel11/Investigacion-SI/branches/main/protection` responde con el check `resultado` y `gh api repos/11Axel11/Investigacion-SI/actions/permissions/workflow` muestra `default_workflow_permissions: read`.
- [ ] Guardar la captura de la regla de protección en [evidencias/3.5-proteccion-ramas.md](evidencias/3.5-proteccion-ramas.md).

**Deuda:** cuando haya otro integrante disponible, subir a `APROBACIONES=1 ENFORCE_ADMINS=true` y volver a aplicar.

## 2. Probar que el bloqueo de fusión funciona (ítem 3.6)

Solo se puede hacer después del punto 1. Hoy está demostrado el check en rojo y luego en verde (PR #12), pero no que GitHub impida fusionar.

- [ ] Abrir un PR de prueba con un fallo deliberado (por ejemplo una prueba que falle) y comprobar que el botón de fusionar queda **bloqueado** con el check `resultado` en rojo.
- [ ] Corregirlo, ver el check en verde y fusionar.
- [ ] Anotar el enlace a ambos PR y una captura en [evidencias/3.6-bloqueo-demostrado.md](evidencias/3.6-bloqueo-demostrado.md).

## 3. Instalar Renovate

- [ ] Instalar la aplicación Renovate en `11Axel11/Investigacion-SI` (*GitHub Marketplace → Renovate → Install*, solo este repositorio). La configuración ya está en `renovate.json` ([T-12](../01-planificacion/kb/amenazas.md#t-12), M-12 y M-13).
- [ ] Verificar que abre el PR de incorporación (*Configure Renovate*) y que ese PR pasa el check `resultado`.

## 4. Decidir Q-12: excepciones de OSV-Scanner ([Q-12](../01-planificacion/kb/preguntas-abiertas.md#q-12))

Decisión humana; el agente no puede agregar excepciones ni cambiar el umbral. Responsable propuesto: Daniel; revisor: Pablo.

- [ ] Decidir si el umbral de bloqueo es CVSS ≥ 7.0 (propuesto).
- [ ] Decidir si se aceptan las 4 excepciones de `osv-excepciones.json` hasta 2026-12-31: `glob@10.4.5`, `picomatch@4.0.1`, `tmp@0.0.33` (solo desarrollo, vía `@nestjs/cli`) y `uuid@9.0.1` (producción, no alcanzable).
- [ ] Definir quién las revisa al vencer.
- [ ] Registrar la decisión en Q-12 (estado «decidida»).

## 5. Revisión humana diferida ([Q-11](../01-planificacion/kb/preguntas-abiertas.md#q-11))

- [ ] Asignar a una persona distinta de quien escribió los cambios para revisar scripts, reglas y permisos del agente.
- [ ] Validar las observaciones de la revisión de IA de [3.7](evidencias/3.7-revision-ia.md).

## 6. Secretos y proveedor de IA

- [x] Rotar `DEEPSEEK_API_KEY` (hecho el 2026-11-11 por Frander: clave nueva verificada y clave de la prueba revocada).
- [ ] Revisar la política de datos de DeepSeek (TP-12 en [terceros-secretos.md](../01-planificacion/kb/terceros-secretos.md)).
- [ ] Poner un límite de gasto en la consola del proveedor (recomendado en S-05).
- [ ] Confirmar que quien administra el repo es el responsable del secreto y puede rotarlo (*Settings → Secrets and variables → Actions*).

## Criterio de cierre de la fase 3

Un PR bloqueado por un fallo, su corrección y su integración posterior, con los resultados y artefactos del commit fusionado identificados. Los puntos 1 y 2 lo cumplen.
