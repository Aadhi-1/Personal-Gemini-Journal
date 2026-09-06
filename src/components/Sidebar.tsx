import React, { useState, useRef, useEffect } from 'react';
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
  MoreVertical,
  PanelLeftClose,
  Maximize2,
  Palette,
  X,
  RotateCcw,
  LogOut,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { InteractionEntry, JournalCategory, JOURNAL_STICKERS } from '../types';
import { useTheme, ACCENT_COLORS } from '../theme/ThemeContext';

interface SidebarProps {
  entries: InteractionEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: InteractionEntry) => void;
  onNewEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMoodInsights?: () => void;
  onOpenThemeCustomizer?: () => void;
  isDesktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
  user?: User | null;
  isGuest?: boolean;
  onSignOut?: () => void;
  onSignIn?: () => void;
  onOpenReflectionsMap?: () => void;
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
  onOpenThemeCustomizer,
  isDesktopCollapsed = false,
  onToggleDesktopCollapse,
  user,
  isGuest,
  onSignOut,
  onSignIn,
  onOpenReflectionsMap,
}) => {
  const { currentTheme, accentColorId } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | JournalCategory>('All');
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const geotaggedCount = entries.filter((e) => Boolean(e.location?.lat && e.location?.lng)).length;

  // Close 3-dots menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    if (isHeaderMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHeaderMenuOpen]);

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
        style={{
          backgroundColor: currentTheme.bgSurface,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textMain,
        }}
        className={`fixed lg:static top-16 bottom-0 left-0 z-30 border-r flex flex-col transition-all duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 w-80 sm:w-88' : '-translate-x-full lg:translate-x-0'
        } ${
          isDesktopCollapsed
            ? 'lg:w-0 lg:opacity-0 lg:overflow-hidden lg:border-r-0 lg:pointer-events-none'
            : 'lg:w-80 sm:lg:w-88 lg:opacity-100'
        }`}
      >
        {/* Top Header Row with 3-Dots Menu & Fullscreen Collapse */}
        <div className="p-4 border-b flex flex-col gap-3" style={{ borderColor: currentTheme.borderColor }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: currentTheme.textMain }}>
                  Reflections
                </h2>
                <p className="text-[10px] truncate" style={{ color: currentTheme.textMuted }}>
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'} saved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
                style={{ color: currentTheme.textMuted }}
                title="Close Sidebar"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 1-Click Desktop Collapse Button */}
              {onToggleDesktopCollapse && (
                <button
                  type="button"
                  onClick={onToggleDesktopCollapse}
                  className="hidden lg:flex p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors"
                  style={{ color: currentTheme.textMuted }}
                  title="Full Screen Dashboard (Collapse Sidebar)"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}

              {/* 3-Dots Action Menu */}
              <div className="relative" ref={headerMenuRef}>
                <button
                  id="sidebar-3dots-menu-button"
                  type="button"
                  onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                  className="p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors cursor-pointer"
                  style={{ color: currentTheme.textMain }}
                  title="Sidebar & Dashboard Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isHeaderMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-60 rounded-xl shadow-xl py-1.5 z-50 animate-fade-in border text-xs"
                    style={{
                      backgroundColor: currentTheme.bgSurface,
                      borderColor: currentTheme.borderColor,
                      color: currentTheme.textMain,
                    }}
                  >
                    <div
                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border-b opacity-60"
                      style={{ borderColor: currentTheme.borderColor }}
                    >
                      Dashboard Options
                    </div>

                    {onToggleDesktopCollapse && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onToggleDesktopCollapse();
                        }}
                        className="w-full px-3 py-2 text-left hover:opacity-80 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Maximize2 className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">Full Screen Dashboard</div>
                          <div className="text-[10px]" style={{ color: currentTheme.textMuted }}>
                            Hide sidebar for full-width focus
                          </div>
                        </div>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        onNewEntry();
                        onCloseMobile();
                      }}
                      className="w-full px-3 py-2 text-left hover:opacity-80 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">New Reflection</div>
                        <div className="text-[10px]" style={{ color: currentTheme.textMuted }}>
                          Start fresh contemplation
                        </div>
                      </div>
                    </button>

                    {onOpenMoodInsights && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onOpenMoodInsights();
                          onCloseMobile();
                        }}
                        className="w-full px-3 py-2 text-left hover:opacity-80 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">30-Day Mood Insights</div>
                          <div className="text-[10px]" style={{ color: currentTheme.textMuted }}>
                            View local D3.js visualization
                          </div>
                        </div>
                      </button>
                    )}

                    {onOpenThemeCustomizer && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onOpenThemeCustomizer();
                        }}
                        className="w-full px-3 py-2 text-left hover:opacity-80 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Palette className="w-4 h-4 text-purple-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">Themes & Personalization</div>
                          <div className="text-[10px]" style={{ color: currentTheme.textMuted }}>
                            Change atmosphere & styles
                          </div>
                        </div>
                      </button>
                    )}

                    {onOpenReflectionsMap && (
                      <button
                        id="sidebar-3dots-open-map"
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          onOpenReflectionsMap();
                          onCloseMobile();
                        }}
                        className="w-full px-3 py-2 text-left hover:opacity-80 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">Reflections World Map</div>
                          <div className="text-[10px]" style={{ color: currentTheme.textMuted }}>
                            Explore memories across Google Maps
                          </div>
                        </div>
                      </button>
                    )}

                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsHeaderMenuOpen(false);
                          setSearchQuery('');
                          setSelectedCategory('All');
                        }}
                        className="w-full px-3 py-2 text-left hover:opacity-80 flex items-center gap-2.5 border-t transition-colors cursor-pointer"
                        style={{ borderColor: currentTheme.borderColor }}
                      >
                        <RotateCcw className="w-4 h-4 text-stone-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">Reset Search Filters</div>
                        </div>
                      </button>
                    )}

                    {/* Mobile Close */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        onCloseMobile();
                      }}
                      className="lg:hidden w-full px-3 py-2 text-left hover:opacity-80 flex items-center gap-2.5 border-t transition-colors cursor-pointer"
                      style={{ borderColor: currentTheme.borderColor }}
                    >
                      <X className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="font-semibold">Close Sidebar</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Close Button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors"
                style={{ color: currentTheme.textMain }}
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Bar: New Entry + Reflections Map */}
          <div className="flex items-center gap-2">
            <button
              id="sidebar-new-reflection-btn"
              type="button"
              onClick={() => {
                onNewEntry();
                onCloseMobile();
              }}
              className="flex-1 px-3 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>

            {onOpenReflectionsMap && (
              <button
                id="sidebar-open-map-btn"
                type="button"
                onClick={() => {
                  onOpenReflectionsMap();
                  onCloseMobile();
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold border hover:opacity-90 active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                style={{
                  borderColor: currentTheme.borderColor,
                  backgroundColor: currentTheme.bgMain,
                  color: currentTheme.textMain,
                }}
                title="Explore Reflections on Google Maps"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                <span>Map</span>
                {geotaggedCount > 0 && (
                  <span
                    className="ml-0.5 text-2xs px-1.5 py-0.2 rounded-full font-bold"
                    style={{
                      backgroundColor: `${ACCENT_COLORS[accentColorId].hex}20`,
                      color: ACCENT_COLORS[accentColorId].hex,
                    }}
                  >
                    {geotaggedCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: currentTheme.textMuted }} />
            <input
              id="sidebar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search encrypted reflections..."
              className="w-full pl-8.5 pr-8 py-1.5 text-xs rounded-xl border focus:outline-none transition-all"
              style={{
                backgroundColor: currentTheme.bgMain,
                borderColor: currentTheme.borderColor,
                color: currentTheme.textMain,
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-80 transition-opacity"
                style={{ color: currentTheme.textMuted }}
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className="px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all text-[11px] border"
                  style={{
                    backgroundColor: isActive
                      ? ACCENT_COLORS[accentColorId].hex
                      : currentTheme.bgMain,
                    borderColor: isActive
                      ? ACCENT_COLORS[accentColorId].hex
                      : currentTheme.borderColor,
                    color: isActive ? '#ffffff' : currentTheme.textMuted,
                  }}
                >
                  {category}
                </button>
              );
            })}
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
                  style={{
                    backgroundColor: isSelected
                      ? `${ACCENT_COLORS[accentColorId].hex}12`
                      : currentTheme.bgMain,
                    borderColor: isSelected
                      ? ACCENT_COLORS[accentColorId].hex
                      : currentTheme.borderColor,
                    color: currentTheme.textMain,
                  }}
                  className="group relative p-3 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {entry.mood && (
                        <span className="text-xs shrink-0 select-none" title={`Mood: ${entry.mood}`}>
                          {entry.mood.split(' ')[0]}
                        </span>
                      )}
                      <h4
                        className="text-xs font-semibold line-clamp-1 leading-snug"
                        style={{ color: currentTheme.textMain }}
                      >
                        {entry.title || 'Untitled Reflection'}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEntryToDelete(entry.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1 -mt-1 rounded hover:bg-rose-50 hover:text-rose-600"
                      style={{ color: currentTheme.textMuted }}
                      title="Delete reflection"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {entry.summary ? (
                    <p
                      className="text-[11px] line-clamp-2 mt-1 leading-relaxed"
                      style={{ color: currentTheme.textMuted }}
                    >
                      {entry.summary}
                    </p>
                  ) : entry.messages && entry.messages.length > 0 ? (
                    <p
                      className="text-[11px] line-clamp-2 mt-1 leading-relaxed italic"
                      style={{ color: currentTheme.textMuted }}
                    >
                      "{entry.messages[0].content}"
                    </p>
                  ) : null}

                  {/* Stickers & Tags Row */}
                  {entry.stickers && entry.stickers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {entry.stickers.slice(0, 3).map((stkId) => {
                        const s = JOURNAL_STICKERS.find((item) => item.id === stkId);
                        if (!s) return null;
                        return (
                          <span
                            key={stkId}
                            className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded font-medium border ${s.colorClass}`}
                          >
                            <span>{s.emoji}</span>
                            <span>{s.label}</span>
                          </span>
                        );
                      })}
                      {entry.stickers.length > 3 && (
                        <span className="text-[9px] self-center opacity-70" style={{ color: currentTheme.textMuted }}>
                          +{entry.stickers.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Pinned Location Tag */}
                  {entry.location && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-1.5 py-0.5 rounded-md w-fit max-w-full truncate border border-emerald-200/50">
                      <MapPin className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                      <span className="truncate">{entry.location.name}</span>
                    </div>
                  )}

                  <div
                    className="flex items-center justify-between gap-2 mt-2 pt-2 border-t text-[10px]"
                    style={{ borderColor: currentTheme.borderColor }}
                  >
                    <span className="flex items-center gap-1" style={{ color: currentTheme.textMuted }}>
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.updatedAt || entry.createdAt)}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded font-medium text-[10px]"
                      style={{
                        backgroundColor: `${ACCENT_COLORS[accentColorId].hex}15`,
                        color: ACCENT_COLORS[accentColorId].hex,
                      }}
                    >
                      {entry.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* User Account & Direct Sign Out Card */}
        {(user || isGuest) && (
          <div
            className="p-3 border-t flex flex-col gap-2"
            style={{
              borderColor: currentTheme.borderColor,
              backgroundColor: `${currentTheme.bgMain}95`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google Account'}
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full border border-stone-300 shadow-2xs object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center shadow-2xs flex-shrink-0">
                    {user?.displayName ? user.displayName[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'G'}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate" style={{ color: currentTheme.textMain }}>
                    {user?.displayName || (isGuest ? 'Guest Explorer' : 'Google Account')}
                  </span>
                  <span className="text-[10px] truncate opacity-75" style={{ color: currentTheme.textMuted }}>
                    {user?.email || (isGuest ? 'Ephemeral Session' : 'Firestore Encrypted')}
                  </span>
                </div>
              </div>

              {onSignOut && (
                <button
                  id="sidebar-sign-out-button"
                  type="button"
                  onClick={onSignOut}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 shadow-2xs transition-all cursor-pointer flex-shrink-0 active:scale-95"
                  title="Lock session & sign out from your account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div
          className="p-3 border-t text-[11px] flex items-center justify-between"
          style={{
            borderColor: currentTheme.borderColor,
            backgroundColor: `${currentTheme.bgMain}80`,
            color: currentTheme.textMuted,
          }}
        >
          <span className="flex items-center gap-1.5 font-medium" style={{ color: currentTheme.textMain }}>
            <Sparkles className="w-3 h-3 text-amber-500" />
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} saved
          </span>
          <span className="text-[10px]">Firestore Sync Active</span>
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
