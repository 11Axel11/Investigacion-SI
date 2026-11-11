# Revisión de medidas y nueva amenaza propuesta (1.4 y 1.8)

**Fecha:** 2026-11-11. **Código base revisado:** `cdc70e6`. Revisión técnica asistida por IA a solicitud de Daniel; no es una aprobación ni una revisión cruzada humana. Los revisores mantienen sus estados pendientes en [responsables.md](../kb/responsables.md).

## Alcance y correcciones

Se contrastaron las medidas con los servicios TSE, OIJ y OSM, el arranque de NestJS, los manifiestos y la base de conocimiento. No se modificó la aplicación, no se consultaron secretos y no se descargaron datos personales ni se usó una BD real.

| ID / documento | Hallazgo | Corrección |
|---|---|---|
| T-01 / M-01 | La comprobación aceptaba 401 o 403, aunque Q-01 y los criterios aprobados especifican 401 | Alinear Markdown y Threat Dragon con 401; no cambiar la regla aprobada |
| T-02 | Se afirmaba que había más de cien cantones | La lista `LOCATIONS` de `osm.service.ts` contiene 84 cantones en 7 provincias; hay 22 categorías |
| T-05 / M-05 | El hash podía interpretarse como prueba de autenticidad del archivo | Aclarar que permite identificar el archivo y compararlo con una copia de procedencia conocida, pero no autentica al TSE como emisor |
| T-07 / M-07, arquitectura y terceros | Se generalizaban a todo el OIJ los controles de la descarga del CSV | Distinguir el CSV (host permitido, sin redirecciones, 40 MB y 60 s) del catálogo (timeout de 20 s, sin esos límites explícitos) |
| T-09 / M-09 | La comprobación de CORS y la referencia a DAST podían sugerir protección de la escritura o cobertura de las migraciones | Aclarar los límites de CORS, separar autorización y requerir comprobación específica de migraciones; DAST solo si se selecciona y ejecuta |
| AGENTS.md | La regla de cabecera de administración podía confundirse con una protección ya implementada | Indicar que es una regla aprobada y consultar el estado de T-01; exigir comprobar código y pruebas antes de afirmar que está protegido |
| Modelo Threat Dragon | El operador seguía descrito como rol propuesto, aunque Q-01 y Q-02 ya están resueltas | Describirlo como aprobado, pendiente de implementación |
| T-14 / M-14 | El TSE escribe lotes independientes sin una transacción que abarque toda la importación | Incorporar amenaza y mitigación **propuestas**, con prioridad justificada y comprobación de rollback prevista; no declarar implementada la mitigación |

## Reproducción aislada de T-14

Se ejecuta únicamente el bucle de persistencia extraído del servicio vigente con un repositorio simulado en memoria y 501 distritos ficticios. El segundo `upsert` falla antes de escribir. La extracción exige que el bucle coincida exactamente con el revisado; si cambia, el procedimiento se detiene y debe revisarse. No sustituye una prueba de `importZip`, de un ZIP real ni de transacciones PostgreSQL.

Desde la raíz `Investigacion-SI`, ejecutar este JavaScript con Node.js (solo módulos incorporados, sin instalar paquetes):

```javascript
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

async function main() {
  const source = readFileSync('backend/src/tse/tse.service.ts', 'utf8');
  const match = source.match(/    for \(let offset = 0; offset < rows.length; offset \+= 500\) \{\r?\n      await this\.summaries\.upsert\(rows\.slice\(offset, offset \+ 500\), \['electoralCode'\]\);\r?\n    \}/);
  assert.ok(match, 'El bucle cambió: revisar la reproducción antes de ejecutarla.');
  const rows = Array.from({ length: 501 }, (_, index) => ({
    electoralCode: String(100000 + index),
    electors: 2,
    sourceDate: '2026-11-11',
  }));
  const stored = new Map(rows.map((row) => [row.electoralCode, {
    ...row, electors: 1, sourceDate: '2026-11-01',
  }]));
  let calls = 0;
  const subject = {
    summaries: {
      async upsert(batch) {
        calls += 1;
        if (calls === 2) throw new Error('Fallo controlado del segundo lote');
        for (const row of batch) stored.set(row.electoralCode, { ...row });
      },
    },
  };
  const execution = vm.runInNewContext(
    `(async function () { ${match[0]} }).call(subject)`,
    { rows, subject },
    { timeout: 1000 },
  );
  await assert.rejects(execution, /Fallo controlado del segundo lote/);
  const updated = [...stored.values()].filter((row) => row.sourceDate === '2026-11-11').length;
  const previous = [...stored.values()].filter((row) => row.sourceDate === '2026-11-01').length;
  assert.equal(calls, 2);
  assert.equal(updated, 500);
  assert.equal(previous, 1);
  console.log(JSON.stringify({ lotesIntentados: calls, distritosActualizados: updated, distritosAnteriores: previous }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
```

Para ejecutarlo en PowerShell sin crear un archivo adicional:

```powershell
$revision = Get-Content 'docs/fases/01-planificacion/evidencias/revision-medidas.md' -Raw -Encoding UTF8
$codigo = [regex]::Match($revision, '(?s)```javascript\r?\n(.*?)\r?\n```').Groups[1].Value
$codigo | node -
```

**Resultado observado con Node.js v22.14.0:**

```json
{"lotesIntentados":2,"distritosActualizados":500,"distritosAnteriores":1}
```

Las aserciones confirman el comportamiento inseguro del bucle actual. Que esta reproducción termine con código 0 **no significa que el importador sea seguro**. La prueba de la medida M-14 deberá exigir cero cambios tras un fallo y ejecutarse contra PostgreSQL aislado.

## Comprobaciones y pendientes

- Sintaxis JSON, 21 elementos, 15 entradas y 14 IDs de amenaza; T-07 aparece dos veces.
- Correspondencia entre los IDs de `amenazas.md`, el modelo y la tabla de responsables.
- Numeración interna de amenazas sin duplicados y `threatTop: 16`, disponible para la siguiente entrada del modelo.
- Recuento de provincias, cantones y categorías a partir de las listas del código.
- Enlaces locales de los documentos editados comprobados sin destinos ausentes.
- `git diff --check` para comprobar formato del diff.
- No se ejecutaron compilaciones, suites de la aplicación, escáneres ni una prueba de integración con PostgreSQL; solo cambió documentación y el modelo.
- Pendientes: reimportar el JSON en Threat Dragon, revisión humana, ratificar T-14 y crear su entrada en el registro único de GitHub Issues. No se inventan enlaces a PR, issues ni evidencias externas.

## Propuesta para el PR

**Título:** `docs: revisar medidas de seguridad y proponer T-14 en importación TSE`

**IDs afectados:** T-01/M-01, T-02, T-05/M-05, T-07/M-07, T-09/M-09 y T-14/M-14; instrucciones de AGENTS.md (1.8). Los cambios de los ítems 1.4 y 1.8 requieren revisión de Axel y Frander, respectivamente. No se marca ninguna aprobación en nombre de ellos.
