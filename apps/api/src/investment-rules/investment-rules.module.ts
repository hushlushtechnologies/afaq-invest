import { Module } from '@nestjs/common';
import { InvestmentRulesController } from './investment-rules.controller.js';
import { InvestmentRulesManagementService } from './investment-rules-management.service.js';
import { InvestmentRulesService } from './investment-rules.service.js';
import { StepUpService } from './step-up.service.js';

/**
 * Investment rules: the read side and the write side kept as separate
 * providers, so asking what an amount earns and rewriting what every amount
 * earns are not the same object with the same reach.
 *
 * Both are exported. Later phases need the read side in particular — an
 * investment request has to resolve its terms, and the opportunity screens
 * have to show them.
 */
@Module({
  controllers: [InvestmentRulesController],
  providers: [InvestmentRulesService, InvestmentRulesManagementService, StepUpService],
  exports: [InvestmentRulesService, InvestmentRulesManagementService],
})
export class InvestmentRulesModule {}
