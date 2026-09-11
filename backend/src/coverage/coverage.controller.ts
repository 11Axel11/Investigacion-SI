import { Controller, Get, Query } from '@nestjs/common';
import { CoverageService } from './coverage.service';

@Controller('coverage')
export class CoverageController {
  constructor(private readonly coverageService: CoverageService) {}

  @Get('health')
  health(@Query('province') province?: string, @Query('canton') canton?: string) {
    return this.coverageService.healthCoverage(province, canton);
  }

  @Get('electoral-security')
  electoralSecurity(@Query('province') province?: string, @Query('canton') canton?: string) {
    return this.coverageService.electoralSecurity(province, canton);
  }
}
