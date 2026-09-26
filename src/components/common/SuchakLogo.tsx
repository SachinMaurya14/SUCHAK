import React from 'react';

export interface SuchakLogoProps {
  /**
   * 'full' includes the complete emblem and SUCHAK wordmark.
   * 'compact' displays only the emblem icon (ideal for collapsed sidebars/favicons).
   */
  variant?: 'full' | 'compact';
  /**
   * Size presets:
   * - 'sm': compact toolbar/header sizing
   * - 'md': standard sidebar header sizing (35-50% larger, prominent and legible)
   * - 'lg': large login page and hero branding
   */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SuchakLogo: React.FC<SuchakLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
}) => {
  // Height sizing for full logo (increased 35-50% for maximum legibility)
  const fullSizeMap = {
    sm: 'h-10 max-w-[140px]',
    md: 'h-[58px] max-w-[210px]',
    lg: 'h-20 max-w-[280px]',
  };

  // Sizing for compact icon
  const compactSizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  if (variant === 'compact') {
    return (
      <div
        className={`inline-flex items-center justify-center select-none ${className}`}
        role="img"
        aria-label="SUCHAK"
      >
        <img
          src="/assets/suchak-emblem.png"
          alt="SUCHAK"
          className={`${compactSizeMap[size]} object-contain drop-shadow-xs`}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      role="img"
      aria-label="SUCHAK"
    >
      <img
        src="/assets/suchak-logo.png"
        alt="SUCHAK"
        className={`${fullSizeMap[size]} w-auto object-contain drop-shadow-xs`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
