import { Google_Sans } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/components/query-provider";
import "./globals.css";

const googleSans = Google_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-google-sans",
  display: "swap",
  axes: ["opsz"],
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
});

export const metadata = {
  title: "Observatorio Territorial y Electoral CR",
  description: "Visualización responsable de fuentes OSINT sobre Costa Rica",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${googleSans.variable} h-full`}>
      <body className={`${googleSans.className} h-full overflow-x-hidden antialiased`}>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
