const test = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { aggregateCsv } = require('../dist/oij/oij.parser');
const { OijService } = require('../dist/oij/oij.service');
const line = (crime, date, province, canton) => `${crime},MODALIDAD,${date},PERSONA,PEATON,Mayor de edad,,COSTA RICA,${province},${canton},DISTRITO`;
test('agrupa sin perder la primera fila y respeta comillas CSV', () => {
  const csv = [line('ROBO', '2026-01-01', 'SAN JOSE', 'SAN JOSE'), line('ROBO', '2026-01-02', 'SAN JOSE', 'SAN JOSE'), line('"HURTO, OTRO"', '2026-02-03', 'HEREDIA', 'BELEN')].join('\r\n');
  const result = aggregateCsv(Buffer.from(csv), 2026);
  assert.equal(result.total, 3);
  assert.equal(result.groups.length, 2);
  assert.equal(result.groups[0].count, 2);
  assert.equal(result.groups[1].crime, 'HURTO, OTRO');
  assert.equal(result.firstDate, '2026-01-01');
  assert.equal(result.lastDate, '2026-02-03');
  assert.deepEqual(Object.keys(result.groups[0]).sort(), ['canton', 'count', 'crime', 'district', 'modality', 'month', 'province', 'targetCategory', 'targetType']);
});
test('reconoce codificación Windows-1252', () => {
  const result = aggregateCsv(Buffer.from(line('HURTO', '2026-01-01', 'SAN JOSÉ', 'SARCHÍ'), 'latin1'), 2026);
  assert.equal(result.groups[0].canton, 'SARCHÍ');
});
test('rechaza vacíos, años distintos, columnas y fechas inválidas', () => {
  for (const csv of ['', 'DELITO,FECHA', line('ROBO', '2025-01-01', 'SAN JOSE', 'SAN JOSE'), line('ROBO', '2026-02-30', 'SAN JOSE', 'SAN JOSE')]) assert.throws(() => aggregateCsv(Buffer.from(csv), 2026));
});

test('repara nacionalidad histórica con coma sin desplazar el territorio', () => {
  const csv = 'HURTO,POR CONFIANZA,2025-02-17,VIVIENDA,NO APLICA [VIVIENDA],Mayor de edad,,VIRGENES BRITANICAS,ISLAS,ALAJUELA,ALAJUELA,ALAJUELA';
  const result = aggregateCsv(Buffer.from(csv), 2025);
  assert.equal(result.total, 1);
  assert.equal(result.groups[0].province, 'ALAJUELA');
  assert.equal(result.groups[0].canton, 'ALAJUELA');
  assert.throws(() => aggregateCsv(Buffer.from(csv.replace(',ISLAS,', ',EXTRA_INVALIDA,')), 2025));
});
test('informa CSV malformado como error de datos y no de conexión', () => {
  assert.throws(() => aggregateCsv(Buffer.from('"sin cierre'), 2025), error => error.getStatus() === 400);
});
test('separa tipo de objetivo del corchete de categoría en subvíctima', () => {
  const csv = 'ROBO,ARMA DE FUEGO,2026-03-01,EDIFICACION,Farmacia [Edificacion],,,COSTA RICA,SAN JOSE,SAN JOSE,CARMEN';
  const result = aggregateCsv(Buffer.from(csv), 2026);
  assert.equal(result.groups[0].targetCategory, 'EDIFICACION');
  assert.equal(result.groups[0].targetType, 'FARMACIA');
});
test('repara VATICANO,CIUDAD DEL conservando el cantón', () => {
  const csv = 'ROBO DE VEHICULO,COCHERAZO,2025-10-01,VEHICULO,RURAL 4X4 [VEHICULO],Desconocido,,VATICANO,CIUDAD DEL,PUNTARENAS,OSA,CORTES';
  const result = aggregateCsv(Buffer.from(csv), 2025);
  assert.equal(result.groups[0].province, 'PUNTARENAS');
  assert.equal(result.groups[0].canton, 'OSA');
});

