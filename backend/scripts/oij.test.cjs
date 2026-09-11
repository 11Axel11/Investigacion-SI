const test = require('node:test');
const assert = require('node:assert/strict');
const { aggregateCsv } = require('../dist/oij/oij.parser');
const line = (crime, date, province, canton) => `${crime},MODALIDAD,${date},PERSONA,PEATON,Mayor de edad,,COSTA RICA,${province},${canton},DISTRITO`;
test('agrupa sin perder la primera fila y respeta comillas CSV', () => {
  const csv = [line('ROBO', '2026-01-01', 'SAN JOSE', 'SAN JOSE'), line('ROBO', '2026-01-02', 'SAN JOSE', 'SAN JOSE'), line('"HURTO, OTRO"', '2026-02-03', 'HEREDIA', 'BELEN')].join('\r\n');
  const result = aggregateCsv(Buffer.from(csv), 2026);
  assert.equal(result.total, 3);
  assert.equal(result.groups.length, 2);
  assert.equal(result.groups[0].count, 2);
  assert.equal(result.groups[1].crime, 'HURTO, OTRO');
  assert.equal(result.firstDate, '2026-01-01');
  assert.equal(result.lastDate, '2026-02-03');
  assert.deepEqual(Object.keys(result.groups[0]).sort(), ['canton', 'count', 'crime', 'month', 'province']);
});
test('reconoce codificación Windows-1252', () => {
  const result = aggregateCsv(Buffer.from(line('HURTO', '2026-01-01', 'SAN JOSÉ', 'SARCHÍ'), 'latin1'), 2026);
  assert.equal(result.groups[0].canton, 'SARCHÍ');
});
test('rechaza vacíos, años distintos, columnas y fechas inválidas', () => {
  for (const csv of ['', 'DELITO,FECHA', line('ROBO', '2025-01-01', 'SAN JOSE', 'SAN JOSE'), line('ROBO', '2026-02-30', 'SAN JOSE', 'SAN JOSE')]) assert.throws(() => aggregateCsv(Buffer.from(csv), 2026));
});

test('repara nacionalidad histórica con coma sin desplazar el territorio', () => {
  const csv = 'HURTO,POR CONFIANZA,2025-02-17,VIVIENDA,NO APLICA [VIVIENDA],Mayor de edad,,VIRGENES BRITANICAS,ISLAS,ALAJUELA,ALAJUELA,ALAJUELA';
  const result = aggregateCsv(Buffer.from(csv), 2025);
  assert.equal(result.total, 1);
  assert.equal(result.groups[0].province, 'ALAJUELA');
  assert.equal(result.groups[0].canton, 'ALAJUELA');
  assert.throws(() => aggregateCsv(Buffer.from(csv.replace(',ISLAS,', ',EXTRA_INVALIDA,')), 2025));
});
test('informa CSV malformado como error de datos y no de conexión', () => {
  assert.throws(() => aggregateCsv(Buffer.from('"sin cierre'), 2025), error => error.getStatus() === 400);
});
test('repara VATICANO,CIUDAD DEL conservando el cantón', () => {
  const csv = 'ROBO DE VEHICULO,COCHERAZO,2025-10-01,VEHICULO,RURAL 4X4 [VEHICULO],Desconocido,,VATICANO,CIUDAD DEL,PUNTARENAS,OSA,CORTES';
  const result = aggregateCsv(Buffer.from(csv), 2025);
  assert.equal(result.groups[0].province, 'PUNTARENAS');
  assert.equal(result.groups[0].canton, 'OSA');
});
