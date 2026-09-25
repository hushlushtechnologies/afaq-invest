/**
 * Creates the first Super Admin.
 *
 * Deliberately a command, not an endpoint: there is no public registration and
 * no "first run" web page that could be reached by a stranger. Whoever can run
 * this already has the server's secret key.
 *
 * No credentials live in this file or in the repository. Details come from the
 * environment, and by default no password is set at all — the person receives
 * an invitation and chooses their own.
 *
 *   BOOTSTRAP_ADMIN_EMAIL     required
 *   BOOTSTRAP_ADMIN_NAME      required
 *   BOOTSTRAP_ADMIN_PASSWORD  optional; only for local development without email
 *
 * Run with:  pnpm db:bootstrap
 */

import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  createPrismaClient,
  type PrismaClient,
  type PrismaTransactionClient,
} from '@afaq/database';

const SUPER_ADMIN_ROLE_KEY = 'SUPER_ADMIN';
const INVITATION_VALID_DAYS = 7;
const MINIMUM_PASSWORD_LENGTH = 12;

interface BootstrapInput {
  email: string;
  fullName: string;
  password?: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
  databaseUrl: string;
  adminAppUrl: string;
}

class BootstrapError extends Error {}

function readInput(): BootstrapInput {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const adminAppUrl = process.env.ADMIN_APP_URL ?? 'http://localhost:3000';

  const missing: string[] = [];
  if (!email) missing.push('BOOTSTRAP_ADMIN_EMAIL');
  if (!fullName) missing.push('BOOTSTRAP_ADMIN_NAME');
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseSecretKey) missing.push('SUPABASE_SECRET_KEY');
  if (!databaseUrl) missing.push('DATABASE_URL');

  if (missing.length > 0) {
    throw new BootstrapError(`Missing environment variables: ${missing.join(', ')}`);
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email!)) {
    throw new BootstrapError(`"${email}" is not a valid email address.`);
  }

  if (password !== undefined && password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new BootstrapError(
      `BOOTSTRAP_ADMIN_PASSWORD must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`,
    );
  }

  return {
    email: email!,
    fullName: fullName!,
    password,
    supabaseUrl: supabaseUrl!,
    supabaseSecretKey: supabaseSecretKey!,
    databaseUrl: databaseUrl!,
    adminAppUrl,
  };
}

/**
 * Supabase has no "find user by email", so the admin list is paged through.
 * Only ever a handful of pages at bootstrap time.
 */
async function findAuthUserByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<User | undefined> {
  const perPage = 200;

  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new BootstrapError(`Could not read Supabase users: ${error.message}`);
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) return undefined;
  }

  return undefined;
}

/** Refuses to run twice, and refuses to run before the seed. */
async function assertSafeToBootstrap(prisma: PrismaClient, email: string): Promise<string> {
  const role = await prisma.role.findUnique({ where: { key: SUPER_ADMIN_ROLE_KEY } });

  if (!role) {
    throw new BootstrapError('The SUPER_ADMIN role does not exist yet. Run `pnpm db:seed` first.');
  }

  const existingSuperAdmins = await prisma.staffUserRole.count({ where: { roleId: role.id } });

  if (existingSuperAdmins > 0) {
    throw new BootstrapError(
      `A Super Admin already exists (${existingSuperAdmins} found). Bootstrap runs only once — ` +
        'invite further staff from Administration → Staff inside the Admin Portal.',
    );
  }

  const existingStaff = await prisma.staffUser.findUnique({ where: { email } });

  if (existingStaff) {
    throw new BootstrapError(
      `A staff member with the email ${email} already exists (status ${existingStaff.status}).`,
    );
  }

  return role.id;
}

/**
 * Finds, creates or invites the authentication identity.
 *
 * With a password: the account is created and confirmed, for local work where
 * email delivery is not set up. Without one: an invitation is sent and no
 * password ever exists until the person chooses it.
 */
async function ensureAuthUser(
  supabase: SupabaseClient,
  input: BootstrapInput,
): Promise<{ user: User; invited: boolean }> {
  // A previous half-finished run may have left a Supabase user behind; reuse
  // it rather than failing or creating a second one.
  const existing = await findAuthUserByEmail(supabase, input.email);

  if (existing) {
    console.log(`Supabase: reusing the existing account for ${input.email}`);
    return { user: existing, invited: false };
  }

  if (input.password) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.fullName },
    });

    if (error || !data.user) {
      throw new BootstrapError(`Could not create the Supabase account: ${error?.message}`);
    }

    console.log('Supabase: account created with the password from the environment');
    return { user: data.user, invited: false };
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${input.adminAppUrl}/en/auth/callback`,
    data: { full_name: input.fullName },
  });

  if (error || !data.user) {
    throw new BootstrapError(`Could not send the invitation: ${error?.message}`);
  }

  console.log(`Supabase: invitation sent to ${input.email}`);
  return { user: data.user, invited: true };
}

async function main(): Promise<void> {
  const input = readInput();
  const prisma = createPrismaClient({ connectionString: input.databaseUrl });

  const supabase = createClient(input.supabaseUrl, input.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const roleId = await assertSafeToBootstrap(prisma, input.email);

    const { user: authUser, invited } = await ensureAuthUser(supabase, input);

    // --- the staff record --------------------------------------------------
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_VALID_DAYS * 24 * 60 * 60 * 1000);

    const staff = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const created = await tx.staffUser.create({
        data: {
          authUserId: authUser.id,
          email: input.email,
          fullName: input.fullName,
          status: invited ? 'INVITED' : 'ACTIVE',
          invitedAt: invited ? now : null,
          invitationExpiresAt: invited ? expiresAt : null,
          invitationSentCount: invited ? 1 : 0,
          activatedAt: invited ? null : now,
        },
      });

      await tx.staffUserRole.create({
        data: { staffUserId: created.id, roleId },
      });

      // The very first privileged account is exactly the kind of event an
      // auditor will look for.
      await tx.auditLog.create({
        data: {
          actorStaffUserId: created.id,
          actorEmail: created.email,
          category: 'STAFF',
          action: 'staff.super_admin_bootstrapped',
          targetType: 'StaffUser',
          targetId: created.id,
          targetLabel: created.email,
          after: {
            status: created.status,
            roles: [SUPER_ADMIN_ROLE_KEY],
            method: invited ? 'invitation' : 'password',
          },
          metadata: { source: 'bootstrap-cli' },
        },
      });

      if (invited) {
        await tx.authActivity.create({
          data: {
            staffUserId: created.id,
            email: created.email,
            event: 'INVITATION_SENT',
            succeeded: true,
            deviceLabel: 'bootstrap-cli',
          },
        });
      }

      return created;
    });

    console.log('');
    console.log('Super Admin created.');
    console.log(`  name:   ${staff.fullName}`);
    console.log(`  email:  ${staff.email}`);
    console.log(`  status: ${staff.status}`);
    console.log('');

    if (invited) {
      console.log('Next: open the invitation email and choose a password.');
      console.log('The account becomes ACTIVE once that is done.');
    } else {
      console.log('Next: sign in at the Admin Portal with the password you set.');
      console.log('Remove BOOTSTRAP_ADMIN_PASSWORD from your environment now.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // Only the message — a stack trace here could reveal connection strings.
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nBootstrap failed: ${message}`);
  process.exitCode = 1;
});
