// Experimento de resiliencia (ítem 4.10): Toxiproxy entre el backend y Overpass (F-03, T-02, T-07).
// Ejecutar con `scripts/pruebas/resiliencia.sh` (levanta Toxiproxy y la BD de pruebas). Overpass es un servidor
// local falso: no se toca ningún servicio real. Hipótesis y criterios en docs/fases/04-pruebas/evidencias/4.10-resiliencia.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { abrirApp, vaciar, CLAVE_ADMIN, CABECERA } = require('./apoyo.cjs');

const API = process.env.TOXIPROXY_API ?? 'http://127.0.0.1:8474';
const PUERTO_PROXY = Number(process.env.TOXIPROXY_PUERTO ?? 8666);
const PROVINCIA = 'San José';
let ctx; let servidor; let llamadas = 0;
const tiempos = [];

const toxi = (ruta, metodo = 'GET', cuerpo) => fetch(`${API}${ruta}`, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
const lugar = (id, clave, valor) => ({ type: 'node', id, lat: 9.9, lon: -84.1, tags: { [clave]: valor, name: `Lugar Ficticio ${id}` } });
const limite = { type: 'relation', id: 1, tags: { boundary: 'administrative', admin_level: '4' }, center: { lat: 9.93, lon: -84.08 } };

async function sync(category) {
  const inicio = Date.now();
  const respuesta = await fetch(`${ctx.base}/osm/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json', [CABECERA]: CLAVE_ADMIN }, body: JSON.stringify({ province: PROVINCIA, category }) });
  const cuerpo = await respuesta.json().catch(() => ({}));
  return { status: respuesta.status, segundos: (Date.now() - inicio) / 1000, cuerpo };
}
const lugaresGuardados = async (category) => Number((await ctx.dataSource.query('SELECT COUNT(*) AS n FROM osm_place WHERE category = $1', [category]))[0].n);
const registrar = (t, etiqueta, r) => { tiempos.push(`${etiqueta}: HTTP ${r.status} en ${r.segundos.toFixed(1)} s`); t.diagnostic(tiempos.at(-1)); };

test.before(async () => {
  servidor = http.createServer((req, res) => {
    llamadas += 1; req.resume();
    let datos = '';
    req.on('data', (parte) => { datos += parte; });
    req.on('end', () => {
      // Responde según la consulta: la etiqueta pedida (amenity/shop = valor) y el nivel del límite administrativo.
      const consulta = decodeURIComponent(datos);
      const [, clave = 'amenity', valor = 'hospital'] = consulta.match(/nwr\["(\w+)"="(\w+)"\]/) ?? [];
      const base = [...valor].reduce((suma, c) => suma + c.charCodeAt(0), 0) * 10; // ids distintos por categoría
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ osm3s: { timestamp_osm_base: '2026-01-01T00:00:00Z' }, elements: [limite, lugar(base + 1, clave, valor), lugar(base + 2, clave, valor)] }));
    });
  });
  await new Promise((ok) => servidor.listen(0, '0.0.0.0', ok));
  const puertoFalso = servidor.address().port;
  await toxi('/proxies/overpass', 'DELETE').catch(() => {});
  const creado = await toxi('/proxies', 'POST', { name: 'overpass', listen: `0.0.0.0:${PUERTO_PROXY}`, upstream: `host.docker.internal:${puertoFalso}`, enabled: true });
  assert.equal(creado.status, 201, 'no se pudo crear el proxy en Toxiproxy: experimento INCOMPLETO');
  process.env.OVERPASS_URL = `http://127.0.0.1:${PUERTO_PROXY}/api/interpreter`;
  ctx = await abrirApp();
  await vaciar(ctx.dataSource);
});
test.after(async () => {
  await toxi('/proxies/overpass', 'DELETE').catch(() => {});
  await ctx?.app.close();
  await new Promise((ok) => servidor?.close(ok));
  console.log('\n--- Resumen del experimento ---\n' + tiempos.join('\n'));
});

test('1. línea base: sin fallos la sincronización responde 201 en pocos segundos', async (t) => {
  const r = await sync('hospital');
  registrar(t, 'base', r);
  assert.equal(r.status, 201);
  assert.ok(r.segundos < 3);
  assert.equal(await lugaresGuardados('hospital'), 2);
});

test('2. latencia de 4 s (bajo el timeout de 35 s): responde bien, más lento, sin perder datos', async (t) => {
  await toxi('/proxies/overpass/toxics', 'POST', { name: 'latencia', type: 'latency', attributes: { latency: 4000 } });
  try {
    const r = await sync('pharmacy');
    registrar(t, 'latencia 4 s', r);
    assert.equal(r.status, 201);
    assert.ok(r.segundos >= 4 && r.segundos < 12, `tardó ${r.segundos}`);
    assert.equal(await lugaresGuardados('pharmacy'), 2);
  } finally { await toxi('/proxies/overpass/toxics/latencia', 'DELETE'); }
});

test('3. latencia de 45 s (sobre el timeout de 35 s): corta a ~35 s con 503 y conserva los datos previos', async (t) => {
  const antes = await lugaresGuardados('hospital');
  await ctx.dataSource.query(`UPDATE osm_query_cache SET "fetchedAt" = now() - interval '1 hour'`); // fuerza consulta externa
  await toxi('/proxies/overpass/toxics', 'POST', { name: 'lenta', type: 'latency', attributes: { latency: 45000 } });
  try {
    const r = await sync('hospital');
    registrar(t, 'latencia 45 s', r);
    assert.equal(r.status, 503);
    assert.ok(r.segundos >= 34 && r.segundos < 40, `el corte debía rondar los 35 s y fue ${r.segundos}`);
    assert.match(String(r.cuerpo.message), /Overpass/);
    assert.equal(await lugaresGuardados('hospital'), antes, 'los datos previos siguen intactos');
  } finally { await toxi('/proxies/overpass/toxics/lenta', 'DELETE'); }
});

test('4. corte total del proxy: responde 503 rápido, sin colgarse, y conserva los datos previos', async (t) => {
  const antes = await lugaresGuardados('pharmacy');
  await ctx.dataSource.query(`UPDATE osm_query_cache SET "fetchedAt" = now() - interval '1 hour'`);
  await toxi('/proxies/overpass', 'POST', { enabled: false });
  const r = await sync('pharmacy');
  registrar(t, 'corte total', r);
  assert.equal(r.status, 503);
  assert.ok(r.segundos < 5, `debía fallar rápido y tardó ${r.segundos}`);
  assert.equal(await lugaresGuardados('pharmacy'), antes);
});

test('5. recuperación: al restablecer la conexión la siguiente sincronización funciona sin reiniciar nada', async (t) => {
  await toxi('/proxies/overpass', 'POST', { enabled: true });
  const r = await sync('pharmacy');
  registrar(t, 'recuperación', r);
  assert.equal(r.status, 201);
  assert.ok(r.segundos < 3);
  assert.equal(await lugaresGuardados('pharmacy'), 2);
  const salud = await fetch(`${ctx.base}/health`);
  assert.equal(salud.status, 200, 'el backend siguió sano durante todo el experimento');
});

test('6. durante una caída, las lecturas públicas siguen funcionando con los datos guardados', async (t) => {
  await toxi('/proxies/overpass', 'POST', { enabled: false });
  const inicio = Date.now();
  const lectura = await fetch(`${ctx.base}/osm/by-category?category=hospital`);
  registrar(t, 'lectura con Overpass caído', { status: lectura.status, segundos: (Date.now() - inicio) / 1000 });
  assert.equal(lectura.status, 200);
  assert.equal((await lectura.json()).length, 2);
  await toxi('/proxies/overpass', 'POST', { enabled: true });
});

test('7. ráfaga: 10 sincronizaciones simultáneas de la misma combinación terminan bien y la BD queda consistente', async (t) => {
  await ctx.dataSource.query(`UPDATE osm_query_cache SET "fetchedAt" = now() - interval '1 hour'`);
  const antesLlamadas = llamadas;
  const resultados = await Promise.all(Array.from({ length: 10 }, () => sync('hospital')));
  const estados = resultados.map((r) => r.status);
  tiempos.push(`ráfaga x10: estados ${JSON.stringify(estados)}; consultas a Overpass: ${llamadas - antesLlamadas} (F03-AC9 pide 1)`);
  t.diagnostic(tiempos.at(-1));
  assert.ok(estados.every((s) => s === 201 || s === 500 || s === 503), `estados inesperados ${estados}`);
  assert.equal(await lugaresGuardados('hospital'), 2, 'sin duplicados ni pérdida tras la ráfaga');
});
