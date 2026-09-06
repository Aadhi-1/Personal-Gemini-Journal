// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  Search,
  X,
  Compass,
  ExternalLink,
  Sparkles,
  Maximize2,
  Minimize2,
  Calendar,
  Tag,
  Smile,
  ChevronRight,
  Plus,
  LocateFixed,
  Layers,
  Map as MapIcon,
  HelpCircle,
} from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { InteractionEntry, JournalLocation } from '../types';
import { useTheme, ACCENT_COLORS } from '../theme/ThemeContext';

interface ReflectionsMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: InteractionEntry[];
  onSelectEntry: (entry: InteractionEntry) => void;
  onCreateWithLocation?: (location: JournalLocation) => void;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; glyph: string }> = {
  'Personal Reflection': { bg: '#3b82f6', border: '#1d4ed8', glyph: '#ffffff' },
  'Brainstorming': { bg: '#8b5cf6', border: '#6d28d9', glyph: '#ffffff' },
  'Gratitude': { bg: '#10b981', border: '#047857', glyph: '#ffffff' },
  'Decision Making': { bg: '#f59e0b', border: '#b45309', glyph: '#ffffff' },
  'Goal Setting': { bg: '#ec4899', border: '#be185d', glyph: '#ffffff' },
  'General': { bg: '#64748b', border: '#334155', glyph: '#ffffff' },
};

const SANCTUARY_PRESETS: JournalLocation[] = [
  {
    name: 'Kyoto Arashiyama Bamboo Grove',
    formattedAddress: 'Ukyo Ward, Kyoto 616-8385, Japan',
    lat: 35.0169,
    lng: 135.6713,
  },
  {
    name: 'Singapore Botanic Gardens',
    formattedAddress: '1 Cluny Rd, Singapore 259569',
    lat: 1.3138,
    lng: 103.8159,
  },
  {
    name: 'Central Park Conservatory Water',
    formattedAddress: 'New York, NY 10022, United States',
    lat: 40.7745,
    lng: -73.9696,
  },
  {
    name: 'Lake Louise Alpine Vista',
    formattedAddress: 'Banff National Park, Alberta, Canada',
    lat: 51.4254,
    lng: -116.1773,
  },
  {
    name: 'Hyde Park Serpentine',
    formattedAddress: 'London W2 2UH, United Kingdom',
    lat: 51.5073,
    lng: -0.1657,
  },
  {
    name: 'Shinjuku Gyoen Zen Garden',
    formattedAddress: 'Tokyo 160-0014, Japan',
    lat: 35.6852,
    lng: 139.7101,
  },
];

