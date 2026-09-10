import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OsmPlace } from './osm-place.entity';
import { OsmQueryCache } from './osm-query-cache.entity';
import { OsmController } from './osm.controller';
import { OsmService } from './osm.service';

@Module({
  imports: [TypeOrmModule.forFeature([OsmPlace, OsmQueryCache])],
  controllers: [OsmController],
  providers: [OsmService],
})
export class OsmModule {}
