import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, ResponseMessage } from '../common/decorators';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  @ResponseMessage('Service is healthy')
  @ApiOperation({
    summary: 'Liveness and database readiness probe used by Docker',
  })
  async check() {
    const database = await this.prisma.isHealthy();
    const payload = {
      status: database ? 'ok' : 'degraded',
      database: database ? 'up' : 'down',
      name: this.config.get<string>('app.name'),
      environment: this.config.get<string>('app.env'),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    if (!database) {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }
}
