import { Module } from '@nestjs/common';
import { AnnotationController } from './annotation.controller';
import { AnnotationService } from './annotation.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { CollaborationModule } from 'src/collaboration/collaboration.module';

@Module({
  imports: [CollaborationModule],
  controllers: [AnnotationController],
  providers: [AnnotationService, PrismaService],
  exports: [AnnotationService],
})
export class AnnotationModule {}
