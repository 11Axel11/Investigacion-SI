// Se carga en el backend con NODE_OPTIONS=--require. Simula el OIJ (catálogo CKAN y CSV) sin salir a internet.
// No modifica el código de la aplicación: solo sustituye `fetch` para las dos URLs del OIJ.
const fetchReal = globalThis.fetch;
const anio = new Date().getFullYear();
const csv = [
  `ROBO,MODALIDAD,${anio}-01-05,EDIFICACION,Farmacia [Edificacion],,,COSTA RICA,SAN JOSE,SAN JOSE,CARMEN`,
  `ROBO,MODALIDAD,${anio}-01-06,EDIFICACION,Farmacia [Edificacion],,,COSTA RICA,SAN JOSE,SAN JOSE,CARMEN`,
  `HURTO,MODALIDAD,${anio}-02-01,EDIFICACION,Banco [Edificacion],,,COSTA RICA,HEREDIA,BELEN,SAN ANTONIO`,
].join('\r\n');

globalThis.fetch = async (entrada, init) => {
  const url = new URL(String(entrada instanceof URL ? entrada.href : entrada));
  if (url.hostname === 'datosabiertospj.poder-judicial.go.cr') {
    return Response.json({ result: { resources: [{ format: 'CSV', name: `Estadísticas ${anio}`, url: 'https://pjcrdatosabiertos.blob.core.windows.net/ficticio/datos.csv' }] } });
  }
  if (url.hostname === 'pjcrdatosabiertos.blob.core.windows.net') return new Response(csv, { headers: { 'Content-Type': 'text/csv' } });
  return fetchReal(entrada, init);
};
