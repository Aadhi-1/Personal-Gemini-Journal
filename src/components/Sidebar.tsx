import React, { useState } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  MessageSquare,
  Trash2,
  Tag,
  Sparkles,
  MapPin,
  BarChart3,
} from 'lucide-react';
import { InteractionEntry, JournalCategory } from '../types';

interface SidebarProps {
  entries: InteractionEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: InteractionEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMoodInsights?: () => void;
}

const CATEGORIES: ('All' | JournalCategory)[] = [
  'All',
  'Personal Reflection',
  'Brainstorming',
  'Gratitude',
  'Decision Making',
  'Goal Setting',
  'General',
];

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  selectedEntryId,
  onSelectEntry,
  onNewEntry,
  onDeleteEntry,
  isMobileOpen,
  onCloseMobile,
  onOpenMoodInsights,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | JournalCategory>('All');
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Filter entries based on search and category
  const filteredEntries = entries.filter((entry) => {
    const matchesCategory =
      selectedCategory === 'All' || entry.category === selectedCategory;

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesTitle = entry.title?.toLowerCase().includes(query);
    const matchesSummary = entry.summary?.toLowerCase().includes(query);
    const matchesMood = entry.mood?.toLowerCase().includes(query);
    const matchesLocation =
      entry.location?.name?.toLowerCase().includes(query) ||
      entry.location?.formattedAddress?.toLowerCase().includes(query);
    const matchesMessages = entry.messages?.some((m) =>
      m.content?.toLowerCase().includes(query)
    );

    return (
      matchesCategory &&
      (matchesTitle || matchesSummary || matchesMood || matchesLocation || matchesMessages)
    );
  });

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="journal-sidebar"
        className={`fixed lg:static top-16 bottom-0 left-0 z-30 w-80 sm:w-88 bg-stone-50 border-r border-stone-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* New Entry Action Header */}
        <div className="p-4 border-b border-stone-200">
          <button
            id="new-reflection-button"
            type="button"
            onClick={() => {
              onNewEntry();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition-all shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>New Reflection</span>
          </button>

          {/* Search Input */}
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-reflections-input"
              type="text"
              placeholder="Search reflections & keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-stone-300 placeholder-stone-400 text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition-all"
            />
          </div>

          {/* 30-Day D3.js Mood Insights Launcher */}
          {onOpenMoodInsights && (
            <button
              id="sidebar-mood-insights-button"
              type="button"
              onClick={() => {
                onOpenMoodInsights();
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3 py-2 mt-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200/80 text-amber-900 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Open D3.js Mood Insights (Local Enclave 30-Day Frequency Analysis)"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-600" />
                <span>30-Day Mood Insights</span>
              </div>
              <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                D3.js
              </span>
            </button>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto mt-3 pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-200/70 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 px-4">
              <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-600">No reflections found</p>
              <p className="text-xs text-stone-400 mt-1">
                {searchQuery
                  ? 'Try adjusting your search terms or category filter.'
                  : 'Start your first reflective dialogue with Gemini.'}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isSelected = entry.id === selectedEntryId;
              return (
                <div
                  key={entry.id}
                  id={`reflection-item-${entry.id}`}
                  onClick={() => {
                    onSelectEntry(entry);
                    onCloseMobile();
                  }}
                  className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-stone-800/40 shadow-xs ring-1 ring-stone-800/20'
                      : 'bg-white/70 hover:bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {entry.mood && (
                        <span className="text-xs shrink-0 select-none" title={`Mood: ${entry.mood}`}>
                          {entry.mood.split(' ')[0]}
                        </span>
                      )}
                      <h4 className="text-xs font-semibold text-stone-900 line-clamp-1 leading-snug">
                        {entry.title || 'Untitled Reflection'}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEntryToDelete(entry.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition-opacity p-1 -mr-1 -mt-1 rounded"
                      title="Delete reflection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {entry.summary ? (
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                      {entry.summary}
                    </p>
                  ) : entry.messages.length > 0 ? (
                    <p className="text-[11px] text-stone-400 line-clamp-2 mt-1 leading-relaxed italic">
                      "{entry.messages[0].content}"
                    </p>
                  ) : null}

                  {/* Pinned Location Tag */}
                  {entry.location && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit max-w-full truncate">
                      <MapPin className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                      <span className="truncate">{entry.location.name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-100 text-[10px] text-stone-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.updatedAt || entry.createdAt)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-medium text-[10px]">
                      {entry.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-stone-200 bg-stone-100/70 text-[11px] text-stone-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3 h-3 text-amber-600" />
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} saved
          </span>
          <span className="text-[10px] text-stone-400">Firestore Sync Active</span>
        </div>
      </aside>

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-stone-200 shadow-xl">
            <h3 className="text-base font-semibold text-stone-900 mb-2">
              Delete this reflection?
            </h3>
            <p className="text-xs text-stone-600 mb-6 leading-relaxed">
              This will permanently delete this conversation and its saved insights from your private Firestore database. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (entryToDelete) {
                    onDeleteEntry(entryToDelete);
                    setEntryToDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
