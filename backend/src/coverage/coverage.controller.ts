import { Controller, Get, Query } from '@nestjs/common';
import { OptionalQueryText, OptionalQueryYear, queryFiltersPipe, TerritoryQueryDto, YearQueryDto } from '../common/query-filters';
import { CoverageService } from './coverage.service';
import { CantonBoundariesService } from './canton-boundaries.service';

class ViabilityQueryDto extends YearQueryDto {
  @OptionalQueryText() businessType?: string;
}

class CrimeRateQueryDto extends TerritoryQueryDto {
  @OptionalQueryYear() year?: string;
  @OptionalQueryText() businessType?: string;
}

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
  health(@Query(queryFiltersPipe) { province, canton }: TerritoryQueryDto) {
    return this.coverageService.healthCoverage(province, canton);
  }

  @Get('electoral-security')
  electoralSecurity(@Query(queryFiltersPipe) { province, canton }: TerritoryQueryDto) {
    return this.coverageService.electoralSecurity(province, canton);
  }

  @Get('crime-rate')
  crimeRate(@Query(queryFiltersPipe) { province, canton, year, businessType }: CrimeRateQueryDto) {
    return this.coverageService.crimeRate(province, canton, year, businessType);
  }

  @Get('viability-index')
  viabilityIndex(@Query(queryFiltersPipe) { year, businessType }: ViabilityQueryDto) {
    return this.coverageService.viabilityIndex(year, businessType);
  }

  @Get('business-types')
  businessTypes(@Query(queryFiltersPipe) { year }: YearQueryDto) {
    return this.coverageService.businessTypes(year);
  }
}