export const ReflectionsMapModal: React.FC<ReflectionsMapModalProps> = ({
  isOpen,
  onClose,
  entries,
  onSelectEntry,
  onCreateWithLocation,
}) => {
  const { currentTheme, accentColorId } = useTheme();
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<InteractionEntry | null>(null);
  const [clickedCoord, setClickedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [clickedAddress, setClickedAddress] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');

  // Active camera position state
  const [cameraCenter, setCameraCenter] = useState<{ lat: number; lng: number }>({
    lat: 20.0,
    lng: 0.0,
  });
  const [cameraZoom, setCameraZoom] = useState<number>(2);

  // Fetch backend Google Maps key if not bundled in client
  useEffect(() => {
    if (!apiKey) {
      fetch('/api/config/maps')
        .then((res) => res.json())
        .then((data) => {
          if (data.apiKey) {
            setApiKey(data.apiKey);
          }
        })
        .catch((err) => {
          console.warn('Could not retrieve Google Maps configuration:', err);
        });
    }
  }, [apiKey]);

  // Extract all entries that have location metadata
  const geotaggedEntries = useMemo(() => {
    return entries.filter(
      (e): e is InteractionEntry & { location: JournalLocation } =>
        Boolean(e.location && typeof e.location.lat === 'number' && typeof e.location.lng === 'number')
    );
  }, [entries]);

  // Filter geotagged entries by search and category
  const filteredEntries = useMemo(() => {
    return geotaggedEntries.filter((e) => {
      const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.location.name.toLowerCase().includes(q) ||
        (e.location.formattedAddress && e.location.formattedAddress.toLowerCase().includes(q)) ||
        (e.mood && e.mood.toLowerCase().includes(q))
      );
    });
  }, [geotaggedEntries, selectedCategory, searchQuery]);

  // Center map on first entry or default
  useEffect(() => {
    if (isOpen) {
      if (filteredEntries.length > 0) {
        setCameraCenter({
          lat: filteredEntries[0].location.lat,
          lng: filteredEntries[0].location.lng,
        });
        setCameraZoom(filteredEntries.length === 1 ? 12 : 3);
      } else {
        setCameraCenter({ lat: 25.0, lng: 15.0 });
        setCameraZoom(2);
      }
      setSelectedEntry(null);
      setClickedCoord(null);
    }
  }, [isOpen, filteredEntries.length]);

  // Handle map click to inspect or create
  const handleMapClick = useCallback(async (e: any) => {
    if (e.detail && e.detail.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      setClickedCoord({ lat, lng });
      setSelectedEntry(null);
      setClickedAddress('Looking up location name...');
      setIsGeocoding(true);

      try {
        const res = await fetch(`/api/maps/geocode?lat=${lat}&lng=${lng}`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setClickedAddress(data.results[0].formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } else {
          setClickedAddress(`Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        }
      } catch {
        setClickedAddress(`Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      } finally {
        setIsGeocoding(false);
      }
    }
  }, []);

  // Jump to specific entry marker
  const handleFocusEntry = (entry: InteractionEntry & { location: JournalLocation }) => {
    setSelectedEntry(entry);
    setClickedCoord(null);
    setCameraCenter({ lat: entry.location.lat, lng: entry.location.lng });
    setCameraZoom(14);
  };

  // Jump to preset spot
  const handleSelectPreset = (preset: JournalLocation) => {
    setCameraCenter({ lat: preset.lat, lng: preset.lng });
    setCameraZoom(13);
    setClickedCoord({ lat: preset.lat, lng: preset.lng });
    setClickedAddress(preset.formattedAddress || preset.name);
    setSelectedEntry(null);
  };

  const handleCreateHere = () => {
    if (clickedCoord && onCreateWithLocation) {
      onCreateWithLocation({
        name: clickedAddress || 'Pinned Sanctuary',
        formattedAddress: clickedAddress || undefined,
        lat: Number(clickedCoord.lat.toFixed(6)),
        lng: Number(clickedCoord.lng.toFixed(6)),
      });
      onClose();
    }
  };

  const categories = ['All', 'Personal Reflection', 'Brainstorming', 'Gratitude', 'Decision Making', 'Goal Setting'];

  if (!isOpen) return null;

  return (
    <div
      id="reflections-map-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <motion.div
        id="reflections-map-modal-card"
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className={`w-full bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-2 sm:inset-4 max-w-none h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]'
            : 'max-w-6xl h-[88vh] max-h-[850px]'
        }`}
        style={{
          backgroundColor: currentTheme.bgSurface,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textMain,
        }}
      >
        {/* Header Bar */}
        <div
          id="reflections-map-header"
          className="px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: currentTheme.borderColor }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold truncate">
                  Reflections World Map
                </h2>
                <span
                  className="hidden sm:inline-flex text-2xs px-2 py-0.5 rounded-full font-semibold border"
                  style={{
                    backgroundColor: `${ACCENT_COLORS[accentColorId].hex}15`,
                    borderColor: `${ACCENT_COLORS[accentColorId].hex}35`,
                    color: ACCENT_COLORS[accentColorId].hex,
                  }}
                >
                  {geotaggedEntries.length} Geotagged
                </span>
              </div>
              <p className="text-2xs truncate" style={{ color: currentTheme.textMuted }}>
                Explore your contemplation spots and sanctuaries powered by Google Maps Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="map-fullscreen-toggle-button"
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
              style={{ color: currentTheme.textMuted }}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              id="close-reflections-map-button"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close Map"
              style={{ color: currentTheme.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div
          id="reflections-map-toolbar"
          className="px-4 sm:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs"
          style={{
            backgroundColor: `${currentTheme.bgSurface}f0`,
            borderColor: currentTheme.borderColor,
          }}
        >
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search
              className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: currentTheme.textMuted }}
            />
            <input
              id="map-search-reflections-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reflections or pinned places..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border transition-colors outline-hidden"
              style={{
                backgroundColor: currentTheme.bgSurface,
                borderColor: currentTheme.borderColor,
                color: currentTheme.textMain,
              }}
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`map-category-chip-${cat.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="px-2.5 py-1 text-2xs rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer border"
                  style={{
                    backgroundColor: isSelected ? ACCENT_COLORS[accentColorId].hex : 'transparent',
                    borderColor: isSelected ? ACCENT_COLORS[accentColorId].hex : currentTheme.borderColor,
                    color: isSelected ? '#ffffff' : currentTheme.textMuted,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area: Map Canvas + Sidebar List */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
          {/* Google Maps Stage */}
          <div className="flex-1 h-64 md:h-auto relative overflow-hidden bg-stone-100 dark:bg-stone-950">
            {apiKey ? (
              <APIProvider apiKey={apiKey}>
                <Map
                  id="reflections-world-map-canvas"
                  style={{ width: '100%', height: '100%' }}
                  center={cameraCenter}
                  zoom={cameraZoom}
                  onCenterChanged={(e) => setCameraCenter(e.detail.center)}
                  onZoomChanged={(e) => setCameraZoom(e.detail.zoom)}
                  mapId="DEMO_MAP_ID"
                  mapTypeId={mapType}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  onClick={handleMapClick}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                >
                  {/* User Geotagged Reflection Markers */}
                  {filteredEntries.map((entry) => {
                    const pinConfig = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.General;
                    const isSelected = selectedEntry?.id === entry.id;

                    return (
                      <AdvancedMarker
                        key={entry.id}
                        position={{ lat: entry.location.lat, lng: entry.location.lng }}
                        title={entry.title}
                        onClick={() => {
                          setSelectedEntry(entry);
                          setClickedCoord(null);
                        }}
                      >
                        <Pin
                          background={isSelected ? '#dc2626' : pinConfig.bg}
                          borderColor={isSelected ? '#991b1b' : pinConfig.border}
                          glyphColor="#ffffff"
                          scale={isSelected ? 1.25 : 1.0}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {/* Temporary Clicked Marker */}
                  {clickedCoord && (
                    <AdvancedMarker
                      position={clickedCoord}
                      title="Clicked Location"
                    >
                      <Pin background="#10b981" borderColor="#047857" glyphColor="#ffffff" scale={1.15} />
                    </AdvancedMarker>
                  )}

                  {/* InfoWindow for Selected Reflection */}
                  {selectedEntry && selectedEntry.location && (
                    <InfoWindow
                      position={{
                        lat: selectedEntry.location.lat,
                        lng: selectedEntry.location.lng,
                      }}
                      onCloseClick={() => setSelectedEntry(null)}
                      maxWidth={320}
                    >
                      <div className="p-1 text-slate-900 font-sans">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-2xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                            {selectedEntry.category}
                          </span>
                          {selectedEntry.mood && (
                            <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {selectedEntry.mood}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                          {selectedEntry.title}
                        </h3>

                        <div className="flex items-center gap-1 text-2xs text-slate-500 mb-2">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{selectedEntry.location.name}</span>
                        </div>

                        {selectedEntry.summary && (
                          <p className="text-2xs text-slate-600 line-clamp-2 mb-2.5 leading-relaxed bg-slate-50 p-1.5 rounded-md border border-slate-100">
                            {selectedEntry.summary}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedEntry.location.lat},${selectedEntry.location.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-2xs text-slate-500 hover:text-slate-800"
                          >
                            <span>Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>

                          <button
                            id="infowindow-open-entry-button"
                            type="button"
                            onClick={() => {
                              onSelectEntry(selectedEntry);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>Open Reflection</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            ) : (
              /* Graceful Prototyping Canvas when API key is pending */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-radial from-stone-50 to-stone-200 dark:from-stone-900 dark:to-stone-950">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-3 shadow-md"
                  style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                >
                  <MapPin className="w-7 h-7 animate-bounce" />
                </div>
                <h3 className="text-base font-bold mb-1">
                  Interactive Google Maps Explorer
                </h3>
                <p className="text-xs max-w-md mb-4 leading-relaxed opacity-80" style={{ color: currentTheme.textMuted }}>
                  Connect your Google Maps API key to render dynamic satellite & vector tiles, pin reflections across continents, and explore geographical contemplation footprints.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <a
                    href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                  >
                    <span>Get Free Maps Demo Key</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border transition-colors hover:bg-stone-200/50 dark:hover:bg-stone-800"
                    style={{ borderColor: currentTheme.borderColor, color: currentTheme.textMuted }}
                  >
                    <span>Terms of Service</span>
                  </a>
                </div>
              </div>
            )}

            {/* Clicked Coordinate Action Floating Pill */}
            {clickedCoord && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-10 p-3 rounded-xl shadow-xl border backdrop-blur-md flex flex-col gap-2 text-xs"
                style={{
                  backgroundColor: `${currentTheme.bgSurface}fa`,
                  borderColor: currentTheme.borderColor,
                  color: currentTheme.textMain,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Compass className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {isGeocoding ? 'Identifying location...' : clickedAddress}
                      </div>
                      <div className="text-2xs font-mono opacity-70">
                        {clickedCoord.lat.toFixed(5)}, {clickedCoord.lng.toFixed(5)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClickedCoord(null)}
                    className="p-1 rounded-md hover:opacity-75"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {onCreateWithLocation && (
                  <button
                    id="create-reflection-at-clicked-coord-button"
                    type="button"
                    onClick={handleCreateHere}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all hover:opacity-90 active:scale-95 shadow-2xs cursor-pointer"
                    style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Reflection Here</span>
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Side Drawer: Geotagged Reflections List & Sanctuary Presets */}
          <div
            id="map-reflections-drawer"
            className="w-full md:w-80 sm:md:w-88 border-t md:border-t-0 md:border-l flex flex-col shrink-0 overflow-hidden"
            style={{
              backgroundColor: currentTheme.bgSurface,
              borderColor: currentTheme.borderColor,
            }}
          >
            {/* Drawer Tabs / Sub-header */}
            <div
              className="p-3 border-b flex items-center justify-between text-xs font-semibold"
              style={{ borderColor: currentTheme.borderColor }}
            >
              <span>Geotagged Entries ({filteredEntries.length})</span>
              <span className="text-2xs font-normal" style={{ color: currentTheme.textMuted }}>
                Click to center
              </span>
            </div>

            {/* List of Geotagged Reflections */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => {
                  const isSelected = selectedEntry?.id === entry.id;
                  const pinConfig = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.General;

                  return (
                    <div
                      key={entry.id}
                      id={`map-entry-card-${entry.id}`}
                      onClick={() => handleFocusEntry(entry)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-xs ${
                        isSelected
                          ? 'ring-2 shadow-xs'
                          : 'hover:opacity-90'
                      }`}
                      style={{
                        borderColor: isSelected ? ACCENT_COLORS[accentColorId].hex : currentTheme.borderColor,
                        backgroundColor: isSelected
                          ? `${ACCENT_COLORS[accentColorId].hex}10`
                          : `${currentTheme.bgSurface}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: pinConfig.bg }}
                          />
                          <span className="text-2xs font-semibold truncate" style={{ color: pinConfig.bg }}>
                            {entry.category}
                          </span>
                        </div>
                        {entry.mood && (
                          <span className="text-2xs opacity-80 shrink-0">
                            {entry.mood}
                          </span>
                        )}
                      </div>

                      <h4 className="font-semibold truncate mb-1" style={{ color: currentTheme.textMain }}>
                        {entry.title}
                      </h4>

                      <div className="flex items-center gap-1 text-2xs truncate" style={{ color: currentTheme.textMuted }}>
                        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{entry.location.name}</span>
                      </div>

                      <div className="mt-2 pt-2 border-t flex items-center justify-between text-2xs" style={{ borderColor: currentTheme.borderColor }}>
                        <span style={{ color: currentTheme.textMuted }}>
                          {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntry(entry);
                            onClose();
                          }}
                          className="font-medium hover:underline inline-flex items-center gap-0.5"
                          style={{ color: ACCENT_COLORS[accentColorId].hex }}
                        >
                          <span>Open</span>
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center px-4">
                  <div
                    className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 mb-2"
                  >
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-semibold mb-1">No Pinned Spots Found</h4>
                  <p className="text-2xs leading-relaxed mb-4" style={{ color: currentTheme.textMuted }}>
                    {searchQuery
                      ? 'No geotagged reflections match your query.'
                      : 'Pin your physical sanctuary to any reflection from the workspace toolbar.'}
                  </p>
                </div>
              )}

              {/* Inspiration Reflection Sanctuaries */}
              <div className="pt-2">
                <div className="text-2xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: currentTheme.textMuted }}>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Inspiration Sanctuaries</span>
                </div>
                <div className="space-y-1.5">
                  {SANCTUARY_PRESETS.map((spot) => (
                    <button
                      key={spot.name}
                      type="button"
                      onClick={() => handleSelectPreset(spot)}
                      className="w-full text-left p-2 rounded-lg border text-2xs hover:opacity-85 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      style={{
                        borderColor: currentTheme.borderColor,
                        backgroundColor: `${currentTheme.bgSurface}`,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{spot.name}</div>
                        <div className="text-3xs truncate opacity-70" style={{ color: currentTheme.textMuted }}>
                          {spot.formattedAddress}
                        </div>
                      </div>
                      <LocateFixed className="w-3 h-3 shrink-0 text-emerald-500" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div
          id="reflections-map-footer"
          className="px-4 sm:px-6 py-2.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-2xs"
          style={{
            borderColor: currentTheme.borderColor,
            backgroundColor: `${currentTheme.bgSurface}f5`,
            color: currentTheme.textMuted,
          }}
        >
          <div className="flex items-center gap-2">
            <span>Powered by Google Maps Platform (@vis.gl/react-google-maps)</span>
            <span>•</span>
            <a
              href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noreferrer"
              className="hover:underline text-emerald-600 dark:text-emerald-400"
            >
              Terms of Service
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="close-map-footer-button"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium rounded-xl border hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              style={{ borderColor: currentTheme.borderColor, color: currentTheme.textMain }}
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
