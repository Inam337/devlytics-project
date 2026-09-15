import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import {
  Client,
  ClientInfo,
  CurrentUser,
  OrganizationId,
  RequirePermissions,
  ResponseMessage,
} from '../common/decorators';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions(Permission.ROLE_READ)
  @ApiOperation({ summary: 'List roles with their permission scope and member counts' })
  findAll(@OrganizationId() organizationId: string) {
    return this.rolesService.findAll(organizationId);
  }

  @Get(':id')
  @RequirePermissions(Permission.ROLE_READ)
  @ApiOperation({ summary: 'Role detail' })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.rolesService.findOne(organizationId, id);
  }

  @Patch(':id/permissions')
  @RequirePermissions(Permission.ROLE_UPDATE)
  @ResponseMessage('Role permissions updated successfully')
  @ApiOperation({ summary: 'Replace a role permission scope (audit-logged with before/after)' })
  updatePermissions(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.rolesService.updatePermissions(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }
}
