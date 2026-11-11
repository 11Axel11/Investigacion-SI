import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../common/admin-key.guard';
import { OijService } from './oij.service';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle({
  osmMinute: true,
  osmHour: true,
  oijFiveMinutes: true,
  oijHour: true,
})

@Controller('oij')
export class OijController {
  constructor(private readonly service: OijService) {}
  @Post('sync')
  @SkipThrottle({
  osmMinute: false,
  osmHour: false,}) 
@UseGuards(AdminKeyGuard) sync(@Body() body: { year?: number }) { return this.service.sync(body?.year); }
  @Get('overview') overview(@Query() query: {
    year?: string; province?: string; canton?: string; district?: string; crime?: string; modality?: string;
    targetCategory?: string; targetType?: string;
  }) { return this.service.overview(query); }
}
