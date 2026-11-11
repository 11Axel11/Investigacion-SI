// ESLint del frontend (ítem 2.2). Configuración oficial de Next (React, hooks y Core Web Vitals).
// No se desactiva ninguna regla para que pase: los hallazgos se corrigen o se justifican en la línea.
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTypescript,
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default config;
