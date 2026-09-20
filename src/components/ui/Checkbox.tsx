import React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, ...props }, ref) => {
    const checkId = id || `chk-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id={checkId}
          ref={ref}
          className={`mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer ${className}`}
          {...props}
        />
        <div className="flex flex-col text-left">
          <label htmlFor={checkId} className="text-sm font-medium text-foreground cursor-pointer select-none">
            {label}
          </label>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
