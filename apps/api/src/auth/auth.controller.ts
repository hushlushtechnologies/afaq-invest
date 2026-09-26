import { Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { InvitationLifecycleService } from '../staff/invitation-lifecycle.service.js';
import { AllowInvited } from './allow-invited.decorator.js';
import { CurrentStaff, type RequestWithStaff } from './current-staff.decorator.js';
import { StaffContextService } from './staff-context.service.js';
import type { StaffContext } from './staff-context.types.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly staffContext: StaffContextService,
    private readonly invitations: InvitationLifecycleService,
  ) {}

  /**
   * Who the caller is, and what they may do.
   *
   * The Admin Portal asks once after signing in and uses the answer to decide
   * what to show — the whole sidebar depends on it. It is a convenience for
   * the interface; every endpoint still checks permissions itself.
   *
   * Note for anyone editing this file: each route needs its own method
   * decorator directly above its own method. Nest stores the path and the
   * verb in single-valued metadata, so stacking two route decorators on one
   * method silently keeps only the last one applied and the other route
   * disappears — returning 404 with nothing in the logs to explain it.
   */
  @Get('me')
  @ApiOperation({ summary: 'The signed-in staff member, with roles and permissions' })
  @ApiOkResponse({ description: 'The caller’s staff context' })
  @ApiUnauthorizedResponse({ description: 'No valid session' })
  async me(@CurrentStaff() staff: StaffContext): Promise<StaffContext> {
    // Keeps "last seen" roughly current without a write on every request.
    await this.staffContext.touchLastSeen(staff.staffUserId);
    return staff;
  }

  /**
   * Turns an invitation into an active account.
   *
   * Reachable while the account is still INVITED — that is the whole point of
   * it — which is why it carries @AllowInvited. No other route does.
   */
  @Post('accept-invitation')
  @AllowInvited()
  @ApiOperation({ summary: 'Accept an invitation and activate the account' })
  @ApiOkResponse({ description: 'The account is now active' })
  @ApiBadRequestResponse({ description: 'The invitation has expired or was withdrawn' })
  async acceptInvitation(
    @CurrentStaff() staff: StaffContext,
    @Req() request: RequestWithStaff,
  ): Promise<{ id: string }> {
    const result = await this.invitations.accept(staff);

    // Drop the cached identity so the very next request re-reads the staff
    // record and sees ACTIVE. Otherwise they would be bounced straight back
    // out of the portal they just joined.
    const token = request.headers.authorization?.split(' ')[1];
    if (token) this.staffContext.forgetToken(token);

    return result;
  }

  /**
   * Tells the API that a session is ending.
   *
   * Supabase ends the session itself; this drops our cached copy of the
   * verified token so the few seconds it would otherwise remain trusted are
   * removed. Called just before signing out, while the token still works.
   */
  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Forget the caller's token" })
  signOut(@Req() request: RequestWithStaff): void {
    const header = request.headers.authorization ?? '';
    const [, token] = header.split(' ');

    if (token) {
      this.staffContext.forgetToken(token.trim());
    }
  }
}
