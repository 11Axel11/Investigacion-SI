// Pruebas de la clave de administración (Q-01, T-01, M-01). Ejecutar con `npm run test:admin`.
// Usan solo claves ficticias y servicios simulados: no tocan la BD ni ningún tercero.
const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Module, RequestMethod } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { UnauthorizedException } = require('@nestjs/common');
const { AdminKeyGuard, ADMIN_KEY_HEADER, ADMIN_KEY_MIN_LENGTH } = require('../dist/common/admin-key.guard');
const { OsmController } = require('../dist/osm/osm.controller');
const { OsmService } = require('../dist/osm/osm.service');
const { OijController } = require('../dist/oij/oij.controller');
const { OijService } = require('../dist/oij/oij.service');
const { TseController } = require('../dist/tse/tse.controller');
const { TseService } = require('../dist/tse/tse.service');
const { ThrottlerModule } = require('@nestjs/throttler');

const KEY = 'clave-ficticia-de-prueba-0123456789'; // 35 caracteres, no es un secreto real
const ORIGINAL = process.env.ADMIN_API_KEY;
test.afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ADMIN_API_KEY;
  else process.env.ADMIN_API_KEY = ORIGINAL;
});

const contextWith = (headers) => ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) });
const run = (headers) => new AdminKeyGuard().canActivate(contextWith(headers));
const rejected = (headers) => assert.throws(() => run(headers), UnauthorizedException);

test('la cabecera y el mínimo son los de Q-01', () => {
  assert.equal(ADMIN_KEY_HEADER, 'x-admin-key');
  assert.equal(ADMIN_KEY_MIN_LENGTH, 32);
});

test('acepta la clave correcta', () => {
  process.env.ADMIN_API_KEY = KEY;
  assert.equal(run({ [ADMIN_KEY_HEADER]: KEY }), true);
});

test('rechaza sin cabecera, con cabecera vacía y con una clave incorrecta', () => {
  process.env.ADMIN_API_KEY = KEY;
  rejected({});
  rejected({ [ADMIN_KEY_HEADER]: '' });
  rejected({ [ADMIN_KEY_HEADER]: 'incorrecta' });
});

test('es sensible a mayúsculas y a una diferencia de un solo carácter', () => {
  process.env.ADMIN_API_KEY = KEY;
  rejected({ [ADMIN_KEY_HEADER]: KEY.toUpperCase() });
  rejected({ [ADMIN_KEY_HEADER]: KEY.slice(0, -1) + 'X' });
});

test('rechaza un prefijo, un sufijo y la clave con espacios', () => {
  process.env.ADMIN_API_KEY = KEY;
  rejected({ [ADMIN_KEY_HEADER]: KEY.slice(0, -1) });
  rejected({ [ADMIN_KEY_HEADER]: KEY + 'x' });
  rejected({ [ADMIN_KEY_HEADER]: ` ${KEY}` });
  rejected({ [ADMIN_KEY_HEADER]: `${KEY} ` });
});

test('rechaza una cabecera repetida (llega como arreglo)', () => {
  process.env.ADMIN_API_KEY = KEY;
  rejected({ [ADMIN_KEY_HEADER]: [KEY, KEY] });
  rejected({ [ADMIN_KEY_HEADER]: [KEY] });
});

test('falla cerrada si ADMIN_API_KEY falta o está vacía, aunque la cabecera coincida', () => {
  delete process.env.ADMIN_API_KEY;
  rejected({ [ADMIN_KEY_HEADER]: KEY });
  rejected({ [ADMIN_KEY_HEADER]: 'undefined' });
  rejected({});
  process.env.ADMIN_API_KEY = '';
  rejected({ [ADMIN_KEY_HEADER]: '' });
  rejected({ [ADMIN_KEY_HEADER]: KEY });
});

test('valor límite: 31 caracteres se rechazan y 32 se aceptan', () => {
  const k31 = 'a'.repeat(ADMIN_KEY_MIN_LENGTH - 1);
  const k32 = 'a'.repeat(ADMIN_KEY_MIN_LENGTH);
  process.env.ADMIN_API_KEY = k31;
  rejected({ [ADMIN_KEY_HEADER]: k31 });
  process.env.ADMIN_API_KEY = k32;
  assert.equal(run({ [ADMIN_KEY_HEADER]: k32 }), true);
  rejected({ [ADMIN_KEY_HEADER]: k31 });
});

test('R-02: espacios o salto de línea alrededor de la clave configurada no la invalidan', () => {
  for (const configured of [` ${KEY}`, `${KEY} `, `${KEY}\n`, `\t${KEY}\r\n`]) {
    process.env.ADMIN_API_KEY = configured;
    assert.equal(run({ [ADMIN_KEY_HEADER]: KEY }), true, JSON.stringify(configured));
    rejected({ [ADMIN_KEY_HEADER]: configured }); // la recibida no se recorta
  }
});

test('R-02: el mínimo de 32 caracteres se mide sin los espacios de los extremos', () => {
  const k31 = 'a'.repeat(ADMIN_KEY_MIN_LENGTH - 1);
  process.env.ADMIN_API_KEY = `${k31} `; // 32 caracteres con el espacio, 31 reales
  rejected({ [ADMIN_KEY_HEADER]: k31 });
  rejected({ [ADMIN_KEY_HEADER]: `${k31} ` });
  process.env.ADMIN_API_KEY = '   '.padEnd(40, ' '); // solo espacios
  rejected({ [ADMIN_KEY_HEADER]: ' '.repeat(40) });
  rejected({ [ADMIN_KEY_HEADER]: '' });
});

