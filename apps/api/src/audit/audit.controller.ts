import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuditLogListItem, AuthActivityListItem, Paginated } from '@afaq/types';
import { RequirePermissions } from '../auth/permissions.decorator.js';
import { AuditService } from './audit.service.js';
import { ListAuditDto, ListAuthActivityDto } from './dto/list-audit.dto.js';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'The audit trail' })
  @ApiOkResponse({ description: 'A page of audit entries' })
  @ApiForbiddenResponse({ description: 'Missing audit.view' })
  list(@Query() query: ListAuditDto): Promise<Paginated<AuditLogListItem>> {
    return this.audit.list(query);
  }

  /** Declared before :targetType so "sign-ins" is never read as a type. */
  @Get('sign-ins')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Sign-in activity, including failed attempts' })
  @ApiOkResponse({ description: 'A page of sign-in events' })
  signIns(@Query() query: ListAuthActivityDto): Promise<Paginated<AuthActivityListItem>> {
    return this.audit.listAuthActivity(query);
  }

  /**
   * Everything that ever happened to one record.
   *
   * targetId is not a UUID pipe on purpose: audit entries can point at things
   * identified some other way, and refusing to show history because an id
   * looks unusual would be the wrong trade in a record meant for reading.
   */
  @Get(':targetType/:targetId')
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'The history of one record' })
  @ApiOkResponse({ description: 'A page of audit entries for that record' })
  history(
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ): Promise<Paginated<AuditLogListItem>> {
    return this.audit.history(targetType, targetId);
  }
}
