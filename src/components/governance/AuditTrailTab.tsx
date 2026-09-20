/**
 * SUCHAK - Enterprise HSE Safety Intelligence & Early-Warning Platform
 * Phase 13: Governance Audit Trail & Compliance Log Component
 */

import React from 'react';
import { ScrollText, ShieldCheck, User, Calendar, Tag, ShieldAlert, Cpu } from 'lucide-react';
import { GovernanceAuditEvent } from '../../../server/modelGovernanceTypes.ts';

export interface AuditTrailTabProps {
  events: GovernanceAuditEvent[];
}

export const AuditTrailTab: React.FC<AuditTrailTabProps> = ({ events }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary" />
            <span>Immutable Governance Audit Trail</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cryptographically recorded compliance events for safety audit and regulatory verification.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/20 px-2.5 py-1 rounded-full border border-border-subtle">
          {events.length} Recorded Events
        </span>
      </div>

      <div className="border border-border-subtle rounded-xl bg-surface divide-y divide-border-subtle overflow-hidden text-xs">
        {events.map((event) => (
          <div key={event.id} className="p-4 hover:bg-muted/10 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold px-2 py-0.5 rounded text-[10px] bg-muted/40 text-foreground border border-border-subtle">
                  {event.event_type}
                </span>
                <span className="font-mono text-muted-foreground text-[11px]">{event.entity_id}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {event.entity_type}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(event.timestamp).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
              <User className="w-3.5 h-3.5" />
              <span>
                Initiated by <strong className="text-foreground">{event.actor.name}</strong> ({event.actor.role})
              </span>
            </div>

            {Object.keys(event.details).length > 0 && (
              <div className="p-2.5 rounded bg-muted/20 font-mono text-[11px] text-foreground border border-border-subtle overflow-x-auto">
                <pre className="whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