test('una clave muy larga o con caracteres no ASCII no rompe la comparación', () => {
  const long = 'ñ'.repeat(10_000);
  process.env.ADMIN_API_KEY = long;
  assert.equal(run({ [ADMIN_KEY_HEADER]: long }), true);
  rejected({ [ADMIN_KEY_HEADER]: 'ñ'.repeat(9_999) });
  rejected({ [ADMIN_KEY_HEADER]: 'n'.repeat(10_000) });
});

test('el mensaje de rechazo es idéntico en todos los casos y no revela ninguna clave', () => {
  const messages = new Set();
  const attempt = (envKey, headers) => {
    if (envKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = envKey;
    try { run(headers); } catch (error) { messages.add(JSON.stringify(error.getResponse())); return error; }
    assert.fail('debía rechazar');
  };
  attempt(undefined, { [ADMIN_KEY_HEADER]: KEY });
  attempt(KEY, {});
  attempt(KEY, { [ADMIN_KEY_HEADER]: 'incorrecta-sentinela-1234567890abcdef' });
  assert.equal(messages.size, 1);
  const [only] = messages;
  assert.ok(!only.includes(KEY) && !only.includes('sentinela'));
});

// --- Integración HTTP: Nest real, servicios simulados, sin BD ni terceros.
const calls = { osm: 0, oij: 0, tse: 0 };
async function startApp() {
  class TestModule {}
   Module({
    imports: [
      ThrottlerModule.forRoot([
        { name: 'osmMinute', ttl: 60 * 1000, limit: 20 },
        { name: 'osmHour', ttl: 60 * 60 * 1000, limit: 20 },
        { name: 'oijFiveMinutes', ttl: 5 * 60 * 1000, limit: 5 },
        { name: 'oijHour', ttl: 60 * 60 * 1000, limit: 5 },
      ]),
    ],
    controllers: [OsmController, OijController, TseController],
    providers: [
      { provide: OsmService, useValue: { sync: () => { calls.osm += 1; return { ok: true }; }, locations: () => [] } },
      { provide: OijService, useValue: { sync: () => { calls.oij += 1; return { ok: true }; }, overview: () => ({ ok: true }) } },
      { provide: TseService, useValue: { importZip: () => { calls.tse += 1; return { ok: true }; }, overview: () => ({ ok: true }) } },
    ],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl() };
}

const WRITES = [
  ['POST', '/osm/sync', 'osm', { 'Content-Type': 'application/json' }, '{}'],
  ['POST', '/oij/sync', 'oij', { 'Content-Type': 'application/json' }, '{"year":2026}'],
  ['POST', '/tse/import', 'tse', {}, undefined],
];

test('HTTP: los tres endpoints de escritura responden 401 sin clave o con una incorrecta y no ejecutan nada', async () => {
  process.env.ADMIN_API_KEY = KEY;
  const { app, base } = await startApp();
  try {
    for (const [method, path, key, headers, body] of WRITES) {
      for (const extra of [{}, { [ADMIN_KEY_HEADER]: 'incorrecta' }, { [ADMIN_KEY_HEADER]: '' }]) {
        const response = await fetch(base + path, { method, headers: { ...headers, ...extra }, body });
        assert.equal(response.status, 401, `${method} ${path} con ${JSON.stringify(extra)}`);
      }
      assert.equal(calls[key], 0, `${path} no debe ejecutar el servicio`);
    }
  } finally { await app.close(); }
});

test('HTTP: con la clave correcta los tres endpoints responden como antes', async () => {
  process.env.ADMIN_API_KEY = KEY;
  const { app, base } = await startApp();
  try {
    for (const [method, path, key, headers, body] of WRITES) {
      const before = calls[key];
      const response = await fetch(base + path, { method, headers: { ...headers, [ADMIN_KEY_HEADER]: KEY }, body });
      assert.ok(response.status < 300, `${method} ${path} devolvió ${response.status}`);
      assert.equal(calls[key], before + 1);
    }
  } finally { await app.close(); }
});

test('HTTP: sin ADMIN_API_KEY los tres endpoints rechazan incluso con una cabecera', async () => {
  delete process.env.ADMIN_API_KEY;
  const { app, base } = await startApp();
  try {
    for (const [method, path, , headers, body] of WRITES) {
      const response = await fetch(base + path, { method, headers: { ...headers, [ADMIN_KEY_HEADER]: KEY }, body });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  } finally { await app.close(); }
});

test('HTTP: las lecturas siguen siendo públicas (Q-02)', async () => {
  process.env.ADMIN_API_KEY = KEY;
  const { app, base } = await startApp();
  try {
    for (const path of ['/osm/locations', '/oij/overview', '/tse/overview']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
    }
  } finally { await app.close(); }
});

test('regla: todo handler POST de los controladores tiene AdminKeyGuard y ningún GET lo tiene', () => {
  const seen = [];
  for (const Controller of [OsmController, OijController, TseController]) {
    for (const name of Object.getOwnPropertyNames(Controller.prototype)) {
      const handler = Controller.prototype[name];
      const method = Reflect.getMetadata('method', handler);
      if (method === undefined) continue;
      const guards = Reflect.getMetadata('__guards__', handler) ?? [];
      const label = `${Controller.name}.${name}`;
      if (method === RequestMethod.POST) {
        assert.ok(guards.includes(AdminKeyGuard), `${label} es POST y no tiene AdminKeyGuard`);
        seen.push(label);
      } else {
        assert.ok(!guards.includes(AdminKeyGuard), `${label} es una lectura y no debe exigir clave (Q-02)`);
      }
    }
  }
  assert.equal(seen.length, 3, `se esperaban 3 POST protegidos y hay ${seen}`);
});
