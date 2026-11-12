import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

const DEFAULT_CORS_ORIGIN =
  'http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3100';

export function corsOrigins(
  configuredOrigins = process.env.CORS_ORIGINS,
): string[] {
  return (configuredOrigins ?? DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function configureHttpSecurity(app: INestApplication): void {
  app.use(helmet());

  app.enableCors({
    origin: corsOrigins(),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Admin-Key'],
    maxAge: 86_400,
  });
}