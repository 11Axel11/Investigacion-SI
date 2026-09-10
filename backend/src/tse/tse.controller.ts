import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TseService } from './tse.service';

@Controller('tse')
export class TseController {
  constructor(private readonly tseService: TseService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 80 * 1024 * 1024 } }))
  importZip(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('sourceDate') sourceDate?: string,
  ) {
    return this.tseService.importZip(file, sourceDate);
  }

  @Get('districts')
  districts(
    @Query('province') province?: string,
    @Query('canton') canton?: string,
    @Query('q') q?: string,
  ) {
    return this.tseService.findAll({ province, canton, q });
  }

  @Get('overview')
  overview() {
    return this.tseService.overview();
  }
}
