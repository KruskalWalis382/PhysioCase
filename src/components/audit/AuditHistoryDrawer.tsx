import React, { useEffect, useMemo, useState } from 'react';
import { useClinical } from '../../context/ClinicalContext';
import { sortAuditEvents } from '../../utils/clinicalAudit';
import { ClinicalAuditEvent, AuditActionType } from '../../types';

interface AuditHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  caseId?: string;
}

export const AuditHistoryDrawer: React.FC<AuditHistoryDrawerProps> = ({
  isOpen,
  onClose,
  patientId,
  caseId,
}) => {
  const { auditEvents = [] } = useClinical();
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter events based on patient/case scope, action filter, and search query
  const filteredEvents = useMemo(() => {
    let list = auditEvents || [];

    if (patientId) {
      list = list.filter((e) => e.patientId === patientId);
    }
    if (caseId) {
      list = list.filter((e) => e.caseId === caseId);
    }

    if (actionFilter !== 'all') {
      list = list.filter((e) => e.action === actionFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.entityType.toLowerCase().includes(q) ||
          e.entityId.toLowerCase().includes(q) ||
          e.actor.name.toLowerCase().includes(q) ||
          (e.reason && e.reason.toLowerCase().includes(q))
      );
    }

    return sortAuditEvents(list);
  }, [auditEvents, patientId, caseId, actionFilter, searchQuery]);

  if (!isOpen) return null;

  const getActionBadgeColor = (action: AuditActionType) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FINALIZE':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'AMEND':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'SOFT_DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'HARD_DELETE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'RESTORE_WORKSPACE':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PRUNE_AUDIT_LOG':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'EXPORT_REPORT':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getActorSourceLabel = (source: string) => {
    switch (source) {
      case 'authenticated_session':
        return 'Verified Session';
      case 'settings_configured':
        return 'Configured Practitioner';
      default:
        return 'Local Device';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Clinical Audit History"
    >
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-200 ease-in-out">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Clinical Audit History</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-200 text-slate-700">
                {filteredEvents.length} events
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Append-only factual ledger (deterministic order: sequence ASC)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close audit history drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by entity, ID, actor, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Action:</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="FINALIZE">FINALIZE</option>
              <option value="AMEND">AMEND</option>
              <option value="SOFT_DELETE">SOFT_DELETE</option>
              <option value="HARD_DELETE">HARD_DELETE</option>
              <option value="RESTORE_WORKSPACE">RESTORE</option>
              <option value="PRUNE_AUDIT_LOG">PRUNE</option>
            </select>
          </div>
        </div>

        {/* Ledger Event List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <svg className="w-10 h-10 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium text-slate-600">No audit events found</p>
              <p className="text-xs mt-1">Actions on clinical records will appear here automatically.</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="border border-slate-200 rounded-lg p-3 bg-white hover:bg-slate-50/50 transition-colors text-xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-slate-400">
                      #{event.sequence}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadgeColor(
                        event.action
                      )}`}
                    >
                      {event.action}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {event.entityType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(event.occurredAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600 my-1 bg-slate-50/80 p-2 rounded border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Target Entity ID
                    </span>
                    <span className="font-mono text-[11px] text-slate-700">{event.entityId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Attributed Actor
                    </span>
                    <span className="font-medium text-slate-800">
                      {event.actor.name}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({getActorSourceLabel(event.actor.source)})
                      </span>
                    </span>
                  </div>
                </div>

                {event.changedFields && event.changedFields.length > 0 && (
                  <div className="mt-1.5">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">
                      Changed Properties
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {event.changedFields.map((field) => (
                        <span
                          key={field}
                          className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {event.reason && (
                  <div className="mt-1.5 text-slate-600">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block">Reason</span>
                    <span className="italic text-slate-700">{event.reason}</span>
                  </div>
                )}

                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-1.5 text-[10px] text-slate-500 font-mono bg-slate-100/60 p-1.5 rounded">
                    {Object.entries(event.metadata).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        <span className="text-slate-400">{k}:</span> {String(v)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>PhysioCase Local-First Governance</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
