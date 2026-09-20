import React, { useState } from 'react';
import { Download, FileSpreadsheet, Code, CheckCircle } from 'lucide-react';
import { Modal } from '../ui/Modal.tsx';
import { Button } from '../ui/Button.tsx';
import { AnalyticsFilterOptions } from '../../types/analytics.ts';
import { analyticsService } from '../../services/analyticsService.ts';

export interface ExportAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AnalyticsFilterOptions;
}

export const ExportAnalyticsModal: React.FC<ExportAnalyticsModalProps> = ({
  isOpen,
  onClose,
  filters,
}) => {
  const [selectedDataset, setSelectedDataset] = useState<'overview' | 'sif' | 'sites' | 'precursors' | 'capa'>('overview');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setSuccessMessage(null);
    try {
      if (format === 'csv') {
        await analyticsService.exportCsv(selectedDataset, filters);
        setSuccessMessage(`Successfully downloaded ${selectedDataset.toUpperCase()} CSV dataset.`);
      } else {
        await analyticsService.exportJson(filters);
        setSuccessMessage('Successfully exported full JSON analytics schema.');
      }
      setTimeout(() => {
        setIsExporting(false);
      }, 800);
    } catch (err: any) {
      setIsExporting(false);
      alert(`Export failed: ${err.message}`);
    }
  };

  const datasets = [
    {
      id: 'overview',
      name: 'Executive Overview KPIs',
      desc: 'All 8 core metrics, formulas, comparison values, and authoritative sources.',
    },
    {
      id: 'sif',
      name: 'SIF Potential Distribution',
      desc: 'SIF classification, review policies, human verification breakdown.',
    },
    {
      id: 'sites',
      name: 'Site-by-Site Exposure & Sufficiency',
      desc: 'Asset report counts, precursor density, dominant priority, and sample sufficiency indicators.',
    },
    {
      id: 'precursors',
      name: 'Precursor Clustering & Hazards',
      desc: 'Top precursor categories, share %, and SIF correlation counts.',
    },
    {
      id: 'capa',
      name: 'CAPA Resolution & Action Aging',
      desc: 'Corrective action completion rates, aging buckets, and overdue counts.',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Executive Analytics Dataset"
      description="Download certified data extracts for corporate safety reporting, audits, or external BI ingestion"
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Generating File...' : `Download ${format.toUpperCase()}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Format Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground block">File Format</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                format === 'csv'
                  ? 'border-primary bg-primary/10 text-foreground font-semibold'
                  : 'border-border bg-surface hover:bg-surface-muted text-muted-foreground'
              }`}
            >
              <FileSpreadsheet className={`w-5 h-5 ${format === 'csv' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <span className="text-xs block font-bold">CSV Spreadsheet</span>
                <span className="text-[10px] text-muted-foreground block">Tabular format for Excel & BI</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat('json')}
              className={`p-3 rounded-lg border text-left flex items-center gap-3 transition-all ${
                format === 'json'
                  ? 'border-primary bg-primary/10 text-foreground font-semibold'
                  : 'border-border bg-surface hover:bg-surface-muted text-muted-foreground'
              }`}
            >
              <Code className={`w-5 h-5 ${format === 'json' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <span className="text-xs block font-bold">Raw JSON</span>
                <span className="text-[10px] text-muted-foreground block">Full hierarchical telemetry object</span>
              </div>
            </button>
          </div>
        </div>

        {/* Dataset Choice (when CSV) */}
        {format === 'csv' && (
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-foreground block">Select Dataset</label>
            <div className="space-y-2">
              {datasets.map((d) => (
                <label
                  key={d.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-3 cursor-pointer transition-all ${
                    selectedDataset === d.id
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-surface hover:bg-surface-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="dataset"
                    value={d.id}
                    checked={selectedDataset === d.id}
                    onChange={() => setSelectedDataset(d.id as any)}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">{d.name}</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight mt-0.5">{d.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-lg border border-success/30 bg-success/10 text-success text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
