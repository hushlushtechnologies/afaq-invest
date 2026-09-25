import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const ALLOW_INVITED_KEY = 'allowInvited';

/**
 * Lets a staff member who has been invited but not yet activated through.
 *
 * Exactly one endpoint needs this — the one where they accept the invitation.
 * Everything else still refuses them, because until they finish setting up,
 * they are not staff who may act.
 */
export const AllowInvited = (): CustomDecorator<string> => SetMetadata(ALLOW_INVITED_KEY, true);
