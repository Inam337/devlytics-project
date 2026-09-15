import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import { OrganizationId, RequirePermissions } from '../common/decorators';
import { MetricsQueryDto } from './dto/metrics-query.dto';
import { MetricsService } from './metrics.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Metrics')
@ApiBearerAuth()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('developers')
  @RequirePermissions(Permission.METRIC_READ)
  @ApiOperation({ summary: 'Developer engineering metrics for a period' })
  developers(@OrganizationId() organizationId: string, @Query() query: MetricsQueryDto) {
    return this.metricsService.developers(organizationId, query);
  }

  @Get('developers/:id')
  @RequirePermissions(Permission.METRIC_READ)
  @ApiOperation({ summary: 'One developer metrics with a daily trend' })
  developerOne(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: MetricsQueryDto,
  ) {
    return this.metricsService.developerOne(organizationId, id, query);
  }

  @Get('teams')
  @RequirePermissions(Permission.METRIC_READ)
  @ApiOperation({ summary: 'Team engineering metrics for a period' })
  teams(@OrganizationId() organizationId: string, @Query() query: MetricsQueryDto) {
    return this.metricsService.teams(organizationId, query);
  }

  @Get('teams/:id')
  @RequirePermissions(Permission.METRIC_READ)
  @ApiOperation({ summary: 'One team metrics' })
  teamOne(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: MetricsQueryDto,
  ) {
    return this.metricsService.teamOne(organizationId, id, query);
  }

  @Get('repositories/:id')
  @RequirePermissions(Permission.METRIC_READ)
  @ApiOperation({ summary: 'One repository activity metrics' })
  repositoryOne(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Query() query: MetricsQueryDto,
  ) {
    return this.metricsService.repositoryOne(organizationId, id, query);
  }
}
