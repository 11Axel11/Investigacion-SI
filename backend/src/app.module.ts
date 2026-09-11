import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoverageModule } from './coverage/coverage.module';
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
        synchronize: true, // laboratorio academico: evita manejar migraciones aparte
      }),
    }),
    OsmModule,
    TseModule,
    CoverageModule,
  ],
})
export class AppModule {}
