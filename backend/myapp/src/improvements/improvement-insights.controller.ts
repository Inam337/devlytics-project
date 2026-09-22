import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import { OrganizationId, RequirePermissions } from '../common/decorators';
import {
  HistoryQueryDto,
  InsightsScopeQueryDto,
  ProblemsQueryDto,
} from './dto/insights.dto';
import { ImprovementInsightsService } from './improvement-insights.service';

@ApiTags('Improvement Engine — Insights')
@ApiBearerAuth()
@Controller('improvements')
export class ImprovementInsightsController {
  constructor(private readonly insights: ImprovementInsightsService) {}

  @Get('dashboard')
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({
    summary:
      'Improvement Engine dashboard: active experiments, top problems, recent proofs, trend',
  })
  dashboard(
    @OrganizationId() organizationId: string,
    @Query() query: InsightsScopeQueryDto,
  ) {
    return this.insights.dashboard(organizationId, query);
  }

  @Get('problems')
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({
    summary: 'Detected engineering problems, derived from open quality issues',
  })
  problems(
    @OrganizationId() organizationId: string,
    @Query() query: ProblemsQueryDto,
  ) {
    return this.insights.problems(organizationId, query);
  }

  @Get('history')
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({
    summary: 'Completed improvement experiments with their verified results',
  })
  history(
    @OrganizationId() organizationId: string,
    @Query() query: HistoryQueryDto,
  ) {
    return this.insights.history(organizationId, query);
  }
}
