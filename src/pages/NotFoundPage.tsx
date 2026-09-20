import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.tsx';

export interface NotFoundPageProps {
  onNavigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center my-auto min-h-[50vh]">
      <div className="w-16 h-16 rounded-2xl bg-surface-muted border border-border flex items-center justify-center text-muted-foreground mb-4">
        <AlertCircle className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground font-display">Page Not Found (404)</h2>
      <p className="text-xs text-muted-foreground mt-2 max-w-sm leading-relaxed">
        The requested HSE module or route does not exist or has moved.
      </p>
      <div className="mt-6">
        <Button
          variant="primary"
          size="sm"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => onNavigate('/dashboard')}
        >
          Return to Safety Dashboard
        </Button>
      </div>
    </div>
  );
};
