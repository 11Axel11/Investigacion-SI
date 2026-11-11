import { Controller, Get, Query } from '@nestjs/common';
import { CoverageService } from './coverage.service';
import { CantonBoundariesService } from './canton-boundaries.service';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle({
  osmMinute: true,
  osmHour: true,
  oijFiveMinutes: true,
  oijHour: true,
})

@Controller('coverage')
export class CoverageController {
  constructor(
    private readonly coverageService: CoverageService,
    private readonly cantonBoundariesService: CantonBoundariesService,
  ) {}

  @Get('canton-boundaries')
  cantonBoundaries() {
    return this.cantonBoundariesService.getBoundaries();
  }

  @Get('health')
  health(@Query('province') province?: string, @Query('canton') canton?: string) {
    return this.coverageService.healthCoverage(province, canton);
  }

  @Get('electoral-security')
  electoralSecurity(@Query('province') province?: string, @Query('canton') canton?: string) {
    return this.coverageService.electoralSecurity(province, canton);
  }

  @Get('crime-rate')
  crimeRate(
    @Query('province') province?: string,
    @Query('canton') canton?: string,
    @Query('year') year?: string,
    @Query('businessType') businessType?: string,
  ) {
    return this.coverageService.crimeRate(province, canton, year, businessType);
  }

  @Get('viability-index')
  viabilityIndex(@Query('year') year?: string, @Query('businessType') businessType?: string) {
    return this.coverageService.viabilityIndex(year, businessType);
  }

  @Get('business-types')
  businessTypes(@Query('year') year?: string) {
    return this.coverageService.businessTypes(year);
  }
}
