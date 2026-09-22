import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public, ResponseMessage } from '../common/decorators';
import { AppException } from '../common/exceptions/app.exception';
import { WebhooksService } from './webhooks.service';

/**
 * Inbound Git provider webhooks. Excluded from Swagger since these are called
 * by GitHub/GitLab, never by a client of the API.
 */
@ApiExcludeController()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('github')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Webhook accepted')
  async github(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Headers('x-github-event') event: string | undefined,
  ) {
    if (!request.rawBody) throw AppException.badRequest('Missing request body');
    const payload = JSON.parse(request.rawBody.toString('utf8')) as {
      repository?: { full_name?: string };
    };
    return this.webhooksService.handleGithub(
      request.rawBody,
      signature,
      event ?? 'unknown',
      payload.repository?.full_name,
    );
  }

  @Public()
  @Post('gitlab')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Webhook accepted')
  async gitlab(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-gitlab-token') token: string | undefined,
    @Headers('x-gitlab-event') event: string | undefined,
  ) {
    if (!request.rawBody) throw AppException.badRequest('Missing request body');
    const payload = JSON.parse(request.rawBody.toString('utf8')) as {
      project?: { path_with_namespace?: string };
    };
    return this.webhooksService.handleGitlab(
      token,
      event ?? 'unknown',
      payload.project?.path_with_namespace,
    );
  }
}
