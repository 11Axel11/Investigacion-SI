import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import iconv from 'iconv-lite';
import { createInterface } from 'readline';
import { Readable } from 'stream';
import { Repository } from 'typeorm';
import * as unzipper from 'unzipper';
import { TseElectoralSummary } from './tse-electoral-summary.entity';

interface DistrictName {
  province: string;
  canton: string;
  district: string;
}

interface DistrictCount {
  electors: number;
  pollingStations: Set<string>;
}

@Injectable()
export class TseService {
  constructor(
    @InjectRepository(TseElectoralSummary)
    private readonly summaries: Repository<TseElectoralSummary>,
  ) {}

  async importZip(file: Express.Multer.File | undefined, sourceDate?: string) {
    if (!file) throw new BadRequestException('Debe adjuntar un archivo ZIP del TSE.');
    if (!file.originalname.toLowerCase().endsWith('.zip') || file.buffer.subarray(0, 2).toString() !== 'PK') {
      throw new BadRequestException('El archivo debe ser un ZIP válido descargado del TSE.');
    }

    const parsedSourceDate = this.validateSourceDate(sourceDate);
    const districts = new Map<string, DistrictName>();
    const counts = new Map<string, DistrictCount>();
    let padronFound = false;
    let districtFileFound = false;
    let processed = 0;

    try {
      const archive = Readable.from([file.buffer]).pipe(unzipper.Parse({ forceStream: true }));
      for await (const entry of archive) {
        const filename = String(entry.path ?? '').replaceAll('\\', '/').split('/').pop()?.toLowerCase() ?? '';
        if (filename === 'distelec.txt') {
          districtFileFound = true;
          await this.readLines(entry, (line) => {
            const [code, province, canton, district] = line.split(',', 4);
            if (/^\d{6}$/.test(code?.trim())) {
              districts.set(code.trim(), {
                province: province?.trim() || 'SIN PROVINCIA',
                canton: canton?.trim() || 'SIN CANTÓN',
                district: district?.trim() || 'SIN DISTRITO',
              });
            }
          });
        } else if (filename.endsWith('.txt') && filename !== 'leame.txt') {
          padronFound = true;
          await this.readLines(entry, (line) => {
            const fields = line.split(',');
            const code = fields[1]?.trim();
            const pollingStation = fields[4]?.trim();
            if (!/^\d{6}$/.test(code)) return;
            const current = counts.get(code) ?? { electors: 0, pollingStations: new Set<string>() };
            current.electors += 1;
            if (pollingStation) current.pollingStations.add(pollingStation);
            counts.set(code, current);
            processed += 1;
            if (processed > 5_000_000) {
              throw new BadRequestException('El padrón supera el límite seguro de cinco millones de filas.');
            }
          });
        } else {
          entry.autodrain();
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const detail = error instanceof Error ? error.message : 'estructura desconocida';
      throw new BadRequestException(`No se pudo procesar el ZIP del TSE: ${detail}`);
    }

    if (!padronFound || !districtFileFound) {
      throw new BadRequestException('El ZIP debe contener el archivo del padrón y DISTELEC.TXT.');
    }
    if (counts.size === 0) {
      throw new BadRequestException('No se encontraron registros electorales válidos.');
    }

    const sourceFile = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
    const importedAt = new Date();
    const rows = [...counts.entries()].map(([electoralCode, count]) => {
      const location = districts.get(electoralCode) ?? {
        province: 'DESCONOCIDA',
        canton: 'DESCONOCIDO',
        district: `Código ${electoralCode}`,
      };
      return {
        electoralCode,
        ...location,
        electors: count.electors,
        pollingStations: count.pollingStations.size,
        sourceFile,
        sourceDate: parsedSourceDate,
        importedAt,
      };
    });

    for (let offset = 0; offset < rows.length; offset += 500) {
      await this.summaries.upsert(rows.slice(offset, offset + 500), ['electoralCode']);
    }

    return {
      importedDistricts: rows.length,
      processedElectors: processed,
      discardedPersonalFields: true,
      sourceFile,
      sourceDate: parsedSourceDate,
      importedAt,
    };
  }

  async findAll(filters: { province?: string; canton?: string; q?: string }) {
    const qb = this.summaries.createQueryBuilder('summary');
    if (filters.province?.trim()) {
      qb.andWhere('summary.province ILIKE :province', { province: filters.province.trim() });
    }
    if (filters.canton?.trim()) {
      qb.andWhere('summary.canton ILIKE :canton', { canton: filters.canton.trim() });
    }
    if (filters.q?.trim()) {
      qb.andWhere('(summary.district ILIKE :q OR summary.electoralCode ILIKE :q)', {
        q: `%${filters.q.trim()}%`,
      });
    }
    const data = await qb.orderBy('summary.electors', 'DESC').take(250).getMany();
    return { data, total: data.length };
  }

  async overview() {
    const provinces = await this.summaries.createQueryBuilder('summary')
      .select('summary.province', 'province')
      .addSelect('SUM(summary.electors)', 'electors')
      .addSelect('SUM(summary.pollingStations)', 'pollingStations')
      .addSelect('COUNT(*)', 'districts')
      .groupBy('summary.province')
      .orderBy('SUM(summary.electors)', 'DESC')
      .getRawMany<{ province: string; electors: string; pollingStations: string; districts: string }>();

    const metadata = await this.summaries.createQueryBuilder('summary')
      .select('MAX(summary.importedAt)', 'lastImport')
      .addSelect('MAX(summary.sourceDate)', 'sourceDate')
      .addSelect('COUNT(*)', 'districts')
      .addSelect('SUM(summary.electors)', 'electors')
      .getRawOne<{ lastImport?: string; sourceDate?: string; districts: string; electors?: string }>();

    return {
      provinces: provinces.map((row) => ({
        province: row.province,
        electors: Number(row.electors),
        pollingStations: Number(row.pollingStations),
        districts: Number(row.districts),
      })),
      metadata: {
        lastImport: metadata?.lastImport,
        sourceDate: metadata?.sourceDate,
        districts: Number(metadata?.districts ?? 0),
        electors: Number(metadata?.electors ?? 0),
      },
    };
  }

  private async readLines(entry: NodeJS.ReadableStream, onLine: (line: string) => void) {
    const decoded = entry.pipe(iconv.decodeStream('windows-1252'));
    const lines = createInterface({ input: decoded, crlfDelay: Infinity });
    for await (const line of lines) {
      if (line.length > 2_000) throw new BadRequestException('Se encontró una fila inválida en el ZIP.');
      if (line.trim()) onLine(line);
    }
  }

  private validateSourceDate(value?: string) {
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())) {
      throw new BadRequestException('La fecha de corte debe tener el formato AAAA-MM-DD.');
    }
    return value;
  }
}
