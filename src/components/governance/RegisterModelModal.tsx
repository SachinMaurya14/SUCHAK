/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Register Model Modal Component
 */

import React, { useState } from 'react';
import { Cpu, Plus, X } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { ModelRecord } from '../../../server/modelGovernanceTypes.ts';

export interface RegisterModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterModel: (model: Omit<ModelRecord, 'created_at' | 'updated_at'>) => Promise<void>;
  onSuccess?: () => void;
}

export const RegisterModelModal: React.FC<RegisterModelModalProps> = ({
  isOpen,
  onClose,
  onRegisterModel,
  onSuccess,
}) => {
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [modelVersion, setModelVersion] = useState('1.0.0');
  const [provider, setProvider] = useState('SUCHAK Domain Fine-Tuned (PyTorch / ONNX)');
  const [architecture, setArchitecture] = useState('Transformer (RoBERTa-large SIF Classifier)');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelId.trim() || !modelName.trim()) {
      setError('Model ID and Name are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onRegisterModel({
        model_id: modelId.trim(),
        model_name: modelName.trim(),
        model_version: modelVersion.trim(),
        provider: provider.trim(),
        model_family: architecture.trim() || 'Domain Transformer',
        tasks: ['SIF_CLASSIFICATION', 'SAFETY_INTELLIGENCE'],
        status: 'DRAFT',
        release_readiness: 'NOT_READY',
        is_production_active: false,
        created_by: 'CSO-Alok-Baruah',
        notes: description.trim() || 'Candidate safety model registered for empirical evaluation.',
        supported_schema_version: '2026.1',
        configuration: { temperature: 0.1, max_output_tokens: 1024 },
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register model.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Candidate Model" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-foreground block mb-1">Model Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., Domain-Transformer-SIF-v2"
              className="w-full px-3 py-2 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Model ID (Identifier)</label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="e.g., model-domain-transformer-v2"
              className="w-full px-3 py-2 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-foreground block mb-1">Model Version</label>
            <input
              type="text"
              value={modelVersion}
              onChange={(e) => setModelVersion(e.target.value)}
              placeholder="e.g., 2.0.0"
              className="w-full px-3 py-2 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground block mb-1">Provider / Runtime</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="e.g., Google Gemini / ONNX / TensorRT"
              className="w-full px-3 py-2 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="font-semibold text-foreground block mb-1">Architecture</label>
          <input
            type="text"
            value={architecture}
            onChange={(e) => setArchitecture(e.target.value)}
            placeholder="e.g., Transformer / DeBERTa-v3 / Hybrid"
            className="w-full px-3 py-2 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="font-semibold text-foreground block mb-1">Model Purpose & Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe target safety tasks, training dataset, and operational scope..."
            className="w-full p-3 bg-muted/20 border border-border-subtle rounded-lg text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
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
            {isSubmitting ? 'Registering...' : 'Register Model in Registry'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
