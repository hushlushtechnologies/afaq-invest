import { Module } from '@nestjs/common';
import { OpportunitiesController } from './opportunities.controller.js';
import { OpportunitiesManagementService } from './opportunities-management.service.js';
import { OpportunitiesService } from './opportunities.service.js';

/**
 * Investment opportunities: the read side and the write side kept as separate
 * providers, so reading a raise and opening one are not the same object with
 * the same reach.
 *
 * Self-contained on purpose. Opening a raise resolves the live ladder itself,
 * inside its own transaction, rather than calling the investment-rules
 * service — a call out to another module could not take part in that
 * transaction, and the pin has to be the ladder live at the instant of
 * opening.
 *
 * Both are exported: the investment phase will need a raise resolved, and its
 * pinned terms read, before it can accept money into one.
 */
@Module({
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService, OpportunitiesManagementService],
  exports: [OpportunitiesService, OpportunitiesManagementService],
})
export class OpportunitiesModule {}
