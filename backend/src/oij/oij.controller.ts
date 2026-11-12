import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../common/admin-key.guard';
import { OijService } from './oij.service';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';


@SkipThrottle({
  osmMinute: true,
  osmHour: true,
})

@Controller('oij')
export class OijController {
  constructor(private readonly service: OijService) {}
@Post('sync')
@UseGuards(AdminKeyGuard, ThrottlerGuard)
sync(@Body() body: { year?: number }) {
  return this.service.sync(body?.year);
}
  @Get('overview') overview(@Query() query: {
    year?: string; province?: string; canton?: string; district?: string; crime?: string; modality?: string;
    targetCategory?: string; targetType?: string;
  }) { return this.service.overview(query); }
}
