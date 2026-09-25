import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'afaq:isPublic';

/**
 * Marks an endpoint as reachable without signing in.
 *
 * Everything is protected by default — the guard is global — so openness is
 * the exception and has to be written down. Forgetting this decorator makes an
 * endpoint private, which is the safe way round.
 */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
