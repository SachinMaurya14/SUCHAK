/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Governance Decision Modal Component
 */

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, AlertOctagon } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { EvaluationRun } from '../../../server/modelGovernanceTypes.ts';

export interface GovernanceDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluation: EvaluationRun | null;
  onRecordDecision: (evaluationId: string, decision: 'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED', justification: string) => Promise<void>;
  onSuccess?: () => void;
}

export const GovernanceDecisionModal: React.FC<GovernanceDecisionModalProps> = ({
  isOpen,
  onClose,
  evaluation,
  onRecordDecision,
  onSuccess,
}) => {
  const [decision, setDecision] = useState<'APPROVED' | 'REVIEW_REQUIRED' | 'REJECTED'>('APPROVED');
  const [justification, setJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!evaluation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim()) {
      setError('A formal justification is mandatory for audit compliance.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onRecordDecision(evaluation.evaluation_id, decision, justification);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record governance decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="HSE Leadership Governance Decision" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3.5 rounded-xl border border-border-subtle bg-muted/20">
          <div className="flex items-center justify-between font-mono text-[11px] mb-1">
            <span className="text-muted-foreground">Evaluation ID:</span>
            <span className="font-bold text-foreground">{evaluation.evaluation_id}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Model Target:</span>
            <span className="font-semibold text-foreground">{evaluation.model_name} ({evaluation.model_version})</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">Quality Gate Result:</span>
            <span
              className={`font-bold font-mono ${
                evaluation.overall_quality_gate_status === 'PASS'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {evaluation.overall_quality_gate_status}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="font-semibold text-foreground block mb-2">Governance Determination</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDecision('APPROVED')}
              className={`p-3 rounded-lg border text-center transition-all ${
                decision === 'APPROVED'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'border-border-subtle hover:bg-muted/20 text-muted-foreground'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-700 dark:text-emerald-400" />
              <span>APPROVE</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision('REVIEW_REQUIRED')}
              className={`p-3 rounded-lg border text-center transition-all ${
                decision === 'REVIEW_REQUIRED'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                  : 'border-border-subtle hover:bg-muted/20 text-muted-foreground'
              }`}
            >
              <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-700 dark:text-amber-400" />
              <span>REVIEW REQUIRED</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision('REJECTED')}
              className={`p-3 rounded-lg border text-center transition-all ${
                decision === 'REJECTED'
                  ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 font-bold'
                  : 'border-border-subtle hover:bg-muted/20 text-muted-foreground'
              }`}
            >
              <XCircle className="w-5 h-5 mx-auto mb-1 text-red-700 dark:text-red-400" />
              <span>REJECT</span>
            </button>
          </div>
        </div>

        <div>
          <label className="font-semibold text-foreground block mb-1">
            Official HSE Justification & Audit Rationale <span className="text-red-700">*</span>
          </label>
          <textarea
            rows={4}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Specify reason for approval or rejection, benchmark coverage, barrier compliance, or operational constraints..."
            className="w-full p-3 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary text-xs"
          />
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
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Recording Decision...' : 'Commit Governance Decision'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
