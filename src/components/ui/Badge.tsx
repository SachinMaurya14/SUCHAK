import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium rounded-full',
    md: 'text-xs px-2.5 py-1 font-medium rounded-full',
  };

  const variantClasses = {
    default: 'bg-surface-muted text-foreground border border-border',
    primary: 'bg-primary/10 text-primary border border-primary/20',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-success/15 text-success border border-success/30 font-semibold',
    warning: 'bg-warning/15 text-warning border border-warning/30 font-semibold',
    danger: 'bg-danger/15 text-danger border border-danger/30 font-semibold',
    info: 'bg-info/15 text-info border border-info/30',
    outline: 'border border-border text-muted-foreground',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
