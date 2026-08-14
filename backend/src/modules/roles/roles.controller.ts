import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ModuleAccess } from '../permissions/decorators/module-access.decorator';
import { SetRolePermissionMatrixDto } from '../permissions/dto/set-role-permission-matrix.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Get()
  @ModuleAccess('admin_roles', 'r')
  async findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id/permission-matrix')
  @ModuleAccess('admin_roles', 'r')
  getPermissionMatrix(@Param('id') id: string) {
    return this.permissionsService.getMatrixForRole(id);
  }

  @Put(':id/permission-matrix')
  @ModuleAccess('admin_roles', 'u')
  @HttpCode(200)
  setPermissionMatrix(
    @Param('id') id: string,
    @Body() input: SetRolePermissionMatrixDto,
  ) {
    return this.permissionsService.setMatrixForRole(id, input);
  }

  @Get(':id')
  @ModuleAccess('admin_roles', 'r')
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @ModuleAccess('admin_roles', 'w')
  async create(@Body() input: CreateRoleDto) {
    return this.rolesService.create(input);
  }

  @Patch(':id')
  @ModuleAccess('admin_roles', 'u')
  async update(@Param('id') id: string, @Body() input: UpdateRoleDto) {
    return this.rolesService.update(id, input);
  }

  @Delete(':id')
  @ModuleAccess('admin_roles', 'd')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
  }
}
