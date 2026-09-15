import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ReferenceDataService } from './reference-data.service';

/**
 * Database access is global: every domain module injects `PrismaService`
 * through its own repository rather than constructing a client.
 */
@Global()
@Module({
  providers: [PrismaService, ReferenceDataService],
  exports: [PrismaService, ReferenceDataService],
})
export class DatabaseModule {}
