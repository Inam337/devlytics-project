import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import { OrganizationId, RequirePermissions } from '../common/decorators';
import { RankingsQueryDto } from './dto/rankings-query.dto';
import { RankingsService } from './rankings.service';

@ApiTags('Rankings')
@ApiBearerAuth()
@Controller('rankings')
export class RankingsController {
  constructor(private readonly rankingsService: RankingsService) {}

  @Get('developers')
  @RequirePermissions(Permission.RANKING_READ)
  @ApiOperation({ summary: 'Developer leaderboard for a period' })
  developers(
    @OrganizationId() organizationId: string,
    @Query() query: RankingsQueryDto,
  ) {
    return this.rankingsService.developerLeaderboard(organizationId, query);
  }

  @Get('teams')
  @RequirePermissions(Permission.RANKING_READ)
  @ApiOperation({ summary: 'Team leaderboard for a period' })
  teams(
    @OrganizationId() organizationId: string,
    @Query() query: RankingsQueryDto,
  ) {
    return this.rankingsService.teamLeaderboard(organizationId, query);
  }

  @Get('history')
  @RequirePermissions(Permission.RANKING_READ)
  @ApiOperation({ summary: 'Ranking history across periods' })
  history(
    @OrganizationId() organizationId: string,
    @Query() query: RankingsQueryDto,
  ) {
    return this.rankingsService.history(organizationId, query);
  }
}
