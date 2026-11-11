// Compuerta del DAST (ítem 4.7). Lee el informe JSON de ZAP y decide:
//   0 = sin alertas de riesgo ALTO · 1 = hay alertas ALTO (bloquea) · 2 = el informe no existe o no se pudo leer (INCOMPLETO).
// Las alertas MEDIO/BAJO se listan en el resumen y se triajan a mano; no bloquean.
import { existsSync, readFileSync } from 'node:fs';

const ruta = process.argv[2];
if (!ruta || !existsSync(ruta)) { console.error('INCOMPLETO: no existe el informe de ZAP.'); process.exit(2); }
let informe;
try { informe = JSON.parse(readFileSync(ruta, 'utf8')); } catch { console.error('INCOMPLETO: el informe de ZAP no es JSON válido.'); process.exit(2); }

const sitios = informe.site ?? [];
if (!sitios.length) { console.error('INCOMPLETO: ZAP no analizó ningún sitio.'); process.exit(2); }
const nivel = { 3: 'ALTO', 2: 'MEDIO', 1: 'BAJO', 0: 'INFORMATIVO' };
const alertas = sitios.flatMap((sitio) => (sitio.alerts ?? []).map((a) => ({
  sitio: sitio['@name'], riesgo: Number(a.riskcode), nombre: a.name, instancias: Number(a.count ?? (a.instances ?? []).length),
})));
for (const riesgo of [3, 2, 1, 0]) {
  const lista = alertas.filter((a) => a.riesgo === riesgo);
  console.log(`${nivel[riesgo]}: ${lista.length}`);
  for (const a of lista) console.log(`  - [${a.sitio}] ${a.nombre} (${a.instancias} instancia(s))`);
}
const altas = alertas.filter((a) => a.riesgo >= 3);
if (altas.length) { console.error(`BLOQUEA: ${altas.length} alerta(s) de riesgo ALTO.`); process.exit(1); }
console.log('Sin alertas de riesgo ALTO.');
