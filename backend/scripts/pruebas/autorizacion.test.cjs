// Autorización (4.5) y rutas alternativas a los mismos datos (4.6). Ejecutar con `npm run test:autorizacion`.
// Aplicación y BD reales, datos FICTICIOS, todo directo a la API HTTP (sin pasar por la interfaz). Fuente de los
// casos: matriz de acceso de arquitectura.md, T-01 y los criterios F0nAC7 de flujos.md.
//
// Roles del sistema (Q-01, Q-02): visitante (sin clave) y operador (cabecera X-Admin-Key). No hay cuentas, sesiones
// ni recursos con dueño, por eso "propiedad" y "sesión inválida" no aplican: la ausencia de clave y una clave
// incorrecta son los equivalentes y se prueban aquí.
const test = require('node:test');
const assert = require('node:assert/strict');
const { abrirApp, sembrar, vaciar, CLAVE_ADMIN, CABECERA } = require('./apoyo.cjs');
const { makeZip } = require('./zip.cjs');

let ctx;
test.before(async () => { ctx = await abrirApp(); });
test.after(async () => { await ctx?.app.close(); });
test.beforeEach(async () => { await sembrar(ctx.dataSource); });

async function estadoBD() {
  let texto = '';
  for (const m of ctx.dataSource.entityMetadatas) texto += m.tableName + JSON.stringify(await ctx.dataSource.query(`SELECT * FROM "${m.tableName}" ORDER BY 1`));
  return texto;
}
const zipFicticio = () => {
  const form = new FormData();
  form.append('file', new Blob([makeZip({ 'DISTELEC.TXT': '999001,PROVINCIA FALSA,CANTON FALSO,DISTRITO FALSO', 'PADRON.txt': '999999999,999001,1,20300101,0001,NOMBRE INVENTADO,APELLIDO' })]), 'p.zip');
  return form;
};
const ESCRITURAS = [
  { ruta: '/osm/sync', json: { province: 'San José', category: 'hospital' } },
  { ruta: '/oij/sync', json: { year: new Date().getFullYear() } },
  { ruta: '/tse/import', form: true },
];
const pedir = (ruta, { metodo = 'POST', cabeceras = {}, escritura } = {}) => fetch(`${ctx.base}${ruta}`, {
  method: metodo,
  headers: { ...(escritura?.json ? { 'Content-Type': 'application/json' } : {}), ...cabeceras },
  body: metodo === 'GET' || metodo === 'HEAD' ? undefined : escritura?.form ? zipFicticio() : escritura?.json ? JSON.stringify(escritura.json) : undefined,
});

// ---------------------------------------------------------------- 4.5
test('F01-AC7, F02-AC5, F03-AC7: sin clave o con clave incorrecta responde 401, no modifica la BD y no expone datos', async () => {
  const antes = await estadoBD();
  const intentos = [
    {}, { [CABECERA]: '' }, { [CABECERA]: 'incorrecta' }, { [CABECERA]: CLAVE_ADMIN.toUpperCase() }, { [CABECERA]: `${CLAVE_ADMIN.slice(0, 5)} ${CLAVE_ADMIN.slice(5)}` },
    // (Un espacio al inicio o al final NO se prueba aquí: el análisis HTTP, RFC 9110 §5.5, lo elimina antes de llegar
    // al guard y la clave llega exacta. Ese caso lo cubre test:admin llamando al guard directamente.)
    { Authorization: `Bearer ${CLAVE_ADMIN}` }, { Cookie: `admin=${CLAVE_ADMIN}` }, { 'X-Api-Key': CLAVE_ADMIN },
  ];
  for (const e of ESCRITURAS) {
    for (const cabeceras of intentos) {
      const respuesta = await pedir(e.ruta, { cabeceras, escritura: e });
      const texto = await respuesta.text();
      assert.equal(respuesta.status, 401, `${e.ruta} con ${JSON.stringify(Object.keys(cabeceras))}`);
      for (const dato of [CLAVE_ADMIN, 'Hospital Ficticio', 'FICTICIA', 'CARMEN']) assert.ok(!texto.includes(dato), `el 401 de ${e.ruta} no debe exponer datos`);
    }
  }
  assert.equal(await estadoBD(), antes, 'ningún rechazo modifica la BD');
});

test('T-01: la clave solo se acepta en la cabecera, no por la URL, el cuerpo ni una cabecera repetida', async () => {
  const antes = await estadoBD();
  for (const e of ESCRITURAS) {
    for (const query of [`?key=${CLAVE_ADMIN}`, `?x-admin-key=${CLAVE_ADMIN}`, `?X-Admin-Key=${CLAVE_ADMIN}`]) {
      assert.equal((await pedir(e.ruta + query, { escritura: e })).status, 401, `${e.ruta}${query.split('=')[0]}`);
    }
    // Cabecera repetida: Node la une con coma ("clave, clave"), que no es la clave.
    const respuesta = await pedir(e.ruta, { cabeceras: { [CABECERA]: `${CLAVE_ADMIN}, ${CLAVE_ADMIN}` }, escritura: e });
    assert.equal(respuesta.status, 401, `${e.ruta} cabecera repetida`);
  }
  assert.equal(await estadoBD(), antes);
});

