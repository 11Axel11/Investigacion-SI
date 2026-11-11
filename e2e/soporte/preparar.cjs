// Antes de cada ejecución: BD de pruebas vacía (la crea el backend al arrancar; aquí solo se vacía si ya existe).
const { execFileSync } = require('node:child_process');
const path = require('node:path');

module.exports = async function preparar() {
  limpiar();
};
function limpiar() {
  execFileSync('node', ['scripts/pruebas/sembrar.cjs', '--limpiar'], { cwd: path.resolve(__dirname, '../../backend'), env: process.env, stdio: 'pipe' });
}
module.exports.limpiar = limpiar;
