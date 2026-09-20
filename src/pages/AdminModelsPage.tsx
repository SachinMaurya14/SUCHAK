import React from 'react';
import { Cpu, CheckCircle2, Shield, Info, Database } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card.tsx';
import { Badge } from '../components/ui/Badge.tsx';

export interface AdminModelsPageProps {
  onNavigate: (path: string) => void;
}

export const AdminModelsPage: React.FC<AdminModelsPageProps> = ({ onNavigate }) => {
  const models = [
    { name: 'SUCHAK-SIF-Classifier-v1', type: 'Domain Transformer (Sequence Classification)', task: 'SIF Potential Binary & Multi-Class Scoring', status: 'Staged for Phase 2', latency: '~120ms' },
    { name: 'IOGP-Rule-Concordance-v1', type: 'Semantic Multi-Label Zero-Shot Matcher', task: 'Life-Saving Rule Mapping (9 Primary Rules)', status: 'Staged for Phase 2', latency: '~180ms' },
    { name: 'Precursor-Cluster-HDBSCAN-v1', type: 'Density-Based Embedding Clusterer', task: 'Unsupervised Barrier Degradation Grouping', status: 'Staged for Phase 2', latency: 'Batch / Async' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <PageHeader
        title="Model Registry & AI Governance"
        subtitle="Operational parameters, safety model versions, and latency benchmarks."
        badge={<Badge variant="primary" size="sm">Phase 1 Registry Shell</Badge>}
      />

      <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">AI Governance Boundary:</span>{' '}
          SUCHAK strictly adheres to explainable AI and human-in-the-loop validation. In Phase 1, model endpoints are registered and documented in the schema foundation. Model weights and inference pipelines will be linked in Phase 2.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {models.map((m, idx) => (
          <Card key={idx}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="w-4 h-4 text-primary" />
                <Badge variant="outline" size="sm">NLP Model</Badge>
              </div>
              <CardTitle className="text-sm">{m.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Model Architecture</span>
                <span className="font-medium text-foreground">{m.type}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Primary Task</span>
                <span className="font-medium text-foreground">{m.task}</span>
              </div>
              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-primary">{m.status}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
