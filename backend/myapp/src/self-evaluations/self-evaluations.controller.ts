import {
  Body,
  Controller,
  Get,
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
import type { AuthenticatedUser } from '../common/types/request-context';
import {
  CreateSelfEvaluationDto,
  SelfEvaluationQueryDto,
  UpdateSelfEvaluationDto,
} from './dto/self-evaluation.dto';
import { SelfEvaluationsService } from './self-evaluations.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });
const REVIEWER_ROLES = [
  'ORGANIZATION_ADMIN',
  'DEPARTMENT_MANAGER',
  'TEAM_LEAD',
];

@ApiTags('Self Evaluation')
@ApiBearerAuth()
@Controller('self-evaluations')
export class SelfEvaluationsController {
  constructor(
    private readonly selfEvaluationsService: SelfEvaluationsService,
  ) {}

  @Post()
  @RequirePermissions(Permission.SELF_EVALUATION_WRITE)
  @ResponseMessage('Self-evaluation created successfully')
  @ApiOperation({ summary: 'Draft a self-evaluation for a period' })
  create(
    @OrganizationId() organizationId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSelfEvaluationDto,
    @Client() client: ClientInfo,
  ) {
    return this.selfEvaluationsService.create(organizationId, userId, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Get()
  @RequirePermissions(Permission.SELF_EVALUATION_READ)
  @ApiOperation({
    summary: 'List self-evaluations (developers see only their own)',
  })
  findAll(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SelfEvaluationQueryDto,
  ) {
    const scopeToSelf = user.roleKey === 'DEVELOPER' ? user.userId : undefined;
    return this.selfEvaluationsService.findAll(
      organizationId,
      query,
      scopeToSelf,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.SELF_EVALUATION_READ)
  @ApiOperation({ summary: 'Self-evaluation detail' })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
  ) {
    return this.selfEvaluationsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SELF_EVALUATION_WRITE)
  @ResponseMessage('Self-evaluation updated successfully')
  @ApiOperation({
    summary: 'Update, submit, or (as a reviewer) close out a self-evaluation',
  })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: UpdateSelfEvaluationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Client() client: ClientInfo,
  ) {
    return this.selfEvaluationsService.update(
      organizationId,
      id,
      dto,
      { actorId: user.userId, ...client },
      REVIEWER_ROLES.includes(user.roleKey),
    );
  }
}
