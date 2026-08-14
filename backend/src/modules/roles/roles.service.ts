import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Role } from '../../database/entities/role.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(input: CreateRoleDto): Promise<Role> {
    const role = this.rolesRepository.create({
      name: input.name.trim(),
      description: input.description.trim(),
    });

    try {
      const saved = await this.rolesRepository.save(role);
      await this.permissionsService.seedAllFalseForNewRole(saved.id);
      return saved;
    } catch (error) {
      if (this.isDuplicateNameError(error)) {
        throw new ConflictException('Role name already exists');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (input.name !== undefined) {
      role.name = input.name.trim();
    }
    if (input.description !== undefined) {
      role.description = input.description.trim();
    }

    try {
      return await this.rolesRepository.save(role);
    } catch (error) {
      if (this.isDuplicateNameError(error)) {
        throw new ConflictException('Role name already exists');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: { usuarios: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.usuarios.length > 0) {
      throw new ConflictException(
        'Role is assigned to users. Reassign users before deleting role',
      );
    }

    await this.rolesRepository.remove(role);
  }

  private isDuplicateNameError(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const mysqlError = error as QueryFailedError & { code?: string };
    return mysqlError.code === 'ER_DUP_ENTRY';
  }
}
