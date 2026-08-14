import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, QueryFailedError, Repository } from 'typeorm';
import { AppModuleEntity } from '../../database/entities/app-module.entity';
import { RolePermission } from '../../database/entities/role-permission.entity';
import { Role } from '../../database/entities/role.entity';
import { CreateAppModuleDto } from './dto/create-app-module.dto';
import { SetRolePermissionMatrixDto } from './dto/set-role-permission-matrix.dto';
import { UpdateAppModuleDto } from './dto/update-app-module.dto';

export type NavModuleForUser = {
  code: string;
  name: string;
  route_path: string;
  nav_sort_order: number;
};

type AppModuleRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  route_path: string | null;
  nav_sort_order: number;
  is_system: boolean;
};

type MatrixRow = {
  app_module: AppModuleRow;
  r: boolean;
  w: boolean;
  u: boolean;
  d: boolean;
};

export type AppModuleAdminView = {
  id: string;
  code: string;
  name: string;
  description: string;
  route_path: string | null;
  nav_sort_order: number;
  is_system: boolean;
};

@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(AppModuleEntity)
    private readonly appModuleRepo: Repository<AppModuleEntity>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.backfillRoleMatricesWhenEmpty();
    await this.ensureMissingRolePermissionRows();
  }

  private async backfillRoleMatricesWhenEmpty(): Promise<void> {
    const modules = await this.findAllAppModules();
    if (modules.length === 0) {
      return;
    }
    const roles = await this.roleRepo.find();
    for (const role of roles) {
      const c = await this.rolePermissionRepo.count({
        where: { role: { id: role.id } },
      });
      if (c > 0) {
        continue;
      }
      for (const m of modules) {
        await this.rolePermissionRepo.save(
          this.rolePermissionRepo.create({
            role: { id: role.id } as Role,
            appModule: m,
            r: true,
            w: true,
            u: true,
            d: true,
          }),
        );
      }
    }
  }

  async seedAllFalseForNewRole(roleId: string): Promise<void> {
    const modules = await this.findAllAppModules();
    for (const m of modules) {
      await this.rolePermissionRepo.save(
        this.rolePermissionRepo.create({
          role: { id: roleId } as Role,
          appModule: m,
          r: false,
          w: false,
          u: false,
          d: false,
        }),
      );
    }
  }

  private async ensureMissingRolePermissionRows(): Promise<void> {
    const [roles, modules] = await Promise.all([
      this.roleRepo.find(),
      this.findAllAppModules(),
    ]);
    for (const role of roles) {
      for (const m of modules) {
        const c = await this.rolePermissionRepo.count({
          where: { role: { id: role.id }, appModule: { id: m.id } },
        });
        if (c > 0) {
          continue;
        }
        await this.rolePermissionRepo.save(
          this.rolePermissionRepo.create({
            role: { id: role.id } as Role,
            appModule: m,
            r: false,
            w: false,
            u: false,
            d: false,
          }),
        );
      }
    }
  }

  async listNavModulesForUser(roleId: string | null): Promise<NavModuleForUser[]> {
    const map = await this.getPermissionMapForRole(roleId);
    const rows = await this.appModuleRepo.find({
      where: { routePath: Not(IsNull()) },
      order: { navSortOrder: 'ASC', name: 'ASC' },
    });

    return rows
      .filter(
        (m) =>
          m.routePath &&
          m.routePath.trim() !== '' &&
          map[m.code]?.r,
      )
      .map((m) => ({
        code: m.code,
        name: m.name,
        route_path: m.routePath as string,
        nav_sort_order: m.navSortOrder,
      }));
  }

  findAllAppModules(): Promise<AppModuleEntity[]> {
    return this.appModuleRepo.find({
      order: { navSortOrder: 'ASC', name: 'ASC' },
    });
  }

  toAppModuleAdminView(m: AppModuleEntity): AppModuleAdminView {
    return {
      id: m.id,
      code: m.code,
      name: m.name,
      description: m.description,
      route_path: m.routePath,
      nav_sort_order: m.navSortOrder,
      is_system: m.isSystem,
    };
  }

  listAppModulesForAdmin(): Promise<AppModuleAdminView[]> {
    return this.findAllAppModules().then((rows) =>
      rows.map((m) => this.toAppModuleAdminView(m)),
    );
  }

  getAppModuleByIdForAdmin(id: string): Promise<AppModuleAdminView> {
    return this.findAppModuleByIdOrFail(id).then((m) =>
      this.toAppModuleAdminView(m),
    );
  }

  async removeAppModule(id: string): Promise<void> {
    const m = await this.findAppModuleByIdOrFail(id);
    if (m.isSystem) {
      throw new ConflictException(
        'No se puede eliminar un módulo de sistema.',
      );
    }
    await this.appModuleRepo.remove(m);
  }

  async findAppModuleByIdOrFail(id: string): Promise<AppModuleEntity> {
    const m = await this.appModuleRepo.findOne({ where: { id } });
    if (!m) {
      throw new NotFoundException('Módulo no encontrado');
    }
    return m;
  }

  async createAppModule(input: CreateAppModuleDto): Promise<AppModuleAdminView> {
    const existing = await this.appModuleRepo.findOne({
      where: { code: input.code },
    });
    if (existing) {
      throw new ConflictException('Ya existe un módulo con ese code');
    }

    const entity = this.appModuleRepo.create({
      code: input.code,
      name: input.name.trim(),
      description: (input.description ?? '').trim(),
      routePath:
        input.route_path === undefined ? null : input.route_path,
      navSortOrder: input.nav_sort_order ?? 0,
      isSystem: false,
    });

    try {
      const saved = await this.appModuleRepo.save(entity);
      const roles = await this.roleRepo.find();
      for (const role of roles) {
        await this.rolePermissionRepo.save(
          this.rolePermissionRepo.create({
            role: { id: role.id } as Role,
            appModule: saved,
            r: false,
            w: false,
            u: false,
            d: false,
          }),
        );
      }
      return this.toAppModuleAdminView(saved);
    } catch (err) {
      if (this.isDuplicateAppModuleError(err)) {
        throw new ConflictException('Ya existe un módulo con ese code');
      }
      throw err;
    }
  }

  async updateAppModule(
    id: string,
    input: UpdateAppModuleDto,
  ): Promise<AppModuleAdminView> {
    const m = await this.findAppModuleByIdOrFail(id);
    if (input.name !== undefined) {
      m.name = input.name.trim();
    }
    if (input.description !== undefined) {
      m.description = input.description.trim();
    }
    if (input.route_path !== undefined) {
      m.routePath = input.route_path;
    }
    if (input.nav_sort_order !== undefined) {
      m.navSortOrder = input.nav_sort_order;
    }
    if (input.is_system !== undefined) {
      m.isSystem = input.is_system;
    }
    const saved = await this.appModuleRepo.save(m);
    return this.toAppModuleAdminView(saved);
  }

  private isDuplicateAppModuleError(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) {
      return false;
    }
    const e = err as QueryFailedError & { code?: string; errno?: number };
    return e.code === 'ER_DUP_ENTRY' || e.errno === 1062;
  }

  findByRoleId(roleId: string): Promise<RolePermission[]> {
    return this.rolePermissionRepo.find({
      where: { role: { id: roleId } },
      relations: { appModule: true },
    });
  }

  async getPermissionMapForRole(
    roleId: string | null,
  ): Promise<
    Record<string, { r: boolean; w: boolean; u: boolean; d: boolean }>
  > {
    const modules = await this.findAllAppModules();
    const empty = () => ({
      r: false,
      w: false,
      u: false,
      d: false,
    });
    if (!roleId) {
      return Object.fromEntries(modules.map((m) => [m.code, empty()])) as Record<
        string,
        { r: boolean; w: boolean; u: boolean; d: boolean }
      >;
    }
    const existing = await this.findByRoleId(roleId);
    const byCode = new Map(
      existing.map(
        (rp) => [rp.appModule.code, rp] as [string, RolePermission],
      ),
    );
    return Object.fromEntries(
      modules.map((m) => {
        const rp = byCode.get(m.code);
        return [
          m.code,
          {
            r: rp?.r ?? false,
            w: rp?.w ?? false,
            u: rp?.u ?? false,
            d: rp?.d ?? false,
          },
        ];
      }),
    ) as Record<string, { r: boolean; w: boolean; u: boolean; d: boolean }>;
  }

  async getMatrixForRole(roleId: string): Promise<{ role_id: string; rows: MatrixRow[] }> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    const modules = await this.findAllAppModules();
    const existing = await this.findByRoleId(roleId);
    const byModuleId = new Map(
      existing.map((rp) => [rp.appModule.id, rp] as [string, RolePermission]),
    );
    return {
      role_id: roleId,
      rows: modules.map((m) => {
        const rp = byModuleId.get(m.id);
        return {
          app_module: {
            id: m.id,
            code: m.code,
            name: m.name,
            description: m.description,
            route_path: m.routePath,
            nav_sort_order: m.navSortOrder,
            is_system: m.isSystem,
          },
          r: rp?.r ?? false,
          w: rp?.w ?? false,
          u: rp?.u ?? false,
          d: rp?.d ?? false,
        };
      }),
    };
  }

  async setMatrixForRole(
    roleId: string,
    input: SetRolePermissionMatrixDto,
  ): Promise<{ role_id: string; rows: MatrixRow[] }> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    const modules = await this.findAllAppModules();
    const byId = new Map(modules.map((m) => [m.id, m]));
    if (input.rows.length !== modules.length) {
      throw new BadRequestException('Matrix must include every app module');
    }
    for (const row of input.rows) {
      if (!byId.has(row.app_module_id)) {
        throw new BadRequestException(`Invalid app_module_id: ${row.app_module_id}`);
      }
    }
    const inputIds = new Set(input.rows.map((r) => r.app_module_id));
    for (const m of modules) {
      if (!inputIds.has(m.id)) {
        throw new BadRequestException('Matrix must include every app module');
      }
    }
    if (new Set([...inputIds.values()]).size !== inputIds.size) {
      throw new BadRequestException('Duplicate app_module_id in matrix');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(RolePermission)
        .createQueryBuilder()
        .delete()
        .from(RolePermission)
        .where('role_id = :roleId', { roleId })
        .execute();

      const toSave = input.rows.map((row) =>
        manager.getRepository(RolePermission).create({
          role: { id: roleId } as Role,
          appModule: { id: row.app_module_id } as AppModuleEntity,
          r: row.r,
          w: row.w,
          u: row.u,
          d: row.d,
        }),
      );
      await manager.getRepository(RolePermission).save(toSave);
    });
    return this.getMatrixForRole(roleId);
  }

  async roleHasPermission(
    roleId: string | null,
    moduleCode: string,
    flag: 'r' | 'w' | 'u' | 'd' = 'r',
  ): Promise<boolean> {
    if (!roleId) return false;
    const map = await this.getPermissionMapForRole(roleId);
    return Boolean(map[moduleCode]?.[flag]);
  }

  /** Nivel A = revisión; B = solo campo. Prioriza A si tiene ambos. */
  async getEngineeringLevel(roleId: string | null): Promise<'A' | 'B' | null> {
    const map = await this.getPermissionMapForRole(roleId);
    const puedeRevision =
      map.revision?.r || map.revision?.w || map.revision?.u || map.revision?.d;
    const puedeCampo = map.campo?.r || map.campo?.w || map.campo?.u || map.campo?.d;
    if (puedeRevision) return 'A';
    if (puedeCampo) return 'B';
    return null;
  }

  /** Ingenieros asignables en moderación (excluye administradores globales). */
  async getAssignableEngineeringLevel(roleId: string | null): Promise<'A' | 'B' | null> {
    const nivel = await this.getEngineeringLevel(roleId);
    if (!nivel) return null;
    const esAdminGlobal = await this.roleHasPermission(roleId, 'admin_usuarios', 'w');
    if (esAdminGlobal) return null;
    return nivel;
  }

  async roleRequiresEngineeringCredentials(roleId: string | null): Promise<boolean> {
    return (await this.getEngineeringLevel(roleId)) !== null;
  }

  async countActiveUsersWithPermission(
    moduleCode: string,
    flag: 'r' | 'w' | 'u' | 'd' = 'w',
  ): Promise<number> {
    const flagColumn = flag;
    return this.dataSource
      .getRepository(RolePermission)
      .createQueryBuilder('rp')
      .innerJoin('rp.role', 'role')
      .innerJoin('rp.appModule', 'mod')
      .innerJoin('role.usuarios', 'u')
      .where('mod.code = :moduleCode', { moduleCode })
      .andWhere(`rp.${flagColumn} = :allowed`, { allowed: true })
      .andWhere('u.activo = :activo', { activo: true })
      .getCount();
  }
}
