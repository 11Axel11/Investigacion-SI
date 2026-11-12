import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminKeyGuard } from '../common/admin-key.guard';
import { MulterErrorFilter } from '../common/multer-error.filter';
import { OptionalQueryText, queryFiltersPipe, TerritoryQueryDto } from '../common/query-filters';
import { TseService } from './tse.service';

class DistrictQueryDto extends TerritoryQueryDto {
  @OptionalQueryText() q?: string;
}

@Controller('tse')
export class TseController {
  constructor(private readonly tseService: TseService) {}

  @Post('import')
  @UseGuards(AdminKeyGuard)
  @UseFilters(MulterErrorFilter)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 80 * 1024 * 1024 } }))
  importZip(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('sourceDate') sourceDate?: string,
  ) {
    return this.tseService.importZip(file, sourceDate);
  }

  @Get('districts')
  districts(@Query(queryFiltersPipe) query: DistrictQueryDto) {
    return this.tseService.findAll(query);
  }

  @Get('overview')
  overview() {
    return this.tseService.overview();
  }
}
