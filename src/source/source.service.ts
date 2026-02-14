import { User } from '@db';
import { AuditAction, FileType, SourceType, VaultRole } from '@db';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { MulterFile } from 'src/common/types';
import { StorageService } from 'src/storage/storage.service';
import { sourceSelect, SourceSelect } from './queries';
import { CreateSourceDto, UpdateSourceDto } from './dto';

const SOURCE_UPLOAD_PREFIX = 'uploads/sources/';

function mimeToFileType(mime: string): FileType {
  if (!mime) return FileType.OTHER;
  if (mime === 'application/pdf') return FileType.PDF;
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return FileType.DOCX;
  if (mime.startsWith('image/')) return FileType.IMAGE;
  if (mime.startsWith('video/')) return FileType.VIDEO;
  if (mime.includes('dataset') || mime.includes('csv') || mime.includes('json')) return FileType.DATASET;
  return FileType.OTHER;
}

@Injectable()
export class SourceService {
  private readonly logger = new AppLoggerService(SourceService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private async ensureVaultMember(userId: string, vaultId: string): Promise<{ role: VaultRole }> {
    const member = await this.prismaService.vaultMember.findUnique({
      where: { vaultId_userId: { vaultId, userId } },
      select: { role: true },
    });
    if (!member) throw throwError('Vault not found or access denied', HttpStatus.NOT_FOUND);
    return member;
  }

  private async ensureCanEditSource(userId: string, vaultId: string): Promise<void> {
    const member = await this.ensureVaultMember(userId, vaultId);
    if (member.role === VaultRole.VIEWER) {
      throw throwError('Forbidden: only CONTRIBUTOR or OWNER can create or edit sources', HttpStatus.FORBIDDEN);
    }
  }

  async create(user: User, vaultId: string, dto: CreateSourceDto): Promise<ApiResponse<SourceSelect>> {
    try {
      await this.ensureCanEditSource(user.id, vaultId);

      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);

      if (dto.fileId) {
        const file = await this.prismaService.file.findFirst({
          where: { id: dto.fileId, vaultId, deletedAt: null },
        });
        if (!file) throw throwError('File not found in this vault', HttpStatus.NOT_FOUND);
      }

      const source = await this.prismaService.source.create({
        data: {
          vaultId,
          createdBy: user.id,
          title: dto.title,
          authors: dto.authors ?? [],
          publication: dto.publication ?? null,
          year: dto.year ?? null,
          externalUrl: dto.externalUrl ?? null,
          sourceType: dto.sourceType ?? SourceType.PDF,
          fileId: dto.fileId ?? null,
          abstract: dto.abstract ?? null,
          keywords: dto.keywords ?? [],
        },
        select: sourceSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.SOURCE_ADDED,
          entityType: 'source',
          entityId: source.id,
        },
      });

      return {
        message: 'Source created successfully',
        success: true,
        data: source,
      };
    } catch (err) {
      this.logger.error('Failed to create source', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'create',
        vaultId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to create source', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createWithFile(
    user: User,
    vaultId: string,
    dto: CreateSourceDto,
    file: MulterFile,
  ): Promise<ApiResponse<SourceSelect>> {
    try {
      await this.ensureCanEditSource(user.id, vaultId);

      const vault = await this.prismaService.vault.findFirst({
        where: { id: vaultId, deletedAt: null },
      });
      if (!vault) throw throwError('Vault not found', HttpStatus.NOT_FOUND);

      const { filename } = await this.storageService.uploadFile(file, SOURCE_UPLOAD_PREFIX);
      const fileUrl = this.storageService.getImageUrl(filename);
      const fileType = mimeToFileType(file.mimetype);

      const fileRecord = await this.prismaService.file.create({
        data: {
          vaultId,
          uploadedBy: user.id,
          fileName: file.originalname,
          fileUrl,
          fileSize: file.size,
          fileMimeType: file.mimetype,
          fileType,
        },
      });

      const source = await this.prismaService.source.create({
        data: {
          vaultId,
          createdBy: user.id,
          title: dto.title,
          authors: dto.authors ?? [],
          publication: dto.publication ?? null,
          year: dto.year ?? null,
          externalUrl: dto.externalUrl ?? null,
          sourceType: dto.sourceType ?? SourceType.PDF,
          fileId: fileRecord.id,
          abstract: dto.abstract ?? null,
          keywords: dto.keywords ?? [],
        },
        select: sourceSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.SOURCE_ADDED,
          entityType: 'source',
          entityId: source.id,
          details: { fileId: fileRecord.id },
        },
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.FILE_UPLOADED,
          entityType: 'file',
          entityId: fileRecord.id,
        },
      });

      return {
        message: 'Source created and file uploaded successfully',
        success: true,
        data: source,
      };
    } catch (err) {
      this.logger.error('Failed to create source with file', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'createWithFile',
        vaultId,
        userId: user.id,
      });
      throw throwError(
        err.message || 'Failed to create source with file',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllByVault(
    user: User,
    vaultId: string,
    params?: { page?: number; limit?: number },
  ): Promise<ApiResponse<{ sources: SourceSelect[]; total: number; page: number; limit: number }>> {
    try {
      await this.ensureVaultMember(user.id, vaultId);

      const page = Math.max(1, params?.page ?? 1);
      const limit = Math.min(100, Math.max(1, params?.limit ?? 20));
      const skip = (page - 1) * limit;

      const [sources, total] = await Promise.all([
        this.prismaService.source.findMany({
          where: { vaultId, deletedAt: null },
          select: sourceSelect,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prismaService.source.count({ where: { vaultId, deletedAt: null } }),
      ]);

      return {
        message: 'Sources retrieved successfully',
        success: true,
        data: { sources, total, page, limit },
      };
    } catch (err) {
      this.logger.error('Failed to list sources', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'findAllByVault',
        vaultId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to list sources', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findOne(user: User, vaultId: string, sourceId: string): Promise<ApiResponse<SourceSelect>> {
    try {
      await this.ensureVaultMember(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
        select: sourceSelect,
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      return {
        message: 'Source retrieved successfully',
        success: true,
        data: source,
      };
    } catch (err) {
      this.logger.error('Failed to get source', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'findOne',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to get source', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async update(
    user: User,
    vaultId: string,
    sourceId: string,
    dto: UpdateSourceDto,
  ): Promise<ApiResponse<SourceSelect>> {
    try {
      await this.ensureCanEditSource(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      const updateData: {
        title?: string;
        authors?: string[];
        publication?: string | null;
        year?: number | null;
        externalUrl?: string | null;
        sourceType?: SourceType;
        fileId?: string | null;
        aiExtracted?: boolean;
        abstract?: string | null;
        keywords?: string[];
      } = {};
      if (dto.title !== undefined) updateData.title = dto.title;
      if (dto.authors !== undefined) updateData.authors = dto.authors;
      if (dto.publication !== undefined) updateData.publication = dto.publication;
      if (dto.year !== undefined) updateData.year = dto.year;
      if (dto.externalUrl !== undefined) updateData.externalUrl = dto.externalUrl;
      if (dto.sourceType !== undefined) updateData.sourceType = dto.sourceType;
      if (dto.fileId !== undefined) updateData.fileId = dto.fileId;
      if (dto.aiExtracted !== undefined) updateData.aiExtracted = dto.aiExtracted;
      if (dto.abstract !== undefined) updateData.abstract = dto.abstract;
      if (dto.keywords !== undefined) updateData.keywords = dto.keywords;

      const updated = await this.prismaService.source.update({
        where: { id: sourceId },
        data: updateData,
        select: sourceSelect,
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.SOURCE_UPDATED,
          entityType: 'source',
          entityId: sourceId,
          details: { updated: updateData },
        },
      });

      return {
        message: 'Source updated successfully',
        success: true,
        data: updated,
      };
    } catch (err) {
      this.logger.error('Failed to update source', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'update',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to update source', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async remove(user: User, vaultId: string, sourceId: string): Promise<ApiResponse<{ id: string }>> {
    try {
      await this.ensureCanEditSource(user.id, vaultId);

      const source = await this.prismaService.source.findFirst({
        where: { id: sourceId, vaultId, deletedAt: null },
      });
      if (!source) throw throwError('Source not found', HttpStatus.NOT_FOUND);

      await this.prismaService.source.update({
        where: { id: sourceId },
        data: { deletedAt: new Date() },
      });

      await this.prismaService.auditLog.create({
        data: {
          vaultId,
          userId: user.id,
          action: AuditAction.SOURCE_DELETED,
          entityType: 'source',
          entityId: sourceId,
        },
      });

      return {
        message: 'Source deleted successfully',
        success: true,
        data: { id: sourceId },
      };
    } catch (err) {
      this.logger.error('Failed to delete source', err.stack, SourceService.name);
      this.logger.logData({
        error: err.message,
        status: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
        method: 'remove',
        vaultId,
        sourceId,
        userId: user.id,
      });
      throw throwError(err.message || 'Failed to delete source', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
