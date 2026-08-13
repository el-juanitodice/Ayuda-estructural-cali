import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asignacion } from '../../database/entities/asignacion.entity';
import { FormularioAis } from '../../database/entities/formulario-ais.entity';
import { Reporte } from '../../database/entities/reporte.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { AisModule } from '../../shared/ais/ais.module';
import { ModeracionController } from './moderacion.controller';
import { ModeracionService } from './moderacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reporte, Usuario, Asignacion, FormularioAis]),
    AisModule,
  ],
  controllers: [ModeracionController],
  providers: [ModeracionService],
})
export class ModeracionModule {}
