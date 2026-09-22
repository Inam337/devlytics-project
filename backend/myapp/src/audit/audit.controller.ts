import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import { OrganizationId, RequirePermissions } from '../common/decorators';
import { AuditService } from './audit.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'List audit log entries (Organization Admin and Auditor)',
  })
  findAll(
    @OrganizationId() organizationId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditService.findAll(organizationId, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({
    summary: 'Audit entry detail with before/after values and reason',
  })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.auditService.findOne(organizationId, id);
  }
}
