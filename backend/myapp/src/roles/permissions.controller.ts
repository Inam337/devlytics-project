import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '../common/constants/permissions';
import { RequirePermissions } from '../common/decorators';
import { PrismaService } from '../database/prisma.service';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permission.ROLE_READ)
  @ApiOperation({
    summary: 'The global permission catalog, grouped by resource',
  })
  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    const byResource = permissions.reduce<Record<string, typeof permissions>>(
      (groups, item) => {
        (groups[item.resource] ??= []).push(item);
        return groups;
      },
      {},
    );

    return { total: permissions.length, resources: byResource };
  }
}
