import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Foto } from '../../database/entities/foto.entity';
import { Reporte } from '../../database/entities/reporte.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { FotosController } from './fotos.controller';
import { FotosService } from './fotos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Foto, Reporte, Usuario]), AuthModule, PermissionsModule],
  controllers: [FotosController],
  providers: [FotosService, OptionalJwtAuthGuard],
  exports: [FotosService],
})
export class FotosModule {}
