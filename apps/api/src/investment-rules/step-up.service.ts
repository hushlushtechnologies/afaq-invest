import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from '../config/configuration.js';

/**
 * Re-checking that the person at the keyboard is who the session says.
 *
 * Publishing a ladder decides what the business owes real people, so it asks
 * for the administrator's own password again rather than trusting a session
 * that may have been left open on an unlocked screen.
 *
 * Their own password, deliberately, not a shared one kept in Settings: a
 * secret several people know proves only that somebody who knew it was
 * present, and the audit entry would name whoever's session was open rather
 * than whoever decided. This way the trail names a real person.
 *
 * Two things this file must never do, and does not: store the password
 * anywhere, or write it to a log. It is held in a parameter for the length of
 * one call and never leaves it.
 */
@Injectable()
export class StepUpService {
  private readonly logger = new Logger(StepUpService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Confirms the password belongs to this staff member.
   *
   * Uses a throwaway client built with the PUBLISHABLE key, not the secret
   * one. The secret key bypasses Row Level Security and can mint a session
   * for anybody without knowing their password, which would make this check
   * meaningless; the publishable key can only do what a browser could, which
   * is exactly the question being asked.
   *
   * A correct password creates a real session at Supabase as a side effect,
   * so it is signed out again immediately — this is an identity check, not a
   * sign-in, and leaving a spare refresh token lying around would be a small
   * gift to anyone who later stole it.
   */
  async verifyPassword(email: string, password: string | undefined): Promise<void> {
    if (!password) {
      throw new UnauthorizedException({
        reason: 'step_up_required',
        field: 'password',
        message: 'Enter your password to confirm this change.',
      });
    }

    const supabase = this.config.get<SupabaseConfig>('supabase');

    if (!supabase?.url || !supabase.publishableKey) {
      // Failing closed: if the check cannot run, the change does not happen.
      // The alternative — letting it through — would turn a misconfiguration
      // into a silently missing control.
      this.logger.error('Step-up authentication is switched on but Supabase is not configured');

      throw new UnauthorizedException({
        reason: 'step_up_unavailable',
        message: 'This change needs password confirmation, which is not available right now.',
      });
    }

    const client = createClient(supabase.url, supabase.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      // The email, never the password, and never Supabase's own message —
      // which distinguishes "no such account" from "wrong password" and would
      // turn this into an account-enumeration oracle.
      this.logger.warn(`Step-up authentication failed for ${email}`);

      throw new UnauthorizedException({
        reason: 'step_up_failed',
        field: 'password',
        message: 'That password is not correct.',
      });
    }

    // Best effort: the check has already passed, and failing to tidy up the
    // session is not a reason to refuse the change.
    try {
      await client.auth.signOut();
    } catch {
      this.logger.warn('Could not sign out the transient step-up session');
    }
  }
}
