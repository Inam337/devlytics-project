import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
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
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequirePermissions(Permission.ORGANIZATION_READ)
  @ApiOperation({ summary: 'Organizations the caller belongs to' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.organizationsService.findAllForUser(userId);
  }

  @Post()
  @RequirePermissions(Permission.ORGANIZATION_UPDATE)
  @ResponseMessage('Organization created successfully')
  @ApiOperation({
    summary: 'Create an organization (roles, weights and local AI provider are provisioned with it)',
  })
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.organizationsService.create(dto, { actorId: userId, ...client });
  }

  @Get(':id')
  @RequirePermissions(Permission.ORGANIZATION_READ)
  @ApiOperation({ summary: 'Organization detail with entity counts' })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.organizationsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.ORGANIZATION_UPDATE)
  @ResponseMessage('Organization updated successfully')
  @ApiOperation({ summary: 'Update organization settings, branding or setup-wizard progress' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.organizationsService.update(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }
}
