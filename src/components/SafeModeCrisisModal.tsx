import React, { useEffect } from 'react';
import { Phone, Heart, ShieldAlert, X, AlertCircle, PhoneCall } from 'lucide-react';

interface SafeModeCrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerPhrase?: string;
}

export function SafeModeCrisisModal({ isOpen, onClose, triggerPhrase }: SafeModeCrisisModalProps) {
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.speechSynthesis) {
      // Gentle reassuring voice notification
      const utterance = new SpeechSynthesisUtterance(
        "You are safe right now. Please reach out to someone who cares about you. Help is available 24/7."
      );
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-stone-900 border-2 border-rose-500/50 rounded-3xl p-6 sm:p-8 text-stone-100 shadow-2xl relative animate-fade-in">
        {/* Close / Dismiss */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
          title="I am safe, return to journal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Safe Mode Support</h2>
            <p className="text-xs text-rose-300 font-medium">
              Immediate Care & Crisis Safeguard Protocol
            </p>
          </div>
        </div>

        {/* Compassionate Message */}
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 mb-6 text-sm text-stone-200 leading-relaxed">
          <p className="font-semibold text-rose-200 mb-1">We care about you and your safety.</p>
          <p className="text-xs sm:text-sm text-stone-300">
            Life can feel overwhelming, but you do not have to carry this alone. Reach out to one of the free, confidential resources below right now.
          </p>
          {triggerPhrase && (
            <div className="mt-3 pt-2 border-t border-rose-900/60 text-[11px] text-rose-300/80">
              Safety check triggered by detected emotional distress.
            </div>
          )}
        </div>

        {/* High-Contrast Large Touch Targets (Designed for Elderly & Children) */}
        <div className="space-y-3 mb-6">
          {/* 988 Suicide & Crisis Lifeline */}
          <a
            href="tel:988"
            className="flex items-center justify-between p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg hover:shadow-rose-600/30 transform active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-base sm:text-lg">Call 988 Lifeline</div>
                <div className="text-xs font-normal text-rose-100">Free, Confidential, 24/7 Suicide & Crisis</div>
              </div>
            </div>
            <span className="text-xs font-mono uppercase bg-white/20 px-3 py-1 rounded-lg">Dial 988</span>
          </a>

          {/* 911 Emergency Services */}
          <a
            href="tel:911"
            className="flex items-center justify-between p-4 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-bold transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-base sm:text-lg">Emergency Services</div>
                <div className="text-xs font-normal text-stone-400">Immediate Medical & Emergency Assistance</div>
              </div>
            </div>
            <span className="text-xs font-mono uppercase bg-stone-700 px-3 py-1 rounded-lg text-stone-200">Dial 911</span>
          </a>

          {/* Trusted Caregiver / Family Contact */}
          <a
            href="tel:18002738255"
            className="flex items-center justify-between p-4 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-bold transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-base sm:text-lg">Crisis Support Counselor</div>
                <div className="text-xs font-normal text-stone-400">Talk with an empathetic listener</div>
              </div>
            </div>
            <span className="text-xs font-mono uppercase bg-stone-700 px-3 py-1 rounded-lg text-stone-200">Call Now</span>
          </a>
        </div>

        {/* Dismiss and Affirmation */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-stone-500">
            Zero-Trust Safe Mode • No audio recorded during crisis
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-stone-200 underline font-medium"
          >
            I am okay, close safe mode
          </button>
        </div>
      </div>
    </div>
  );
}
