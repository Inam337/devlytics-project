import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

/**
 * Roles and the global permission catalog. They ship together because the
 * catalog exists only to be granted to roles.
 */
@Module({
  controllers: [RolesController, PermissionsController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
