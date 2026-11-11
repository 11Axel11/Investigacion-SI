import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Salud del servicio para el HEALTHCHECK del contenedor (ítem 3.3). Lectura pública y mínima: responde 200 solo
 * si la BD contesta `SELECT 1`; si no, 503. No devuelve versión, host, errores ni datos de la BD (T-09).
 */
@SkipThrottle({
  osmMinute: true,
  osmHour: true,
  oijFiveMinutes: true,
  oijHour: true,
})

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'error' });
    }
    return { status: 'ok' };
  }
}
