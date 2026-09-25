import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { PermissionGroup, RoleDetail, RoleListItem } from '@afaq/types';
import { CurrentStaff } from '../auth/current-staff.decorator.js';
import { RequireAnyPermission, RequirePermissions } from '../auth/permissions.decorator.js';
import type { StaffContext } from '../auth/staff-context.types.js';
import { CreateRoleDto, UpdateRoleDto } from './dto/write-role.dto.js';
import { RolesManagementService } from './roles-management.service.js';
import { RolesService } from './roles.service.js';

@ApiTags('Roles')
@Controller()
export class RolesController {
  constructor(
    private readonly roles: RolesService,
    private readonly management: RolesManagementService,
  ) {}

  @Get('roles')
  @RequirePermissions('role.view')
  @ApiOperation({ summary: 'List roles' })
  @ApiOkResponse({ description: 'Every role, with permission and staff counts' })
  @ApiForbiddenResponse({ description: 'Missing roles.view' })
  list(): Promise<RoleListItem[]> {
    return this.roles.list();
  }

  /**
   * The catalogue is declared before :id so "permissions" is never mistaken
   * for a role id.
   */
  @Get('permissions')
  // Anyone who can look at roles or assign them needs to read the catalogue,
  // so requiring roles.view alone would break the staff screens.
  @RequireAnyPermission('role.view', 'staff.manage')
  @ApiOperation({ summary: 'The permission catalogue, grouped by resource' })
  @ApiOkResponse({ description: 'Permission groups' })
  catalogue(): PermissionGroup[] {
    return this.roles.catalogue();
  }

  @Get('roles/:id')
  @RequirePermissions('role.view')
  @ApiOperation({ summary: 'One role, with the permissions it carries' })
  @ApiOkResponse({ description: 'The role' })
  @ApiNotFoundResponse({ description: 'No such role' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoleDetail> {
    return this.roles.findOne(id);
  }

  @Post('roles')
  @RequirePermissions('role.create')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiCreatedResponse({ description: 'The role was created' })
  @ApiForbiddenResponse({ description: 'Including permissions you do not hold' })
  @ApiConflictResponse({ description: 'A role with that name already exists' })
  create(
    @CurrentStaff() actor: StaffContext,
    @Body() body: CreateRoleDto,
  ): Promise<{ id: string }> {
    return this.management.create(actor, body);
  }

  @Patch('roles/:id')
  @RequirePermissions('role.edit')
  @ApiOperation({ summary: 'Change a custom role' })
  @ApiOkResponse({ description: 'Updated' })
  @ApiBadRequestResponse({ description: 'Built-in roles cannot be edited' })
  update(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleDto,
  ): Promise<{ id: string }> {
    return this.management.update(actor, id, body);
  }

  @Delete('roles/:id')
  @RequirePermissions('role.delete')
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiOkResponse({ description: 'Deleted' })
  @ApiBadRequestResponse({ description: 'Built-in, or still held by staff' })
  remove(
    @CurrentStaff() actor: StaffContext,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ id: string }> {
    return this.management.remove(actor, id);
  }
}
