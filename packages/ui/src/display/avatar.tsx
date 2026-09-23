'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@afaq/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, string> = {
  xs: 'size-6 text-[0.625rem]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-xl',
};

const TINTS = [
  'bg-primary/15 text-primary-strong',
  'bg-accent/20 text-accent-strong',
  'bg-info/15 text-info-strong',
  'bg-secondary/15 text-secondary',
] as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** The same name always gets the same tint. */
function tintOf(name: string): string {
  let total = 0;
  for (const character of name) total += character.charCodeAt(0);
  return TINTS[total % TINTS.length] ?? TINTS[0];
}

export interface AvatarProps {
  name: string;
  /** Photo URL. Falls back to initials if missing or broken. */
  src?: string;
  size?: AvatarSize;
  /** Small dot on the trailing corner. */
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

export function Avatar({ name, src, size = 'md', status, className }: AvatarProps): ReactNode {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const showImage = Boolean(src) && !failed;

  // A photo can fail before React is ready to hear about it, so onError never
  // fires. Whenever the address changes, check whether it already failed.
  useEffect(() => {
    const image = imageRef.current;
    setFailed(Boolean(image && image.complete && image.naturalWidth === 0));
  }, [src]);

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-full font-semibold ring-1 ring-border',
          SIZES[size],
          showImage ? 'bg-background-subtle' : tintOf(name),
        )}
      >
        {showImage ? (
          <img
            ref={imageRef}
            src={src}
            alt={name}
            onError={() => setFailed(true)}
            className="size-full object-cover"
          />
        ) : (
          <>
            <span aria-hidden="true">{initialsOf(name)}</span>
            <span className="sr-only">{name}</span>
          </>
        )}
      </span>

      {status ? (
        <span
          role="img"
          aria-label={status}
          className={cn(
            'absolute end-0 bottom-0 size-2.5 rounded-full ring-2 ring-surface',
            status === 'online' && 'bg-success',
            status === 'busy' && 'bg-danger',
            status === 'offline' && 'bg-fg-muted',
          )}
        />
      ) : null}
    </span>
  );
}
