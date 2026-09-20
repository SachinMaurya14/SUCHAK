import React, { useState } from 'react';
import { Sparkles, Send, Bot, Shield, Lightbulb } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';

export interface AskSuchakPageProps {
  onNavigate: (path: string) => void;
}

export const AskSuchakPage: React.FC<AskSuchakPageProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeResponse, setActiveResponse] = useState<string | null>(null);

  const samplePrompts = [
    'What are the most frequent barrier failures observed during high-pressure testing at Digboi?',
    'Show me all near-miss reports from the past 30 days related to scaffold tags and working at height.',
    'Which operational activities currently present the highest SIF precursor concentration?',
    'Summarize recurring unsafe condition reports around confined space atmospheric gas tests.',
  ];

  const handleInquire = () => {
    if (!query.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setActiveResponse(query);
    }, 600);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Ask SUCHAK — Safety Intelligence Copilot"
        subtitle="Natural language inquiry interface for incident precursors, safety rule concordance, and risk patterns."
        badge={<Badge variant="primary" size="sm">Safety Copilot</Badge>}
      />

      <Card>
        <CardContent className="space-y-6 p-6">
          <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 text-xs text-muted-foreground">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground">Natural Language Copilot:</span>{' '}
              Ask SUCHAK provides safety intelligence retrieval grounded across enterprise safety observations, PostgreSQL persistent records, and IOGP Life-Saving Rules.
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-warning" />
              Suggested Enterprise Safety Inquiries:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {samplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(prompt);
                    setActiveResponse(null);
                  }}
                  className="p-3 rounded-lg border border-border bg-surface-muted/30 text-xs text-left text-foreground hover:border-primary/50 hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInquire();
            }}
            className="relative flex items-center pt-4 border-t border-border-subtle"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask SUCHAK about SIF precursors, sites, activities, or safety rules..."
              className="w-full rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground text-sm py-3 pl-4 pr-28 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <div className="absolute right-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isSubmitting}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                Inquire
              </Button>
            </div>
          </form>

          {activeResponse && (
            <div className="p-5 rounded-xl border border-border bg-surface-muted/40 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-xs text-foreground font-display">
                    SUCHAK Grounded Safety Synthesis
                  </span>
                </div>
                <Badge variant="primary" size="sm">Confidence: 94%</Badge>
              </div>

              <p className="text-xs text-foreground leading-relaxed">
                Analysis of recent field observations reveals recurring SIF precursor signals concentrated around high-pressure hydrostatic proofs. The primary physical barrier failure mode identified is <strong>missing or disconnected safety whip check restraints</strong> on pressurized swivel joints, combined with exclusion zone breaches.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Mapped Rule</span>
                  <span className="font-semibold text-warning mt-1 block">Line of Fire (Rule 4)</span>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">High-Risk Asset</span>
                  <span className="font-semibold text-foreground mt-1 block">Digboi Central (Rig #4)</span>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Referenced Records</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/reports/REP-2026-0891')}
                    className="font-mono font-semibold text-primary mt-1 block hover:underline cursor-pointer"
                  >
                    REP-2026-0891 →
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
