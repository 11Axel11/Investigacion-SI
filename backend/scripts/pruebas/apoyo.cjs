// Apoyo común de las pruebas con BD (ítems 4.1, 4.3, 4.5, 4.6, 4.9). Solo datos FICTICIOS.
// Necesita TEST_DATABASE_URL (la entrega `scripts/pruebas/ambiente.sh up`). Si falta, la prueba FALLA con un
// mensaje claro: una prueba que no pudo correr es INCOMPLETA, nunca aprobada.
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { DataSource } = require('typeorm');

/** Clave de administración FICTICIA para las pruebas (35 caracteres; no es un secreto real). */
const CLAVE_ADMIN = 'clave-ficticia-de-prueba-0123456789';
const CABECERA = 'X-Admin-Key';

function urlBD() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL no está definida: ejecuta `scripts/pruebas/ambiente.sh up` y exporta su `url`. Prueba INCOMPLETA.');
  }
  // Nunca se apunta a una BD que no sea la efímera de pruebas.
  if (!/@(127\.0\.0\.1|localhost)(:\d+)?\//.test(url)) throw new Error('TEST_DATABASE_URL debe apuntar a 127.0.0.1 o localhost.');
  return url;
}

/** Levanta la aplicación real (todos los módulos) contra la BD de pruebas, en un puerto libre. */
async function abrirApp(opciones = {}) {
  const { claveAdmin } = { claveAdmin: CLAVE_ADMIN, ...opciones };
  process.env.DATABASE_URL = urlBD();
  if (claveAdmin == null) delete process.env.ADMIN_API_KEY;
  else process.env.ADMIN_API_KEY = claveAdmin;
  const { AppModule } = require('../../dist/app.module');
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl(), dataSource: app.get(DataSource) };
}

async function vaciar(dataSource) {
  const tablas = dataSource.entityMetadatas.map((m) => `"${m.tableName}"`).join(', ');
  await dataSource.query(`TRUNCATE ${tablas} RESTART IDENTITY CASCADE`);
}

const anio = new Date().getFullYear();

/** Datos inventados: ningún dato del padrón real ni de personas. */
async function sembrar(dataSource) {
  await vaciar(dataSource);
  await dataSource.query(
    `INSERT INTO tse_electoral_summary ("electoralCode", province, canton, district, electors, "pollingStations", "sourceFile", "sourceDate")
     VALUES ('101001','SAN JOSE','CENTRAL','CARMEN',1000,5,'ficticio.zip','2026-01-01'),
            ('101002','SAN JOSE','CENTRAL','MERCED',3000,9,'ficticio.zip','2026-01-01'),
            ('201001','ALAJUELA','CENTRAL','ALAJUELA',2000,8,'ficticio.zip','2026-01-01'),
            ('301001','CARTAGO','CENTRAL','ORIENTAL',500,2,'ficticio.zip','2026-01-01')`,
  );
  const lugares = [
    ['node', '1', 'San José', 'San José', 'hospital', 'Hospital Ficticio Uno'],
    ['node', '2', 'San José', 'San José', 'pharmacy', 'Farmacia Ficticia Uno'],
    ['node', '3', 'San José', 'San José', 'police', 'Delegación Ficticia Uno'],
    ['node', '4', 'Alajuela', 'Alajuela', 'clinic', 'Clínica Ficticia Dos'],
    ['node', '5', 'Alajuela', 'Alajuela', 'pharmacy', 'Farmacia Ficticia Dos'],
  ];
  for (const [osmType, osmId, province, canton, category, name] of lugares) {
    await dataSource.query(
      `INSERT INTO osm_place ("osmType","osmId",province,canton,category,name,latitude,longitude) VALUES ($1,$2,$3,$4,$5,$6,9.93,-84.08)`,
      [osmType, osmId, province, canton, category, name],
    );
  }
  const grupo = (province, canton, crime, targetType, count) => ({
    province, canton, district: 'DISTRITO', crime, modality: 'MODALIDAD', targetCategory: 'EDIFICACION', targetType, month: `${anio}-01`, count,
  });
  const grupos = [
    grupo('SAN JOSE', 'SAN JOSE', 'ROBO', 'FARMACIA', 10),
    grupo('SAN JOSE', 'SAN JOSE', 'HURTO', 'BANCO', 4),
    grupo('ALAJUELA', 'ALAJUELA', 'ROBO', 'FARMACIA', 2),
    grupo('CARTAGO', 'CARTAGO', 'HURTO', 'BAR', 1),
  ];
  await dataSource.query(
    `INSERT INTO oij_dataset (year,"sourceUrl","fetchedAt","firstDate","lastDate",total,groups) VALUES ($1,$2,now(),$3,$4,$5,$6)`,
    [anio, 'https://ejemplo.invalid/ficticio.csv', `${anio}-01-01`, `${anio}-01-31`, 17, JSON.stringify(grupos)],
  );
}

module.exports = { CLAVE_ADMIN, CABECERA, abrirApp, vaciar, sembrar, anio, urlBD };
