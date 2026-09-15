import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
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
import { RecommendationQueryDto, UpdateRecommendationDto } from './dto/improvements.dto';
import { ImprovementsService } from './improvements.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Improvements')
@ApiBearerAuth()
@Controller('improvements/recommendations')
export class ImprovementsController {
  constructor(private readonly improvementsService: ImprovementsService) {}

  @Get()
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({ summary: 'Improvement Center: AI recommendations with their observed fact' })
  findAll(@OrganizationId() organizationId: string, @Query() query: RecommendationQueryDto) {
    return this.improvementsService.findAll(organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({ summary: 'Recommendation detail' })
  findOne(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.improvementsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Recommendation updated successfully')
  @ApiOperation({ summary: 'Accept, reject or mark a recommendation implemented' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateRecommendationDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.improvementsService.update(organizationId, id, dto, { actorId: userId, ...client });
  }
}
