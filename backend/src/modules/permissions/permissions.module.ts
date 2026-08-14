import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModuleEntity } from '../../database/entities/app-module.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { Role } from '../../database/entities/role.entity';
import { AuthModule } from '../auth/auth.module';
import { AppModulesController } from './app-modules.controller';
import { ModuleAccessGuard } from './guards/module-access.guard';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    TypeOrmModule.forFeature([AppModuleEntity, RolePermission, Role]),
  ],
  controllers: [AppModulesController],
  providers: [PermissionsService, ModuleAccessGuard],
  exports: [TypeOrmModule, PermissionsService, ModuleAccessGuard],
})
export class PermissionsModule {}
