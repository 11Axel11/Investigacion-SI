// Pruebas de T-09: cabeceras de seguridad y CORS.
// Ejecutar con: npm run test:t09
const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');

const { Controller, Get, Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { configureHttpSecurity } = require('../dist/common/http-security');

async function startApp() {
  class TestController {
    health() {
      return { ok: true };
    }
  }

  Controller('health')(TestController);
  Get()(
    TestController.prototype,
    'health',
    Object.getOwnPropertyDescriptor(TestController.prototype, 'health'),
  );

  class TestModule {}
  Module({ controllers: [TestController] })(TestModule);

  const app = await NestFactory.create(TestModule, { logger: false });
  configureHttpSecurity(app);
  await app.listen(0, '127.0.0.1');

  return { app, base: await app.getUrl() };
}

test('T-09: Helmet agrega cabeceras y CORS acepta solo el origen permitido', async () => {
  const originalOrigins = process.env.CORS_ORIGINS;
 process.env.CORS_ORIGINS =
  'http://localhost:3000,http://127.0.0.1:3100';

  const { app, base } = await startApp();

  try {
    const allowed = await fetch(`${base}/health`, {
      headers: { Origin: 'http://127.0.0.1:3100'},
    });

    assert.equal(allowed.status, 200);
    assert.equal(
      allowed.headers.get('access-control-allow-origin'),
      'http://127.0.0.1:3100',
    );
    assert.equal(allowed.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(allowed.headers.get('x-frame-options'), 'SAMEORIGIN');

    const rejected = await fetch(`${base}/health`, {
      headers: { Origin: 'https://sitio-ajeno.test' },
    });

    assert.equal(rejected.status, 200);
    assert.equal(rejected.headers.get('access-control-allow-origin'), null);
  } finally {
    await app.close();

    if (originalOrigins === undefined) {
      delete process.env.CORS_ORIGINS;
    } else {
      process.env.CORS_ORIGINS = originalOrigins;
    }
  }
});