import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TseElectoralSummary } from './tse-electoral-summary.entity';
import { TseController } from './tse.controller';
import { TseService } from './tse.service';

@Module({
  imports: [TypeOrmModule.forFeature([TseElectoralSummary])],
  controllers: [TseController],
  providers: [TseService],
})
export class TseModule {}
