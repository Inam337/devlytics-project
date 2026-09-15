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
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions(Permission.DEPARTMENT_READ)
  @ApiOperation({ summary: 'List departments' })
  findAll(@OrganizationId() organizationId: string, @Query() query: PaginationQueryDto) {
    return this.departmentsService.findAll(organizationId, query);
  }

  @Post()
  @RequirePermissions(Permission.DEPARTMENT_WRITE)
  @ResponseMessage('Department created successfully')
  @ApiOperation({ summary: 'Create a department' })
  create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateDepartmentDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.departmentsService.create(organizationId, dto, { actorId: userId, ...client });
  }

  @Get(':id')
  @RequirePermissions(Permission.DEPARTMENT_READ)
  @ApiOperation({ summary: 'Department detail with its teams' })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.departmentsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.DEPARTMENT_WRITE)
  @ResponseMessage('Department updated successfully')
  @ApiOperation({ summary: 'Update a department' })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.departmentsService.update(organizationId, id, dto, { actorId: userId, ...client });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.DEPARTMENT_WRITE)
  @ResponseMessage('Department deleted successfully')
  @ApiOperation({ summary: 'Delete an empty department' })
  remove(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.departmentsService.remove(organizationId, id, { actorId: userId, ...client });
  }
}
