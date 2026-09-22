import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
import {
  AddProjectMemberDto,
  CreateProjectDto,
  ProjectQueryDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions(Permission.PROJECT_READ)
  @ApiOperation({
    summary: 'Project directory with status, counts, progress and quality',
  })
  findAll(
    @OrganizationId() organizationId: string,
    @Query() query: ProjectQueryDto,
  ) {
    return this.projectsService.findAll(organizationId, query);
  }

  @Post()
  @RequirePermissions(Permission.PROJECT_WRITE)
  @ResponseMessage('Project created successfully')
  @ApiOperation({ summary: 'Create a project' })
  create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.projectsService.create(organizationId, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.PROJECT_READ)
  @ApiOperation({
    summary: 'Project detail with members and repositories in scope',
  })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
  ) {
    return this.projectsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.PROJECT_WRITE)
  @ResponseMessage('Project updated successfully')
  @ApiOperation({ summary: 'Update a project' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.projectsService.update(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROJECT_WRITE)
  @ResponseMessage('Project deleted successfully')
  @ApiOperation({
    summary: 'Delete a project that has no repositories assigned',
  })
  remove(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.projectsService.remove(organizationId, id, {
      actorId: userId,
      ...client,
    });
  }

  @Post(':id/members')
  @RequirePermissions(Permission.PROJECT_WRITE)
  @ResponseMessage('Project member assigned successfully')
  @ApiOperation({ summary: 'Assign a member to the project' })
  addMember(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.projectsService.addMember(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PROJECT_WRITE)
  @ResponseMessage('Project member removed successfully')
  @ApiOperation({ summary: 'Remove a member from the project' })
  removeMember(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Param('userId', uuid()) memberId: string,
    @CurrentUser('userId') actorId: string,
    @Client() client: ClientInfo,
  ) {
    return this.projectsService.removeMember(organizationId, id, memberId, {
      actorId,
      ...client,
    });
  }
}
