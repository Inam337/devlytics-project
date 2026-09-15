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
import { GitIdentityClassification } from '@prisma/client';
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
import { GitAccountsService } from './accounts/git-accounts.service';
import {
  ClassifyGitIdentityDto,
  ConnectProviderDto,
  ImportRepositoriesDto,
  LinkGitIdentityDto,
} from './providers/dto/git-provider.dto';
import { GitProvidersService } from './providers/git-providers.service';
import { RepositoryImportService } from './repositories/repository-import.service';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Git Integration')
@ApiBearerAuth()
@Controller('git')
export class GitController {
  constructor(
    private readonly providers: GitProvidersService,
    private readonly accounts: GitAccountsService,
    private readonly importer: RepositoryImportService,
  ) {}

  @Get('providers')
  @RequirePermissions(Permission.INTEGRATION_READ)
  @ApiOperation({ summary: 'Connected Git providers with state and repository counts' })
  findProviders(@OrganizationId() organizationId: string) {
    return this.providers.findAll(organizationId);
  }

  @Post('github/connect')
  @RequirePermissions(Permission.INTEGRATION_WRITE)
  @ResponseMessage('GitHub connected successfully')
  @ApiOperation({ summary: 'Connect GitHub with a read-only token (verified before it is stored)' })
  connectGithub(
    @OrganizationId() organizationId: string,
    @Body() dto: ConnectProviderDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.providers.connect(organizationId, 'GITHUB', dto, { actorId: userId, ...client });
  }

  @Post('gitlab/connect')
  @RequirePermissions(Permission.INTEGRATION_WRITE)
  @ResponseMessage('GitLab connected successfully')
  @ApiOperation({ summary: 'Connect GitLab with a read-only token (verified before it is stored)' })
  connectGitlab(
    @OrganizationId() organizationId: string,
    @Body() dto: ConnectProviderDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.providers.connect(organizationId, 'GITLAB', dto, { actorId: userId, ...client });
  }

  @Get('providers/:id/discover')
  @RequirePermissions(Permission.INTEGRATION_READ)
  @ApiOperation({ summary: 'Repositories visible to the connection, before any collection' })
  discover(@OrganizationId() organizationId: string, @Param('id', uuid()) id: string) {
    return this.providers.discoverRepositories(organizationId, id);
  }

  @Post('providers/:id/import')
  @RequirePermissions(Permission.INTEGRATION_WRITE)
  @ResponseMessage('Repositories imported successfully')
  @ApiOperation({ summary: 'Import selected repositories and queue their history backfill' })
  importRepositories(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: ImportRepositoriesDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.importer.importRepositories(organizationId, id, dto, {
      actorId: userId,
      ...client,
    });
  }

  @Delete('providers/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.INTEGRATION_WRITE)
  @ResponseMessage('Git provider disconnected successfully')
  @ApiOperation({ summary: 'Disconnect a provider (repositories and history are retained)' })
  disconnect(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.providers.disconnect(organizationId, id, { actorId: userId, ...client });
  }

  @Get('identities')
  @RequirePermissions(Permission.INTEGRATION_READ)
  @ApiOperation({ summary: 'Git identities discovered during collection' })
  findIdentities(
    @OrganizationId() organizationId: string,
    @Query() query: PaginationQueryDto,
    @Query('classification') classification?: GitIdentityClassification,
  ) {
    return this.accounts.findAll(organizationId, query, classification);
  }

  @Get('identities/review-queue')
  @RequirePermissions(Permission.INTEGRATION_READ)
  @ApiOperation({ summary: 'Unmatched identities awaiting review (they score nothing)' })
  reviewQueue(@OrganizationId() organizationId: string) {
    return this.accounts.reviewQueue(organizationId);
  }

  @Patch('identities/:id/link')
  @RequirePermissions(Permission.INTEGRATION_WRITE)
  @ResponseMessage('Git identity linked successfully')
  @ApiOperation({ summary: 'Attach a Git identity to a member and re-attribute its history' })
  linkIdentity(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: LinkGitIdentityDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.accounts.link(organizationId, id, dto, { actorId: userId, ...client });
  }

  @Patch('identities/:id/classify')
  @RequirePermissions(Permission.INTEGRATION_WRITE)
  @ResponseMessage('Git identity reclassified successfully')
  @ApiOperation({ summary: 'Mark an identity as an automation account (excluded from scoring)' })
  classifyIdentity(
    @OrganizationId() organizationId: string,
    @Param('id', uuid()) id: string,
    @Body() dto: ClassifyGitIdentityDto,
    @CurrentUser('userId') userId: string,
    @Client() client: ClientInfo,
  ) {
    return this.accounts.classify(organizationId, id, dto, { actorId: userId, ...client });
  }
}
