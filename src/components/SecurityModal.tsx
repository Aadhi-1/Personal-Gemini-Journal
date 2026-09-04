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
} from 'lucide-react';
import { getSecurityAuditLogs, enclave, SecurityAuditEvent } from '../crypto/workerClient';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onCryptoShred?: () => Promise<void>;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  userId,
  onCryptoShred,
}) => {
  const [logs, setLogs] = useState<SecurityAuditEvent[]>([]);
  const [isShredding, setIsShredding] = useState(false);
  const [shredConfirmed, setShredConfirmed] = useState(false);

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

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900">
              Zero-Trust Security & Constitution
            </h2>
            <p className="text-xs text-stone-500">
              FIDO2 Passkeys • Web Worker Enclaves • Audio DLP • Anti-Forensics
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-stone-700">
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
              All encryption keys are derived inside a dedicated Web Worker thread with non-extractable attributes. Plaintext memory buffers are overwritten with <code className="font-mono text-[11px] bg-stone-200 px-1 py-0.5 rounded">crypto.getRandomValues()</code> prior to garbage collection.
            </p>
            <div className="mt-2 p-2 rounded-lg bg-stone-200/70 font-mono text-[11px] text-stone-900 select-all break-all">
              {userId ? `Owner-Bound Path: /users/${userId}/interactions/{interactionId}` : 'No active session'}
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
                  <div key={log.id} className="p-1.5 rounded bg-stone-800/80 border border-stone-700/60 flex items-start justify-between gap-2">
                    <span className="text-emerald-400 shrink-0 font-bold">[{log.eventType}]</span>
                    <span className="text-stone-300 truncate flex-1">{log.details}</span>
                    <span className="text-stone-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
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
              If coerced, entering the designated Panic PIN (e.g. <code className="font-mono text-[11px] bg-stone-200 px-1 py-0.5 rounded font-bold">9110</code>) silently unlocks a benign decoy profile populated with natural reflections while logging <code className="font-mono text-[11px] bg-stone-200 px-1 py-0.5 rounded">DURESS_TRIGGERED</code> without raising suspicion.
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
