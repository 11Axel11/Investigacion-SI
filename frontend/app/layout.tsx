import { QueryProvider } from '@/components/query-provider';
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Observatorio Territorial y Electoral CR',
  description: 'Visualización responsable de fuentes OSINT sobre Costa Rica',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>
          <header className="nav">
            <Link className="brand" href="/">Observatorio CR</Link>
            <nav aria-label="Navegación principal">
              <Link href="/mapa">Mapa OSM</Link>
              <Link href="/electoral">Datos TSE</Link>
            </nav>
          </header>
          <main className="container">{children}</main>
          <footer>
            Proyecto académico OSINT · Datos públicos, procedencia visible y uso responsable
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
