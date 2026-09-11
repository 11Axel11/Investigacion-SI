import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OijDataset } from './oij-dataset.entity';
import { aggregateCsv } from './oij.parser';

export const OIJ_SOURCE = 'https://datosabiertospj.poder-judicial.go.cr/dataset/estadisticas-policiales';
const CATALOG = 'https://datosabiertospj.poder-judicial.go.cr/api/3/action/package_show?id=estadisticas-policiales';

@Injectable()
export class OijService {
  private pending = new Map<number, Promise<OijDataset>>();
  constructor(@InjectRepository(OijDataset) private readonly repo: Repository<OijDataset>) {}

  year(value: unknown) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 2015 || year > new Date().getFullYear()) throw new BadRequestException('Seleccione un año válido desde 2015.');
    return year;
  }

  async sync(value: unknown) {
    const year = this.year(value);
    const cached = await this.repo.findOneBy({ year });
    if (cached && Date.now() - cached.fetchedAt.getTime() < 3600000) return { ...cached, groups: undefined, cache: true };
    let task = this.pending.get(year);
    if (!task) { task = this.download(year); this.pending.set(year, task); }
    try { const data = await task; return { ...data, groups: undefined, cache: false }; }
    finally { this.pending.delete(year); }
  }

  private async download(year: number) {
    try {
      const catalogResponse = await fetch(CATALOG, { signal: AbortSignal.timeout(20000) });
      if (!catalogResponse.ok) throw new Error('Catálogo no disponible');
      const catalog = await catalogResponse.json();
      const resource = catalog.result?.resources?.find((r: any) => String(r.format).toUpperCase() === 'CSV' && new RegExp(`\\b${year}\\b`).test(r.name));
      if (!resource) throw new BadRequestException('El catálogo no publica CSV para ese año.');
      const url = new URL(resource.url);
      if (url.protocol !== 'https:' || url.hostname !== 'pjcrdatosabiertos.blob.core.windows.net') throw new Error('Origen del recurso inesperado');
      const response = await fetch(url, { signal: AbortSignal.timeout(60000), redirect: 'error' });
      if (!response.ok || !response.body) throw new Error('CSV no disponible');
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of response.body as any) {
        size += chunk.length;
        if (size > 40 * 1024 * 1024) { throw new Error('CSV excede 40 MB'); }
        chunks.push(Buffer.from(chunk));
      }
      const parsed = aggregateCsv(Buffer.concat(chunks), year);
      return await this.repo.save({ year, sourceUrl: url.href, fetchedAt: new Date(), ...parsed });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException('No fue posible consultar el OIJ. Reintente más tarde; los datos previamente importados se conservan.');
    }
  }

  async overview(query: { year?: string; province?: string; canton?: string; crime?: string }) {
    const year = this.year(query.year ?? new Date().getFullYear());
    const dataset = await this.repo.findOneBy({ year });
    const years = (await this.repo.find({ select: { year: true }, order: { year: 'DESC' } })).map(r => r.year);
    const all = dataset?.groups ?? [];
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const same = (a: string, b?: string) => !b || normalize(a) === normalize(b);
    const rows = all.filter(r => same(r.province, query.province) && same(r.canton, query.canton) && same(r.crime, query.crime));
    const sumBy = (key: 'province' | 'crime' | 'month') => {
      const counts = new Map<string, number>();
      rows.forEach(r => counts.set(r[key], (counts.get(r[key]) ?? 0) + r.count));
      return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => key === 'month' ? a.name.localeCompare(b.name) : b.count - a.count);
    };
    const cantons = new Map<string, { province: string; canton: string; count: number }>();
    rows.forEach(r => { const key = JSON.stringify([r.province, r.canton]); const item = cantons.get(key) ?? { province: r.province, canton: r.canton, count: 0 }; item.count += r.count; cantons.set(key, item); });
    return {
      total: rows.reduce((sum, r) => sum + r.count, 0), years,
      byProvince: sumBy('province'), byCrime: sumBy('crime'), byMonth: sumBy('month'),
      cantons: [...cantons.values()].sort((a, b) => b.count - a.count),
      options: { provinces: [...new Set(all.map(r => r.province))].sort(), cantons: [...new Set(all.filter(r => same(r.province, query.province)).map(r => r.canton))].sort(), crimes: [...new Set(all.map(r => r.crime))].sort() },
      metadata: dataset ? { year, source: OIJ_SOURCE, sourceUrl: dataset.sourceUrl, fetchedAt: dataset.fetchedAt, firstDate: dataset.firstDate, lastDate: dataset.lastDate, importedRecords: dataset.total } : null,
    };
  }
}
