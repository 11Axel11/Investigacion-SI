import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../common/admin-key.guard';
import { OsmSearchParams, OsmService } from './osm.service';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';



@Controller('osm')
export class OsmController {
  constructor(private readonly osmService: OsmService) {}

 @Post('sync')
@SkipThrottle({
  oijFiveMinutes: true,
  oijHour: true,
})
@UseGuards(AdminKeyGuard, ThrottlerGuard)
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

  @Get('by-category')
  byCategory(
    @Query('category') category: string,
    @Query('province') province?: string,
    @Query('canton') canton?: string,
  ) {
    return this.osmService.findByCategory({ category, province, canton });
  }
}
