import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from '../config/configuration.js';

/**
 * Server-side Supabase access.
 *
 * The admin client uses the SECRET key, which bypasses Row Level Security.
 * It exists only in this API and must never reach a browser.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private adminClient!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const supabase = this.config.get<SupabaseConfig>('supabase');

    if (!supabase?.url || !supabase.secretKey) {
      throw new Error('Supabase configuration is incomplete.');
    }

    this.adminClient = createClient(supabase.url, supabase.secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.logger.log('Supabase admin client initialised');
  }

  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  getStorage(bucket: string) {
    return this.adminClient.storage.from(bucket);
  }
}
