const assert = require('node:assert/strict');
(async () => {
 const base = 'http://localhost:3001';
 const get = async path => { const r = await fetch(base + path); assert.equal(r.status, 200); return r.json(); };
 const all = await get('/oij/overview?year=2026');
 assert.ok(all.total > 0);
 for (const key of ['byProvince', 'byCrime', 'byMonth', 'cantons']) assert.equal(all[key].reduce((s,r)=>s+r.count,0), all.total);
 const filtered = await get('/oij/overview?year=2026&province=SAN%20JOSE&canton=SAN%20JOSE&crime=HURTO');
 assert.equal(filtered.cantons.length, 1);
 assert.equal(filtered.byCrime.length, 1);
 assert.equal(filtered.byCrime[0].name, 'HURTO');
 const empty = await get('/oij/overview?year=2026&province=NO_EXISTE');
 assert.equal(empty.total, 0);
 const invalid = await fetch(base + '/oij/sync', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({year:'bad'})});
 assert.equal(invalid.status,400);
 const cached = await fetch(base + '/oij/sync', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({year:2026})}).then(r=>r.json());
 assert.equal(cached.cache,true);
 for (const path of ['/osm/locations', '/tse/overview', '/coverage/health']) await get(path);
 console.log(JSON.stringify({total:all.total,filtered:filtered.total,cache:cached.cache,checks:'Sums, filters, empty state, invalid year, cache and existing API endpoints: OK'}));
})().catch(e=>{console.error(e);process.exit(1)});

