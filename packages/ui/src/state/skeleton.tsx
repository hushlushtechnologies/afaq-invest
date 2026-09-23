import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@afaq/utils';

export interface SkeletonProps {
  /** 'text' is a short rounded bar, 'circle' suits avatars, 'rect' anything else. */
  shape?: 'text' | 'rect' | 'circle';
  /** Any CSS width, e.g. '60%' or '12rem'. */
  width?: string;
  /** Any CSS height, e.g. '1rem'. */
  height?: string;
  className?: string;
}

/**
 * A placeholder shaped like the content that is loading. Always hidden from
 * screen readers — the loading announcement comes from the surrounding state.
 */
export function Skeleton({ shape = 'rect', width, height, className }: SkeletonProps): ReactNode {
  const style: CSSProperties = { width, height };
  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn(
        'block skeleton-shimmer',
        shape === 'text' && 'h-3 rounded-full',
        shape === 'rect' && 'rounded-lg',
        shape === 'circle' && 'aspect-square rounded-full',
        className,
      )}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/** Several text lines, the last one shorter — like a real paragraph. */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps): ReactNode {
  return (
    <span aria-hidden="true" className={cn('flex flex-col gap-2.5', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          shape="text"
          width={index === lines - 1 && lines > 1 ? '60%' : '100%'}
        />
      ))}
    </span>
  );
}

/** Placeholder for a StatCard. */
export function SkeletonStatCard({ className }: { className?: string }): ReactNode {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-xl border border-border bg-surface card-padding', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <Skeleton shape="text" width="45%" />
          <Skeleton height="1.75rem" width="70%" />
          <Skeleton shape="text" width="35%" />
        </div>
        <Skeleton height="2.25rem" width="2.25rem" />
      </div>
    </div>
  );
}

/** Placeholder for a content card: avatar, heading and a few lines. */
export function SkeletonCard({ className }: { className?: string }): ReactNode {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-xl border border-border bg-surface card-padding', className)}
    >
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" width="2.5rem" />
        <div className="flex-1 space-y-2">
          <Skeleton shape="text" width="50%" />
          <Skeleton shape="text" width="30%" />
        </div>
      </div>
      <SkeletonText lines={3} className="mt-5" />
    </div>
  );
}
