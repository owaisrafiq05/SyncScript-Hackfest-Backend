import { Module } from '@nestjs/common';
import { SourceController } from './source.controller';
import { SourceService } from './source.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { StorageModule } from 'src/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [SourceController],
  providers: [SourceService, PrismaService],
  exports: [SourceService],
})
export class SourceModule {}
