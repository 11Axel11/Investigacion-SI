// Overpass FALSO para las pruebas E2E (ítem 4.4): responde siempre lo mismo y sin salir a internet.
const http = require('node:http');

const PUERTO = Number(process.env.EXTERNOS_PUERTO ?? 4010);
const lugar = (id, nombre) => ({ type: 'node', id, lat: 9.93 + id / 1e4, lon: -84.08, tags: { amenity: 'hospital', name: nombre } });

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/salud') { res.writeHead(200); res.end('ok'); return; }
  let datos = '';
  req.on('data', (parte) => { datos += parte; });
  req.on('end', () => {
    const nivel = decodeURIComponent(datos).includes('"admin_level"="6"') ? '6' : '4';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      osm3s: { timestamp_osm_base: '2026-01-01T00:00:00Z' },
      elements: [
        { type: 'relation', id: 1, tags: { boundary: 'administrative', admin_level: nivel, name: 'San José' }, center: { lat: 9.93, lon: -84.08 } },
        lugar(11, 'Hospital Ficticio A'),
        lugar(12, 'Hospital Ficticio B'),
      ],
    }));
  });
}).listen(PUERTO, '127.0.0.1', () => console.log(`Overpass falso en 127.0.0.1:${PUERTO}`));
