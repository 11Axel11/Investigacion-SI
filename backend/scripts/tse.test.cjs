// Pruebas de la regla de negocio F-01 (importar el padrón del TSE). Ejecutar con `npm run test:tse`.
// Usan ZIP FICTICIOS armados en la prueba (cédulas, nombres y códigos inventados) y un repositorio
// simulado: no tocan la BD, la red ni datos reales del padrón (AGENTS.md, reglas de seguridad).
const test = require('node:test');
const assert = require('node:assert/strict');
const { deflateRawSync } = require('node:zlib');
const { BadRequestException } = require('@nestjs/common');
const { TseService } = require('../dist/tse/tse.service');

// ---------- ZIP mínimo (método "deflate"; suficiente para unzipper) ----------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function makeZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'latin1');
    const packed = deflateRawSync(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, packed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

// ---------- Datos inventados ----------
// DISTELEC.TXT: código,provincia,cantón,distrito. Padrón: cédula,código,sexo,vencimiento,junta,nombre...
const DISTELEC = ['101001,SAN JOSÉ,SAN JOSÉ,CARMEN', '101002,SAN JOSÉ,SAN JOSÉ,MERCED', '201001,ALAJUELA,ALAJUELA,ALAJUELA'].join('\r\n');
const SECRET_ID = '900000001'; // cédula ficticia
const SECRET_NAME = 'PERSONA FICTICIA UNO';
const SECRET_EXPIRY = '20991231';
const padronRow = (id, code, junta, name = 'PERSONA FICTICIA', expiry = '20300101') => `${id},${code},1,${expiry},${junta},${name},APELLIDO`;
const PADRON = [
  padronRow(SECRET_ID, '101001', '0001', SECRET_NAME, SECRET_EXPIRY),
  padronRow('900000002', '101001', '0001'),
  padronRow('900000003', '101001', '0002'),
  padronRow('900000004', '101002', '0003'),
  padronRow('900000005', '201001', '0004'),
].join('\r\n');
const goodZip = () => makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON_COMPLETO.txt': PADRON });

const file = (buffer, originalname = 'padron-ficticio.zip') => ({ buffer, originalname });
function fakeRepo() {
  const store = new Map();
  const calls = [];
  return {
    store,
    calls,
    async upsert(rows, conflictKeys) {
      calls.push({ size: rows.length, conflictKeys });
      for (const row of rows) store.set(row.electoralCode, { ...row });
    },
  };
}
const serviceWith = (repo = fakeRepo()) => ({ repo, service: new TseService(repo) });
const rejects400 = async (service, repo, input, sourceDate) => {
  await assert.rejects(() => service.importZip(input, sourceDate), (error) => {
    assert.ok(error instanceof BadRequestException, `esperaba 400, llegó ${error?.constructor?.name}: ${error?.message}`);
    assert.equal(error.getStatus(), 400);
    return true;
  });
  assert.equal(repo.calls.length, 0, 'un rechazo no debe escribir en la BD (F01-AC3)');
};

// ---------- F01-AC1: éxito ----------
test('F01-AC1: importa conteos por distrito y declara que descartó los datos personales', async () => {
  const { service, repo } = serviceWith();
  const result = await service.importZip(file(goodZip()), '2026-02-28');
  assert.equal(result.importedDistricts, 3);
  assert.equal(result.processedElectors, 5);
  assert.equal(result.discardedPersonalFields, true);
  assert.equal(result.sourceDate, '2026-02-28');
  const carmen = repo.store.get('101001');
  assert.equal(carmen.electors, 3);
  assert.equal(carmen.pollingStations, 2, 'cuenta juntas distintas, no electores');
  assert.deepEqual([carmen.province, carmen.canton, carmen.district], ['SAN JOSÉ', 'SAN JOSÉ', 'CARMEN']);
});

test('F01-AC1: decodifica Windows-1252 (tildes y Ñ de los nombres territoriales)', async () => {
  const { service, repo } = serviceWith();
  const distelec = Buffer.from('301001,CARTAGO,PARAÍSO,OROSÍ\r\n301002,CARTAGO,LA UNIÓN,SAN DIEGO\r\n', 'latin1');
  const padron = Buffer.from(`${padronRow('900000006', '301001', '0001')}\r\n`, 'latin1');
  await service.importZip(file(makeZip({ 'distelec.txt': distelec, 'padron.txt': padron })));
  assert.equal(repo.store.get('301001').canton, 'PARAÍSO');
  assert.equal(repo.store.get('301001').district, 'OROSÍ');
});

// ---------- F01-AC2: privacidad ----------
test('F01-AC2: ni la BD ni la respuesta contienen cédula, nombre ni vencimiento', async () => {
  const { service, repo } = serviceWith();
  const result = await service.importZip(file(goodZip()), '2026-02-28');
  const everything = JSON.stringify({ result, rows: [...repo.store.values()] });
  for (const secret of [SECRET_ID, SECRET_NAME, SECRET_EXPIRY, 'APELLIDO', 'PERSONA FICTICIA']) {
    assert.equal(everything.includes(secret), false, `no debe aparecer "${secret}"`);
  }
  const allowed = ['electoralCode', 'province', 'canton', 'district', 'electors', 'pollingStations', 'sourceFile', 'sourceDate', 'importedAt'];
  for (const row of repo.store.values()) assert.deepEqual(Object.keys(row).sort(), [...allowed].sort());
});

test('F01-AC2: los mensajes de error tampoco filtran datos personales', async () => {
  const { service, repo } = serviceWith();
  const withoutValidRows = makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': `${SECRET_ID},XXXXXX,1,${SECRET_EXPIRY},0001,${SECRET_NAME}\r\n` });
  const longLine = makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': `${padronRow(SECRET_ID, '101001', '0001', SECRET_NAME)}${'x'.repeat(2_100)}\r\n` });
  for (const zip of [withoutValidRows, longLine]) {
    await assert.rejects(() => service.importZip(file(zip)), (error) => {
      const text = `${error.message} ${JSON.stringify(error.getResponse?.() ?? '')}`;
      for (const secret of [SECRET_ID, SECRET_NAME, SECRET_EXPIRY]) assert.equal(text.includes(secret), false);
      return true;
    });
  }
  assert.equal(repo.calls.length, 0);
});

// ---------- F01-AC3: errores de archivo ----------
test('F01-AC3: rechaza sin archivo, sin extensión .zip y sin firma ZIP', async () => {
  const { service, repo } = serviceWith();
  await rejects400(service, repo, undefined);
  await rejects400(service, repo, file(goodZip(), 'padron.txt'));
  await rejects400(service, repo, file(Buffer.from('esto no es un zip'), 'padron.zip'));
  await rejects400(service, repo, file(Buffer.alloc(0), 'padron.zip'));
  await rejects400(service, repo, file(Buffer.from('P'), 'padron.zip'));
});

test('F01-AC3: acepta la extensión .ZIP en mayúsculas', async () => {
  const { service } = serviceWith();
  const result = await service.importZip(file(goodZip(), 'PADRON.ZIP'));
  assert.equal(result.importedDistricts, 3);
});

test('F01-AC3: rechaza un ZIP sin DISTELEC.TXT, sin padrón o sin registros válidos', async () => {
  const { service, repo } = serviceWith();
  await rejects400(service, repo, file(makeZip({ 'PADRON.txt': PADRON })));
  await rejects400(service, repo, file(makeZip({ 'DISTELEC.TXT': DISTELEC })));
  await rejects400(service, repo, file(makeZip({ 'DISTELEC.TXT': DISTELEC, 'LEAME.txt': 'solo un léame' })));
  await rejects400(service, repo, file(makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': 'a,12345,c,d,e\r\n,,,\r\n' })));
});

test('F01-AC3: un ZIP corrupto responde 400, no 500', async () => {
  const { service, repo } = serviceWith();
  const zip = goodZip();
  await rejects400(service, repo, file(Buffer.concat([zip.subarray(0, 40), Buffer.alloc(30, 0xff)])));
  await rejects400(service, repo, file(Buffer.from('PK\u0003\u0004basura-despues-de-la-firma')));
});

test('F01-AC3: los datos anteriores no cambian cuando la importación falla', async () => {
  const { service, repo } = serviceWith();
  await service.importZip(file(goodZip()));
  const before = JSON.stringify([...repo.store.entries()]);
  const callsBefore = repo.calls.length;
  await assert.rejects(() => service.importZip(file(makeZip({ 'DISTELEC.TXT': DISTELEC }))));
  assert.equal(JSON.stringify([...repo.store.entries()]), before);
  assert.equal(repo.calls.length, callsBefore);
});

// ---------- F01-AC4: límites ----------
test('F01-AC4: valor límite de la longitud de línea (2 000 válida, 2 001 rechazada)', async () => {
  const base = padronRow('900000007', '101001', '0001');
  const lineOf = (length) => base + 'x'.repeat(length - base.length);
  const { service, repo } = serviceWith();
  const ok = await service.importZip(file(makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': lineOf(2_000) })));
  assert.equal(ok.processedElectors, 1);
  const callsBefore = repo.calls.length;
  await assert.rejects(() => service.importZip(file(makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': lineOf(2_001) }))), BadRequestException);
  assert.equal(repo.calls.length, callsBefore, 'rechazo sin escribir');
});

// ---------- F01-AC5: fecha de corte ----------
test('F01-AC5: valida AAAA-MM-DD con valores límite', async () => {
  const valid = ['2026-02-28', '2024-02-29', '2000-02-29', '2026-04-30', '2026-12-31', '2026-01-01'];
  const invalid = ['2026-13-01', '2026-00-10', '2026-01-00', '2026-02-30', '2025-02-29', '2026-04-31', '2100-02-29', '2026-1-1', '26-01-01', '2026/01/01', '01-01-2026', '2026-01-01T00:00:00Z', ' 2026-01-01', 'hoy'];
  for (const date of valid) {
    const { service } = serviceWith();
    assert.equal((await service.importZip(file(goodZip()), date)).sourceDate, date, date);
  }
  for (const date of invalid) {
    const { service, repo } = serviceWith();
    await rejects400(service, repo, file(goodZip()), date);
  }
});

test('F01-AC5: la fecha de corte es opcional', async () => {
  const { service } = serviceWith();
  assert.equal((await service.importZip(file(goodZip()))).sourceDate, undefined);
  assert.equal((await service.importZip(file(goodZip()), '')).sourceDate, undefined);
});

// ---------- F01-AC6: idempotencia ----------
test('F01-AC6: importar dos veces el mismo ZIP actualiza por electoralCode sin duplicar', async () => {
  const { service, repo } = serviceWith();
  const withoutImportedAt = () => JSON.stringify([...repo.store.values()].map((row) => ({ ...row, importedAt: undefined })));
  await service.importZip(file(goodZip()), '2026-02-28');
  const first = withoutImportedAt();
  await service.importZip(file(goodZip()), '2026-02-28');
  const second = withoutImportedAt();
  assert.equal(repo.store.size, 3);
  assert.equal(second, first);
  assert.ok(repo.calls.every((call) => JSON.stringify(call.conflictKeys) === JSON.stringify(['electoralCode'])));
});

test('F01-AC6: un segundo ZIP con otros conteos reemplaza los del mismo distrito', async () => {
  const { service, repo } = serviceWith();
  await service.importZip(file(goodZip()));
  const smaller = makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': padronRow('900000008', '101001', '0009') });
  await service.importZip(file(smaller));
  assert.equal(repo.store.get('101001').electors, 1);
  assert.equal(repo.store.get('101001').pollingStations, 1);
});

// ---------- Reglas de procesamiento ----------
test('descarta filas con código de distrito que no tiene exactamente 6 dígitos', async () => {
  const { service, repo } = serviceWith();
  const rows = [padronRow('900000009', '101001', '0001'), padronRow('900000010', '10100', '0001'), padronRow('900000011', '1010011', '0001'), padronRow('900000012', '10100A', '0001'), padronRow('900000013', '', '0001')];
  const result = await service.importZip(file(makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': rows.join('\r\n') })));
  assert.equal(result.processedElectors, 1);
  assert.equal(result.importedDistricts, 1);
  assert.deepEqual([...repo.store.keys()], ['101001']);
});

test('ignora LEAME.txt y archivos que no son .txt, y acepta rutas con carpetas', async () => {
  const { service } = serviceWith();
  const zip = makeZip({ 'datos/DISTELEC.TXT': DISTELEC, 'datos/PADRON.txt': PADRON, 'datos/LEAME.txt': 'leeme', 'datos/otro.csv': 'a,b,c' });
  const result = await service.importZip(file(zip));
  assert.equal(result.processedElectors, 5);
});

test('guarda en lotes de 500 distritos (valores límite 500 y 501)', async () => {
  const codes = (n) => Array.from({ length: n }, (_, i) => String(100000 + i));
  const build = (n) => makeZip({
    'DISTELEC.TXT': codes(n).map((c) => `${c},P,C,D${c}`).join('\r\n'),
    'PADRON.txt': codes(n).map((c) => padronRow(`9${c}`, c, '0001')).join('\r\n'),
  });
  for (const [n, sizes] of [[500, [500]], [501, [500, 1]], [1_200, [500, 500, 200]]]) {
    const { service, repo } = serviceWith();
    await service.importZip(file(build(n)));
    assert.deepEqual(repo.calls.map((call) => call.size), sizes, `${n} distritos`);
    assert.equal(repo.store.size, n);
  }
});

test('el nombre del archivo de origen se sanea y se limita a 255 caracteres', async () => {
  const { service, repo } = serviceWith();
  const result = await service.importZip(file(goodZip(), `pa/dr ón;<script>${'a'.repeat(300)}.zip`));
  assert.match(result.sourceFile, /^[a-zA-Z0-9._-]+$/);
  assert.ok(result.sourceFile.length <= 255);
  assert.equal(repo.store.get('101001').sourceFile, result.sourceFile);
});

// ---------- Brechas conocidas (reglas [A] que el código aún no cumple) ----------
// Se registran como `todo`: no hacen fallar la suite, pero quedan visibles en el reporte.
// F01-AC8 (T-03, M-03) y F01-AC9 (IA-03) están en la KB como brecha actual; ver flujos.md.
test('F01-AC8: rechaza un ZIP con .txt adicionales o descompresión desproporcionada', { todo: 'brecha T-03 / M-03' }, async () => {
  const { service, repo } = serviceWith();
  const extra = makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': PADRON, 'EXTRA.txt': padronRow('900000014', '101001', '0001') });
  await rejects400(service, repo, file(extra));
});
test('F01-AC9: informa unknownDistricts y excluye distritos sin nombre territorial', { todo: 'brecha IA-03' }, async () => {
  const { service } = serviceWith();
  const result = await service.importZip(file(makeZip({ 'DISTELEC.TXT': DISTELEC, 'PADRON.txt': padronRow('900000015', '999999', '0001') })));
  assert.equal(result.unknownDistricts, 1);
});
