import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
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
import { SetScoringWeightsDto } from './dto/scoring.dto';
import { ScoringService } from './scoring.service';

@ApiTags('Scoring')
@ApiBearerAuth()
@Controller('scoring/rules')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get()
  @RequirePermissions(Permission.SCORING_READ)
  @ApiOperation({ summary: 'Active scoring weight configuration' })
  findWeights(@OrganizationId() organizationId: string) {
    return this.scoringService.findWeights(organizationId);
  }

  @Post()
  @RequirePermissions(Permission.SCORING_WRITE)
  @ResponseMessage('Scoring weights created successfully')
  @ApiOperation({
    summary: 'Save a new weight version (must total 100%; existing rankings keep their version)',
  })
  createWeights(
    @OrganizationId() organizationId: string,
    @Body() dto: SetScoringWeightsDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.scoringService.setWeights(organizationId, dto, { actorId: userId, ...client });
  }

  @Patch()
  @RequirePermissions(Permission.SCORING_WRITE)
  @ResponseMessage('Scoring weights updated successfully')
  @ApiOperation({
    summary: 'Save a new weight version (must total 100%; existing rankings keep their version)',
  })
  setWeights(
    @OrganizationId() organizationId: string,
    @Body() dto: SetScoringWeightsDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.scoringService.setWeights(organizationId, dto, { actorId: userId, ...client });
  }
}
