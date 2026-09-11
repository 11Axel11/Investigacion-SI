import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OijDataset } from './oij-dataset.entity';
import { OijController } from './oij.controller';
import { OijService } from './oij.service';
@Module({ imports: [TypeOrmModule.forFeature([OijDataset])], controllers: [OijController], providers: [OijService] })
export class OijModule {}
