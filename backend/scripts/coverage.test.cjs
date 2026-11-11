// Pruebas unitarias de las reglas de negocio de /coverage (ítem 4.2). Ejecutar con `npm run test:coverage`.
// Repositorios simulados y datos inventados: no tocan BD ni red. La cobertura de código solo señala áreas sin
// explorar; lo que se verifica aquí son las reglas (T-10, COV-AC1) con errores y valores límite.
const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { BadRequestException } = require('@nestjs/common');
const { CoverageService } = require('../dist/coverage/coverage.service');

const anio = new Date().getFullYear();
const cadena = (filas) => {
  const qb = {};
  for (const metodo of ['select', 'addSelect', 'where', 'groupBy', 'addGroupBy', 'orderBy']) qb[metodo] = () => qb;
  qb.getRawMany = async () => filas;
  qb.getMany = async () => [];
  return qb;
};
/** tse: [{province, canton, electors, pollingStations, districts}] · osm: [{province, canton, category, total}] */
function servicio({ tse = [], osm = [], grupos } = {}) {
  const repoTse = { createQueryBuilder: () => cadena(tse) };
  const repoOsm = { createQueryBuilder: () => cadena(osm) };
  const repoOij = { findOneBy: async ({ year }) => (grupos && year === anio ? { year, groups: grupos } : null) };
  return new CoverageService(repoTse, repoOsm, repoOij);
}
const t = (province, canton, electors, pollingStations = 1, districts = 1) => ({ province, canton, electors: String(electors), pollingStations: String(pollingStations), districts: String(districts) });
const o = (province, canton, category, total) => ({ province, canton, category, total: String(total) });
const g = (province, canton, crime, targetType, count) => ({ province, canton, district: 'D', crime, modality: 'M', targetCategory: 'EDIFICACION', targetType, month: `${anio}-01`, count });

// ---------- cobertura de salud
test('salud: electores por punto de salud se redondea y el cantón sin puntos queda en déficit', async () => {
  const filas = await servicio({
    tse: [t('SAN JOSE', 'SAN JOSE', 1001), t('ALAJUELA', 'ALAJUELA', 500)],
    osm: [o('San José', 'San José', 'hospital', 1), o('San José', 'San José', 'pharmacy', 2)],
  }).healthCoverage();
  const sanJose = filas.find((f) => f.province === 'SAN JOSE');
  assert.equal(sanJose.healthPoints, 3);
  assert.equal(sanJose.electorsPerHealthPoint, 334); // 1001 / 3 = 333,67
  const alajuela = filas.find((f) => f.province === 'ALAJUELA');
  assert.equal(alajuela.deficit, true);
  assert.equal(alajuela.electorsPerHealthPoint, null);
  assert.equal(alajuela.osmSynced, false);
  assert.equal(filas[0].province, 'ALAJUELA', 'el déficit (sin punto) va primero');
});

test('cruce de fuentes: "CENTRAL" del TSE equivale al cantón cabecera y las tildes no impiden cruzar', async () => {
  const filas = await servicio({ tse: [t('SAN JOSE', 'CENTRAL', 100)], osm: [o('San José', 'San José', 'hospital', 1)] }).healthCoverage();
  assert.equal(filas[0].canton, 'SAN JOSE');
  assert.equal(filas[0].hospitals, 1);
});

test('cruce de fuentes: los alias conocidos (León Cortés, Vázquez de Coronado) cruzan entre TSE, OSM y OIJ', async () => {
  const filas = await servicio({
    tse: [t('SAN JOSE', 'LEON CORTES CASTRO', 100), t('SAN JOSE', 'VAZQUEZ DE CORONADO', 100)],
    osm: [o('San José', 'León Cortés', 'hospital', 1)],
    grupos: [g('SAN JOSE', 'VASQUEZ DE CORONADO', 'ROBO', 'BANCO', 7)],
  }).crimeRate();
  assert.equal(filas.find((f) => f.canton === 'VAZQUEZ DE CORONADO').crimes, 7);
  assert.equal((await servicio({ tse: [t('SAN JOSE', 'LEON CORTES CASTRO', 100)], osm: [o('San José', 'León Cortés', 'hospital', 1)] }).healthCoverage())[0].hospitals, 1);
});

