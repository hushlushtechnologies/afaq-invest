import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Where Supabase sends people back to after an invitation or a password-reset
 * email.
 *
 * The link carries a one-time code, which is exchanged here for a session and
 * written into cookies. The code is used once and never appears in our logs or
 * in any page.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
): Promise<NextResponse> {
  const { locale } = await context.params;
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  // Supabase reports its own failures here, e.g. an expired link.
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error');
  // Where to continue once the session exists — set by whoever sent the link.
  const next = searchParams.get('next');

  if (errorCode) {
    return NextResponse.redirect(`${origin}/${locale}/login?error=expiredLink`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/login`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/${locale}/login?error=expiredLink`);
  }

  // Only our own paths: a crafted link must not be able to choose where
  // someone lands with a fresh session in hand.
  const destination = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  return NextResponse.redirect(`${origin}/${locale}${destination}`);
}
