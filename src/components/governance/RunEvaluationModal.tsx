/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Run Evaluation Trigger Modal Component
 */

import React, { useState } from 'react';
import { Play, X, ShieldAlert, Cpu, Database, FileText, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import {
  ModelRecord,
  PromptRecord,
  EvaluationDataset,
  EvaluationRun,
} from '../../../server/modelGovernanceTypes.ts';

export interface RunEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelRecord[];
  prompts: PromptRecord[];
  datasets: EvaluationDataset[];
  onExecuteRun: (payload: {
    dataset_id: string;
    model_id: string;
    prompt_id: string;
    configuration?: Record<string, any>;
  }) => Promise<EvaluationRun>;
  onSuccess?: (run: EvaluationRun) => void;
}

export const RunEvaluationModal: React.FC<RunEvaluationModalProps> = ({
  isOpen,
  onClose,
  models,
  prompts,
  datasets,
  onExecuteRun,
  onSuccess,
}) => {
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(datasets[0]?.dataset_id || '');
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.model_id || '');
  const [selectedPromptId, setSelectedPromptId] = useState<string>(prompts[0]?.prompt_id || '');
  const [temperature, setTemperature] = useState<number>(0.1);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);

    try {
      const run = await onExecuteRun({
        dataset_id: selectedDatasetId,
        model_id: selectedModelId,
        prompt_id: selectedPromptId,
        configuration: {
          temperature,
        },
      });
      onSuccess?.(run);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute evaluation run.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Execute Evaluation Run" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-2.5 text-muted-foreground">
          <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground">Empirical Safety Benchmarking:</span>{' '}
            Evaluations run each test case through the model, calculate confusion matrix, schema pass rate, multi-label recall, and test against configured Quality Gates.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        {/* Dataset Selection */}
        <div>
          <label className="font-semibold text-foreground block mb-1">Select Benchmark Dataset</label>
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="w-full px-3 py-2 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {datasets.map((d) => (
              <option key={d.dataset_id} value={d.dataset_id}>
                {d.name} ({d.record_count} cases • {d.provenance} • v{d.dataset_version})
              </option>
            ))}
          </select>
        </div>

        {/* Model Selection */}
        <div>
          <label className="font-semibold text-foreground block mb-1">Target Model</label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full px-3 py-2 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {models.map((m) => (
              <option key={m.model_id} value={m.model_id}>
                {m.model_name} (v{m.model_version} • {m.provider} • Status: {m.status})
              </option>
            ))}
          </select>
        </div>

        {/* Prompt Selection */}
        <div>
          <label className="font-semibold text-foreground block mb-1">Prompt Template</label>
          <select
            value={selectedPromptId}
            onChange={(e) => setSelectedPromptId(e.target.value)}
            className="w-full px-3 py-2 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          >
            {prompts.map((p) => (
              <option key={p.prompt_id} value={p.prompt_id}>
                {p.prompt_name} (v{p.prompt_version} • {p.task})
              </option>
            ))}
          </select>
        </div>

        {/* Temperature Config */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="font-semibold text-foreground">Inference Temperature</label>
            <span className="font-mono text-muted-foreground">{temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
            <span>0.0 (Deterministic / Rule-Locked)</span>
            <span>1.0 (Stochastic)</span>
          </div>
        </div>

        <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 border border-border-subtle text-muted-foreground rounded-lg hover:bg-muted/20"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isRunning}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Running Evaluation Suite...' : 'Start Evaluation'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