test('filtros: provincia y cantón no distinguen mayúsculas ni tildes y un valor inexistente da lista vacía', async () => {
  const s = servicio({ tse: [t('SAN JOSE', 'ESCAZU', 100), t('ALAJUELA', 'GRECIA', 100)] });
  assert.equal((await s.healthCoverage('san josé')).length, 1);
  assert.equal((await s.healthCoverage('SAN JOSE', 'Escazú')).length, 1);
  assert.deepEqual(await s.healthCoverage('NO EXISTE'), []);
});

// ---------- tasa de delitos
test('delitos: tasa por 1000 electores con dos decimales; con 0 electores no se divide', async () => {
  const filas = await servicio({
    tse: [t('SAN JOSE', 'SAN JOSE', 3000), t('ALAJUELA', 'ALAJUELA', 0)],
    grupos: [g('SAN JOSE', 'SAN JOSE', 'ROBO', 'FARMACIA', 10), g('ALAJUELA', 'ALAJUELA', 'ROBO', 'FARMACIA', 5)],
  }).crimeRate();
  assert.equal(filas.find((f) => f.province === 'SAN JOSE').crimeRatePer1000Electors, 3.33);
  assert.equal(filas.find((f) => f.province === 'ALAJUELA').crimeRatePer1000Electors, null);
});

test('delitos: el año se valida (límites 2015 y el año actual) y sin datos del OIJ se marca oijSynced=false', async () => {
  const s = servicio({ tse: [t('SAN JOSE', 'SAN JOSE', 100)] });
  for (const year of ['2014', String(anio + 1), '2020.5', 'abc', '']) {
    // "" cae al año actual (valor por defecto); el resto debe rechazarse
    if (year === '') continue;
    await assert.rejects(() => s.crimeRate(undefined, undefined, year), BadRequestException, year);
  }
  for (const year of ['2015', String(anio)]) assert.equal((await s.crimeRate(undefined, undefined, year)).length, 1, `${year} es válido`);
  assert.equal((await s.crimeRate())[0].oijSynced, false);
});

test('delitos: el tipo de negocio filtra sin distinguir mayúsculas ni tildes', async () => {
  const filas = await servicio({
    tse: [t('SAN JOSE', 'SAN JOSE', 1000)],
    grupos: [g('SAN JOSE', 'SAN JOSE', 'ROBO', 'FARMACIA', 4), g('SAN JOSE', 'SAN JOSE', 'ROBO', 'BANCO', 9)],
  }).crimeRate(undefined, undefined, undefined, 'farmácia');
  assert.equal(filas[0].crimes, 4);
});

test('tipos de negocio: solo EDIFICACION y sin DESCONOCIDO, ordenados', async () => {
  const grupos = [g('A', 'A', 'ROBO', 'FARMACIA', 1), g('A', 'A', 'ROBO', 'BANCO', 1), g('A', 'A', 'ROBO', 'DESCONOCIDO', 1), { ...g('A', 'A', 'ROBO', 'PEATON', 1), targetCategory: 'PERSONA' }];
  assert.deepEqual(await servicio({ grupos }).businessTypes(), ['BANCO', 'FARMACIA']);
  assert.deepEqual(await servicio().businessTypes(), []);
});

// ---------- índice de viabilidad (T-10)
const extremos = () => servicio({
  tse: [t('SAN JOSE', 'SAN JOSE', 10000, 10), t('ALAJUELA', 'ALAJUELA', 10000, 5)],
  osm: [o('San José', 'San José', 'hospital', 5), o('San José', 'San José', 'police', 5)],
  grupos: [g('SAN JOSE', 'SAN JOSE', 'ROBO', 'BANCO', 10), g('ALAJUELA', 'ALAJUELA', 'ROBO', 'BANCO', 500)],
});

test('viabilidad: el mejor cantón en los tres componentes obtiene 100 (ALTO) y el peor 0 (BAJO)', async () => {
  const [mejor, peor] = await extremos().viabilityIndex();
  assert.equal(mejor.canton, 'SAN JOSE');
  assert.equal(mejor.score, 100);
  assert.equal(mejor.band, 'ALTO');
  assert.equal(peor.score, 0);
  assert.equal(peor.band, 'BAJO');
  assert.equal(mejor.dataComplete && peor.dataComplete, true);
});

