import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import {
  CurrentUser,
  OrganizationId,
  RequirePermissions,
} from '../common/decorators';
import { AchievementsService } from './achievements.service';

@ApiTags('Achievements')
@ApiBearerAuth()
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get('me')
  @RequirePermissions(Permission.ACHIEVEMENT_READ)
  @ApiOperation({
    summary:
      "The caller's badges — earned, in progress and locked, with evidence",
  })
  findMine(
    @OrganizationId() organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.achievementsService.findForUser(organizationId, userId);
  }
}
