'use client';

import { useReducedMotion } from 'framer-motion';
import type { LottieHandle, LottieSubscriptions } from 'lottie-react';
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '@afaq/utils';
import { LOTTIE_REGISTRY, type LottieName } from './registry';

/** Only the props this component passes — lottie-react's own types are far broader. */
interface PlayerProps {
  src: string | object;
  loop?: boolean;
  autoplay?: boolean;
  lottieRef?: Ref<LottieHandle>;
  subscriptions?: Partial<LottieSubscriptions>;
  className?: string;
  style?: CSSProperties;
}

/**
 * The player is loaded only when an animation is actually needed, so the
 * Lottie engine (~150KB) never slows down pages that don't use it. The light
 * build draws SVG only, which is all these animations need.
 */
const LottiePlayer = lazy(() =>
  import('lottie-react').then((module) => ({
    default: module.LottieLight as unknown as ComponentType<PlayerProps>,
  })),
);

export type LottieSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<LottieSize, string> = {
  sm: 'size-10',
  md: 'size-16',
  lg: 'size-24',
  xl: 'size-36',
};

const ICON_SIZES: Record<LottieSize, string> = {
  sm: '[&_svg]:size-6',
  md: '[&_svg]:size-9',
  lg: '[&_svg]:size-12',
  xl: '[&_svg]:size-16',
};

export interface LottieAnimationProps {
  /** A named animation from the registry. */
  name?: LottieName;
  /** Or any animation: a URL to a JSON file, or the animation object itself. */
  src?: string | object;
  /** Overrides the registry's setting. */
  loop?: boolean;
  autoplay?: boolean;
  size?: LottieSize;
  /**
   * What the animation means, e.g. "Payment confirmed". Leave out when the
   * surrounding text already says it — the animation is then decorative.
   */
  label?: string;
  /** Shown instead of the animation if it can't load. Defaults to the registry icon. */
  fallback?: ReactNode;
  /** Wait until it scrolls into view before downloading. On by default. */
  lazyLoad?: boolean;
  onComplete?: () => void;
  className?: string;
}

/**
 * A Lottie animation that never breaks the page: it downloads only when
 * visible, shows an icon if the file is missing or fails, and for people who
 * prefer reduced motion it shows a still frame instead of playing.
 */
export function LottieAnimation({
  name,
  src,
  loop,
  autoplay = true,
  size = 'md',
  label,
  fallback,
  lazyLoad = true,
  onComplete,
  className,
}: LottieAnimationProps): ReactNode {
  const entry = name ? LOTTIE_REGISTRY[name] : undefined;
  const source = src ?? (entry?.available ? entry.src : undefined);
  const shouldLoop = loop ?? entry?.loop ?? false;

  const reduced = useReducedMotion();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<LottieHandle>(null);
  const [inView, setInView] = useState(!lazyLoad);
  const [failed, setFailed] = useState(false);

  // Start downloading shortly before the animation scrolls into view.
  useEffect(() => {
    if (inView || !wrapperRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((item) => item.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [inView]);

  const FallbackIcon = entry?.fallbackIcon;
  const fallbackContent =
    fallback ?? (FallbackIcon ? <FallbackIcon strokeWidth={1.5} aria-hidden="true" /> : null);
  const showFallback = !source || failed;

  // With reduced motion, a one-time animation jumps to its final frame (the
  // tick is drawn); a looping one rests on its first. Nothing plays by itself.
  const subscriptions: Partial<LottieSubscriptions> = {
    ready: () => {
      if (reduced && !shouldLoop) handleRef.current?.seek({ percent: 100 });
    },
    complete: () => onComplete?.(),
    error: () => setFailed(true),
  };

  return (
    <span
      ref={wrapperRef}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-state={showFallback ? 'fallback' : inView ? 'animation' : 'waiting'}
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-primary',
        SIZES[size],
        ICON_SIZES[size],
        className,
      )}
    >
      {showFallback ? (
        fallbackContent
      ) : inView ? (
        <Suspense fallback={null}>
          <LottiePlayer
            src={source}
            loop={shouldLoop}
            autoplay={autoplay && !reduced}
            lottieRef={handleRef}
            subscriptions={subscriptions}
            className="size-full"
          />
        </Suspense>
      ) : null}
    </span>
  );
}
