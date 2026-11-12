import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './common/health.controller';
import { CoverageModule } from './coverage/coverage.module';
import { InitialSchema1794355200000 } from './migrations/initial-schema.migration';
import { OijModule } from './oij/oij.module';
import { OsmModule } from './osm/osm.module';
import { TseModule } from './tse/tse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [InitialSchema1794355200000],
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