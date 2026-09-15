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
import { CreateGoalDto, GoalsQueryDto, UpdateGoalDto } from './dto/goals.dto';
import { GoalsService } from './goals.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Goals')
@ApiBearerAuth()
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @RequirePermissions(Permission.GOAL_WRITE)
  @ResponseMessage('Goal created successfully')
  @ApiOperation({ summary: 'Create an improvement goal with a measured baseline' })
  create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateGoalDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.goalsService.create(organizationId, dto, { actorId: userId, ...client });
  }

  @Get()
  @RequirePermissions(Permission.GOAL_READ)
  @ApiOperation({ summary: 'List goals' })
  findAll(@OrganizationId() organizationId: string, @Query() query: GoalsQueryDto) {
    return this.goalsService.findAll(organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.GOAL_READ)
  @ApiOperation({ summary: 'Goal detail with its progress history' })
  findOne(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.goalsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.GOAL_WRITE)
  @ResponseMessage('Goal updated successfully')
  @ApiOperation({ summary: 'Edit a goal, or abandon it (completion is never set manually)' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.goalsService.update(organizationId, id, dto, { actorId: userId, ...client });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.GOAL_WRITE)
  @ResponseMessage('Goal deleted successfully')
  @ApiOperation({ summary: 'Delete a goal' })
  remove(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.goalsService.remove(organizationId, id, { actorId: userId, ...client });
  }

  @Post(':id/progress')
  @RequirePermissions(Permission.GOAL_WRITE)
  @ResponseMessage('Goal progress re-measured successfully')
  @ApiOperation({ summary: 'Re-measure progress against the latest analysis run' })
  recheck(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.goalsService.recheckProgress(organizationId, id, userId);
  }

  @Get(':id/progress')
  @RequirePermissions(Permission.GOAL_READ)
  @ApiOperation({ summary: 'Progress history for a goal' })
  findProgress(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.goalsService.findProgress(organizationId, id);
  }
}
