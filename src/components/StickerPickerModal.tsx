import React, { useState } from 'react';
import { X, Search, Check, Sparkles, Tag, Smile } from 'lucide-react';
import { JOURNAL_STICKERS, JournalSticker } from '../types';

export interface StickerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStickerIds: string[];
  onToggleSticker: (stickerId: string) => void;
}

const CATEGORIES: { id: 'all' | JournalSticker['category']; label: string }[] = [
  { id: 'all', label: 'All Stickers' },
  { id: 'mindfulness', label: 'Mindfulness & Zen' },
  { id: 'insight', label: 'Insights & Clarity' },
  { id: 'emotion', label: 'Emotions & Vibe' },
  { id: 'achievement', label: 'Focus & Grit' },
  { id: 'milestone', label: 'Milestones' },
];

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
  isOpen,
  onClose,
  selectedStickerIds = [],
  onToggleSticker,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | JournalSticker['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredStickers = JOURNAL_STICKERS.filter((s) => {
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;
    return (
      matchesCategory &&
      (s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q))
    );
  });

  return (
    <div
      id="sticker-picker-modal-overlay"
      className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="sticker-picker-modal-content"
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl p-4 sm:p-6 relative max-h-[92vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 border border-amber-200 flex items-center justify-center text-amber-700">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Journal Reflection Stickers
              </h3>
              <p className="text-[11px] text-stone-500">
                Expressive tags to anchor your state of mind & breakthroughs
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-sticker-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="mt-3 space-y-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stickers (e.g. zen, breakthrough, grateful)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeCategory === c.id
                    ? 'bg-stone-900 text-white shadow-2xs font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-900'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Stickers Summary */}
        {selectedStickerIds.length > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mr-1">
              Attached ({selectedStickerIds.length}):
            </span>
            {selectedStickerIds.map((id) => {
              const sticker = JOURNAL_STICKERS.find((s) => s.id === id);
              if (!sticker) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onToggleSticker(id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs border font-medium transition-all group ${sticker.colorClass}`}
                  title="Click to remove sticker"
                >
                  <span>{sticker.emoji}</span>
                  <span>{sticker.label}</span>
                  <X className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        )}

        {/* Stickers Grid */}
        <div className="mt-3 overflow-y-auto flex-1 pr-1 max-h-[46vh] space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredStickers.map((sticker) => {
              const isSelected = selectedStickerIds.includes(sticker.id);
              return (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => onToggleSticker(sticker.id)}
                  className={`p-2.5 rounded-2xl border text-left flex items-start justify-between gap-2.5 transition-all ${
                    isSelected
                      ? `${sticker.colorClass} ring-2 ring-amber-400/40 shadow-xs font-semibold`
                      : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0 select-none">{sticker.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span>{sticker.label}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 line-clamp-1 leading-tight mt-0.5">
                        {sticker.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                      isSelected
                        ? 'bg-amber-500 border-amber-600 text-white'
                        : 'border-stone-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3" />
                  </div>
                </button>
              );
            })}
          </div>

          {filteredStickers.length === 0 && (
            <div className="py-8 text-center text-stone-400 text-xs">
              No stickers match your query. Try searching for a different keyword.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
          <span className="text-[11px] text-stone-400">
            {selectedStickerIds.length} stickers active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
