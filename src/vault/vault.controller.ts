import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse as ApiResponseDoc, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { VaultService } from './vault.service';
import { User } from '@db';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { CreateVaultDto, UpdateVaultDto, AddVaultMemberDto, AuditLogResponseDto, AUDIT_ACTIONS } from './dto';
import { VaultSelect, VaultWithMyRole, VaultWithMyRoleAndMembers } from './queries';

@Controller('vault')
@ApiTags('Vault')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get()
  @ApiOperation({
    summary: 'List Vaults',
    description: 'Get all vaults the logged-in user is a member of (owner or invited member). Returns vaults with your role (myRole).',
  })
  async findAll(@CurrentUser() user: User): Promise<ApiResponse<VaultWithMyRole[]>> {
    return this.vaultService.findAllByUser(user);
  }

  @Get(':id/audit')
  @ApiOperation({
    summary: 'Get Audit Logs by Vault',
    description:
      'Get audit logs for a vault. Only vault members can access. Logs cover all sections: vault (create/update/delete), members (add/remove/role change), files (upload/delete), sources (add/update/delete), annotations (add/update/delete), relationships (create/delete). Optionally filter by action.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max number of logs (1–100, default 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of logs to skip (default 0)' })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: AUDIT_ACTIONS,
    description: 'Filter by audit action (e.g. SOURCE_ADDED, ANNOTATION_UPDATED)',
  })
  @ApiResponseDoc({ status: 200, description: 'Audit logs retrieved', type: [AuditLogResponseDto] })
  async getAuditLogs(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('action') action?: string,
  ): Promise<ApiResponse<import('./vault.service').AuditLogEntry[]>> {
    return this.vaultService.getAuditLogsByVault(user, id, { limit, offset, action });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Vault',
    description: 'Get a single vault by ID with members list. User must be a vault member (owner or invited). Returns 403 if not a member, 404 if vault not found or deleted.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApiResponse<VaultWithMyRoleAndMembers>> {
    return this.vaultService.findOne(user, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create Vault',
    description: 'Create a new vault. The current user becomes the owner.',
  })
  async create(
    @CurrentUser() user: User,
    @Body() createVaultDto: CreateVaultDto,
  ): Promise<ApiResponse<VaultSelect>> {
    return this.vaultService.create(user, createVaultDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Vault',
    description: 'Update vault name, description, or privacy. Only the vault owner can update.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  async update(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateVaultDto: UpdateVaultDto,
  ): Promise<ApiResponse<VaultSelect>> {
    return this.vaultService.update(user, id, updateVaultDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete Vault',
    description: 'Soft-delete a vault. Only the vault owner can delete.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.vaultService.delete(user, id);
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Add Vault Member',
    description: 'Add a user as a member to a vault with CONTRIBUTOR or VIEWER role. Only the vault owner can add members.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault UUID' })
  async addMember(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() addVaultMemberDto: AddVaultMemberDto,
  ): Promise<ApiResponse<{ vaultId: string; userId: string; role: string }>> {
    return this.vaultService.addMember(user, id, addVaultMemberDto);
  }
}
