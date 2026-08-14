import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asignacion } from '../../database/entities/asignacion.entity';
import { FormularioAis } from '../../database/entities/formulario-ais.entity';
import { Foto } from '../../database/entities/foto.entity';
import { Reporte } from '../../database/entities/reporte.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AisModule } from '../../shared/ais/ais.module';
import { CampoController } from './campo.controller';
import { CampoService } from './campo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormularioAis, Reporte, Foto, Usuario, Asignacion]),
    AuthModule,
    PermissionsModule,
    AisModule,
  ],
  controllers: [CampoController],
  providers: [CampoService],
})
export class CampoModule {}
