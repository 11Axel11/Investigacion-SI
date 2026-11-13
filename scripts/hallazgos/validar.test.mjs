import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validar, ejecutar } from './validar.mjs';

const sha = '05c1545aef6b6a0e8277fe014f4906e2d28d352e';
const valido = `## Origen
Revisión del importador TSE en planificación.
## Versión afectada
${sha}
## Descripción
Un fallo entre lotes puede dejar agregados parcialmente actualizados.
## Evidencia
https://github.com/11Axel11/Investigacion-SI/commit/${sha}
## Severidad y justificación
Media. Afecta la integridad y exige varios lotes y un fallo de persistencia.
## Responsable
Daniel; asignación propuesta, pendiente de ratificación.
## Estado
Pendiente de investigación
La mitigación aún no está implementada.
## Tratamiento
Revisar la propuesta de transacción global sin aceptar riesgos automáticamente.
## Relaciones
T-14, M-14.
## Comprobación posterior
Forzar un fallo en el segundo lote y comprobar que todos los datos permanecen intactos.
`;

test('acepta un registro completo con estado explícito', () => assert.deepEqual(validar(valido), []));
test('rechaza la ausencia de cada campo obligatorio', () => {
  for (const campo of ['Origen', 'Versión afectada', 'Descripción', 'Evidencia', 'Severidad y justificación', 'Responsable', 'Estado', 'Tratamiento', 'Relaciones', 'Comprobación posterior']) {
    const inicio = valido.indexOf(`## ${campo}\n`);
    const fin = valido.indexOf('\n## ', inicio + 1);
    const texto = valido.slice(0, inicio) + (fin === -1 ? '' : valido.slice(fin));
    assert.ok(validar(texto).some((error) => error.includes(campo)), campo);
  }
});
test('rechaza SHA abreviado y evidencia sin enlace', () => {
  assert.ok(validar(valido.replaceAll(sha, '05c1545')).some((e) => e.includes('SHA completo')));
  assert.ok(validar(valido.replace(/https:\/\/[^\n]+/, 'Sin evidencia')).some((e) => e.includes('Evidencia')));
});
test('rechaza campos vacíos, relleno y secciones duplicadas', () => {
  assert.ok(validar(valido.replace('Daniel; asignación propuesta, pendiente de ratificación.', 'Pendiente')).some((e) => e.includes('sin completar')));
  assert.ok(validar(`${valido}\n## Origen\nOtro origen`).some((e) => e.includes('duplicada')));
});
test('rechaza estado inventado y severidad sin justificación', () => {
  assert.ok(validar(valido.replace('\nPendiente de investigación\n', '\nListo\n')).some((e) => e.includes('Estado inválido')));
  assert.ok(validar(valido.replace(/Media\. Afecta[^\n]+/, 'Alta')).some((e) => e.includes('justificación')));
});
test('no confunde encabezados de ejemplos de código con campos', () => {
  assert.ok(validar(`\`\`\`markdown\n${valido}\n\`\`\``).some((e) => e.includes('Falta contenido')));
  assert.deepEqual(validar(valido.replaceAll('\n', '\r\n')), []);
});
test('corregido exige versión y ejecución de comprobación', () => {
  const corregido = valido.replace('\nPendiente de investigación\n', '\nCorregido\n');
  assert.ok(validar(corregido).some((e) => e.includes('Corregido requiere')));
  assert.deepEqual(validar(`${corregido}\nVersión ${sha}; https://github.com/11Axel11/Investigacion-SI/actions/runs/43141820064`), []);
});
test('falso positivo exige evidencia, no solo la declaración', () => {
  const texto = valido.replace('\nPendiente de investigación\n', '\nFalso positivo\n');
  assert.ok(validar(texto).some((e) => e.includes('Falso positivo requiere')));
  assert.deepEqual(validar(`${texto}\nhttps://github.com/11Axel11/Investigacion-SI/commit/${sha}`), []);
});
test('riesgo aceptado exige decisión humana enlazada y fecha real', () => {
  const aceptado = valido.replace('\nPendiente de investigación\n', '\nRiesgo aceptado temporalmente\n');
  assert.ok(validar(aceptado).some((e) => e.includes('Aprobación humana')));
  const decision = `${aceptado}\n## Aprobación humana\nEjemplo ficticio: https://github.com/ejemplo/pruebas/issues/1\n## Vencimiento o revisión\n2026-12-31`;
  assert.deepEqual(validar(decision), []);
  assert.ok(validar(decision.replace('2026-12-31', '2026-02-30')).some((e) => e.includes('fecha válida')));
});
test('CLI distingue estructura inválida de comprobación no ejecutada', () => {
  const salida = { log() {}, error() {} };
  assert.equal(ejecutar([], salida), 2);
  assert.equal(ejecutar(['--help'], salida), 0);
  assert.equal(ejecutar(['archivo-inexistente-7-5.md'], salida), 2);
  assert.equal(ejecutar(['.env'], salida), 2); // Se rechaza antes de leer.
  const plantilla = new URL('../../.github/ISSUE_TEMPLATE/hallazgo.md', import.meta.url);
  assert.ok(validar(readFileSync(plantilla, 'utf8')).length > 0);
  assert.equal(ejecutar(['.github/ISSUE_TEMPLATE/hallazgo.md'], salida), 1);
});
