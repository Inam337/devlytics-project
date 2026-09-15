import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AppException } from '../common/exceptions/app.exception';
import { QueryUtil } from '../common/utils/query.util';
import { PrismaService } from '../database/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import {
  NOTIFICATION_CATEGORY,
  NotificationEventKey,
} from './notification-events';

export interface NotifyInput {
  organizationId: string;
  userId: string;
  event: NotificationEventKey;
  title: string;
  body: string;
  actionUrl?: string;
  channel?: NotificationChannel;
  metadata?: Prisma.InputJsonValue;
}

const SORTABLE = ['createdAt', 'isRead', 'category'] as const;

/**
 * In-app notification delivery. The category is derived from the event so a
 * caller cannot classify the same event two different ways.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notify(input: NotifyInput): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          eventKey: input.event,
          category: NOTIFICATION_CATEGORY[input.event],
          channel: input.channel ?? 'IN_APP',
          title: input.title,
          body: input.body,
          actionUrl: input.actionUrl,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      // A notification failure must not roll back the action that produced it.
      this.logger.error(`Failed to create '${input.event}' notification: ${(error as Error).message}`);
    }
  }

  /** Fan-out helper for digests and leaderboard events. */
  async notifyMany(inputs: NotifyInput[]): Promise<void> {
    if (inputs.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: inputs.map((input) => ({
          organizationId: input.organizationId,
          userId: input.userId,
          eventKey: input.event,
          category: NOTIFICATION_CATEGORY[input.event],
          channel: input.channel ?? 'IN_APP',
          title: input.title,
          body: input.body,
          actionUrl: input.actionUrl,
          metadata: input.metadata,
        })),
      });
    } catch (error) {
      this.logger.error(`Failed to create notification batch: ${(error as Error).message}`);
    }
  }

  async findAll(organizationId: string, userId: string, query: NotificationQueryDto) {
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      userId,
      ...QueryUtil.compact({ category: query.category, isRead: query.isRead }),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: QueryUtil.orderBy(query.sortBy, query.sortOrder, SORTABLE, 'createdAt'),
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { organizationId, userId, isRead: false } }),
    ]);

    return PaginatedResult.from(
      items.map((item) => ({ ...item, unreadCount })),
      total,
      query,
    );
  }

  async unreadCount(organizationId: string, userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: { organizationId, userId, isRead: false },
    });
    return { unreadCount };
  }

  async markRead(organizationId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, organizationId, userId },
    });
    if (!notification) throw AppException.notFound('Notification', id);
    if (notification.isRead) return notification;

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(organizationId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { organizationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }
}
