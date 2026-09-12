/** @type {import('next').NextConfig} */
const nextConfig = {
  // Evita que el servidor de desarrollo genere archivos de instrucciones ajenos al proyecto.
  agentRules: false,
  // react-leaflet v4 no soporta el doble montaje de efectos de Strict Mode:
  // reinicializa Leaflet sobre el mismo nodo DOM y tira "Map container is
  // already initialized". Ver /cobertura (ViabilityMap).
  reactStrictMode: false,
};

module.exports = nextConfig;
