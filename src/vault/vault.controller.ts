import { Body, Controller, Delete, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { VaultService } from './vault.service';
import { User } from '@db';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApiResponse } from 'src/common/types';
import { CreateVaultDto, UpdateVaultDto, AddVaultMemberDto } from './dto';
import { VaultSelect } from './queries';

@Controller('vault')
@ApiTags('Vault')
@UseGuards(AuthGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Post()
  @ApiProperty({
    title: 'Create Vault',
    description: 'Create a new vault. The current user becomes the owner.',
    type: CreateVaultDto,
  })
  async create(
    @CurrentUser() user: User,
    @Body() createVaultDto: CreateVaultDto,
  ): Promise<ApiResponse<VaultSelect>> {
    return this.vaultService.create(user, createVaultDto);
  }

  @Put(':id')
  @ApiProperty({
    title: 'Update Vault',
    description: 'Update vault name, description, or privacy. Only the vault owner can update.',
    type: UpdateVaultDto,
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault ID' })
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateVaultDto: UpdateVaultDto,
  ): Promise<ApiResponse<VaultSelect>> {
    return this.vaultService.update(user, id, updateVaultDto);
  }

  @Delete(':id')
  @ApiProperty({
    title: 'Delete Vault',
    description: 'Soft-delete a vault. Only the vault owner can delete.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault ID' })
  async delete(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.vaultService.delete(user, id);
  }

  @Post(':id/members')
  @ApiProperty({
    title: 'Add Vault Member',
    description: 'Add a user as a member to a vault with CONTRIBUTOR or VIEWER role. Only the vault owner can add members.',
    type: AddVaultMemberDto,
  })
  @ApiParam({ name: 'id', type: String, description: 'Vault ID' })
  async addMember(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() addVaultMemberDto: AddVaultMemberDto,
  ): Promise<ApiResponse<{ vaultId: string; userId: string; role: string }>> {
    return this.vaultService.addMember(user, id, addVaultMemberDto);
  }
}
