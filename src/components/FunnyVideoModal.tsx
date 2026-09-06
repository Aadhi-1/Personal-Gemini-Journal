import React, { useState } from 'react';
import { X, Sparkles, Film, Heart, RotateCw, Smile } from 'lucide-react';
import { FunnyVideoPlayer } from './FunnyVideoPlayer';
import { FUNNY_VIDEOS, getRandomFunnyVideo } from '../data/funnyVideos';
import { UpliftingVideo } from '../types';

interface FunnyVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVideo?: UpliftingVideo;
}

export const FunnyVideoModal: React.FC<FunnyVideoModalProps> = ({
  isOpen,
  onClose,
  initialVideo,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="funny-video-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="funny-video-modal-content"
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-amber-200/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-base sm:text-lg shadow-sm shrink-0">
              😂
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-1.5 flex-wrap">
                <span>Instant Mood Uplifter</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                  Calming Zone
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-600 line-clamp-1 sm:line-clamp-none">
                Whenever you feel down, angry, or overwhelmed, pause and let contagious laughter soothe your mind.
              </p>
            </div>
          </div>

          <button
            id="close-funny-video-modal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 max-h-[82vh] overflow-y-auto">
          <FunnyVideoPlayer initialVideo={initialVideo} inline={false} />

          {/* Calming reassurance banner */}
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Smile className="w-4 h-4" />
            </div>
            <div className="text-xs text-amber-950 leading-relaxed">
              <p className="font-semibold mb-0.5">Take a slow, gentle breath.</p>
              <p className="text-amber-900/80">
                It is completely normal to feel upset, overwhelmed, or tired. You did nothing wrong, and things will get clearer step by step.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
