import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller.js';
import { CompaniesManagementService } from './companies-management.service.js';
import { CompaniesService } from './companies.service.js';

/**
 * Companies: the read side and the write side kept as separate providers, so
 * reading a company and changing one are not the same object with the same
 * reach. Both are exported — the dashboard will want the counts, and later
 * phases will want a company resolved before attaching an opportunity to it.
 */
@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService, CompaniesManagementService],
  exports: [CompaniesService, CompaniesManagementService],
})
export class CompaniesModule {}
