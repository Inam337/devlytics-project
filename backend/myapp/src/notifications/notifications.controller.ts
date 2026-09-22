import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import {
  CurrentUser,
  OrganizationId,
  RequirePermissions,
  ResponseMessage,
} from '../common/decorators';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATION_READ)
  @ApiOperation({ summary: "List the caller's notifications" })
  findAll(
    @OrganizationId() organizationId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.findAll(organizationId, userId, query);
  }

  @Get('unread-count')
  @RequirePermissions(Permission.NOTIFICATION_READ)
  @ApiOperation({ summary: 'Unread badge count for the header' })
  unreadCount(
    @OrganizationId() organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationsService.unreadCount(organizationId, userId);
  }

  @Patch('read-all')
  @RequirePermissions(Permission.NOTIFICATION_READ)
  @ResponseMessage('All notifications marked as read')
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  markAllRead(
    @OrganizationId() organizationId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.notificationsService.markAllRead(organizationId, userId);
  }

  @Patch(':id/read')
  @RequirePermissions(Permission.NOTIFICATION_READ)
  @ResponseMessage('Notification marked as read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(
    @OrganizationId() organizationId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.notificationsService.markRead(organizationId, userId, id);
  }
}
