'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from './Icons';

export interface AppleSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  dot?: string;
  hint?: string;
  disabled?: boolean;
}

interface AppleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AppleSelectOption[];
  prefix?: string;
  placeholder?: string;
  ariaLabel?: string;
  title?: string;
  variant?: 'pill' | 'field' | 'compact';
  placement?: 'auto' | 'top' | 'bottom';
  align?: 'left' | 'right';
  minMenuWidth?: number;
  disabled?: boolean;
  isFiltered?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
}

export default function AppleSelect({
  value,
  onChange,
  options,
  prefix,
  placeholder = 'เลือก...',
  ariaLabel,
  title,
  variant = 'field',
  placement = 'auto',
  align = 'left',
  minMenuWidth,
  disabled = false,
  isFiltered = false,
  className = '',
  style,
}: AppleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [coords, setCoords] = useState<MenuCoords>({
    top: 0,
    left: 0,
    width: 180,
    maxHeight: 260,
    openUp: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  const computeCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 10;
    const gap = 6;

    const baseWidth = Math.max(
      rect.width,
      minMenuWidth ?? (variant === 'compact' ? 132 : 176)
    );
    const menuWidth = Math.min(baseWidth, vw - margin * 2);

    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    if (left + menuWidth > vw - margin) {
      left = vw - menuWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    const spaceBelow = vh - rect.bottom - margin - gap;
    const spaceAbove = rect.top - margin - gap;

    let openUp = false;
    if (placement === 'top') {
      openUp = spaceAbove > 110 || spaceAbove > spaceBelow;
    } else if (placement === 'auto') {
      openUp = spaceBelow < 210 && spaceAbove > spaceBelow;
    }

    const availableHeight = Math.max(120, openUp ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(280, availableHeight);

    setCoords(
      openUp
        ? {
            bottom: vh - rect.top + gap,
            left,
            width: menuWidth,
            maxHeight,
            openUp: true,
          }
        : {
            top: rect.bottom + gap,
            left,
            width: menuWidth,
            maxHeight,
            openUp: false,
          }
    );
  }, [align, minMenuWidth, placement, variant]);

  useEffect(() => {
    if (!isOpen) return;
    computeCoords();

    const selectedIdx = options.findIndex(o => o.value === value && !o.disabled);
    setHighlightedIdx(selectedIdx >= 0 ? selectedIdx : 0);

    // Focus/scroll selected option gently into view after portal mounts
    const raf = requestAnimationFrame(() => {
      const selectedEl = menuRef.current?.querySelector('[data-selected="true"]');
      if (selectedEl instanceof HTMLElement) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    });

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        (triggerRef.current?.contains(target) || menuRef.current?.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleWindowResize = () => computeCoords();

    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      computeCoords();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, computeCoords, options, value]);

  const selectOption = (opt: AppleSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const enabledIndices = options
      .map((o, idx) => (o.disabled ? -1 : idx))
      .filter(idx => idx !== -1);

    if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const pos = enabledIndices.indexOf(highlightedIdx);
      const next = enabledIndices[(pos + 1) % enabledIndices.length];
      if (next !== undefined) setHighlightedIdx(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const pos = enabledIndices.indexOf(highlightedIdx);
      const prev =
        pos <= 0
          ? enabledIndices[enabledIndices.length - 1]
          : enabledIndices[pos - 1];
      if (prev !== undefined) setHighlightedIdx(prev);
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (enabledIndices.length > 0) setHighlightedIdx(enabledIndices[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      if (enabledIndices.length > 0) {
        setHighlightedIdx(enabledIndices[enabledIndices.length - 1]);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[highlightedIdx];
      if (opt && !opt.disabled) selectOption(opt);
    }
  };

  const menuPortal =
    isOpen &&
    mounted &&
    createPortal(
      <div
        ref={menuRef}
        role="listbox"
        aria-label={ariaLabel || prefix || 'ตัวเลือก'}
        data-apple-select-menu="true"
        className={`apple-select-menu ${coords.openUp ? 'open-up' : 'open-down'}`}
        style={{
          position: 'fixed',
          top: coords.top,
          bottom: coords.bottom,
          left: coords.left,
          width: coords.width,
          maxHeight: coords.maxHeight,
          zIndex: 10050,
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        {options.map((opt, idx) => {
          const isSelected = opt.value === value;
          const isHighlighted = idx === highlightedIdx;
          return (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-selected={isSelected ? 'true' : undefined}
              disabled={opt.disabled}
              className={`apple-select-option ${isSelected ? 'selected' : ''} ${
                isHighlighted ? 'highlighted' : ''
              }`}
              onMouseEnter={() => setHighlightedIdx(idx)}
              onClick={() => selectOption(opt)}
            >
              {opt.dot && (
                <span
                  className="apple-select-dot"
                  style={{ background: opt.dot }}
                  aria-hidden="true"
                />
              )}
              {opt.icon && <span className="apple-select-opt-icon">{opt.icon}</span>}
              <span className="apple-select-opt-label">{opt.label}</span>
              {opt.hint && <span className="apple-select-opt-hint">{opt.hint}</span>}
              {isSelected && (
                <CheckIcon
                  size={13}
                  strokeWidth={2.75}
                  className="apple-select-check"
                />
              )}
            </button>
          );
        })}
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || prefix}
        title={title}
        disabled={disabled}
        className={`apple-select-trigger variant-${variant} ${
          isOpen ? 'is-open' : ''
        } ${isFiltered ? 'is-filtered' : ''} ${className}`}
        style={style}
        onClick={e => {
          e.stopPropagation();
          if (!disabled) setIsOpen(prev => !prev);
        }}
        onKeyDown={handleKeyDown}
      >
        {prefix && <span className="apple-select-prefix">{prefix}</span>}

        <span className="apple-select-value">
          {selectedOption?.dot && (
            <span
              className="apple-select-dot"
              style={{ background: selectedOption.dot }}
              aria-hidden="true"
            />
          )}
          {selectedOption?.icon && (
            <span className="apple-select-val-icon">{selectedOption.icon}</span>
          )}
          <span className="apple-select-val-text">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>

        <ChevronDownIcon
          size={variant === 'compact' ? 11 : 12}
          className={`apple-select-chevron ${isOpen ? 'rotated' : ''}`}
        />
      </button>

      {menuPortal}
    </>
  );
}
