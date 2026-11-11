// Compuerta de OSV-Scanner (ítem 3.2). Lee el JSON de `osv-scanner scan source --format json` y decide
// qué hallazgos BLOQUEAN la integración. Política (T-12, M-13):
//   - Bloquea todo aviso con gravedad CVSS >= 7.0 (alta o crítica) que no tenga una excepción vigente.
//   - Los avisos < 7.0 se informan, no bloquean (se corrigen con las actualizaciones de Renovate).
//   - Una excepción vive en `osv-excepciones.json`, con motivo, decisión (Q-nn) y fecha de vencimiento.
//     Al vencer deja de proteger y el aviso vuelve a bloquear. Una excepción sin motivo o sin fecha se rechaza.
//   - Un JSON ausente o ilegible es un análisis INCOMPLETO (código 2), nunca aprobado.
// Códigos de salida: 0 sin bloqueos · 1 hay bloqueos · 2 análisis incompleto o configuración inválida.
// Uso: node scripts/ci/osv-gate.mjs <osv.json> [osv-excepciones.json]
import { readFileSync, existsSync } from 'node:fs';

const [, , reportPath, exceptionsPath = 'osv-excepciones.json'] = process.argv;
const UMBRAL = Number(process.env.OSV_UMBRAL ?? 7.0);
const HOY = process.env.OSV_FECHA ?? new Date().toISOString().slice(0, 10);

const incompleto = (mensaje) => {
  console.error(`OSV: análisis INCOMPLETO, no se da por aprobado. ${mensaje}`);
  process.exit(2);
};

if (!reportPath || !existsSync(reportPath)) incompleto('No existe el reporte JSON de osv-scanner.');
let report;
try {
  report = JSON.parse(readFileSync(reportPath, 'utf8'));
} catch (error) {
  incompleto(`El reporte no es JSON válido (${error.message}).`);
}
if (!Array.isArray(report.results)) incompleto('El reporte no tiene la lista "results".');

let exceptions = [];
if (existsSync(exceptionsPath)) {
  try {
    exceptions = JSON.parse(readFileSync(exceptionsPath, 'utf8')).excepciones ?? [];
  } catch (error) {
    incompleto(`No se pudo leer ${exceptionsPath} (${error.message}).`);
  }
}
const invalidas = exceptions.filter((e) => !e.id || !e.motivo || !e.decision || !/^\d{4}-\d{2}-\d{2}$/.test(e.hasta ?? ''));
if (invalidas.length > 0) incompleto(`Excepciones sin id, motivo, decisión o fecha AAAA-MM-DD: ${invalidas.map((e) => e.id ?? '?').join(', ')}.`);

const vigentes = new Map(exceptions.filter((e) => e.hasta >= HOY).map((e) => [e.id, e]));
const vencidas = exceptions.filter((e) => e.hasta < HOY);

const bloqueantes = [];
const informados = [];
const exceptuados = [];
for (const result of report.results) {
  const archivo = String(result.source?.path ?? '?').split('/').slice(-2).join('/');
  for (const pkg of result.packages ?? []) {
    for (const group of pkg.groups ?? []) {
      const gravedad = Number(group.max_severity ?? 0);
      const ids = [...new Set([...(group.ids ?? []), ...(group.aliases ?? [])])];
      const fila = { archivo, paquete: `${pkg.package.name}@${pkg.package.version}`, id: group.ids?.[0] ?? '?', gravedad };
      const excepcion = ids.map((id) => vigentes.get(id)).find(Boolean);
      if (gravedad < UMBRAL) informados.push(fila);
      else if (excepcion) exceptuados.push({ ...fila, hasta: excepcion.hasta, decision: excepcion.decision });
      else bloqueantes.push(fila);
    }
  }
}

const imprimir = (titulo, filas) => {
  console.log(`\n${titulo} (${filas.length})`);
  for (const f of filas) console.log(`  ${f.gravedad.toFixed(1).padStart(4)}  ${f.id.padEnd(22)} ${f.paquete}  [${f.archivo}]${f.hasta ? `  excepción hasta ${f.hasta} (${f.decision})` : ''}`);
};
console.log(`OSV-Scanner · umbral de bloqueo: CVSS >= ${UMBRAL} · fecha: ${HOY}`);
imprimir('BLOQUEAN', bloqueantes);
imprimir('Exceptuados (vigentes)', exceptuados);
imprimir('Informativos (< umbral, no bloquean)', informados);
if (vencidas.length > 0) console.log(`\nExcepciones VENCIDAS (ya no protegen): ${vencidas.map((e) => `${e.id} (${e.hasta})`).join(', ')}`);

if (bloqueantes.length > 0) {
  console.error(`\nBLOQUEADO: ${bloqueantes.length} aviso(s) de gravedad alta o crítica sin excepción vigente.`);
  process.exit(1);
}
console.log('\nOSV: sin bloqueos.');
