import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
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
  QualityIssueQueryDto,
  QualitySnapshotQueryDto,
  TriggerScanDto,
  UpdateQualityIssueStatusDto,
} from './dto/quality.dto';
import { QualityService } from './quality.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Code Quality')
@ApiBearerAuth()
@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Post('scan')
  @RequirePermissions(Permission.QUALITY_WRITE)
  @ResponseMessage('Quality scan queued successfully')
  @ApiOperation({ summary: 'Queue a deterministic quality analysis run for a repository' })
  triggerScan(
    @OrganizationId() organizationId: string,
    @Body() dto: TriggerScanDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.qualityService.triggerScan(organizationId, dto, { actorId: userId, ...client });
  }

  @Get('summary')
  @RequirePermissions(Permission.QUALITY_READ)
  @ApiOperation({ summary: 'Eight-KPI code quality summary across repositories' })
  summary(@OrganizationId() organizationId: string, @Query('projectId') projectId?: string) {
    return this.qualityService.summary(organizationId, projectId);
  }

  @Get('snapshots')
  @RequirePermissions(Permission.QUALITY_READ)
  @ApiOperation({ summary: 'Quality snapshot history' })
  findSnapshots(@OrganizationId() organizationId: string, @Query() query: QualitySnapshotQueryDto) {
    return this.qualityService.findSnapshots(organizationId, query);
  }

  @Get('issues')
  @RequirePermissions(Permission.QUALITY_READ)
  @ApiOperation({ summary: 'Findings: observed fact, AI inference and recommendation' })
  findIssues(@OrganizationId() organizationId: string, @Query() query: QualityIssueQueryDto) {
    return this.qualityService.findIssues(organizationId, query);
  }

  @Get('issues/:id')
  @RequirePermissions(Permission.QUALITY_READ)
  @ApiOperation({ summary: 'Finding detail' })
  findIssueOne(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.qualityService.findIssueOne(organizationId, id);
  }

  @Patch('issues/:id/status')
  @RequirePermissions(Permission.QUALITY_WRITE)
  @ResponseMessage('Quality issue status updated successfully')
  @ApiOperation({ summary: 'Update a finding status' })
  updateStatus(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateQualityIssueStatusDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.qualityService.updateIssueStatus(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }
}
