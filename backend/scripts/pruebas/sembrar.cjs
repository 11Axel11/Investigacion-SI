// Carga (o vacía con --limpiar) los datos FICTICIOS en la BD de pruebas. Lo invoca scripts/pruebas/ambiente.sh.
const { abrirApp, sembrar, vaciar } = require('./apoyo.cjs');

(async () => {
  const { app, dataSource } = await abrirApp();
  try {
    if (process.argv.includes('--limpiar')) {
      await vaciar(dataSource);
      console.log('Tablas vaciadas.');
    } else {
      await sembrar(dataSource);
      console.log('Datos ficticios cargados (TSE, OIJ y OSM inventados).');
    }
  } finally {
    await app.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
