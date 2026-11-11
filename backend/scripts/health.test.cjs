// Pruebas de GET /health (healthcheck del contenedor, ítem 3.3). Ejecutar con `npm run test:health`.
// Nest real con una BD simulada: no toca ninguna base de datos.
const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { DataSource } = require('typeorm');
const { HealthController } = require('../dist/common/health.controller');

async function start(dataSource) {
  class HealthTestModule {}
  Module({ controllers: [HealthController], providers: [{ provide: DataSource, useValue: dataSource }] })(HealthTestModule);
  const app = await NestFactory.create(HealthTestModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl() };
}

test('responde 200 {status: ok} cuando la BD contesta SELECT 1, sin pedir clave', async () => {
  const queries = [];
  const { app, base } = await start({ query: async (sql) => { queries.push(sql); return [{ '?column?': 1 }]; } });
  try {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.deepEqual(queries, ['SELECT 1']);
  } finally { await app.close(); }
});

test('responde 503 cuando la BD falla y no filtra el error ni datos de conexión', async () => {
  const { app, base } = await start({ query: async () => { throw new Error('connect ECONNREFUSED postgresql://usuario:clave-secreta@db:5432/osint'); } });
  try {
    const response = await fetch(`${base}/health`);
    assert.equal(response.status, 503);
    const text = await response.text();
    for (const leak of ['ECONNREFUSED', 'clave-secreta', 'postgresql', 'usuario', 'db:5432']) assert.equal(text.includes(leak), false, `no debe aparecer ${leak}`);
    assert.deepEqual(JSON.parse(text), { status: 'error' });
  } finally { await app.close(); }
});

test('responde 503 también si la BD tarda en fallar con un error que no es Error', async () => {
  const { app, base } = await start({ query: async () => Promise.reject('cadena') });
  try {
    assert.equal((await fetch(`${base}/health`)).status, 503);
  } finally { await app.close(); }
});

test('solo existe GET: POST responde 404 (no es un endpoint de escritura)', async () => {
  const { app, base } = await start({ query: async () => [] });
  try {
    assert.equal((await fetch(`${base}/health`, { method: 'POST' })).status, 404);
  } finally { await app.close(); }
});
