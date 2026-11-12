const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');

const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { ThrottlerModule } = require('@nestjs/throttler');

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
        { name: 'osmMinute', ttl: 60 * 1000, limit: 20 },
        { name: 'osmHour', ttl: 60 * 60 * 1000, limit: 20 },
        { name: 'oijFiveMinutes', ttl: 5 * 60 * 1000, limit: 20 },
        { name: 'oijHour', ttl: 60 * 60 * 1000, limit: 20 },
      ]),
    ],
    controllers: [OsmController, OijController],
    providers: [
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

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${base}/osm/sync`, {
        method: 'POST',
        headers,
        body: '{}',
      });
      assert.ok(response.status < 300, `OSM intento ${attempt + 1}`);
    }

    const osmBlocked = await fetch(`${base}/osm/sync`, {
      method: 'POST',
      headers,
      body: '{}',
    });

    assert.equal(osmBlocked.status, 429);
    assert.equal(calls.osm, 20);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetch(`${base}/oij/sync`, {
        method: 'POST',
        headers,
        body: '{"year":2026}',
      });
      assert.ok(response.status < 300, `OIJ intento ${attempt + 1}`);
    }

    const oijBlocked = await fetch(`${base}/oij/sync`, {
      method: 'POST',
      headers,
      body: '{"year":2026}',
    });

    assert.equal(oijBlocked.status, 429);
    assert.equal(calls.oij, 20);

    assert.equal((await fetch(`${base}/osm/locations`)).status, 200);
    assert.equal((await fetch(`${base}/oij/overview`)).status, 200);
  } finally {
    await app.close();
  }
});