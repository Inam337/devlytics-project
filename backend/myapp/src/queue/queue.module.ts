import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Redis/BullMQ connection shared by every queue. Individual domain modules
 * register the queues they own with `BullModule.registerQueue`.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        prefix: config.get<string>('redis.queuePrefix', 'devlytics'),
        connection: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
          db: config.get<number>('redis.db', 0),
          // Fail fast rather than buffering commands forever when Redis is down.
          maxRetriesPerRequest: null,
          enableOfflineQueue: false,
          retryStrategy: (attempt: number) => Math.min(attempt * 1000, 15_000),
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 3600, count: 500 },
          removeOnFail: { age: 86_400 },
        },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
