/**
 * Human-Safety & Psychological Safeguards, Audio DLP, and Prompt Injection Defense
 */

import { logSecurityEvent } from './workerClient';

// Harm & Severe Distress Indicators (Self-Harm, Crisis, Physical Abuse)
const SEVERE_DISTRESS_PATTERNS = [
  /\b(kill myself|want to die|suicide|end my life|end it all|hurt myself|cutting myself)\b/i,
  /\b(no reason to live|better off dead|wish i were dead|can't go on anymore)\b/i,
  /\b(being beaten|hitting me|hurting me physically|abusing me|scared of being attacked)\b/i,
];

export interface DistressAnalysisResult {
  isDistressDetected: boolean;
  triggerPhrase?: string;
  recommendedAction: 'NORMAL' | 'ACTIVATE_SAFE_MODE';
}

/**
 * On-Device NLP Harm & Distress Classifier (Runs BEFORE encryption & network transmission)
 */
export function analyzeDistressOnDevice(transcript: string): DistressAnalysisResult {
  if (!transcript || typeof transcript !== 'string') {
    return { isDistressDetected: false, recommendedAction: 'NORMAL' };
  }

  for (const pattern of SEVERE_DISTRESS_PATTERNS) {
    const match = transcript.match(pattern);
    if (match) {
      logSecurityEvent(
        'DISTRESS_SAFE_MODE_TRIGGERED',
        'CRITICAL',
        `Critical distress detected in voice input: matched pattern.`
      );
      return {
        isDistressDetected: true,
        triggerPhrase: match[0],
        recommendedAction: 'ACTIVATE_SAFE_MODE',
      };
    }
  }

  return { isDistressDetected: false, recommendedAction: 'NORMAL' };
}

/**
 * Audio Data Loss Prevention (DLP) Filter
 * Scrubs PII, Phone Numbers, Addresses, SSNs, and Credit Cards before audio synthesis
 */
export function sanitizeTextForAudioDLP(text: string): { cleanText: string; redactedCount: number } {
  if (!text) return { cleanText: '', redactedCount: 0 };

  let clean = text;
  let redactedCount = 0;

  // Phone numbers (e.g. 555-123-4567, (555) 123-4567, +1 555 123 4567)
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  if (phoneRegex.test(clean)) {
    clean = clean.replace(phoneRegex, '[phone number redacted]');
    redactedCount++;
  }

  // Social Security Numbers (XXX-XX-XXXX)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  if (ssnRegex.test(clean)) {
    clean = clean.replace(ssnRegex, '[ID number redacted]');
    redactedCount++;
  }

  // Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;
  if (emailRegex.test(clean)) {
    clean = clean.replace(emailRegex, '[email address redacted]');
    redactedCount++;
  }

  // Credit card numbers (16 digits with optional spaces or hyphens)
  const ccRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
  if (ccRegex.test(clean)) {
    clean = clean.replace(ccRegex, '[card number redacted]');
    redactedCount++;
  }

  // Street address pattern
  const streetRegex = /\b\d{1,5}\s+[A-Za-z0-9\s.,]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way)\b/gi;
  if (streetRegex.test(clean)) {
    clean = clean.replace(streetRegex, '[street address redacted]');
    redactedCount++;
  }

  if (redactedCount > 0) {
    logSecurityEvent(
      'DLP_REDACTION_APPLIED',
      'WARNING',
      `Audio DLP scrubbed ${redactedCount} sensitive PII entities before speech synthesis.`
    );
  }

  return { cleanText: clean, redactedCount };
}

/**
 * Prompt Injection Firewall Canary Verification
 */
export function verifyPromptCanary(aiResponseText: string, canaryUuid: string): { isValid: boolean; sanitizedText: string } {
  if (aiResponseText && canaryUuid && aiResponseText.includes(canaryUuid)) {
    logSecurityEvent(
      'INJECTION_ATTEMPT',
      'CRITICAL',
      'Prompt injection detected: Canary token leaked in model response. Response dropped.'
    );
    return {
      isValid: false,
      sanitizedText: "I am reflecting on your thoughts with care. Let's explore your feelings gently.",
    };
  }

  return {
    isValid: true,
    sanitizedText: aiResponseText,
  };
}

/**
 * On-Device Empathy Fallback
 * Speaks comforting audio when offline, on network timeout, or when circuit breaker trips.
 */
export const EMPATHY_FALLBACK_AUDIO_SCRIPT =
  "I'm having a little trouble hearing you right now, but I am still right here with you. Let's take a slow, gentle breath together. You can speak to me again whenever you feel ready.";
