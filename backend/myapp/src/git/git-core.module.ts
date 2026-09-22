import { Module } from '@nestjs/common';
import { GitAccountsService } from './accounts/git-accounts.service';
import { GitProvidersService } from './providers/git-providers.service';
import { ProviderAdapterFactory } from './providers/provider-adapter.factory';
import { RepositoriesRepository } from './repositories/repositories.repository';

/**
 * Provider access without any HTTP surface.
 *
 * Split out from `GitModule` so the sync pipeline can collect from providers
 * and the Git controllers can import repositories, without the two modules
 * importing each other.
 */
@Module({
  providers: [
    ProviderAdapterFactory,
    GitProvidersService,
    GitAccountsService,
    RepositoriesRepository,
  ],
  exports: [
    ProviderAdapterFactory,
    GitProvidersService,
    GitAccountsService,
    RepositoriesRepository,
  ],
})
export class GitCoreModule {}
