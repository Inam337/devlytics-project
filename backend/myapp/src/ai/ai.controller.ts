import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
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
import { AiAnalysisService } from './ai-analysis.service';
import { AiProvidersService } from './ai-providers.service';
import {
  AiUsageQueryDto,
  AnalysisQueryDto,
  CreateAiIntegrationDto,
  TriggerAnalysisDto,
  UpdateAiIntegrationDto,
} from './dto/ai.dto';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly providers: AiProvidersService,
    private readonly analysis: AiAnalysisService,
  ) {}

  @Get('providers')
  @RequirePermissions(Permission.AI_READ)
  @ApiOperation({ summary: 'AI providers available to this organization' })
  findProviders(@OrganizationId() organizationId: string) {
    return this.providers.findProviders(organizationId);
  }

  @Get('integrations')
  @RequirePermissions(Permission.AI_READ)
  @ApiOperation({ summary: 'Configured AI integrations (API keys never returned)' })
  findIntegrations(@OrganizationId() organizationId: string) {
    return this.providers.findIntegrations(organizationId);
  }

  @Post('integrations')
  @RequirePermissions(Permission.AI_WRITE)
  @ResponseMessage('AI integration created successfully')
  @ApiOperation({ summary: 'Configure an AI integration (external providers are opt-in)' })
  createIntegration(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateAiIntegrationDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.providers.createIntegration(organizationId, dto, { actorId: userId, ...client });
  }

  @Patch('integrations/:id')
  @RequirePermissions(Permission.AI_WRITE)
  @ResponseMessage('AI integration updated successfully')
  @ApiOperation({ summary: 'Update an AI integration' })
  updateIntegration(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateAiIntegrationDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.providers.updateIntegration(organizationId, id, dto, { actorId: userId, ...client });
  }

  @Delete('integrations/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.AI_WRITE)
  @ResponseMessage('AI integration removed successfully')
  @ApiOperation({ summary: 'Remove an AI integration' })
  removeIntegration(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.providers.removeIntegration(organizationId, id, { actorId: userId, ...client });
  }

  @Post('analysis')
  @RequirePermissions(Permission.AI_RUN)
  @ResponseMessage('AI analysis run started successfully')
  @ApiOperation({ summary: 'Run deterministic analysis then AI interpretation for a repository' })
  triggerAnalysis(
    @OrganizationId() organizationId: string,
    @Body() dto: TriggerAnalysisDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.analysis.triggerAnalysis(organizationId, dto.repositoryId, {
      actorId: userId,
      ...client,
    });
  }

  @Get('analysis')
  @RequirePermissions(Permission.AI_READ)
  @ApiOperation({ summary: 'Analysis run history' })
  findAll(@OrganizationId() organizationId: string, @Query() query: AnalysisQueryDto) {
    return this.analysis.findAll(organizationId, query);
  }

  @Get('analysis/:id')
  @RequirePermissions(Permission.AI_READ)
  @ApiOperation({ summary: 'Analysis run detail with its findings and recommendations' })
  findOne(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.analysis.findOne(organizationId, id);
  }

  @Post('analysis/:id/retry')
  @RequirePermissions(Permission.AI_RUN)
  @ResponseMessage('AI interpretation retried successfully')
  @ApiOperation({ summary: 'Retry AI interpretation for findings still missing one' })
  retry(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.analysis.retry(organizationId, id, { actorId: userId, ...client });
  }

  @Get('usage')
  @RequirePermissions(Permission.AI_READ)
  @ApiOperation({ summary: 'AI usage (informational only, never a ranking reward)' })
  usage(@OrganizationId() organizationId: string, @Query() query: AiUsageQueryDto) {
    return this.analysis.usage(organizationId, query);
  }
}
