import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import configuration from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuditModule } from './audit/audit.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { InvestmentRulesModule } from './investment-rules/investment-rules.module.js';
import { RolesModule } from './roles/roles.module.js';
import { StaffModule } from './staff/staff.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    AuditModule,
    RolesModule,
    StaffModule,
    CompaniesModule,
    InvestmentRulesModule,
    HealthModule,
  ],
})
export class AppModule {}
