import React from 'react';

export interface SuchakLogoProps {
  /**
   * 'full' includes the shield emblem and the SUCHAK wordmark.
   * 'compact' includes only the shield emblem (ideal for collapsed sidebars).
   */
  variant?: 'full' | 'compact';
  /**
   * Size presets or custom height classes
   */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSubtitle?: boolean;
}

export const SuchakLogo: React.FC<SuchakLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showSubtitle = false,
}) => {
  const [imgError, setImgError] = React.useState(false);

  // Height sizing
  const heightMap = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  const emblemSize = {
    sm: 32,
    md: 40,
    lg: 48,
  }[size];

  // Render supplied official SUCHAK logo image for full brand header
  if (!imgError && variant === 'full') {
    return (
      <div
        className={`inline-flex items-center select-none ${className}`}
        role="img"
        aria-label="SUCHAK HSE Intelligence"
      >
        <img
          src="/suchak-logo.jpg"
          alt="SUCHAK HSE Intelligence"
          className={`${heightMap[size]} max-w-[180px] w-auto object-contain rounded-xs`}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-3 select-none ${className}`}
      role="img"
      aria-label="SUCHAK HSE Intelligence"
    >
      {/* SUCHAK Shield Emblem (Faithful to official logo) */}
      <svg
        width={emblemSize}
        height={emblemSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
      >
        <defs>
          <linearGradient id="suchak-orange-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="suchak-shield-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F243E" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0F243E" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Outer Orange Orbit Arc (lower left) */}
        <path
          d="M 16 68 C 12 55, 14 42, 22 34 C 23 32, 26 30, 29 33 C 23 40, 20 52, 26 66 C 28 71, 33 76, 40 81 C 33 79, 23 75, 16 68 Z"
          fill="url(#suchak-orange-grad)"
        />

        {/* Shield Body Background */}
        <path
          d="M 50 14 C 64 14, 76 18, 80 23 C 80 48, 70 70, 50 86 C 30 70, 20 48, 20 23 C 24 18, 36 14, 50 14 Z"
          fill="url(#suchak-shield-fill)"
        />

        {/* Grey Right Shield Rim */}
        <path
          d="M 50 14 C 64 14, 76 18, 80 23 C 80 48, 70 70, 50 86 L 50 78 C 65 64, 72 45, 72 27 C 67 24, 58 20, 50 20 Z"
          fill="#64748B"
        />

        {/* Dark Navy Left Shield Rim */}
        <path
          d="M 50 14 C 36 14, 24 18, 20 23 C 20 48, 30 70, 50 86 L 50 78 C 35 64, 28 45, 28 27 C 33 24, 42 20, 50 20 Z"
          fill="#0F243E"
          className="dark:fill-[#1E3A5F]"
        />

        {/* Dark Navy Orbit Arc wrapping across lower shield */}
        <path
          d="M 12 70 C 18 78, 32 78, 48 68 C 62 59, 74 46, 84 32 C 86 29, 87 28, 84 27 C 82 26, 79 28, 76 32 C 67 44, 56 55, 43 63 C 30 71, 18 72, 12 65 C 11 63, 10 65, 12 70 Z"
          fill="#0F243E"
          className="dark:fill-[#38BDF8]"
        />

        {/* Network Connector Lines (Safety Intelligence Nodes) */}
        <line x1="43" y1="52" x2="52" y2="35" stroke="#0F243E" strokeWidth="3.5" strokeLinecap="round" className="dark:stroke-sky-300" />
        <line x1="52" y1="35" x2="68" y2="38" stroke="#0F243E" strokeWidth="3.5" strokeLinecap="round" className="dark:stroke-sky-300" />

        {/* Network Nodes (Dots) */}
        <circle cx="52" cy="35" r="5" fill="#0F243E" className="dark:fill-sky-300" />
        <circle cx="68" cy="38" r="4.5" fill="#0F243E" className="dark:fill-sky-300" />

        {/* Orange Circular Badge with "SU" in lower center */}
        <circle cx="43" cy="54" r="14" fill="url(#suchak-orange-grad)" />
        <text
          x="43"
          y="59"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize="13"
          letterSpacing="-0.5px"
        >
          SU
        </text>
      </svg>

      {/* Wordmark (Shown only in 'full' variant) */}
      {variant === 'full' && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className="text-[22px] font-black tracking-[-0.02em] font-display text-[#0C2340] dark:text-slate-100 uppercase"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}
          >
            SUCHAK
          </span>
          {showSubtitle && (
            <span className="text-[9px] uppercase font-bold tracking-[0.18em] text-muted-foreground mt-0.5">
              HSE Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};
