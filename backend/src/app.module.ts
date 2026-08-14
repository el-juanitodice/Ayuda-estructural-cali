import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CorreoModule } from './modules/correo/correo.module';
import { ModeracionModule } from './modules/moderacion/moderacion.module';
import { TableroModule } from './modules/tablero/tablero.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { SaludModule } from './modules/salud/salud.module';
import { StorageModule } from './modules/storage/storage.module';
import { FotosModule } from './modules/fotos/fotos.module';
import { CampoModule } from './modules/campo/campo.module';
import { AisModule } from './shared/ais/ais.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    StorageModule,
    AisModule,
    CorreoModule,
    SaludModule,
    AuthModule,
    AdminModule,
    ReportesModule,
    ModeracionModule,
    TableroModule,
    FotosModule,
    CampoModule,
    PermissionsModule,
    RolesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
