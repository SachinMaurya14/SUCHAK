import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (val: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeValue,
  onClear,
  placeholder = 'Search safety reports, keywords, sites...',
  className = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface text-foreground placeholder:text-muted-foreground text-xs py-2 pl-9 pr-8 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChangeValue('');
            onClear?.();
          }}
          className="absolute right-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
