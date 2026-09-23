import { CheckCircle2, Clock, Inbox, ShieldCheck, ThumbsUp, type LucideIcon } from 'lucide-react';

/**
 * Every named animation the platform uses. Each app serves its files from
 * public/lottie/<name>.json.
 *
 * `available` stays false until the designer delivers the real file. While it
 * is false the icon is shown and no download is attempted — so a missing file
 * never produces a failed request or a blank space.
 */
export type LottieName = 'success' | 'pending' | 'verification' | 'empty' | 'confirmation';

export interface LottieEntry {
  /** Address of the JSON file, served from the app's public folder. */
  src: string;
  /** Loops continuously (pending) or plays once and holds (success). */
  loop: boolean;
  /** Shown when the file is unavailable, fails to load, or while waiting. */
  fallbackIcon: LucideIcon;
  available: boolean;
}

export const LOTTIE_REGISTRY: Record<LottieName, LottieEntry> = {
  // DEMO FILES — simple originals made for testing. Replace with the final designs.
  success: {
    src: '/lottie/success.json',
    loop: false,
    fallbackIcon: CheckCircle2,
    available: true,
  },
  pending: { src: '/lottie/pending.json', loop: true, fallbackIcon: Clock, available: true },
  // Waiting for designed files. Set `available: true` once each file is in public/lottie/.
  verification: {
    src: '/lottie/verification.json',
    loop: true,
    fallbackIcon: ShieldCheck,
    available: false,
  },
  empty: { src: '/lottie/empty.json', loop: false, fallbackIcon: Inbox, available: false },
  confirmation: {
    src: '/lottie/confirmation.json',
    loop: false,
    fallbackIcon: ThumbsUp,
    available: false,
  },
};
