import { Module } from '@nestjs/common';
import { InvestorsController } from './investors.controller.js';
import { InvestorsManagementService } from './investors-management.service.js';
import { InvestorsService } from './investors.service.js';

/**
 * Investor accounts: the read side and the write side kept as separate
 * providers, so reading an account and closing one are not the same object
 * with the same reach.
 *
 * PrismaService, SupabaseService and ConfigService come from global modules,
 * the same as for staff invitations.
 *
 * The read side is exported: the identity-check screens and, later, the
 * investment flow will need an investor resolved and their eligibility read.
 */
@Module({
  controllers: [InvestorsController],
  providers: [InvestorsService, InvestorsManagementService],
  exports: [InvestorsService],
})
export class InvestorsModule {}
