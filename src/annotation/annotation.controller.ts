import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { User } from '@db';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { AnnotationService } from './annotation.service';
import { CreateAnnotationDto, UpdateAnnotationDto } from './dto';
import { AnnotationSelect } from './queries';

@Controller('vault/:vaultId/source/:sourceId/annotation')
@ApiTags('Annotation')
@UseGuards(AuthGuard)
export class AnnotationController {
  constructor(private readonly annotationService: AnnotationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create Annotation',
    description:
      'Create an annotation on a source. Only CONTRIBUTOR or OWNER can create. contentHtml is optional (defaults to contentMarkdown).',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  async create(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Body() createAnnotationDto: CreateAnnotationDto,
  ): Promise<ApiResponse<AnnotationSelect>> {
    return this.annotationService.create(user, vaultId, sourceId, createAnnotationDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List Annotations',
    description: 'Get paginated list of annotations for a source. Requires vault membership.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  @ApiProperty({
    title: 'List Annotations',
    description: 'Get paginated list of annotations in the source.',
  })
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', type: Number, required: false, description: 'Items per page (default: 20, max: 100)' })
  async findAll(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<
    ApiResponse<{
      annotations: AnnotationSelect[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    return this.annotationService.findAllBySource(user, vaultId, sourceId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Annotation',
    description: 'Get a single annotation by ID. Requires vault membership.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  @ApiParam({ name: 'id', type: String, description: 'Annotation ID' })
  @ApiProperty({
    title: 'Get Annotation',
    description: 'Get a single annotation by ID.',
  })
  async findOne(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<AnnotationSelect>> {
    return this.annotationService.findOne(user, vaultId, sourceId, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Annotation',
    description: 'Update an annotation. Version is incremented when content changes. Only CONTRIBUTOR or OWNER can update.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  @ApiParam({ name: 'id', type: String, description: 'Annotation ID' })
  @ApiProperty({
    title: 'Update Annotation',
    description: 'Update annotation content or location references.',
    type: UpdateAnnotationDto,
  })
  async update(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Param('id') id: string,
    @Body() updateAnnotationDto: UpdateAnnotationDto,
  ): Promise<ApiResponse<AnnotationSelect>> {
    return this.annotationService.update(user, vaultId, sourceId, id, updateAnnotationDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Annotation',
    description: 'Soft-delete an annotation. Only CONTRIBUTOR or OWNER can delete.',
  })
  @ApiParam({ name: 'vaultId', type: String, description: 'Vault ID' })
  @ApiParam({ name: 'sourceId', type: String, description: 'Source ID' })
  @ApiParam({ name: 'id', type: String, description: 'Annotation ID' })
  @ApiProperty({
    title: 'Delete Annotation',
    description: 'Soft-delete an annotation.',
  })
  async remove(
    @CurrentUser() user: User,
    @Param('vaultId') vaultId: string,
    @Param('sourceId') sourceId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.annotationService.remove(user, vaultId, sourceId, id);
  }
}
