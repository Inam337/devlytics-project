import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import { OrganizationId, RequirePermissions } from '../common/decorators';
import { DashboardService } from './dashboard.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard/overview')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Organization-wide dashboard: KPIs, podium, activity, quality, AI summary' })
  overview(@OrganizationId() organizationId: string) {
    return this.dashboardService.overview(organizationId);
  }

  @Get('developers/:id/dashboard')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Developer dashboard: score, rank, achievements, active goals' })
  developer(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.dashboardService.developerDashboard(organizationId, id);
  }

  @Get('teams/:id/dashboard')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Team dashboard: score, rank, member and repository counts' })
  team(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.dashboardService.teamDashboard(organizationId, id);
  }

  @Get('repositories/:id/dashboard')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Repository dashboard: sync state and latest quality' })
  repository(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.dashboardService.repositoryDashboard(organizationId, id);
  }
}
