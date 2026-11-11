// Integración API + BD de pruebas (ítem 4.3). Ejecutar con `npm run test:integracion` (exige TEST_DATABASE_URL).
// Aplicación real (todos los módulos) y PostgreSQL real, con datos FICTICIOS. Los terceros (Overpass y OIJ) se
// simulan localmente: no se sale a internet. Cada prueba cita el criterio de flujos.md que verifica.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { abrirApp, sembrar, vaciar, CLAVE_ADMIN, CABECERA, anio } = require('./apoyo.cjs');
const { makeZip } = require('./zip.cjs');

let ctx;
const llamadas = { osm: 0, oij: 0 };
let overpass = () => ({ status: 200, body: {} });
let oijCatalogo = () => ({ status: 200, body: {} });
let oijCsv = () => ({ status: 200, body: '' });
let servidorOverpass;
const fetchReal = globalThis.fetch;

test.before(async () => {
  servidorOverpass = http.createServer((req, res) => {
    llamadas.osm += 1;
    req.resume();
    req.on('end', () => {
      const { status, body } = overpass();
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise((ok) => servidorOverpass.listen(0, '127.0.0.1', ok));
  process.env.OVERPASS_URL = `http://127.0.0.1:${servidorOverpass.address().port}/api/interpreter`;

  // OIJ: el servicio usa fetch global con URLs fijas; se intercepta solo lo que NO es el servidor de la prueba.
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof URL ? input.href : input);
    if (/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url)) return fetchReal(input, init);
    llamadas.oij += 1;
    const { status, body } = url.includes('package_show') ? oijCatalogo() : oijCsv();
    const texto = typeof body === 'string' ? body : JSON.stringify(body);
    return new Response(texto, { status, headers: { 'Content-Type': 'text/plain' } });
  };
  ctx = await abrirApp();
});

test.after(async () => {
  globalThis.fetch = fetchReal;
  await ctx?.app.close();
  await new Promise((ok) => servidorOverpass?.close(ok));
});

test.beforeEach(async () => {
  await vaciar(ctx.dataSource);
  llamadas.osm = 0;
  llamadas.oij = 0;
});

const escribir = (ruta, { cuerpo, clave = CLAVE_ADMIN, query = '' } = {}) =>
  fetchReal(`${ctx.base}${ruta}${query}`, {
    method: 'POST',
    headers: { ...(clave ? { [CABECERA]: clave } : {}), ...(cuerpo && !(cuerpo instanceof FormData) ? { 'Content-Type': 'application/json' } : {}) },
    body: cuerpo instanceof FormData ? cuerpo : cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
const contar = async (tabla) => Number((await ctx.dataSource.query(`SELECT COUNT(*) AS n FROM "${tabla}"`))[0].n);
async function volcado() {
  let texto = '';
  for (const m of ctx.dataSource.entityMetadatas) texto += JSON.stringify(await ctx.dataSource.query(`SELECT * FROM "${m.tableName}"`));
  return texto;
}

// ---------------------------------------------------------------- F-01
const DISTELEC = ['101001,SAN JOSÉ,SAN JOSÉ,CARMEN', '101002,SAN JOSÉ,SAN JOSÉ,MERCED', '201001,ALAJUELA,ALAJUELA,ALAJUELA'].join('\r\n');
const CEDULA = '900000001';
const NOMBRE = 'PERSONA FICTICIA UNO';
const fila = (id, codigo, junta, nombre = 'PERSONA FICTICIA') => `${id},${codigo},1,20300101,${junta},${nombre},APELLIDO`;
const PADRON = [fila(CEDULA, '101001', '0001', NOMBRE), fila('900000002', '101001', '0001'), fila('900000003', '101001', '0002'),
  fila('900000004', '101002', '0003'), fila('900000005', '201001', '0004')].join('\r\n');
const zipBueno = () => makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON_COMPLETO.txt': PADRON });
const formulario = (buffer, nombre = 'padron-ficticio.zip') => {
  const form = new FormData();
  form.append('file', new Blob([buffer]), nombre);
  return form;
};

test('F01-AC1 y F01-AC2: importa conteos por distrito y no persiste ningún dato personal (BD real)', async () => {
  const respuesta = await escribir('/tse/import', { cuerpo: formulario(zipBueno()), query: '?sourceDate=2026-01-31' });
  const texto = await respuesta.text();
  assert.equal(respuesta.status, 201, texto);
  const cuerpo = JSON.parse(texto);
  assert.equal(cuerpo.importedDistricts, 3);
  assert.equal(cuerpo.processedElectors, 5);
  assert.equal(cuerpo.discardedPersonalFields, true);
  const filas = await ctx.dataSource.query('SELECT "electoralCode", electors, "pollingStations" FROM tse_electoral_summary ORDER BY "electoralCode"');
  assert.deepEqual(filas.map((f) => [f.electoralCode, f.electors, f.pollingStations]), [['101001', 3, 2], ['101002', 1, 1], ['201001', 1, 1]]);
  for (const secreto of [CEDULA, NOMBRE, '20300101']) {
    assert.ok(!texto.includes(secreto), 'la respuesta no debe incluir datos personales');
    assert.ok(!(await volcado()).includes(secreto), `la BD no debe contener ${secreto === CEDULA ? 'la cédula' : 'datos personales'}`);
  }
});

test('F01-AC6: importar el mismo ZIP dos veces actualiza sin duplicar (restricción única real)', async () => {
  for (let i = 0; i < 2; i += 1) assert.equal((await escribir('/tse/import', { cuerpo: formulario(zipBueno()) })).status, 201);
  assert.equal(await contar('tse_electoral_summary'), 3);
  const [{ total }] = await ctx.dataSource.query('SELECT SUM(electors)::int AS total FROM tse_electoral_summary');
  assert.equal(total, 5);
});

test('F01-AC3: un archivo inválido responde 400 y los datos anteriores no cambian', async () => {
  await sembrar(ctx.dataSource);
  const antes = await ctx.dataSource.query('SELECT "electoralCode", electors FROM tse_electoral_summary ORDER BY "electoralCode"');
  for (const form of [formulario(Buffer.from('no es un zip'), 'x.zip'), formulario(makeZip({ 'DISTELEC.TXT': DISTELEC }))]) {
    assert.equal((await escribir('/tse/import', { cuerpo: form })).status, 400);
  }
  assert.equal((await escribir('/tse/import', {})).status, 400, 'sin archivo');
  const despues = await ctx.dataSource.query('SELECT "electoralCode", electors FROM tse_electoral_summary ORDER BY "electoralCode"');
  assert.deepEqual(despues, antes);
});

test('F01-AC5: una fecha de corte imposible responde 400 y no escribe', async () => {
  for (const fecha of ['2026-02-30', '2026-13-01', 'ayer']) {
    assert.equal((await escribir('/tse/import', { cuerpo: formulario(zipBueno()), query: `?sourceDate=${fecha}` })).status, 400, fecha);
  }
  assert.equal(await contar('tse_electoral_summary'), 0);
});

// ---------------------------------------------------------------- F-02
const lineaOij = (delito, fecha, provincia, canton) => `${delito},MODALIDAD,${fecha},EDIFICACION,Farmacia [Edificacion],,,COSTA RICA,${provincia},${canton},DISTRITO`;
function oijDisponible() {
  oijCatalogo = () => ({ status: 200, body: { result: { resources: [{ format: 'CSV', name: `Estadísticas ${anio}`, url: 'https://pjcrdatosabiertos.blob.core.windows.net/ficticio/datos.csv' }] } } });
  oijCsv = () => ({ status: 200, body: [lineaOij('ROBO', `${anio}-01-05`, 'SAN JOSE', 'SAN JOSE'), lineaOij('ROBO', `${anio}-01-06`, 'SAN JOSE', 'SAN JOSE'), lineaOij('HURTO', `${anio}-02-01`, 'HEREDIA', 'BELEN')].join('\r\n') });
}

test('F02-AC1 y F02-AC2: sincroniza el año, guarda procedencia y la segunda llamada usa la caché', async () => {
  oijDisponible();
  const primera = await (await escribir('/oij/sync', { cuerpo: { year: anio } })).json();
  assert.equal(primera.cache, false);
  assert.equal(primera.total, 3);
  const [fila0] = await ctx.dataSource.query('SELECT year, "sourceUrl", total FROM oij_dataset');
  assert.equal(fila0.year, anio);
  assert.match(fila0.sourceUrl, /^https:\/\/pjcrdatosabiertos\.blob\.core\.windows\.net\//);
  const descargas = llamadas.oij;
  const segunda = await (await escribir('/oij/sync', { cuerpo: { year: anio } })).json();
  assert.equal(segunda.cache, true);
  assert.equal(llamadas.oij, descargas, 'la caché no descarga de nuevo');
});

test('F02-AC3: año fuera de rango o no entero responde 400 sin descargar', async () => {
  oijDisponible();
  for (const year of [2014, anio + 1, 2020.5, 'abc', null]) {
    assert.equal((await escribir('/oij/sync', { cuerpo: { year } })).status, 400, String(year));
  }
  assert.equal(llamadas.oij, 0);
});

test('F02-AC4: si el catálogo falla responde 503 y el dato previo se conserva', async () => {
  await sembrar(ctx.dataSource);
  await ctx.dataSource.query(`UPDATE oij_dataset SET "fetchedAt" = now() - interval '2 hours'`);
  oijCatalogo = () => ({ status: 500, body: {} });
  const respuesta = await escribir('/oij/sync', { cuerpo: { year: anio } });
  assert.equal(respuesta.status, 503);
  const [{ total }] = await ctx.dataSource.query('SELECT total FROM oij_dataset WHERE year = $1', [anio]);
  assert.equal(total, 17, 'los datos previos siguen intactos');
});

test('F02-AC4: un CSV que cambió de estructura responde 400 y no sustituye los datos', async () => {
  await sembrar(ctx.dataSource);
  await ctx.dataSource.query(`UPDATE oij_dataset SET "fetchedAt" = now() - interval '2 hours'`);
  oijDisponible();
  oijCsv = () => ({ status: 200, body: 'columna,distinta\n1,2' });
  assert.equal((await escribir('/oij/sync', { cuerpo: { year: anio } })).status, 400);
  assert.equal((await ctx.dataSource.query('SELECT total FROM oij_dataset WHERE year = $1', [anio]))[0].total, 17);
});

// ---------------------------------------------------------------- F-03
const limite = { type: 'relation', id: 3223004, tags: { boundary: 'administrative', admin_level: '4', name: 'San José' }, center: { lat: 9.93, lon: -84.09 } };
const hospital = (id, nombre) => ({ type: 'node', id, lat: 9.9 + id / 1e5, lon: -84.1, tags: { amenity: 'hospital', name: nombre } });
const overpassCon = (...lugares) => () => ({ status: 200, body: { osm3s: { timestamp_osm_base: '2026-01-01T00:00:00Z' }, elements: [limite, ...lugares] } });
const PROVINCIA = { province: 'San José', category: 'hospital' };

test('F03-AC1 y F03-AC2: sincroniza, guarda lugares normalizados y la segunda llamada usa la caché', async () => {
  overpass = overpassCon(hospital(1, 'Hospital Ficticio A'), hospital(2, 'Hospital Ficticio B'));
  const primera = await (await escribir('/osm/sync', { cuerpo: PROVINCIA })).json();
  assert.equal(primera.guardados, 2);
  assert.equal(primera.cache, false);
  assert.equal(await contar('osm_place'), 2);
  assert.equal(await contar('osm_query_cache'), 1);
  const segunda = await (await escribir('/osm/sync', { cuerpo: PROVINCIA })).json();
  assert.equal(segunda.cache, true);
  assert.equal(llamadas.osm, 1, 'la caché no llama de nuevo a Overpass');
});

test('F03-AC3: provincia, cantón o categoría inválidos responden 400 y no llegan a Overpass', async () => {
  for (const cuerpo of [{ province: 'Atlantis', category: 'hospital' }, { province: 'San José', canton: 'Cartago', category: 'hospital' },
    { province: 'San José', category: 'bazuca' }, { province: 'San José', category: 'hospital"]; out;' }, {}]) {
    assert.equal((await escribir('/osm/sync', { cuerpo })).status, 400, JSON.stringify(cuerpo));
  }
  assert.equal(llamadas.osm, 0);
});

test('F03-AC4: si Overpass falla responde 503 y los lugares previos siguen intactos', async () => {
  await ctx.dataSource.query(`INSERT INTO osm_place ("osmType","osmId",province,canton,category,name,latitude,longitude) VALUES ('node','900','San José','','hospital','Hospital previo',9.9,-84.1)`);
  overpass = () => ({ status: 500, body: {} });
  assert.equal((await escribir('/osm/sync', { cuerpo: PROVINCIA })).status, 503);
  assert.equal(await contar('osm_place'), 1);
});

test('F03-AC6 (Q-02): cualquier visitante consulta los lugares guardados sin clave', async () => {
  await sembrar(ctx.dataSource);
  const respuesta = await fetchReal(`${ctx.base}/osm/by-category?category=pharmacy`);
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).length, 2);
});

test('F03-AC5: si Overpass responde sin lugares, los lugares anteriores de esa combinación no se pierden', async () => {
  await ctx.dataSource.query(`INSERT INTO osm_place ("osmType","osmId",province,canton,category,name,latitude,longitude) VALUES ('node','900','San José','','hospital','Hospital previo',9.9,-84.1)`);
  overpass = overpassCon(); // solo el límite administrativo, sin lugares
  await escribir('/osm/sync', { cuerpo: PROVINCIA });
  assert.equal(await contar('osm_place'), 1, 'el lugar previo debe conservarse (M-06 / T-06)');
});
