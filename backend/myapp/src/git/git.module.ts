import { Module } from '@nestjs/common';
import { GitCoreModule } from './git-core.module';
import { GitController } from './git.controller';
import { ActivityService } from './activity/activity.service';
import { RepositoriesController } from './repositories/repositories.controller';
import { RepositoriesService } from './repositories/repositories.service';
import { RepositoryImportService } from './repositories/repository-import.service';
import { SyncModule } from '../sync/sync.module';

/** HTTP surface for Git integration: providers, identities, repositories, activity. */
@Module({
  imports: [GitCoreModule, SyncModule],
  controllers: [GitController, RepositoriesController],
  providers: [RepositoriesService, ActivityService, RepositoryImportService],
  exports: [RepositoriesService, ActivityService],
})
export class GitModule {}
