import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ModuleAccess } from './decorators/module-access.decorator';
import { CreateAppModuleDto } from './dto/create-app-module.dto';
import { UpdateAppModuleDto } from './dto/update-app-module.dto';
import { PermissionsService } from './permissions.service';

@Controller('app-modules')
export class AppModulesController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ModuleAccess('admin_modules', 'r')
  findAll() {
    return this.permissionsService.listAppModulesForAdmin();
  }

  @Get(':id')
  @ModuleAccess('admin_modules', 'r')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionsService.getAppModuleByIdForAdmin(id);
  }

  @Post()
  @ModuleAccess('admin_modules', 'w')
  create(@Body() dto: CreateAppModuleDto) {
    return this.permissionsService.createAppModule(dto);
  }

  @Patch(':id')
  @ModuleAccess('admin_modules', 'u')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppModuleDto,
  ) {
    return this.permissionsService.updateAppModule(id, dto);
  }

  @Delete(':id')
  @ModuleAccess('admin_modules', 'd')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionsService.removeAppModule(id);
  }
}
