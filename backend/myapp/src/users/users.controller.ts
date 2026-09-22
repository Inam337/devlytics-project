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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'List organization members' })
  findAll(
    @OrganizationId() organizationId: string,
    @Query() query: UserQueryDto,
  ) {
    return this.usersService.findAll(organizationId, query);
  }

  @Post()
  @RequirePermissions(Permission.USER_CREATE)
  @ResponseMessage('Invitation sent successfully')
  @ApiOperation({ summary: 'Invite a developer into the organization' })
  create(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.usersService.invite(organizationId, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_READ)
  @ApiOperation({ summary: 'Member profile with teams and Git identities' })
  findOne(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.usersService.findOne(organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_UPDATE)
  @ResponseMessage('User updated successfully')
  @ApiOperation({
    summary: 'Update a member profile, role or membership status',
  })
  update(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.usersService.update(organizationId, id, dto, {
      actorId: userId,
      reason: dto.reason,
      ...client,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USER_DELETE)
  @ResponseMessage('User removed from the organization')
  @ApiOperation({
    summary:
      'Remove a member (measured history is retained, membership is marked removed)',
  })
  remove(
    @OrganizationId() organizationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.usersService.remove(organizationId, id, {
      actorId: userId,
      ...client,
    });
  }
}
