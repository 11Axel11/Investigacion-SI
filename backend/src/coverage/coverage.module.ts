import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OsmPlace } from '../osm/osm-place.entity';
import { TseElectoralSummary } from '../tse/tse-electoral-summary.entity';
import { CoverageController } from './coverage.controller';
import { CoverageService } from './coverage.service';

@Module({
  imports: [TypeOrmModule.forFeature([TseElectoralSummary, OsmPlace])],
  controllers: [CoverageController],
  providers: [CoverageService],
})
export class CoverageModule {}
