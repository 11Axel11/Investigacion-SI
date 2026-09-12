import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

export function aggregateCsv(buffer: Buffer, year: number) {
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { text = new TextDecoder('windows-1252').decode(buffer); }
  let rows: string[][];
  try {
    rows = parse(text, { bom: true, skip_empty_lines: true, trim: true, relax_column_count: true });
  } catch {
    throw new BadRequestException('El CSV del OIJ tiene un formato inválido. No se sustituyeron los datos guardados.');
  }
  const groups = new Map<string, {
    province: string; canton: string; district: string; crime: string; modality: string;
    targetCategory: string; targetType: string; month: string; count: number;
  }>();
  let firstDate = '', lastDate = '', total = 0;
  for (const sourceRow of rows) {
    // Los CSV históricos incluyen nacionalidades con una coma sin escapar.
    // Reparar únicamente los sufijos conocidos en esa posición y validar provincia.
    const provinces = ['SAN JOSE', 'ALAJUELA', 'CARTAGO', 'HEREDIA', 'GUANACASTE', 'PUNTARENAS', 'LIMON', 'DESCONOCIDO'];
    const provinceKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const row = sourceRow.length === 12
      && /^(ISLAS|REPUBLICA DEMOCRATICA DEL|REPUBLICA DEL|CIUDAD DEL)$/.test(sourceRow[8])
      && provinces.includes(provinceKey(sourceRow[9]))
      ? [...sourceRow.slice(0, 7), `${sourceRow[7]}, ${sourceRow[8]}`, ...sourceRow.slice(9)]
      : sourceRow;
    // El recurso oficial V1 no tiene encabezados: delito, modalidad, fecha,
    // víctima, subvíctima, edad, sexo, nacionalidad, provincia, cantón, distrito.
    if (row.length !== 11 || !/^\d{4}-\d{2}-\d{2}$/.test(row[2]) || Number(row[2].slice(0, 4)) !== year || !row[0] || !row[8] || !row[9]) {
      throw new BadRequestException('El CSV del OIJ cambió de estructura o contiene filas inválidas. No se sustituyeron los datos guardados.');
    }
    const date = row[2];
    if (Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new BadRequestException('Fecha inválida en el CSV.');
    // subvíctima llega como "FARMACIA [EDIFICACION]": el corchete es la
    // categoría del objetivo (persona/vivienda/vehículo/edificación) y el
    // texto previo el tipo específico (farmacia, banco, bar...), clave para
    // cruzar delitos contra un tipo de negocio puntual.
    const rawTarget = row[4]?.trim().toUpperCase() || '';
    const targetType = rawTarget.replace(/\s*\[[^\]]*\]\s*$/, '').trim() || 'DESCONOCIDO';
    const group = {
      province: row[8].trim().toUpperCase(),
      canton: row[9].trim().toUpperCase(),
      district: row[10]?.trim().toUpperCase() || 'DESCONOCIDO',
      crime: row[0].trim().toUpperCase(),
      modality: row[1]?.trim().toUpperCase() || 'DESCONOCIDA',
      targetCategory: row[3]?.trim().toUpperCase() || 'DESCONOCIDA',
      targetType,
      month: date.slice(0, 7),
      count: 0,
    };
    const key = JSON.stringify([group.province, group.canton, group.district, group.crime, group.modality, group.targetCategory, group.targetType, group.month]);
    const item = groups.get(key) ?? group;
    item.count++;
    groups.set(key, item);
    total++;
    if (!firstDate || date < firstDate) firstDate = date;
    if (date > lastDate) lastDate = date;
  }
  if (!total) throw new BadRequestException('El archivo del OIJ está vacío.');
  return { groups: [...groups.values()], total, firstDate, lastDate };
}


