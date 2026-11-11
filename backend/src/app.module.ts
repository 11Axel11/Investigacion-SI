import { OijModule } from './oij/oij.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './common/health.controller';
import { CoverageModule } from './coverage/coverage.module';
import { OsmModule } from './osm/osm.module';
import { TseModule } from './tse/tse.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
  { name: 'osmMinute', ttl: 60 * 1000, limit: 1 },
  { name: 'osmHour', ttl: 60 * 60 * 1000, limit: 5 },
  { name: 'oijFiveMinutes', ttl: 5 * 60 * 1000, limit: 1 },
  { name: 'oijHour', ttl: 60 * 60 * 1000, limit: 3 },
]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true, // laboratorio academico: evita manejar migraciones aparte
      }),
    }),
    OsmModule,
    TseModule,
    CoverageModule,
    OijModule,
  ],
  controllers: [HealthController],
  providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
],
})
export class AppModule {}

