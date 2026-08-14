import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../../database/entities/role.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Role]), AuthModule, PermissionsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
