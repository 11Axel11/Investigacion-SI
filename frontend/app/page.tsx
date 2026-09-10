import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <span className="eyebrow">Fuentes abiertas · Costa Rica</span>
        <h1>Observatorio territorial y electoral</h1>
        <p>
          Una aplicación que convierte dos fuentes OSINT en información consultable:
          infraestructura cercana de OpenStreetMap y estadísticas agregadas del padrón electoral del TSE.
        </p>
      </section>

      <section className="cards" aria-label="Módulos del observatorio">
        <article className="card card-map">
          <span className="card-number">01</span>
          <h2>Servicios en el territorio</h2>
          <p>
            Consulta hospitales, clínicas, farmacias, centros educativos y servicios de emergencia
            dentro de cualquier provincia o cantón del país.
          </p>
          <p className="source-tag">OpenStreetMap · Overpass API · JSON normalizado y caché</p>
          <Link className="button-link" href="/mapa">Explorar el mapa →</Link>
        </article>

        <article className="card card-tse">
          <span className="card-number">02</span>
          <h2>Radiografía electoral</h2>
          <p>
            Importa un ZIP oficial del TSE y analiza cantidades de electores y juntas por provincia,
            cantón y distrito electoral.
          </p>
          <p className="source-tag">TSE · ZIP/TXT · ETL agregado sin datos personales</p>
          <Link className="button-link" href="/electoral">Ver datos electorales →</Link>
        </article>
      </section>

      <section className="principles">
        <h2>Del dato público a una capacidad útil</h2>
        <div>
          <p><strong>Consumir</strong><br />El backend consulta o procesa cada fuente real.</p>
          <p><strong>Transformar</strong><br />Los formatos externos se normalizan antes de guardarlos.</p>
          <p><strong>Visualizar</strong><br />Mapas, resúmenes y filtros permiten interpretar los resultados.</p>
        </div>
      </section>
    </>
  );
}