async function verifyRejectedDownload(t, resourceUrl, download) {
  const year = 2025;
  const previous = {
    year,
    fetchedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    sourceUrl: 'https://pjcrdatosabiertos.blob.core.windows.net/oij/2025.csv',
    ...aggregateCsv(Buffer.from(line('ROBO', '2025-01-01', 'SAN JOSE', 'SAN JOSE')), year),
  };
  const findOneBy = t.mock.fn(async ({ year: requestedYear }) =>
    requestedYear === year ? previous : null);
  const save = t.mock.fn();
  const service = new OijService({ findOneBy, find: async () => [{ year }], save });
  const catalogUrl = 'https://datosabiertospj.poder-judicial.go.cr/api/3/action/package_show?id=estadisticas-policiales';
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (String(url) === catalogUrl) {
      return Response.json({
        result: { resources: [{ name: `Estadísticas ${year}`, format: 'CSV', url: resourceUrl }] },
      });
    }
    assert.equal(String(url), resourceUrl);
    return download?.(options);
  });

  const before = await service.overview({ year });
  await assert.rejects(service.sync(year), (error) => error.getStatus() === 503);
  const expectedCalls = download ? [catalogUrl, resourceUrl] : [catalogUrl];
  assert.deepEqual(fetchMock.mock.calls.map(({ arguments: [url] }) => String(url)), expectedCalls);
  assert.equal(save.mock.callCount(), 0);
  assert.deepEqual(await service.overview({ year }), before);
}

const allowedCsv = 'https://pjcrdatosabiertos.blob.core.windows.net/oij/2025.csv';

test('rechaza un CSV de otro host y conserva el agregado anterior (T-07)', async (t) => {
  await verifyRejectedDownload(t, 'https://example.invalid/oij.csv');
});

test('rechaza una redirección de un CSV del host permitido (T-07)', async (t) => {
  const validCsv = line('HURTO', '2025-01-02', 'HEREDIA', 'BELEN');
  const paths = [];
  const server = createServer((request, response) => {
    paths.push(request.url);
    if (request.url === '/original') response.writeHead(302, { Location: '/destino' }).end();
    else response.end(validCsv);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const realFetch = globalThis.fetch;
  await verifyRejectedDownload(t, allowedCsv, (options) =>
    realFetch(`http://127.0.0.1:${server.address().port}/original`, options));
  assert.deepEqual(paths, ['/original']);
});

test('interrumpe un CSV al superar 40 MiB sin leer el resto (T-07)', async (t) => {
  const chunk = Buffer.alloc(1024 * 1024);
  let read = 0;
  let closed = false;
  await verifyRejectedDownload(t, allowedCsv, () => ({
    ok: true,
    body: (async function* () {
      try {
        for (let i = 0; i < 42; i++) {
          read++;
          yield chunk;
        }
      } finally {
        closed = true;
      }
    })(),
  }));
  assert.equal(read, 41);
  assert.equal(closed, true);
});

test('interrumpe la lectura del CSV al agotarse su plazo de 60 s (T-07)', async (t) => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  const timeoutMock = t.mock.method(AbortSignal, 'timeout', (ms) => timeout(ms === 60_000 ? 10 : ms));
  let aborted = false;
  await verifyRejectedDownload(t, allowedCsv, ({ signal }) => ({
    ok: true,
    body: new ReadableStream({
      start(controller) {
        const keepAlive = setTimeout(() => controller.close(), 1000);
        signal.addEventListener('abort', () => {
          clearTimeout(keepAlive);
          aborted = true;
          controller.error(signal.reason);
        }, { once: true });
      },
    }),
  }));
  assert.deepEqual(timeoutMock.mock.calls.map(({ arguments: [ms] }) => ms), [20_000, 60_000]);
  assert.equal(aborted, true);
});
