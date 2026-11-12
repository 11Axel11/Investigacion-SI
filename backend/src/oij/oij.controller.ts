import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../common/admin-key.guard';
import { queryFiltersPipe } from '../common/query-filters';
import { OijOverviewQueryDto } from './oij-overview-query.dto';
import { OijService } from './oij.service';
@Controller('oij')
export class OijController {
  constructor(private readonly service: OijService) {}
  @Post('sync') @UseGuards(AdminKeyGuard) sync(@Body() body: { year?: number }) { return this.service.sync(body?.year); }
  @Get('overview')
  overview(@Query(queryFiltersPipe) query: OijOverviewQueryDto) {
    return this.service.overview(query);
  }
}
