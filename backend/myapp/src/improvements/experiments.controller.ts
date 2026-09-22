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
import {
  CreateExperimentDto,
  CreateExperimentMetricDto,
  ExperimentsQueryDto,
  UpdateExperimentDto,
  UpdateExperimentMetricDto,
} from './dto/experiments.dto';
import { ExperimentsService } from './experiments.service';
import { ImprovementVerificationService } from './improvement-verification.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Improvement Engine — Experiments')
@ApiBearerAuth()
@Controller('improvements/experiments')
export class ExperimentsController {
  constructor(
    private readonly experiments: ExperimentsService,
    private readonly verification: ImprovementVerificationService,
  ) {}

  @Post()
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Experiment created successfully')
  @ApiOperation({ summary: 'Create an engineering improvement experiment' })
  create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateExperimentDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.create(organizationId, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Get()
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({ summary: 'List experiments' })
  findAll(
    @OrganizationId() organizationId: string,
    @Query() query: ExperimentsQueryDto,
  ) {
    return this.experiments.findAll(organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({ summary: 'Experiment detail with its metrics and proof' })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
  ) {
    return this.experiments.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Experiment updated successfully')
  @ApiOperation({
    summary: 'Edit experiment content, or schedule/cancel it manually',
  })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateExperimentDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.update(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Experiment deleted successfully')
  @ApiOperation({ summary: 'Delete a draft or cancelled experiment' })
  remove(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.remove(organizationId, id, {
      actorId: userId,
      ...client,
    });
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Experiment started')
  @ApiOperation({
    summary:
      'Start (or resume) the experiment — captures baselines on first activation',
  })
  start(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.start(organizationId, id, {
      actorId: userId,
      ...client,
    });
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Experiment paused')
  @ApiOperation({ summary: 'Pause an active experiment' })
  pause(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.pause(organizationId, id, {
      actorId: userId,
      ...client,
    });
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Experiment completed')
  @ApiOperation({
    summary:
      'Complete the experiment — captures final measurements from stored activity',
  })
  complete(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.complete(organizationId, id, {
      actorId: userId,
      ...client,
    });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Experiment cancelled')
  @ApiOperation({ summary: 'Cancel the experiment' })
  cancel(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.cancel(organizationId, id, {
      actorId: userId,
      ...client,
    });
  }

  @Get(':id/metrics')
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({ summary: "List an experiment's metrics" })
  listMetrics(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
  ) {
    return this.experiments.listMetrics(organizationId, id);
  }

  @Post(':id/metrics')
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Metric added successfully')
  @ApiOperation({
    summary:
      'Add a metric to the experiment — baseline is calculated when omitted and the experiment has started',
  })
  addMetric(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: CreateExperimentMetricDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.addMetric(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Patch(':id/metrics/:metricId')
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Metric updated successfully')
  @ApiOperation({
    summary: "Edit a metric's name, unit, target or primary flag",
  })
  updateMetric(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Param('metricId', uuid()) metricId: string,
    @Body() dto: UpdateExperimentMetricDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.updateMetric(organizationId, id, metricId, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Delete(':id/metrics/:metricId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Metric removed successfully')
  @ApiOperation({ summary: 'Remove a metric from the experiment' })
  removeMetric(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Param('metricId', uuid()) metricId: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.experiments.removeMetric(organizationId, id, metricId, {
      actorId: userId,
      ...client,
    });
  }

  @Get(':id/progress')
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({
    summary:
      'Progress of each metric toward its target, computed from baseline and target — never current/target alone',
  })
  progress(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
  ) {
    return this.experiments.progress(organizationId, id);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.IMPROVEMENT_WRITE)
  @ResponseMessage('Experiment verified')
  @ApiOperation({
    summary:
      'Verify a completed experiment against its primary metric and produce an improvement proof',
  })
  verify(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.verification.verify(organizationId, id, {
      actorId: userId,
      ...client,
    });
  }

  @Get(':id/proof')
  @RequirePermissions(Permission.IMPROVEMENT_READ)
  @ApiOperation({ summary: 'The improvement proof produced by verification' })
  proof(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
  ) {
    return this.verification.findProof(organizationId, id);
  }
}
