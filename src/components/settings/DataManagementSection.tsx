import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  RefreshCw,
  X,
  FileCheck,
  AlertOctagon,
  History,
  Trash2,
  Archive,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useClinical } from '../../context/ClinicalContext';
import {
  calculateWorkspaceSummary,
  createWorkspaceBackupEnvelope,
  downloadWorkspaceBackupFile,
  validateWorkspaceBackup,
  executeReplaceRestore,
  canonicalizeJson,
  computeSha256,
} from '../../utils/workspaceBackup';
import {
  BackupValidationResult,
  PhysioCaseWorkspaceBackupEnvelope,
  WorkspaceBackupSummary,
} from '../../types/backup';
import { formatClinicalDate } from '../../utils/clinicalFormatters';
import { AuditHistoryDrawer } from '../audit/AuditHistoryDrawer';

export const DataManagementSection: React.FC = () => {
  const {
    getAuthoritativeWorkspaceDataset,
    restoreWorkspaceDataset,
    auditEvents = [],
    pruneAuditLog,
    auditStorageWarning,
  } = useClinical();
  const events = auditEvents || [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active state summary
  const activeDataset = getAuthoritativeWorkspaceDataset();
  const currentSummary = calculateWorkspaceSummary(activeDataset);

  // Backup creation state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Restore validation state
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);
  const [rawFileContent, setRawFileContent] = useState<string | null>(null);

  // Confirmation modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  // Critical recovery state
  const [criticalRecoveryError, setCriticalRecoveryError] = useState<string | null>(null);

  // Stage 13: Audit Ledger Maintenance state
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isPruneModalOpen, setIsPruneModalOpen] = useState(false);
  const [pruneConfirmText, setPruneConfirmText] = useState('');
  const defaultCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [pruneCutoffDate, setPruneCutoffDate] = useState(defaultCutoff);
  const [pruneArchiveChecksum, setPruneArchiveChecksum] = useState<string | null>(null);
  const [hasExportedArchive, setHasExportedArchive] = useState(false);
  const [auditExportMessage, setAuditExportMessage] = useState<string | null>(null);

  // Handle Export
  const handleExportBackup = async () => {
    setIsExporting(true);
    setExportSuccessMessage(null);
    try {
      const envelope = await createWorkspaceBackupEnvelope(activeDataset);
      downloadWorkspaceBackupFile(envelope);
      setExportSuccessMessage('Workspace backup generated and downloaded successfully.');
      setTimeout(() => setExportSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Backup generation failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection & Validation
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setIsValidating(true);
    setValidationResult(null);
    setRestoreSuccessMessage(null);

    try {
      const text = await file.text();
      setRawFileContent(text);
      const result = await validateWorkspaceBackup(text);
      setValidationResult(result);
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [{ code: 'ERR_INVALID_JSON', message: `Could not read file: ${err.message}` }],
        warnings: [],
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Trigger Restore Confirmation Modal
  const handleOpenRestoreConfirm = () => {
    if (!validationResult?.valid || !validationResult.envelope) return;
    setConfirmInputText('');
    setIsConfirmModalOpen(true);
  };

  // Execute Replace Restore
  const handleExecuteRestore = async () => {
    if (!validationResult?.valid || !validationResult.envelope) return;
    setIsRestoring(true);

    const result = await executeReplaceRestore(
      validationResult.envelope,
      activeDataset,
      (newDataset) => {
        restoreWorkspaceDataset(newDataset);
      }
    );

    setIsRestoring(false);
    setIsConfirmModalOpen(false);

    if (result.success) {
      setRestoreSuccessMessage(
        `Workspace successfully restored (${result.restoredCounts?.patientCount || 0} patients, ${result.restoredCounts?.caseCount || 0} cases).`
      );
      // Reset restore selection
      setSelectedFileName(null);
      setValidationResult(null);
      setRawFileContent(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else if (result.criticalRecovery) {
      setCriticalRecoveryError(result.error || 'Fatal write error during restore.');
    } else {
      alert(`Restore aborted: ${result.error}`);
    }
  };

  // Emergency Recovery Actions
  const handleEmergencyDownloadSnapshot = () => {
    const emergency = window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__;
    if (!emergency) return;
    const blob = new Blob([JSON.stringify(emergency.preRestoreSnapshot, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physiocase-emergency-pre-restore-snapshot-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEmergencyDownloadAttempt = () => {
    const emergency = window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__;
    if (!emergency) return;
    downloadWorkspaceBackupFile(emergency.failedCandidateBackup);
  };

  const handleEmergencyRetryRollback = async () => {
    const emergency = window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__;
    if (!emergency) return;
    try {
      restoreWorkspaceDataset(emergency.preRestoreSnapshot);
      delete window.__PHYSIOCASE_EMERGENCY_RECOVERY_SNAPSHOT__;
      setCriticalRecoveryError(null);
      alert('Rollback retry succeeded: original workspace was rehydrated.');
    } catch (err: any) {
      alert(`Rollback retry failed: ${err.message}`);
    }
  };

  // Stage 13: Audit Ledger Maintenance Handlers
  const handleExportAuditLedger = async () => {
    try {
      const canonicalAudit = canonicalizeJson(events);
      const checksum = await computeSha256(canonicalAudit);
      setPruneArchiveChecksum(checksum);
      setHasExportedArchive(true);

      const archiveEnvelope = {
        format: 'physiocase-audit-ledger-archive',
        schemaVersion: '1.0',
        application: 'PhysioCase',
        exportedAt: new Date().toISOString(),
        eventCount: events.length,
        integrity: {
          algorithm: 'SHA-256',
          checksum,
        },
        events: events,
      };

      const jsonString = JSON.stringify(archiveEnvelope, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const filename = `physiocase-audit-ledger-${new Date().toISOString().slice(0, 10)}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setAuditExportMessage('Audit ledger archive exported and verified with SHA-256 checksum.');
      setTimeout(() => setAuditExportMessage(null), 5000);
    } catch (err: any) {
      console.error('Audit export failed:', err);
    }
  };

  const eligiblePruneCount = events.filter((e) => e.occurredAt <= pruneCutoffDate).length;

  const handleOpenPruneModal = () => {
    setPruneConfirmText('');
    setIsPruneModalOpen(true);
  };

  const handleExecutePrune = () => {
    if (pruneConfirmText !== 'PRUNE_AUDIT_LOG' || !hasExportedArchive || !pruneArchiveChecksum) return;
    const prunedCount = pruneAuditLog(pruneCutoffDate, pruneArchiveChecksum);
    setIsPruneModalOpen(false);
    setPruneConfirmText('');
    setAuditExportMessage(`Audit log maintenance complete: ${prunedCount} historical events pruned. Retained anchor event.`);
    setTimeout(() => setAuditExportMessage(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      {/* Critical Recovery Full-Screen Overlay if active */}
      {criticalRecoveryError && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#18201C]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
        >
          <div className="bg-white border-2 border-[#8C3B2B] rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-[#8C3B2B]">
              <AlertOctagon className="w-8 h-8 shrink-0" />
              <div>
                <h2 className="text-lg font-bold">CRITICAL RECOVERY STATE</h2>
                <p className="text-xs text-[#525954]">
                  Storage write failed and automatic rollback could not be verified.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E3DDD2] text-xs space-y-2">
              <p className="font-semibold text-[#18201C]">Diagnostic Failure Details:</p>
              <p className="font-mono text-[11px] text-[#8C3B2B] bg-white p-2 rounded border border-[#E3DDD2] break-all">
                {criticalRecoveryError}
              </p>
              <p className="text-[#525954] leading-relaxed">
                An emergency in-memory snapshot of your original database before the restore attempt has been preserved in memory. Normal workspace inputs are halted until you resolve recovery.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-[#18201C] uppercase tracking-wider block">
                Emergency Recovery Actions:
              </span>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Button
                  id="emergency-download-snapshot-btn"
                  variant="primary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleEmergencyDownloadSnapshot}
                >
                  Download Original Snapshot
                </Button>
                <Button
                  id="emergency-download-attempt-btn"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleEmergencyDownloadAttempt}
                >
                  Download Candidate Backup
                </Button>
                <Button
                  id="emergency-retry-rollback-btn"
                  variant="outline"
                  size="sm"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={handleEmergencyRetryRollback}
                >
                  Retry Rollback
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Section Header */}
      <div>
        <h2 className="text-base font-semibold text-[#18201C] mb-1">
          Data Management, Backup & Disaster Recovery
        </h2>
        <p className="text-xs text-[#666D67]">
          Create portable, tamper-evident JSON backups of your complete local clinical workspace or restore from a previously exported backup file.
        </p>
      </div>

      {/* Notification Banners */}
      {exportSuccessMessage && (
        <div className="p-3.5 bg-[#EBF4EE] border border-[#CDE3D5] text-[#1B3B2B] rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1B3B2B]" />
          <span>{exportSuccessMessage}</span>
        </div>
      )}

      {restoreSuccessMessage && (
        <div className="p-3.5 bg-[#EBF4EE] border border-[#CDE3D5] text-[#1B3B2B] rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1B3B2B]" />
          <span>{restoreSuccessMessage}</span>
        </div>
      )}

      {/* Two Column Cards: Export and Import */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Create Workspace Backup Card */}
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAE4DB]">
              <div className="w-8 h-8 rounded-lg bg-[#EBF2EE] border border-[#D5E2DA] flex items-center justify-center text-[#1B3B2B]">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#18201C]">Create Workspace Backup</h3>
                <p className="text-[11px] text-[#636A64]">Export full authoritative clinical database</p>
              </div>
            </div>

            <p className="text-xs text-[#525954] leading-relaxed">
              Generates a single self-contained JSON file containing all 23 authoritative collections (patients, care episodes, subjective intakes, objective findings, problems, goals, sessions, deliveries, progress records, and discharge summaries) with SHA-256 integrity verification.
            </p>

            {/* Current Caseload Statistics */}
            <div className="bg-white border border-[#E8E2D9] rounded-lg p-3 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-[#18201C] uppercase tracking-wider block">
                Current Workspace Caseload:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-[#525954]">
                <div>
                  <span className="text-[#757C76] block">Patients:</span>
                  <span className="font-bold text-[#18201C]">{currentSummary.patientCount}</span>
                </div>
                <div>
                  <span className="text-[#757C76] block">Care Episodes:</span>
                  <span className="font-bold text-[#18201C]">{currentSummary.caseCount}</span>
                </div>
                <div>
                  <span className="text-[#757C76] block">Sessions:</span>
                  <span className="font-bold text-[#18201C]">{currentSummary.sessionCount}</span>
                </div>
                <div>
                  <span className="text-[#757C76] block">Problems:</span>
                  <span className="font-bold text-[#18201C]">{currentSummary.problemCount}</span>
                </div>
                <div>
                  <span className="text-[#757C76] block">Measurements:</span>
                  <span className="font-bold text-[#18201C]">{currentSummary.measurementCount}</span>
                </div>
                <div>
                  <span className="text-[#757C76] block">Total Entities:</span>
                  <span className="font-bold text-[#18201C]">{currentSummary.totalEntityCount}</span>
                </div>
              </div>
            </div>

            {/* Security Warning Notice */}
            <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F3D7D0] text-xs text-[#8C3B2B] flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Sensitive Clinical Data Notice</span>
                <p className="text-[11px] leading-relaxed text-[#742F22]">
                  This backup file contains complete, unencrypted health records. Store this file securely in compliance with your local health data privacy regulations (e.g. HIPAA, GDPR).
                </p>
              </div>
            </div>
          </div>

          <Button
            id="download-workspace-backup-btn"
            variant="primary"
            size="md"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportBackup}
            disabled={isExporting}
            className="w-full justify-center"
          >
            {isExporting ? 'Generating Backup...' : 'Download Workspace Backup (.json)'}
          </Button>
        </div>

        {/* 2. Restore Workspace Backup Card */}
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#EAE4DB]">
              <div className="w-8 h-8 rounded-lg bg-[#F4EFE8] border border-[#E5DFD4] flex items-center justify-center text-[#555C57]">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#18201C]">Restore Workspace Backup</h3>
                <p className="text-[11px] text-[#636A64]">Replace local workspace from backup file</p>
              </div>
            </div>

            <p className="text-xs text-[#525954] leading-relaxed">
              Restore your workspace from a previously exported backup file. Pre-flight structural and referential verification guarantees that corrupt or incompatible files are safely rejected before any data is written.
            </p>

            {/* File Selection Input */}
            <div>
              <label
                htmlFor="backup-file-input"
                className="block text-xs font-semibold text-[#18201C] mb-1.5"
              >
                Select Backup File (.json)
              </label>
              <input
                ref={fileInputRef}
                id="backup-file-input"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="w-full text-xs text-[#525954] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#D5CEC2] file:text-xs file:font-medium file:bg-white file:text-[#18201C] hover:file:bg-[#F4EFE8] file:cursor-pointer cursor-pointer border border-[#DDD6CB] rounded-lg p-1.5 bg-white"
              />
              {selectedFileName && (
                <p className="text-[11px] text-[#636A64] mt-1 font-mono">
                  Loaded: {selectedFileName}
                </p>
              )}
            </div>

            {/* Validation Feedback Banner */}
            {isValidating && (
              <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E8E2D9] text-xs text-[#636A64] flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#1B3B2B]" />
                <span>Validating backup integrity and referential structure...</span>
              </div>
            )}

            {validationResult && !validationResult.valid && (
              <div className="p-3.5 rounded-lg bg-[#FAF0ED] border border-[#F3D7D0] text-xs text-[#8C3B2B] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Restore Validation Failed</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-[#742F22]">
                  {validationResult.errors.map((err, idx) => (
                    <li key={idx}>
                      <span className="font-mono font-bold">[{err.code}]</span> {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validationResult && validationResult.valid && validationResult.envelope && (
              <div className="p-3.5 rounded-lg bg-[#EBF4EE] border border-[#CDE3D5] text-xs text-[#1B3B2B] space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <FileCheck className="w-4 h-4 shrink-0" />
                  <span>Valid Workspace Backup Verified</span>
                </div>

                <div className="text-[11px] text-[#2D5A42] space-y-0.5">
                  <p>
                    <span className="font-semibold">Exported Date:</span>{' '}
                    {formatClinicalDate(validationResult.envelope.exportedAt)}
                  </p>
                  <p>
                    <span className="font-semibold">Application Version:</span>{' '}
                    {validationResult.envelope.applicationVersion} (Schema{' '}
                    {validationResult.envelope.schemaVersion})
                  </p>
                  <p>
                    <span className="font-semibold">Integrity:</span> SHA-256 Checksum Verified
                  </p>
                </div>

                <div className="pt-2 border-t border-[#CDE3D5] grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#4E7961] block">Patients:</span>
                    <span className="font-bold text-[#1B3B2B]">
                      {validationResult.summary?.patientCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4E7961] block">Cases:</span>
                    <span className="font-bold text-[#1B3B2B]">
                      {validationResult.summary?.caseCount}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#4E7961] block">Total Entities:</span>
                    <span className="font-bold text-[#1B3B2B]">
                      {validationResult.summary?.totalEntityCount}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button
            id="initiate-restore-btn"
            variant="secondary"
            size="md"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={handleOpenRestoreConfirm}
            disabled={!validationResult?.valid || isRestoring}
            className="w-full justify-center"
          >
            Verify &amp; Restore Workspace
          </Button>
        </div>
      </div>

      {/* 3. Clinical Audit Ledger & Governance Maintenance Card (Stage 13) */}
      <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EAE4DB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0EBF8] border border-[#DDD0EE] flex items-center justify-center text-[#5E328A]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#18201C]">Clinical Audit Ledger &amp; Maintenance</h3>
              <p className="text-[11px] text-[#636A64]">
                Append-only provenance tracking &bull; {events.length} recorded events
              </p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 bg-[#F4EFE8] text-[#555C57] rounded-md font-mono font-medium">
            24th Collection
          </span>
        </div>

        <p className="text-xs text-[#525954] leading-relaxed">
          PhysioCase maintains an append-only, tamper-evident audit ledger capturing every clinical creation, finalization, amendment, soft-deletion, and restore event without duplicating protected clinical narrative.
        </p>

        {/* Audit storage failure notice (Entity-First Protocol) */}
        {auditStorageWarning && (
          <div id="audit-storage-warning-banner" className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F3D7D0] text-xs text-[#8C3B2B] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#C0392B]" />
            <div>
              <span className="font-bold block">Storage Persistence Warning</span>
              <p className="text-[11px] text-[#742F22] leading-relaxed">
                {auditStorageWarning}
              </p>
            </div>
          </div>
        )}

        {/* Audit event volume notice */}
        {events.length >= 2500 && (
          <div className="p-3 rounded-lg bg-[#FAF0ED] border border-[#F3D7D0] text-xs text-[#8C3B2B] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Ledger Maintenance Advisory</span>
              <p className="text-[11px] text-[#742F22] leading-relaxed">
                The audit ledger currently holds {events.length} events. In a local-first browser environment, you may wish to export an archive and prune historical events to conserve LocalStorage capacity.
              </p>
            </div>
          </div>
        )}

        {auditExportMessage && (
          <div className="p-3 bg-[#EBF4EE] border border-[#CDE3D5] text-[#1B3B2B] rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1B3B2B]" />
            <span>{auditExportMessage}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            id="view-audit-ledger-btn"
            variant="secondary"
            size="sm"
            leftIcon={<History className="w-4 h-4" />}
            onClick={() => setIsAuditDrawerOpen(true)}
          >
            View Audit History
          </Button>
          <Button
            id="export-audit-ledger-btn"
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportAuditLedger}
          >
            Export Audit Ledger (.json)
          </Button>
          <Button
            id="open-prune-audit-modal-btn"
            variant="outline"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4 text-[#8C3B2B]" />}
            onClick={handleOpenPruneModal}
            className="text-[#8C3B2B] hover:bg-[#FAF0ED]"
          >
            Prune Historical Ledger
          </Button>
        </div>
      </div>

      {/* Audit History Drawer */}
      <AuditHistoryDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
      />

      {/* High-Friction Audit Ledger Prune Modal */}
      {isPruneModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prune-audit-title"
          className="fixed inset-0 z-50 bg-[#18201C]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-[#E3DDD2] rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-[#8C3B2B]">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 id="prune-audit-title" className="text-base font-bold text-[#18201C]">
                  Prune Clinical Audit Ledger
                </h3>
              </div>
              <button
                type="button"
                id="cancel-prune-x-btn"
                onClick={() => setIsPruneModalOpen(false)}
                className="text-[#757C76] hover:text-[#18201C] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#525954]">
              <p className="font-semibold text-[#8C3B2B]">
                ⚠️ Warning: Audit log events will be permanently removed from this device.
              </p>
              <p>
                To preserve clinical accountability, you must first export an archive of the audit log before pruning. A factual anchor event with the archive checksum will be permanently appended to the retained ledger.
              </p>

              <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#18201C]">Step 1: Export Archive</span>
                  {hasExportedArchive ? (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Archive Exported
                    </span>
                  ) : (
                    <Button
                      id="prune-step-export-btn"
                      variant="primary"
                      size="sm"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                      onClick={handleExportAuditLedger}
                    >
                      Export Archive First
                    </Button>
                  )}
                </div>

                {pruneArchiveChecksum && (
                  <div className="text-[10px] font-mono bg-white p-2 rounded border border-[#E3DDD2] break-all">
                    <span className="text-slate-400 block font-sans font-semibold">Archive SHA-256 Checksum:</span>
                    {pruneArchiveChecksum}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-[#18201C] mb-1">
                    Step 2: Prune events older than date
                  </label>
                  <input
                    type="date"
                    value={pruneCutoffDate}
                    onChange={(e) => setPruneCutoffDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-[#DDD6CB] rounded-md bg-white text-[#18201C]"
                  />
                  <span className="text-[11px] text-[#757C76] block mt-1">
                    Eligible events for pruning: <span className="font-bold text-[#18201C]">{eligiblePruneCount}</span> of {auditEvents.length}
                  </span>
                </div>
              </div>

              {/* Typed verification */}
              <div className="pt-2 space-y-1.5">
                <label htmlFor="confirm-prune-input" className="block text-xs font-bold text-[#18201C]">
                  Step 3: To confirm, type <span className="font-mono text-[#8C3B2B]">PRUNE_AUDIT_LOG</span> below:
                </label>
                <input
                  id="confirm-prune-input"
                  type="text"
                  value={pruneConfirmText}
                  onChange={(e) => setPruneConfirmText(e.target.value)}
                  placeholder="PRUNE_AUDIT_LOG"
                  className="w-full px-3 py-2 rounded-lg border border-[#DDD6CB] bg-[#FAF8F5] text-xs font-mono text-[#18201C] focus:outline-none focus:border-[#8C3B2B]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAE4DB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPruneModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                id="confirm-prune-audit-btn"
                variant="danger"
                size="sm"
                onClick={handleExecutePrune}
                disabled={
                  pruneConfirmText !== 'PRUNE_AUDIT_LOG' ||
                  !hasExportedArchive ||
                  eligiblePruneCount === 0
                }
              >
                Confirm Prune ({eligiblePruneCount} events)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* High-Friction Restore Confirmation Modal */}
      {isConfirmModalOpen && validationResult?.envelope && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-confirm-title"
          className="fixed inset-0 z-50 bg-[#18201C]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white border border-[#E3DDD2] rounded-2xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 text-[#8C3B2B]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 id="restore-confirm-title" className="text-base font-bold text-[#18201C]">
                  Replace Workspace Confirmation
                </h3>
              </div>
              <button
                type="button"
                id="cancel-restore-btn"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-[#757C76] hover:text-[#18201C] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[#525954]">
              <p className="font-medium text-[#18201C]">
                ⚠️ This operation replaces your current local database with the contents of the backup file.
              </p>
              <p>
                Any clinical encounters, subjective assessments, or progress notes entered on this machine since the backup was created will be permanently replaced.
              </p>

              {/* Before vs After Comparison */}
              <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-3.5 space-y-2 text-xs">
                <span className="text-[11px] font-bold text-[#18201C] uppercase tracking-wider block">
                  Dataset Comparison:
                </span>
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="space-y-1">
                    <span className="text-[#757C76] block font-semibold">Current Workspace:</span>
                    <p>Patients: {currentSummary.patientCount}</p>
                    <p>Care Episodes: {currentSummary.caseCount}</p>
                    <p>Total Entities: {currentSummary.totalEntityCount}</p>
                  </div>
                  <div className="space-y-1 border-l border-[#EAE4DB] pl-3">
                    <span className="text-[#1B3B2B] block font-semibold">Incoming Backup:</span>
                    <p>Patients: {validationResult.summary?.patientCount}</p>
                    <p>Care Episodes: {validationResult.summary?.caseCount}</p>
                    <p>Total Entities: {validationResult.summary?.totalEntityCount}</p>
                  </div>
                </div>
              </div>

              {/* Typed Verification Requirement */}
              <div className="pt-2 space-y-1.5">
                <label
                  htmlFor="confirm-restore-input"
                  className="block text-xs font-bold text-[#18201C]"
                >
                  To confirm, type <span className="font-mono text-[#8C3B2B]">RESTORE</span> below:
                </label>
                <input
                  id="confirm-restore-input"
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder="RESTORE"
                  className="w-full px-3 py-2 rounded-lg border border-[#DDD6CB] bg-[#FAF8F5] text-xs font-mono text-[#18201C] focus:outline-none focus:border-[#1B3B2B]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EAE4DB]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isRestoring}
              >
                Cancel
              </Button>
              <Button
                id="confirm-replace-restore-btn"
                variant="danger"
                size="sm"
                onClick={handleExecuteRestore}
                disabled={confirmInputText !== 'RESTORE' || isRestoring}
              >
                {isRestoring ? 'Restoring Workspace...' : 'Confirm Replace Restore'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
