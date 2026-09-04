import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Lock,
  Database,
  Cpu,
  CheckCircle2,
  KeyRound,
  Trash2,
  AlertOctagon,
  FileCode,
  Activity,
  Sparkles,
  Download,
  HardDrive,
  FileDown,
  Eye,
  EyeOff,
  Check,
  Copy,
  FileText,
  RefreshCw,
  Upload,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { getSecurityAuditLogs, enclave, SecurityAuditEvent } from '../crypto/workerClient';
import { InteractionEntry } from '../types';
import {
  createEncryptedBackup,
  createSovereignJsonExport,
  triggerFileDownload,
  verifyAndDecryptBackup,
  SovereignExportResult,
} from '../crypto/secureExport';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  entries?: InteractionEntry[];
  onCryptoShred?: () => Promise<void>;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  userId,
  entries = [],
  onCryptoShred,
}) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'export'>('export');
  const [logs, setLogs] = useState<SecurityAuditEvent[]>([]);
  const [isShredding, setIsShredding] = useState(false);
  const [shredConfirmed, setShredConfirmed] = useState(false);

  // Secure Export State
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [includeLocations, setIncludeLocations] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<SovereignExportResult | null>(null);
  const [exportType, setExportType] = useState<'encrypted' | 'plain' | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState(false);

  // Verification & Decryption Tool State
  const [verifyJsonInput, setVerifyJsonInput] = useState('');
  const [verifyPassphrase, setVerifyPassphrase] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    success?: boolean;
    totalEntries?: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLogs(getSecurityAuditLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShred = async () => {
    setIsShredding(true);
    try {
      await enclave.shredKey();
      if (onCryptoShred) {
        await onCryptoShred();
      }
      setShredConfirmed(true);
      setLogs(getSecurityAuditLogs());
    } catch (e) {
      console.error('Shredding error:', e);
    } finally {
      setIsShredding(false);
    }
  };

  // Handle Encrypted Backup Download
  const handleExportEncrypted = async () => {
    try {
      setIsExporting(true);
      const { envelope, result } = await createEncryptedBackup(
        entries,
        backupPassphrase,
        includeLocations
      );
      triggerFileDownload(JSON.stringify(envelope, null, 2), result.fileName);
      setLastExportResult(result);
      setExportType('encrypted');
      setLogs(getSecurityAuditLogs());
    } catch (err) {
      console.error('Failed to export encrypted backup:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Plain Sovereign JSON Archive Download
  const handleExportPlainJson = async () => {
    try {
      setIsExporting(true);
      const { data, result } = await createSovereignJsonExport(entries, includeLocations);
      triggerFileDownload(JSON.stringify(data, null, 2), result.fileName);
      setLastExportResult(result);
      setExportType('plain');
      setLogs(getSecurityAuditLogs());
    } catch (err) {
      console.error('Failed to export plain sovereign json:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Copy Checksum to Clipboard
  const handleCopyChecksum = () => {
    if (!lastExportResult) return;
    navigator.clipboard.writeText(lastExportResult.checksum);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  // Handle Verifying a Backup
  const handleVerifyBackup = async () => {
    if (!verifyJsonInput.trim()) return;
    setIsVerifying(true);
    setVerificationFeedback(null);
    try {
      const outcome = await verifyAndDecryptBackup(verifyJsonInput, verifyPassphrase);
      setVerificationFeedback(outcome);
    } catch (err: any) {
      setVerificationFeedback({ success: false, error: err.message || 'Verification failed.' });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle File Drag / Selection for Verification
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setVerifyJsonInput(content || '');
    };
    reader.readAsText(file);
  };

  return (
    <div
      id="security-modal-overlay"
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="security-modal-content"
        className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="close-security-modal"
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-xl hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900">
              Security & Data Sovereignty
            </h2>
            <p className="text-xs text-stone-500">
              Encrypted Local Backups • Zero-Trust Enclave • Anti-Forensics
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 bg-stone-100 rounded-2xl mb-5 text-xs font-semibold">
          <button
            type="button"
            id="tab-secure-export"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'export'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Secure Export & Sovereignty</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
              Backup
            </span>
          </button>
          <button
            type="button"
            id="tab-zero-trust-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'architecture'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Zero-Trust Architecture</span>
          </button>
        </div>

        {/* TAB 1: SECURE EXPORT & FULL DATA SOVEREIGNTY */}
        {activeTab === 'export' && (
          <div className="space-y-4 text-xs text-stone-700 animate-fade-in">
            {/* Sovereignty Guarantee Card */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-stone-900 font-semibold">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  <span>Local Data Sovereignty Guarantee</span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  100% Client-Owned
                </span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                You maintain complete, absolute ownership of your thoughts and reflections. Export an encrypted backup directly to your local computer storage at any time. No vendor lock-in, no telemetry retention, and no loss of access if you leave the cloud.
              </p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-stone-200 text-center font-mono">
                <div className="p-2 rounded-xl bg-white border border-stone-200">
                  <div className="text-base font-bold text-stone-900">{entries.length}</div>
                  <div className="text-[10px] text-stone-500 uppercase">Journal Entries</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-stone-200">
                  <div className="text-base font-bold text-stone-900">
                    {entries.reduce((acc, e) => acc + (e.messages?.length || 0), 0)}
                  </div>
                  <div className="text-[10px] text-stone-500 uppercase">Total Messages</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-stone-200 col-span-2 sm:col-span-1">
                  <div className="text-base font-bold text-emerald-600">AES-256-GCM</div>
                  <div className="text-[10px] text-stone-500 uppercase">Encryption Standard</div>
                </div>
              </div>
            </div>

            {/* Export Configuration Controls */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="font-semibold text-stone-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Backup Passphrase & Metadata Settings</span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Backup Passphrase (Optional for PBKDF2 Password-Protected Backup):
                </label>
                <div className="relative">
                  <input
                    id="export-backup-passphrase-input"
                    type={showPassphrase ? 'text' : 'password'}
                    value={backupPassphrase}
                    onChange={(e) => setBackupPassphrase(e.target.value)}
                    placeholder="Enter a secret passphrase or leave blank for root enclave key"
                    className="w-full px-3 py-2 pr-9 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                    title={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                  >
                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  If set, your backup is encrypted using PBKDF2 with 100,000 iterations of SHA-256 + 128-bit Salt, allowing cross-device restoration.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="include-locations-checkbox"
                  type="checkbox"
                  checked={includeLocations}
                  onChange={(e) => setIncludeLocations(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="include-locations-checkbox" className="text-xs text-stone-700 cursor-pointer">
                  Include pinned Google Maps geolocations and place metadata in the backup
                </label>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {/* Primary Encrypted Export */}
                <button
                  id="download-encrypted-backup-btn"
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportEncrypted}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs transition-all active:scale-98 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? 'Packaging...' : 'Download Encrypted Backup (.enc.json)'}</span>
                </button>

                {/* Plain JSON Sovereign Archive */}
                <button
                  id="download-plain-sovereign-json-btn"
                  type="button"
                  disabled={isExporting}
                  onClick={handleExportPlainJson}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-100 font-semibold transition-all active:scale-98 disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4 text-stone-300" />
                  <span>Download Sovereign JSON (.json)</span>
                </button>
              </div>
            </div>

            {/* Last Export Receipt & Checksum Banner */}
            {lastExportResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 animate-fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      {exportType === 'encrypted'
                        ? 'Encrypted Backup Downloaded'
                        : 'Sovereign Archive Downloaded'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    {lastExportResult.sizeFormatted}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 mb-2 font-mono">
                  File: <span className="font-bold">{lastExportResult.fileName}</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100/70 border border-emerald-300/50 flex items-center justify-between gap-2">
                  <div className="truncate font-mono text-[10px] text-emerald-950">
                    SHA-256: {lastExportResult.checksum}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyChecksum}
                    className="p-1 rounded hover:bg-emerald-200 text-emerald-800 shrink-0"
                    title="Copy SHA-256 Checksum"
                  >
                    {copiedChecksum ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Verification & Decryption Test Tool */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-stone-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>Verify & Decrypt Local Backup</span>
                </div>
                <span className="text-[10px] text-stone-500 font-mono">Integrity Auditor</span>
              </div>
              <p className="text-stone-600 text-[11px]">
                Verify that your downloaded backup is healthy, valid, and decryptable right in your browser enclave:
              </p>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Backup File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[10px] text-stone-500">or paste JSON content below:</span>
              </div>

              <textarea
                id="verify-backup-textarea"
                rows={2}
                value={verifyJsonInput}
                onChange={(e) => setVerifyJsonInput(e.target.value)}
                placeholder="Paste encrypted backup JSON envelope here..."
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-stone-800 text-[10px] font-mono focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              <div className="flex items-center gap-2">
                <input
                  id="verify-passphrase-input"
                  type="password"
                  value={verifyPassphrase}
                  onChange={(e) => setVerifyPassphrase(e.target.value)}
                  placeholder="Enter backup passphrase (if password-protected)"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-mono"
                />
                <button
                  id="verify-backup-btn"
                  type="button"
                  disabled={isVerifying || !verifyJsonInput.trim()}
                  onClick={handleVerifyBackup}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors disabled:opacity-50 shrink-0"
                >
                  {isVerifying ? 'Auditing...' : 'Verify Backup'}
                </button>
              </div>

              {verificationFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    verificationFeedback.success
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold'
                      : 'bg-rose-100 border border-rose-300 text-rose-900 font-medium'
                  }`}
                >
                  {verificationFeedback.success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Integrity Verified! Successfully decrypted {verificationFeedback.totalEntries} journal entries.
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertOctagon className="w-4 h-4 text-rose-700 shrink-0" />
                      <span>{verificationFeedback.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ZERO-TRUST ARCHITECTURE & AUDIT LOGS */}
        {activeTab === 'architecture' && (
          <div className="space-y-4 text-xs text-stone-700 animate-fade-in">
            {/* Active Session & Web Worker Enclave */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-stone-900 font-semibold">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Client-Side Web Worker Enclave (AES-256-GCM)</span>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  extractable: false
                </span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                All encryption keys are derived inside a dedicated Web Worker thread with non-extractable attributes. Plaintext memory buffers are overwritten with{' '}
                <code className="font-mono text-[11px] bg-stone-200 px-1 py-0.5 rounded">
                  crypto.getRandomValues()
                </code>{' '}
                prior to garbage collection.
              </p>
              <div className="mt-2 p-2 rounded-lg bg-stone-200/70 font-mono text-[11px] text-stone-900 select-all break-all">
                {userId
                  ? `Owner-Bound Path: /users/${userId}/interactions/{interactionId}`
                  : 'No active session'}
              </div>
            </div>

            {/* Real-Time Redacted Audit Log */}
            <div className="p-4 rounded-2xl bg-stone-900 text-stone-100 border border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-stone-200 font-semibold">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Immutable Security Event Stream (Redacted)</span>
                </div>
                <span className="text-[10px] font-mono text-stone-400">
                  {logs.length} events logged
                </span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 font-mono text-[10px] pr-1">
                {logs.length === 0 ? (
                  <div className="text-stone-500 py-2">No security events triggered in current session.</div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-1.5 rounded bg-stone-800/80 border border-stone-700/60 flex items-start justify-between gap-2"
                    >
                      <span className="text-emerald-400 shrink-0 font-bold">[{log.eventType}]</span>
                      <span className="text-stone-300 truncate flex-1">{log.details}</span>
                      <span className="text-stone-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Plausible Deniability & Duress Mode */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center gap-2 mb-1.5 text-stone-900 font-semibold">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Duress Vault & Plausible Deniability Protocol</span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                If coerced, entering the designated Panic PIN (e.g.{' '}
                <code className="font-mono text-[11px] bg-stone-200 px-1 py-0.5 rounded font-bold">
                  9110
                </code>
                ) silently unlocks a benign decoy profile populated with natural reflections while logging{' '}
                <code className="font-mono text-[11px] bg-stone-200 px-1 py-0.5 rounded">
                  DURESS_TRIGGERED
                </code>{' '}
                without raising suspicion.
              </p>
            </div>

            {/* Right to Be Forgotten & Cryptographic Erasure */}
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200">
              <div className="flex items-center gap-2 mb-1.5 text-rose-950 font-semibold">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Cryptographic Erasure ("Right to be Forgotten")</span>
              </div>
              <p className="text-rose-900/80 leading-relaxed mb-3">
                Instantly shreds in-memory symmetric keys and purges authentication mappings. Stored database records immediately become mathematically unrecoverable digital noise.
              </p>

              {shredConfirmed ? (
                <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  Crypto-shred completed. Master encryption keys purged.
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isShredding}
                  onClick={handleShred}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-colors shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isShredding ? 'Shredding Keys...' : 'Crypto-Shred Vault Keys'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
