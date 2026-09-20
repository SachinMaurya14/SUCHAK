import React from 'react';

export interface TableShellProps {
  children: React.ReactNode;
  className?: string;
}

export const TableShell: React.FC<TableShellProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:shadow-none ${className}`}>
      <table className="w-full text-left text-xs border-collapse">{children}</table>
    </div>
  );
};

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <thead
      className={`bg-surface-muted/70 text-muted-foreground font-semibold border-b border-border text-[11px] uppercase tracking-wider ${className}`}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tbody className={`divide-y divide-border-subtle ${className}`} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <tr
      className={`hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <th className={`py-3.5 px-4 font-bold tracking-wider text-muted-foreground ${className}`} {...props}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <td className={`py-3.5 px-4 text-foreground align-middle ${className}`} {...props}>
      {children}
    </td>
  );
};
