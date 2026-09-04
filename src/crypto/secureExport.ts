/**
 * Secure Export & Data Sovereignty Engine
 * Enables Zero-Knowledge encrypted local backups (AES-256-GCM + PBKDF2)
 * and unencumbered Sovereign JSON data exports.
 */

import { InteractionEntry } from '../types';
import { logSecurityEvent } from './workerClient';

export interface EncryptedBackupEnvelope {
  format: 'ReflectAI Sovereign Encrypted Backup';
  version: '2.1.0-sovereign';
  exportedAt: string;
  keyDerivation: 'PBKDF2-SHA256-100K-ITER' | 'LOCAL-AES-GCM';
  salt: string; // Base64
  iv: string; // Base64
  metadata: {
    totalEntries: number;
    totalMessages: number;
    integrityChecksum: string; // SHA-256
    includesLocations: boolean;
    userSovereigntyCertified: boolean;
    exportTimestamp: number;
  };
  encryptedPayload: string; // Base64
}

export interface SovereignExportResult {
  fileName: string;
  blobSize: number;
  sizeFormatted: string;
  checksum: string;
  totalEntries: number;
}

/**
 * Computes SHA-256 hexadecimal hash using the native Web Crypto API
 */
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Formats byte counts into human-readable strings
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Derives an AES-GCM 256-bit key from a passphrase and salt using PBKDF2
 */
async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates an AES-256-GCM encrypted backup envelope
 */
export async function createEncryptedBackup(
  entries: InteractionEntry[],
  passphrase?: string,
  includeLocations = true
): Promise<{ envelope: EncryptedBackupEnvelope; result: SovereignExportResult }> {
  // 1. Sanitize entries and filter location if requested
  const sanitizedEntries = entries.map((e) => {
    const clone = { ...e };
    if (!includeLocations) {
      clone.location = null;
    }
    return clone;
  });

  const totalMessages = sanitizedEntries.reduce((acc, e) => acc + (e.messages?.length || 0), 0);
  const plaintextJson = JSON.stringify(sanitizedEntries);
  const checksum = await computeSha256(plaintextJson);

  // 2. Generate cryptographic salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 3. Derive or generate CryptoKey
  let key: CryptoKey;
  let keyDerivation: EncryptedBackupEnvelope['keyDerivation'] = 'LOCAL-AES-GCM';

  if (passphrase && passphrase.trim().length > 0) {
    key = await deriveKeyFromPassphrase(passphrase.trim(), salt);
    keyDerivation = 'PBKDF2-SHA256-100K-ITER';
  } else {
    key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // 4. Encrypt using AES-256-GCM
  const encoder = new TextEncoder();
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintextJson)
  );

  // Helper: buffer to base64
  const toBase64 = (buf: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < buf.byteLength; i++) {
      binary += String.fromCharCode(buf[i]);
    }
    return btoa(binary);
  };

  const encryptedPayloadBase64 = toBase64(new Uint8Array(ciphertextBuffer));
  const saltBase64 = toBase64(salt);
  const ivBase64 = toBase64(iv);

  const envelope: EncryptedBackupEnvelope = {
    format: 'ReflectAI Sovereign Encrypted Backup',
    version: '2.1.0-sovereign',
    exportedAt: new Date().toISOString(),
    keyDerivation,
    salt: saltBase64,
    iv: ivBase64,
    metadata: {
      totalEntries: sanitizedEntries.length,
      totalMessages,
      integrityChecksum: checksum,
      includesLocations: includeLocations,
      userSovereigntyCertified: true,
      exportTimestamp: Date.now(),
    },
    encryptedPayload: encryptedPayloadBase64,
  };

  const envelopeString = JSON.stringify(envelope, null, 2);
  const blobSize = new Blob([envelopeString]).size;
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `reflectai-backup-${dateStamp}.enc.json`;

  logSecurityEvent(
    'DATA_SOVEREIGNTY_BACKUP_EXPORTED',
    'INFO',
    `Secure Encrypted Backup created (${sanitizedEntries.length} entries, ${formatBytes(blobSize)}).`
  );

  return {
    envelope,
    result: {
      fileName,
      blobSize,
      sizeFormatted: formatBytes(blobSize),
      checksum,
      totalEntries: sanitizedEntries.length,
    },
  };
}

/**
 * Generates an unencumbered, human-readable Sovereign JSON Export
 */
export async function createSovereignJsonExport(
  entries: InteractionEntry[],
  includeLocations = true
): Promise<{ data: any; result: SovereignExportResult }> {
  const sanitizedEntries = entries.map((e) => {
    const clone = { ...e };
    if (!includeLocations) {
      clone.location = null;
    }
    return clone;
  });

  const exportPayload = {
    format: 'ReflectAI Sovereign Raw Archive',
    version: '2.1.0-sovereign',
    dataSovereigntyStatement:
      'This document contains the unencrypted, exportable journal records of the user. Fully portable and unencumbered by proprietary lock-in.',
    exportedAt: new Date().toISOString(),
    totalEntries: sanitizedEntries.length,
    entries: sanitizedEntries,
  };

  const payloadString = JSON.stringify(exportPayload, null, 2);
  const checksum = await computeSha256(payloadString);
  const blobSize = new Blob([payloadString]).size;
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `reflectai-sovereign-archive-${dateStamp}.json`;

  logSecurityEvent(
    'DATA_SOVEREIGNTY_BACKUP_EXPORTED',
    'INFO',
    `Sovereign JSON Archive created (${sanitizedEntries.length} entries, ${formatBytes(blobSize)}).`
  );

  return {
    data: exportPayload,
    result: {
      fileName,
      blobSize,
      sizeFormatted: formatBytes(blobSize),
      checksum,
      totalEntries: sanitizedEntries.length,
    },
  };
}

/**
 * Triggers a browser file download for a string or JSON payload
 */
export function triggerFileDownload(content: string, fileName: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Validates and decrypts an encrypted backup file to verify data integrity
 */
export async function verifyAndDecryptBackup(
  jsonText: string,
  passphrase?: string
): Promise<{ success: boolean; totalEntries?: number; error?: string }> {
  try {
    const envelope = JSON.parse(jsonText) as EncryptedBackupEnvelope;
    if (envelope.format !== 'ReflectAI Sovereign Encrypted Backup') {
      return { success: false, error: 'Invalid backup file format.' };
    }

    if (!passphrase || passphrase.trim().length === 0) {
      return {
        success: false,
        error: 'Passphrase is required to verify this encrypted backup.',
      };
    }

    // Decode Base64
    const fromBase64 = (b64: string) => {
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        arr[i] = bin.charCodeAt(i);
      }
      return arr;
    };

    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    const ciphertext = fromBase64(envelope.encryptedPayload);

    const key = await deriveKeyFromPassphrase(passphrase.trim(), salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedBuffer);
    const entries = JSON.parse(decryptedText);

    return {
      success: true,
      totalEntries: Array.isArray(entries) ? entries.length : 0,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Decryption failed: Incorrect passphrase or corrupted payload.',
    };
  }
}
