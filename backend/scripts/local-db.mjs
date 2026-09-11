import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const databaseDir = fileURLToPath(new URL('../.local-postgres', import.meta.url));
mkdirSync(databaseDir, { recursive: true });
const pg = new EmbeddedPostgres({ databaseDir, user: 'postgres', password: 'local_academic_only', port: 5433, persistent: true, postgresFlags: ['-h', '127.0.0.1'] });
if (!existsSync(`${databaseDir}/PG_VERSION`)) await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'osint'");
await client.end();
if (!result.rowCount) await pg.createDatabase('osint');
console.log('PostgreSQL académico listo en 127.0.0.1:5433');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await pg.stop(); process.exit(0); });
setInterval(() => {}, 60000);

