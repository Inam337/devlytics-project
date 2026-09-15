import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncJobStatus } from '@prisma/client';
import { Permission } from '../common/constants/permissions';
import { CurrentUser, OrganizationId, RequirePermissions, ResponseMessage } from '../common/decorators';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { SyncService } from './sync.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Repositories')
@ApiBearerAuth()
@Controller()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('repositories/:id/sync')
  @RequirePermissions(Permission.REPOSITORY_SYNC)
  @ResponseMessage('Repository sync queued successfully')
  @ApiOperation({ summary: 'Manually trigger a sync for one repository' })
  syncRepository(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.syncService.syncRepository(organizationId, id, userId);
  }

  @Get('sync/jobs')
  @RequirePermissions(Permission.SYNC_READ)
  @ApiOperation({ summary: 'Sync job history' })
  findJobs(
    @OrganizationId() organizationId: string,
    @Query() query: PaginationQueryDto,
    @Query('status') status?: SyncJobStatus,
    @Query('repositoryId') repositoryId?: string,
  ) {
    return this.syncService.findJobs(organizationId, query, status, repositoryId);
  }

  @Get('sync/progress')
  @RequirePermissions(Permission.SYNC_READ)
  @ApiOperation({ summary: 'Live per-repository import progress' })
  importProgress(@OrganizationId() organizationId: string) {
    return this.syncService.importProgress(organizationId);
  }
}
