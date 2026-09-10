import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OsmSearchParams, OsmService } from './osm.service';

@Controller('osm')
export class OsmController {
  constructor(private readonly osmService: OsmService) {}

  @Post('sync')
  sync(@Body() body: OsmSearchParams) {
    return this.osmService.sync(body);
  }

  @Get('places')
  places(
    @Query('province') province: string,
    @Query('canton') canton: string,
    @Query('category') category: string,
    @Query('q') q?: string,
  ) {
    return this.osmService.findAll({ province, canton, category, q });
  }

  @Get('locations')
  locations() {
    return this.osmService.locations();
  }
}
