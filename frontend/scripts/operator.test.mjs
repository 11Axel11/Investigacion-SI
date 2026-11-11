// Pruebas del modo operador (Q-02, T-01). Ejecutar con `npm run test:operator`.
// Usan una clave ficticia y un `fetch` simulado: no salen a la red.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { ADMIN_KEY_HEADER, OperatorKeyRequiredError, adminHeaders, clearAdminKey, hasAdminKey, setAdminKey } from '../lib/operator.ts';
import { ApiError, api, oijApi } from '../lib/api.ts';

const KEY = 'clave-ficticia-de-prueba-0123456789';
const realFetch = globalThis.fetch;
let calls;

function mockFetch(status = 200, body = {}) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
}
test.beforeEach(() => { clearAdminKey(); mockFetch(); });
test.after(() => { globalThis.fetch = realFetch; clearAdminKey(); });

const headerOf = (call) => new Headers(call.init?.headers).get(ADMIN_KEY_HEADER);
const writes = () => [
  ['POST /osm/sync', () => api.osm.sync({ province: 'San José', canton: 'San José', category: 'hospital' }), '/osm/sync'],
  ['POST /oij/sync', () => oijApi.sync(2026), '/oij/sync'],
  ['POST /tse/import', () => api.tse.importZip(new File(['x'], 'ficticio.zip', { type: 'application/zip' })), '/tse/import'],
];

test('la cabecera es X-Admin-Key (Q-01)', () => {
  assert.equal(ADMIN_KEY_HEADER, 'X-Admin-Key');
});

test('sin clave, las tres escrituras fallan antes de salir a la red', async () => {
  for (const [label, call] of writes()) {
    await assert.rejects(call(), OperatorKeyRequiredError, label);
  }
  assert.equal(calls.length, 0, 'no debe haber ninguna petición');
  assert.throws(() => adminHeaders(), OperatorKeyRequiredError);
});

test('con clave, las tres escrituras envían X-Admin-Key a su endpoint', async () => {
  setAdminKey(KEY);
  for (const [label, call, path] of writes()) {
    await call();
    const sent = calls.at(-1);
    assert.ok(sent.url.includes(path), `${label}: ${sent.url}`);
    assert.equal(sent.init.method, 'POST', label);
    assert.equal(headerOf(sent), KEY, label);
  }
  assert.equal(calls.length, 3);
});

test('la importación del TSE no fija Content-Type (lo calcula el navegador con el límite multipart)', async () => {
  setAdminKey(KEY);
  await api.tse.importZip(new File(['x'], 'ficticio.zip'));
  assert.equal(new Headers(calls[0].init.headers).get('Content-Type'), null);
  assert.ok(calls[0].init.body instanceof FormData);
});

test('un 401 descarta la clave, avisa y la siguiente escritura ya no sale a la red', async () => {
  setAdminKey(KEY);
  mockFetch(401, { message: 'Se requiere una clave de administración válida.' });
  await assert.rejects(oijApi.sync(2026), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.match(error.message, /no es válida/);
    return true;
  });
  assert.equal(hasAdminKey(), false);
  await assert.rejects(oijApi.sync(2026), OperatorKeyRequiredError);
  assert.equal(calls.length, 1);
});

test('otros errores (400, 503) conservan la clave', async () => {
  for (const status of [400, 503]) {
    setAdminKey(KEY);
    mockFetch(status, { message: 'fallo de la fuente' });
    await assert.rejects(oijApi.sync(2026), /fallo de la fuente/);
    assert.equal(hasAdminKey(), true, `tras ${status}`);
  }
});

test('las lecturas nunca envían la clave, aunque haya modo operador (Q-02)', async () => {
  setAdminKey(KEY);
  await api.osm.locations();
  await api.osm.places({ province: 'San José', canton: 'San José', category: 'hospital' });
  await api.tse.overview();
  await api.tse.districts({});
  await api.coverage.cantonBoundaries();
  assert.equal(calls.length, 5);
  for (const call of calls) assert.equal(headerOf(call), null, call.url);
});

test('valores límite: una clave vacía o solo con espacios no activa el modo; se recorta', () => {
  setAdminKey('');
  assert.equal(hasAdminKey(), false);
  setAdminKey('   ');
  assert.equal(hasAdminKey(), false);
  setAdminKey(`  ${KEY}  `);
  assert.deepEqual(adminHeaders(), { [ADMIN_KEY_HEADER]: KEY });
  clearAdminKey();
  assert.equal(hasAdminKey(), false);
});

function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.next', 'scripts'].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

test('regla Q-02: ningún archivo que maneja la clave la persiste, y ninguno la expone como NEXT_PUBLIC_*', () => {
  const files = sources(new URL('..', import.meta.url).pathname);
  assert.ok(files.length > 10);
  // Archivos que tocan la clave: el almacén, quien lo importa y la capa de la API.
  const handlesKey = (code) => /lib\/operator|\.\/operator\.ts|setAdminKey|adminHeaders|useOperatorMode/.test(code);
  const keyFiles = files.filter((file) => handlesKey(readFileSync(file, 'utf8')));
  assert.ok(keyFiles.some((f) => f.endsWith('lib/operator.ts')) && keyFiles.some((f) => f.endsWith('lib/api.ts')), 'la detección no encontró el almacén o la API');
  for (const file of keyFiles) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1'); // sin comentarios
    assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB|document\.cookie|history\.(push|replace)State|location\.(search|hash)/, `${file} podría persistir o exponer la clave`);
  }
  // Un secreto nunca puede llamarse NEXT_PUBLIC_* (queda en el código del navegador): se revisa todo el frontend.
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /NEXT_PUBLIC_\w*(ADMIN|KEY|SECRET|TOKEN)/i, `${file} expone un secreto como NEXT_PUBLIC_*`);
  }
  const example = readFileSync(new URL('../.env.local.example', import.meta.url), 'utf8');
  assert.doesNotMatch(example, /NEXT_PUBLIC_\w*(ADMIN|KEY|SECRET|TOKEN)/i);
});