test('T-01: con la clave del operador las tres escrituras no responden 401 (acceso permitido)', async () => {
  for (const e of ESCRITURAS) {
    const respuesta = await pedir(e.ruta, { cabeceras: { [CABECERA]: CLAVE_ADMIN }, escritura: e });
    assert.notEqual(respuesta.status, 401, e.ruta);
    assert.notEqual(respuesta.status, 403, e.ruta);
    await respuesta.text();
  }
});

test('T-01: el servidor falla cerrado sin ADMIN_API_KEY o con una de 31 caracteres, aunque la cabecera coincida', async () => {
  const original = process.env.ADMIN_API_KEY;
  try {
    for (const configurada of [undefined, '', 'a'.repeat(31)]) {
      if (configurada === undefined) delete process.env.ADMIN_API_KEY; else process.env.ADMIN_API_KEY = configurada;
      for (const e of ESCRITURAS) {
        for (const valor of [String(configurada), configurada ?? '']) {
          const respuesta = await pedir(e.ruta, { cabeceras: { [CABECERA]: valor }, escritura: e });
          assert.equal(respuesta.status, 401, `${e.ruta} con clave configurada ${JSON.stringify(configurada)?.length}`);
          await respuesta.text();
        }
      }
    }
  } finally { process.env.ADMIN_API_KEY = original; }
});

test('Q-02: las lecturas son públicas y no piden clave', async () => {
  for (const ruta of ['/health', '/tse/overview', '/tse/districts', '/oij/overview', '/osm/locations', '/osm/by-category?category=pharmacy',
    '/osm/places?province=San%20Jos%C3%A9&category=hospital', '/coverage/health', '/coverage/electoral-security', '/coverage/crime-rate',
    '/coverage/viability-index', '/coverage/business-types']) {
    const respuesta = await pedir(ruta, { metodo: 'GET' });
    assert.equal(respuesta.status, 200, ruta);
    await respuesta.text();
  }
});

test('Las rutas de lectura no escriben: una lectura repetida no cambia la BD', async () => {
  const antes = await estadoBD();
  for (const ruta of ['/tse/overview', '/oij/overview', '/coverage/viability-index', '/osm/by-category?category=pharmacy']) await (await pedir(ruta, { metodo: 'GET' })).text();
  assert.equal(await estadoBD(), antes);
});

// ---------------------------------------------------------------- 4.6
test('4.6: variantes de la ruta de escritura (mayúsculas, barra final, doble barra, método alterno) no evaden la clave', async () => {
  const antes = await estadoBD();
  const variantes = ['/OSM/sync', '/osm/sync/', '/Oij/SYNC', '/tse/import/', '//osm/sync', '/osm/./sync', '/osm/sync;x=1', '/osm/sync%2F', '/%6Fsm/sync'];
  for (const ruta of variantes) {
    const respuesta = await pedir(ruta, { escritura: ESCRITURAS[0] });
    assert.ok([401, 404].includes(respuesta.status), `${ruta} respondió ${respuesta.status} sin clave`);
    await respuesta.text();
  }
  for (const metodo of ['PUT', 'PATCH', 'DELETE']) {
    for (const e of ESCRITURAS) {
      const respuesta = await pedir(e.ruta, { metodo, cabeceras: { [CABECERA]: CLAVE_ADMIN }, escritura: e });
      assert.equal(respuesta.status, 404, `${metodo} ${e.ruta}`);
      await respuesta.text();
    }
  }
  for (const cabecera of ['X-HTTP-Method-Override', 'X-Method-Override', 'X-HTTP-Method']) {
    const respuesta = await pedir('/oij/overview', { metodo: 'GET', cabeceras: { [cabecera]: 'POST' } });
    assert.equal(respuesta.status, 200, cabecera);
    await respuesta.text();
  }
  assert.equal(await estadoBD(), antes);
});

