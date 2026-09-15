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
import { AddTeamMemberDto, CreateTeamDto, TeamQueryDto, UpdateTeamDto } from './dto/team.dto';
import { TeamsService } from './teams.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @RequirePermissions(Permission.TEAM_READ)
  @ApiOperation({ summary: 'Team directory with member, project and repository counts' })
  findAll(@OrganizationId() organizationId: string, @Query() query: TeamQueryDto) {
    return this.teamsService.findAll(organizationId, query);
  }

  @Post()
  @RequirePermissions(Permission.TEAM_WRITE)
  @ResponseMessage('Team created successfully')
  @ApiOperation({ summary: 'Create a team (information, avatar and colour, lead)' })
  create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateTeamDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.teamsService.create(organizationId, dto, { actorId: userId, ...client });
  }

  @Get(':id')
  @RequirePermissions(Permission.TEAM_READ)
  @ApiOperation({ summary: 'Team profile with members, projects and repositories' })
  findOne(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.teamsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TEAM_WRITE)
  @ResponseMessage('Team updated successfully')
  @ApiOperation({ summary: 'Update a team' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateTeamDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.teamsService.update(organizationId, id, dto, { actorId: userId, ...client });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.TEAM_WRITE)
  @ResponseMessage('Team removed successfully')
  @ApiOperation({ summary: 'Delete a team, or archive it when it still owns work' })
  remove(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.teamsService.remove(organizationId, id, { actorId: userId, ...client });
  }

  @Get(':id/members')
  @RequirePermissions(Permission.TEAM_READ)
  @ApiOperation({ summary: 'Team members' })
  findMembers(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.teamsService.findMembers(organizationId, id);
  }

  @Post(':id/members')
  @RequirePermissions(Permission.TEAM_WRITE)
  @ResponseMessage('Team member added successfully')
  @ApiOperation({ summary: 'Add a member to the team' })
  addMember(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.teamsService.addMember(organizationId, id, dto, { actorId: userId, ...client });
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.TEAM_WRITE)
  @ResponseMessage('Team member removed successfully')
  @ApiOperation({ summary: 'Remove a member from the team' })
  removeMember(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Param('userId', uuid()) memberId: string,
    @CurrentUser('userId') actorId: string,
    @Client() client: ClientInfo,
  ) {
    return this.teamsService.removeMember(organizationId, id, memberId, { actorId, ...client });
  }
}
