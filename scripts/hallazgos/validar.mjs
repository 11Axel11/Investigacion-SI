import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const campos = [
  'Origen', 'Versión afectada', 'Descripción', 'Evidencia',
  'Severidad y justificación', 'Responsable', 'Estado', 'Tratamiento',
  'Relaciones', 'Comprobación posterior',
];
const estados = [
  'Confirmado', 'Pendiente de investigación', 'Falso positivo',
  'Corregido', 'Riesgo aceptado temporalmente',
];
const normalizar = (texto) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const enlace = /https:\/\/[^\s<>]+/;
const sha = /\b[0-9a-f]{40}\b/i;
const relleno = /^(?:pendiente|por completar|por asignar|todo|tbd|\[completar\])\.?$/im;

// Revisa documentación: no consulta GitHub, no ejecuta Markdown y no modifica archivos.
export function validar(texto) {
  const errores = [];
  const secciones = new Map();
  let actual;
  let cerca;
  for (const linea of texto.replace(/\r\n/g, '\n').split('\n')) {
    const bloque = linea.match(/^\s*(`{3,}|~{3,})/);
    if (bloque) {
      if (!cerca) cerca = bloque[1][0];
      else if (cerca === bloque[1][0]) cerca = undefined;
      continue;
    }
    if (cerca) continue;
    const titulo = linea.match(/^##\s+(.+?)\s*$/);
    if (titulo) {
      actual = normalizar(titulo[1]);
      if (secciones.has(actual)) errores.push(`Sección duplicada: ${titulo[1]}`);
      else secciones.set(actual, '');
    } else if (actual) {
      secciones.set(actual, `${secciones.get(actual)}\n${linea}`);
    }
  }
  const contenido = (campo) => (secciones.get(normalizar(campo)) ?? '').trim();
  for (const campo of campos) {
    if (!contenido(campo)) errores.push(`Falta contenido en: ${campo}`);
    else if (relleno.test(contenido(campo))) errores.push(`Campo sin completar: ${campo}`);
  }
  if (!sha.test(contenido('Versión afectada'))) errores.push('Versión afectada debe incluir un SHA completo de 40 caracteres.');
  if (!enlace.test(contenido('Evidencia'))) errores.push('Evidencia debe incluir al menos un enlace HTTPS.');
  const severidad = contenido('Severidad y justificación');
  if (!/^(Crítica|Alta|Media|Baja|Informativa)\b/iu.test(severidad)) errores.push('Severidad debe comenzar con Crítica, Alta, Media, Baja o Informativa.');
  if (severidad.length < 40) errores.push('Severidad requiere una justificación de impacto y condiciones, no solo una etiqueta.');
  const estado = contenido('Estado').split('\n')[0].trim();
  if (!estados.includes(estado)) errores.push('Estado inválido: use uno de los cinco estados documentados.');
  if (!/\b(?:T|M|Q|IA)-\d+\b|https:\/\/github\.com\/[^\s]+\/(?:issues|pull)\/\d+/.test(contenido('Relaciones'))) {
    errores.push('Relaciones debe referenciar un ID del proyecto o un issue/PR de GitHub.');
  }
  if (estado === 'Corregido') {
    const comprobacion = contenido('Comprobación posterior');
    if (!sha.test(comprobacion) || !/https:\/\/github\.com\/[^\s]+\/actions\/runs\/\d+/.test(comprobacion)) {
      errores.push('Corregido requiere SHA de la versión comprobada y enlace a una ejecución en Comprobación posterior.');
    }
  }
  if (estado === 'Falso positivo' && !enlace.test(contenido('Comprobación posterior'))) {
    errores.push('Falso positivo requiere evidencia enlazada en Comprobación posterior.');
  }
  if (estado === 'Riesgo aceptado temporalmente') {
    const aprobacion = contenido('Aprobación humana');
    const vencimiento = contenido('Vencimiento o revisión');
    if (!aprobacion || relleno.test(aprobacion) || !enlace.test(aprobacion)) {
      errores.push('El riesgo aceptado requiere sección Aprobación humana con enlace a la decisión.');
    }
    const fecha = vencimiento.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
    const valida = fecha && !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))
      && new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;
    if (!valida) errores.push('El riesgo aceptado requiere sección Vencimiento o revisión con fecha válida AAAA-MM-DD.');
  }
  return errores;
}

export function ejecutar(rutas, salida = console) {
  if (rutas.length === 1 && rutas[0] === '--help') {
    salida.log('Uso: node scripts/hallazgos/validar.mjs archivo.md [otro.md ...]');
    salida.log('Salidas: 0 estructura válida; 1 incompleto/inválido; 2 no ejecutado (argumentos o lectura). No valida veracidad ni aprueba riesgos.');
    return 0;
  }
  if (!rutas.length) {
    salida.error('INCOMPLETO: indique al menos un archivo Markdown. Use --help.');
    return 2;
  }
  let codigo = 0;
  for (const ruta of rutas) {
    try {
      if (extname(ruta).toLowerCase() !== '.md') throw new Error('Solo se admiten archivos .md.');
      const archivo = readFileSync(ruta);
      if (archivo.length > 256 * 1024) throw new Error('Documento mayor de 256 KiB.');
      const errores = validar(archivo.toString('utf8'));
      if (errores.length) {
        codigo = Math.max(codigo, 1);
        salida.error(`${ruta}: INCOMPLETO\n${errores.map((error) => `- ${error}`).join('\n')}`);
      } else salida.log(`${ruta}: estructura válida (sin aprobación humana automática).`);
    } catch (error) {
      codigo = 2;
      salida.error(`${ruta}: NO EJECUTADO (${error.code ?? error.message}).`);
    }
  }
  return codigo;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = ejecutar(process.argv.slice(2));
}
