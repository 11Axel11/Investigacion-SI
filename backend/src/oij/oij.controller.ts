import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OijService } from './oij.service';
@Controller('oij')
export class OijController {
  constructor(private readonly service: OijService) {}
  @Post('sync') sync(@Body() body: { year?: number }) { return this.service.sync(body?.year); }
  @Get('overview') overview(@Query() query: {
    year?: string; province?: string; canton?: string; district?: string; crime?: string; modality?: string;
    targetCategory?: string; targetType?: string;
  }) { return this.service.overview(query); }
}
