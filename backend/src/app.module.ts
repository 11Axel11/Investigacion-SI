import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './common/health.controller';
import { CoverageModule } from './coverage/coverage.module';
import { OijModule } from './oij/oij.module';
import { OsmModule } from './osm/osm.module';
import { TseModule } from './tse/tse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'osmMinute', ttl: 60 * 1000, limit: 20 },
      { name: 'osmHour', ttl: 60 * 60 * 1000, limit: 20 },
      { name: 'oijFiveMinutes', ttl: 5 * 60 * 1000, limit: 5 },
      { name: 'oijHour', ttl: 60 * 60 * 1000, limit: 5 },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    OsmModule,
    TseModule,
    CoverageModule,
    OijModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}