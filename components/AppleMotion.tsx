'use client';

import React, { useRef, useEffect, useState } from 'react';

function shouldDisableMotion(): boolean {
  if (typeof window === 'undefined') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  if (window.matchMedia('(pointer: coarse)').matches) return true;
  return false;
}

interface Tilt3DCardProps extends React.HTMLAttributes<HTMLDivElement> {
  maxTilt?: number;
  glare?: boolean;
  holographic?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * Apple Card / Apple Watch Medallion inspired 3D tilt container.
 * Uses direct CSS variables inside requestAnimationFrame (zero React re-renders).
 */
export function Tilt3DCard({
  maxTilt = 10,
  glare = true,
  holographic = false,
  disabled = false,
  className = '',
  style,
  children,
  ...rest
}: Tilt3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    rest.onPointerMove?.(e);
    if (disabled || e.pointerType === 'touch' || shouldDisableMotion()) return;
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const rx = (0.5 - py) * (maxTilt * 2);
    const ry = (px - 0.5) * (maxTilt * 2);

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.classList.add('is-tilting');
      el.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`);
      el.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
      el.style.setProperty('--glare-op', '1');
    });
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    rest.onPointerLeave?.(e);
    const el = cardRef.current;
    if (!el) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    el.classList.remove('is-tilting');
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
    el.style.setProperty('--glare-op', '0');
  };

  return (
    <div
      ref={cardRef}
      className={`tilt3d-card ${holographic ? 'has-holo' : ''} ${disabled ? 'tilt-disabled' : ''} ${className}`}
      style={style}
      {...rest}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
      {glare && !disabled && <span className="tilt3d-glare" aria-hidden="true" />}
      {holographic && !disabled && <span className="tilt3d-holo" aria-hidden="true" />}
    </div>
  );
}

interface VisionGlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: string;
  children: React.ReactNode;
}

/**
 * VisionOS-inspired glass surface with subtle cursor-tracking specular edge glow.
 */
export function VisionGlowCard({
  glowColor = 'rgba(0, 113, 227, 0.24)',
  className = '',
  style,
  children,
  ...rest
}: VisionGlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    rest.onPointerMove?.(e);
    if (e.pointerType === 'touch' || shouldDisableMotion()) return;
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.setProperty('--glow-x', `${x.toFixed(1)}px`);
      el.style.setProperty('--glow-y', `${y.toFixed(1)}px`);
      el.style.setProperty('--glow-op', '1');
    });
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    rest.onPointerLeave?.(e);
    const el = ref.current;
    if (!el) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    el.style.setProperty('--glow-op', '0');
  };

  return (
    <div
      ref={ref}
      className={`vision-glow-card ${className}`}
      style={{
        ['--glow-color' as string]: glowColor,
        ...style,
      }}
      {...rest}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </div>
  );
}

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Smooth ease-out counter for KPI dashboard statistics.
 */
export function AnimatedNumber({
  value,
  duration = 520,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      prevRef.current = value;
      setDisplay(value);
      return;
    }

    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    let rafId = 0;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // Apple ease-out quintic curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevRef.current = to;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = to;
    };
  }, [value, duration]);

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