test('viabilidad: sin datos del OIJ el índice no se calcula (score null) en vez de inventarse', async () => {
  const filas = await servicio({ tse: [t('SAN JOSE', 'SAN JOSE', 100)], osm: [o('San José', 'San José', 'hospital', 1)] }).viabilityIndex();
  assert.equal(filas[0].score, null);
  assert.equal(filas[0].band, null);
  assert.equal(filas[0].dataComplete, false);
});

test('viabilidad: cada componente es relativo a los demás cantones (cambiar uno cambia la escala del resto)', async () => {
  const base = { tse: [t('SAN JOSE', 'SAN JOSE', 1000), t('ALAJUELA', 'ALAJUELA', 1000)], osm: [o('San José', 'San José', 'hospital', 2), o('Alajuela', 'Alajuela', 'hospital', 1)] };
  const dos = await servicio({ ...base, grupos: [g('SAN JOSE', 'SAN JOSE', 'ROBO', 'X', 5), g('ALAJUELA', 'ALAJUELA', 'ROBO', 'X', 5)] }).viabilityIndex();
  const tres = await servicio({ tse: [...base.tse, t('CARTAGO', 'CARTAGO', 1000)], osm: [...base.osm, o('Cartago', 'Cartago', 'hospital', 4)], grupos: [g('SAN JOSE', 'SAN JOSE', 'ROBO', 'X', 5), g('ALAJUELA', 'ALAJUELA', 'ROBO', 'X', 5), g('CARTAGO', 'CARTAGO', 'ROBO', 'X', 5)] }).viabilityIndex();
  const cobertura = (filas, canton) => filas.find((f) => f.canton === canton).cobertura.score;
  assert.notEqual(cobertura(dos, 'SAN JOSE'), cobertura(tres, 'SAN JOSE'), 'agregar un cantón cambia el puntaje de otro: es una posición relativa (T-10)');
});

test('viabilidad: los resultados salen ordenados de mayor a menor y los incompletos al final', async () => {
  const filas = await servicio({
    tse: [t('SAN JOSE', 'SAN JOSE', 1000), t('ALAJUELA', 'ALAJUELA', 1000), t('CARTAGO', 'CARTAGO', 0)],
    osm: [o('San José', 'San José', 'hospital', 3)],
    grupos: [g('SAN JOSE', 'SAN JOSE', 'ROBO', 'X', 1), g('ALAJUELA', 'ALAJUELA', 'ROBO', 'X', 9)],
  }).viabilityIndex();
  const puntajes = filas.map((f) => f.score ?? -1);
  assert.deepEqual(puntajes, [...puntajes].sort((a, b) => b - a));
  assert.equal(filas.at(-1).canton, 'CARTAGO');
});

// ---------- brechas conocidas (se registran como `todo`: visibles y sin hacer fallar la suite, igual que en test:tse)
test('COV-AC1: un componente sin diferenciación no suma 100 puntos al índice', { todo: 'brecha IA-09 (normalize devuelve 100 con rango 0)' }, async () => {
  const filas = await servicio({
    tse: [t('SAN JOSE', 'SAN JOSE', 1000, 5), t('ALAJUELA', 'ALAJUELA', 1000, 5)],
    osm: [o('San José', 'San José', 'hospital', 1), o('Alajuela', 'Alajuela', 'hospital', 1)],
    grupos: [g('SAN JOSE', 'SAN JOSE', 'ROBO', 'X', 5), g('ALAJUELA', 'ALAJUELA', 'ROBO', 'X', 5)],
  }).viabilityIndex();
  assert.ok(filas.every((f) => f.cobertura.score !== 100 && f.electoral.score !== 100), 'con todos iguales ningún componente debe puntuar 100: no hay diferenciación');
});

test('F02-AC8: un delito, cantón o tipo de objetivo inexistente responde 400, no ceros', { todo: 'brecha IA-05' }, async () => {
  await assert.rejects(() => servicio({ tse: [t('SAN JOSE', 'SAN JOSE', 100)], grupos: [] }).crimeRate(undefined, 'CANTON QUE NO EXISTE'), BadRequestException);
});
