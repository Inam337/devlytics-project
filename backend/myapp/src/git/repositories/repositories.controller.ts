import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../../common/constants/permissions';
import {
  Client,
  ClientInfo,
  CurrentUser,
  OrganizationId,
  RequirePermissions,
  ResponseMessage,
} from '../../common/decorators';
import { ActivityService } from '../activity/activity.service';
import {
  ActivityQueryDto,
  RepositoryQueryDto,
  UpdateRepositoryDto,
} from './dto/repository.dto';
import { RepositoriesService } from './repositories.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Repositories')
@ApiBearerAuth()
@Controller('repositories')
export class RepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly activityService: ActivityService,
  ) {}

  @Get()
  @RequirePermissions(Permission.REPOSITORY_READ)
  @ApiOperation({
    summary:
      'Repository table: provider, project, team, commits, quality, coverage',
  })
  findAll(
    @OrganizationId() organizationId: string,
    @Query() query: RepositoryQueryDto,
  ) {
    return this.repositoriesService.findAll(organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.REPOSITORY_READ)
  @ApiOperation({
    summary: 'Repository detail: KPIs, coverage trend, top contributors',
  })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
  ) {
    return this.repositoriesService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.REPOSITORY_WRITE)
  @ResponseMessage('Repository updated successfully')
  @ApiOperation({ summary: 'Reassign a repository to a project or team' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateRepositoryDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.repositoriesService.update(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Get(':id/members')
  @RequirePermissions(Permission.REPOSITORY_READ)
  @ApiOperation({ summary: 'Contributors to this repository' })
  findMembers(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
  ) {
    return this.repositoriesService.findMembers(organizationId, id);
  }

  @Get(':id/commits')
  @RequirePermissions(Permission.ACTIVITY_READ)
  @ApiOperation({ summary: 'Commits (bots excluded by default)' })
  commits(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.commits(organizationId, id, query);
  }

  @Get(':id/pull-requests')
  @RequirePermissions(Permission.ACTIVITY_READ)
  @ApiOperation({ summary: 'Pull requests' })
  pullRequests(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.pullRequests(organizationId, id, query);
  }

  @Get(':id/reviews')
  @RequirePermissions(Permission.ACTIVITY_READ)
  @ApiOperation({ summary: 'Pull request reviews' })
  reviews(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.reviews(organizationId, id, query);
  }

  @Get(':id/issues')
  @RequirePermissions(Permission.ACTIVITY_READ)
  @ApiOperation({ summary: 'Issues' })
  issues(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.issues(organizationId, id, query);
  }

  @Get(':id/pipelines')
  @RequirePermissions(Permission.ACTIVITY_READ)
  @ApiOperation({ summary: 'CI pipeline runs' })
  pipelines(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.pipelines(organizationId, id, query);
  }

  @Get(':id/deployments')
  @RequirePermissions(Permission.ACTIVITY_READ)
  @ApiOperation({ summary: 'Deployments' })
  deployments(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: ActivityQueryDto,
  ) {
    return this.activityService.deployments(organizationId, id, query);
  }
}