test('4.6: el padrón importado no sale por ninguna ruta de lectura ni por la búsqueda (F01-AC2)', async () => {
  await vaciar(ctx.dataSource);
  const CEDULA = '900000001';
  const NOMBRE = 'PERSONA FICTICIA UNO';
  const form = new FormData();
  form.append('file', new Blob([makeZip({
    'DISTELEC.TXT': '101001,SAN JOSÉ,SAN JOSÉ,CARMEN',
    'PADRON_COMPLETO.txt': `${CEDULA},101001,1,20991231,0001,${NOMBRE},APELLIDO`,
  })]), 'ficticio.zip');
  const importacion = await fetch(`${ctx.base}/tse/import`, { method: 'POST', headers: { [CABECERA]: CLAVE_ADMIN }, body: form });
  assert.equal(importacion.status, 201);
  for (const ruta of ['/tse/overview', '/tse/districts', `/tse/districts?q=${CEDULA}`, `/tse/districts?q=${encodeURIComponent('PERSONA')}`,
    '/oij/overview', '/coverage/health', '/coverage/electoral-security', '/coverage/crime-rate', '/coverage/viability-index', '/osm/locations']) {
    const respuesta = await pedir(ruta, { metodo: 'GET' });
    const texto = await respuesta.text();
    assert.equal(respuesta.status, 200, ruta);
    for (const secreto of [CEDULA, NOMBRE, '20991231', 'APELLIDO']) assert.ok(!texto.includes(secreto), `${ruta} no debe incluir datos personales`);
  }
  const busqueda = await (await pedir(`/tse/districts?q=${CEDULA}`, { metodo: 'GET' })).json();
  assert.equal(busqueda.total, 0, 'buscar una cédula no devuelve nada');
});

test('4.6: los filtros de las consultas tratan el texto como dato (inyección) y no devuelven más ni fallan', async () => {
  for (const q of ["' OR '1'='1", "%'; DROP TABLE tse_electoral_summary; --", '%', '_']) {
    const respuesta = await pedir(`/tse/districts?q=${encodeURIComponent(q)}`, { metodo: 'GET' });
    assert.equal(respuesta.status, 200, q);
    assert.equal((await respuesta.json()).total, 0, `${q} no coincide con ningún distrito de la prueba`);
  }
  for (const provincia of ["x' OR '1'='1", '<script>1</script>']) {
    const respuesta = await pedir(`/coverage/health?province=${encodeURIComponent(provincia)}`, { metodo: 'GET' });
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), []);
  }
  assert.equal((await ctx.dataSource.query('SELECT COUNT(*)::int AS n FROM tse_electoral_summary'))[0].n, 4, 'la tabla sigue intacta');
});

test('T-11: los filtros TSE buscan comodines y el carácter de escape como texto literal', async () => {
  await ctx.dataSource.query(
    'UPDATE tse_electoral_summary SET district = $1, canton = $2, province = $3 WHERE "electoralCode" = $4',
    ['SECTOR 100%_A!', 'CANTÓN_1', 'PROVINCIA%1', '101001'],
  );
  for (const filtros of [{ q: '%' }, { q: '_' }, { q: '!' }, { canton: 'cantón_1' }, { province: 'provincia%1' }]) {
    const respuesta = await pedir(`/tse/districts?${new URLSearchParams(filtros)}`, { metodo: 'GET' });
    assert.equal(respuesta.status, 200);
    assert.deepEqual((await respuesta.json()).data.map(({ electoralCode }) => electoralCode), ['101001']);
  }

  const coincidencia = await pedir('/tse/districts?q=10100', { metodo: 'GET' });
  assert.equal(coincidencia.status, 200);
  assert.equal((await coincidencia.json()).total, 2);
});

test('T-11: devuelve 400 para filtros largos, repetidos, estructurados o años mal formados', async () => {
  const largo = 'x'.repeat(201);
  const rutas = [
    `/tse/districts?q=${largo}`,
    '/tse/districts?province=A&province=B',
    '/tse/districts?q%5Bvalor%5D=x',
    '/tse/districts?q=abc%00def',
    `/oij/overview?targetType=${largo}`,
    '/oij/overview?year=2e3',
    '/coverage/health?canton=A&canton=B',
    `/coverage/electoral-security?province=${largo}`,
    `/coverage/crime-rate?businessType=${largo}`,
    '/coverage/viability-index?year=2026&year=2026',
    '/coverage/business-types?year=2026.5',
  ];
  for (const ruta of rutas) {
    const respuesta = await pedir(ruta, { metodo: 'GET' });
    assert.equal(respuesta.status, 400, ruta);
  }

  const valido = await pedir(`/oij/overview?crime=${'x'.repeat(200)}`, { metodo: 'GET' });
  assert.equal(valido.status, 200);
  assert.equal((await valido.json()).total, 0);
});

test('4.6: no existe exportación, descarga ni operación masiva sin la clave (inventario de rutas)', async () => {
  const rutas = [];
  for (const capa of ctx.app.getHttpAdapter().getInstance()._router.stack) {
    if (capa.route) for (const metodo of Object.keys(capa.route.methods)) rutas.push(`${metodo.toUpperCase()} ${capa.route.path}`);
  }
  const escrituras = rutas.filter((r) => !r.startsWith('GET ')).sort();
  assert.deepEqual(escrituras, ['POST /oij/sync', 'POST /osm/sync', 'POST /tse/import'], 'solo hay tres rutas de escritura, todas con clave');
  assert.ok(!rutas.some((r) => /export|download|dump|backup|bulk|masiv/i.test(r)), `rutas inesperadas: ${rutas.join(', ')}`);
});
