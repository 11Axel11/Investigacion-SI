const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');

const { Module } = require('@nestjs/common');
const { APP_GUARD } = require('@nestjs/core');
const { NestFactory } = require('@nestjs/core');
const { ThrottlerGuard, ThrottlerModule } = require('@nestjs/throttler');

const { OsmController } = require('../dist/osm/osm.controller');
const { OsmService } = require('../dist/osm/osm.service');
const { OijController } = require('../dist/oij/oij.controller');
const { OijService } = require('../dist/oij/oij.service');

const ADMIN_KEY = 'clave-ficticia-rate-limit-0123456789';
const originalKey = process.env.ADMIN_API_KEY;

test.after(() => {
  if (originalKey === undefined) delete process.env.ADMIN_API_KEY;
  else process.env.ADMIN_API_KEY = originalKey;
});

const calls = { osm: 0, oij: 0 };

async function startApp() {
  class TestModule {}

  Module({
    imports: [
      ThrottlerModule.forRoot([
        { name: 'osmMinute', ttl: 60 * 1000, limit: 1 },
        { name: 'osmHour', ttl: 60 * 60 * 1000, limit: 5 },
        { name: 'oijFiveMinutes', ttl: 5 * 60 * 1000, limit: 1 },
        { name: 'oijHour', ttl: 60 * 60 * 1000, limit: 3 },
      ]),
    ],
    controllers: [OsmController, OijController],
    providers: [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
      {
        provide: OsmService,
        useValue: {
          sync: () => {
            calls.osm += 1;
            return { ok: true };
          },
          locations: () => [],
          findAll: () => [],
          findByCategory: () => [],
        },
      },
      {
        provide: OijService,
        useValue: {
          sync: () => {
            calls.oij += 1;
            return { ok: true };
          },
          overview: () => ({ ok: true }),
        },
      },
    ],
  })(TestModule);

  const app = await NestFactory.create(TestModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl() };
}

test('T-02: limita sincronizaciones y conserva públicas las lecturas', async () => {
  process.env.ADMIN_API_KEY = ADMIN_KEY;
  calls.osm = 0;
  calls.oij = 0;

  const { app, base } = await startApp();

  try {
    const headers = {
      'Content-Type': 'application/json',
      'x-admin-key': ADMIN_KEY,
    };

    const osmFirst = await fetch(`${base}/osm/sync`, {
      method: 'POST',
      headers,
      body: '{}',
    });

    const osmSecond = await fetch(`${base}/osm/sync`, {
      method: 'POST',
      headers,
      body: '{}',
    });

    assert.ok(osmFirst.status < 300, 'la primera sincronización OSM debe funcionar');
    assert.equal(osmSecond.status, 429, 'la segunda sincronización OSM debe limitarse');
    assert.equal(calls.osm, 1, 'OSM no debe ejecutarse después del límite');

    const oijFirst = await fetch(`${base}/oij/sync`, {
      method: 'POST',
      headers,
      body: '{"year":2026}',
    });

    const oijSecond = await fetch(`${base}/oij/sync`, {
      method: 'POST',
      headers,
      body: '{"year":2026}',
    });

    assert.ok(oijFirst.status < 300, 'la primera sincronización OIJ debe funcionar');
    assert.equal(oijSecond.status, 429, 'la segunda sincronización OIJ debe limitarse');
    assert.equal(calls.oij, 1, 'OIJ no debe ejecutarse después del límite');

    assert.equal((await fetch(`${base}/osm/locations`)).status, 200);
    assert.equal((await fetch(`${base}/oij/overview`)).status, 200);
  } finally {
    await app.close();
  }
});