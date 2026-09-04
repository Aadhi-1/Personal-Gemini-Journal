import React, { useEffect } from 'react';
import { Phone, Heart, ShieldAlert, X, AlertCircle, PhoneCall } from 'lucide-react';

interface SafeModeCrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerPhrase?: string;
}

export function SafeModeCrisisModal({ isOpen, onClose, triggerPhrase }: SafeModeCrisisModalProps) {
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Immediate compassionate emergency voice announcement
        const utterance = new SpeechSynthesisUtterance(
          "We care about your safety. If you are in crisis or thinking about suicide or self-harm, please call 911 or the 988 Suicide and Crisis Lifeline immediately. Free help is available 24/7."
        );
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }

      // Dispatch urgent emergency notification to external channels (Slack/Discord/Email)
      fetch('/api/notifications/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: `emergency-${Date.now()}`,
          triggerReason: 'CRISIS_SAFE_MODE',
          entryTitle: 'URGENT: Suicide & Self-Harm Emergency Alert',
          category: 'Personal Reflection',
          summary: 'A user displayed indicators of suicide, severe distress, or self-harm in ReflectAI. Emergency services (911) and the 988 Suicide & Crisis Lifeline were immediately activated on-screen.',
          timestamp: new Date().toISOString(),
          channels: ['slack', 'discord', 'email'],
        }),
      }).catch((e) => console.warn('Emergency notification dispatch:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg bg-stone-900 border-2 border-rose-500 rounded-3xl p-6 sm:p-8 text-stone-100 shadow-2xl relative animate-fade-in">
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
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Emergency Assistance</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-rose-500 text-white animate-pulse">
                Active
              </span>
            </div>
            <p className="text-xs text-rose-300 font-medium">
              Immediate Care, Suicide Prevention & Crisis Safeguard
            </p>
          </div>
        </div>

        {/* Compassionate Message */}
        <div className="bg-rose-950/60 border border-rose-800/80 rounded-2xl p-4 mb-5 text-sm text-stone-200 leading-relaxed">
          <p className="font-bold text-rose-200 mb-1 text-base">You are not alone. Please stay with us.</p>
          <p className="text-xs sm:text-sm text-stone-300">
            If you or someone you know is going through a tough time, experiencing suicidal thoughts, or thinking about doing something to hurt yourself, immediate emergency support is right here.
          </p>
          {triggerPhrase && (
            <div className="mt-2.5 pt-2 border-t border-rose-900/60 text-[11px] text-rose-300">
              Triggered by safety guard: <span className="font-mono bg-rose-950 px-1.5 py-0.5 rounded text-white font-semibold">"{triggerPhrase}"</span>
            </div>
          )}
        </div>

        {/* High-Contrast Large Touch Targets */}
        <div className="space-y-3 mb-6">
          {/* 911 Emergency Services (Highest Priority) */}
          <a
            id="emergency-call-911-btn"
            href="tel:911"
            className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold transition-all shadow-xl hover:shadow-red-600/40 transform active:scale-98 border border-red-400"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div className="text-left">
                <div className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                  <span>Call Emergency Services (911)</span>
                </div>
                <div className="text-xs font-normal text-rose-100">Immediate Police, Fire & Medical Emergency Response</div>
              </div>
            </div>
            <span className="text-xs font-mono uppercase bg-white text-red-700 font-extrabold px-3 py-1.5 rounded-lg shrink-0">
              Dial 911
            </span>
          </a>

          {/* 988 Suicide & Crisis Lifeline */}
          <a
            id="emergency-call-988-btn"
            href="tel:988"
            className="flex items-center justify-between p-4 rounded-2xl bg-rose-900/80 hover:bg-rose-800 border border-rose-700 text-white font-bold transition-all shadow-md transform active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/30 text-rose-200 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-base font-bold">988 Suicide & Crisis Lifeline</div>
                <div className="text-xs font-normal text-rose-200">Free, Confidential, 24/7 Suicide Prevention</div>
              </div>
            </div>
            <span className="text-xs font-mono uppercase bg-rose-700 text-white px-3 py-1.5 rounded-lg shrink-0">
              Call or Text 988
            </span>
          </a>

          {/* Crisis Text Line */}
          <a
            id="emergency-sms-741741-btn"
            href="sms:741741?body=HOME"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-bold transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Crisis Text Line</div>
                <div className="text-[11px] font-normal text-stone-400">Text HOME to 741741 for Free 24/7 Crisis Counseling</div>
              </div>
            </div>
            <span className="text-xs font-mono uppercase bg-stone-700 px-2.5 py-1 rounded-lg text-stone-200">Text 741741</span>
          </a>
          {/* Crisis Support Counselor */}
          <a
            id="emergency-call-lifeline-backup-btn"
            href="tel:18002738255"
            className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-100 font-bold transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">National Crisis Support Line</div>
                <div className="text-[11px] font-normal text-stone-400">1-800-273-8255 (24/7 Empathetic Support)</div>
              </div>
            </div>
            <span className="text-xs font-mono uppercase bg-stone-700 px-2.5 py-1 rounded-lg text-stone-200">Call Now</span>
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
