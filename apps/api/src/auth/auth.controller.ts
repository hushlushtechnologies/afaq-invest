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
   * what to show. It is a convenience for the interface — every endpoint
   * still checks permissions itself.
   */
  @Post('accept-invitation')
  @AllowInvited()
  @Get('me')
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
  @ApiUnauthorizedResponse({ description: 'No valid session' })
  async me(@CurrentStaff() staff: StaffContext): Promise<StaffContext> {
    // Keeps "last seen" roughly current without a write on every request.
    await this.staffContext.touchLastSeen(staff.staffUserId);
    return staff;
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
