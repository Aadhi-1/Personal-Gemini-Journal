import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Search,
  Crosshair,
  X,
  Check,
  Compass,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { JournalLocation } from '../types';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: JournalLocation | null;
  onSelectLocation: (location: JournalLocation) => void;
}

const PRESET_PLACES: JournalLocation[] = [
  {
    name: 'Singapore Botanic Gardens',
    formattedAddress: '1 Cluny Rd, Singapore 259569',
    lat: 1.3138,
    lng: 103.8159,
  },
  {
    name: 'Central Park',
    formattedAddress: 'New York, NY 10022, United States',
    lat: 40.785091,
    lng: -73.968285,
  },
  {
    name: 'Shinjuku Gyoen National Garden',
    formattedAddress: '11 Naitomachi, Shinjuku City, Tokyo 160-0014, Japan',
    lat: 35.6852,
    lng: 139.7101,
  },
  {
    name: 'Hyde Park',
    formattedAddress: 'London W2 2UH, United Kingdom',
    lat: 51.507268,
    lng: -0.16573,
  },
  {
    name: 'Kyoto Arashiyama Bamboo Grove',
    formattedAddress: 'Ukyo Ward, Kyoto 616-8385, Japan',
    lat: 35.0169,
    lng: 135.6713,
  },
  {
    name: 'Lake Louise',
    formattedAddress: 'Banff National Park, Alberta, Canada',
    lat: 51.4254,
    lng: -116.1773,
  },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
}) => {
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [selectedLat, setSelectedLat] = useState<number>(
    currentLocation?.lat || 1.3521
  );
  const [selectedLng, setSelectedLng] = useState<number>(
    currentLocation?.lng || 103.8198
  );
  const [locationName, setLocationName] = useState<string>(
    currentLocation?.name || ''
  );
  const [formattedAddress, setFormattedAddress] = useState<string>(
    currentLocation?.formattedAddress || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fetch backend Google Maps key if not present in client bundle
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
          console.warn('Could not fetch maps config:', err);
        });
    }
  }, [apiKey]);

  // Sync initial state when modal opens with existing location
  useEffect(() => {
    if (isOpen) {
      if (currentLocation) {
        setSelectedLat(currentLocation.lat);
        setSelectedLng(currentLocation.lng);
        setLocationName(currentLocation.name);
        setFormattedAddress(currentLocation.formattedAddress || '');
      } else {
        setLocationName('');
        setFormattedAddress('');
      }
      setStatusMessage(null);
    }
  }, [isOpen, currentLocation]);

  // Reverse geocode when coordinates change
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `/api/maps/geocode?lat=${lat}&lng=${lng}`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const firstResult = data.results[0];
          setFormattedAddress(firstResult.formatted_address || '');
          if (!locationName) {
            // Suggest a concise name from address components
            const locality =
              firstResult.address_components?.find((c: any) =>
                c.types.includes('locality') || c.types.includes('sublocality')
              )?.long_name ||
              firstResult.address_components?.[0]?.long_name ||
              'Pinned Location';
            setLocationName(locality);
          }
        }
      } catch (err) {
        console.warn('Reverse geocoding failed:', err);
      }
    },
    [locationName]
  );

  // Handle Map Click to Pin Location
  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      const lat = e.detail.latLng.lat;
      const lng = e.detail.latLng.lng;
      setSelectedLat(lat);
      setSelectedLng(lng);
      reverseGeocode(lat, lng);
    }
  };

  // Handle Search submit (Geocoding search query)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setStatusMessage(null);

    try {
      const res = await fetch(
        `/api/maps/geocode?address=${encodeURIComponent(query)}`
      );
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const best = data.results[0];
        const { lat, lng } = best.geometry.location;
        setSelectedLat(lat);
        setSelectedLng(lng);
        setFormattedAddress(best.formatted_address);
        setLocationName(query);
        setStatusMessage(`Found: ${best.formatted_address}`);
      } else {
        setStatusMessage('No location found for this query. Try a different place name.');
      }
    } catch (err) {
      setStatusMessage('Search request failed. Please check network connectivity.');
    } finally {
      setIsSearching(false);
    }
  };

  // Use Browser Geolocation
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setStatusMessage('Acquiring your current coordinates...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLat(lat);
        setSelectedLng(lng);
        setLocationName('Current Location');
        reverseGeocode(lat, lng);
        setIsLocating(false);
        setStatusMessage('Located current position.');
      },
      (err) => {
        setIsLocating(false);
        setStatusMessage(
          `Unable to retrieve location: ${err.message || 'Permission denied'}`
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Select Preset
  const handleSelectPreset = (preset: JournalLocation) => {
    setSelectedLat(preset.lat);
    setSelectedLng(preset.lng);
    setLocationName(preset.name);
    setFormattedAddress(preset.formattedAddress || '');
    setStatusMessage(`Selected ${preset.name}`);
  };

  // Save location to entry
  const handleConfirm = () => {
    const finalName = locationName.trim() || formattedAddress || 'Pinned Location';
    onSelectLocation({
      name: finalName,
      formattedAddress: formattedAddress.trim() || undefined,
      lat: Number(selectedLat.toFixed(6)),
      lng: Number(selectedLng.toFixed(6)),
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="location-picker-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <motion.div
        id="location-picker-modal-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]"
      >
        {/* Modal Header */}
        <div
          id="location-modal-header"
          className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                Pin Location to Reflection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ground your entry with geographical context via Google Maps
              </p>
            </div>
          </div>
          <button
            id="close-location-modal-button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1">
          {/* Search bar & Current Location */}
          <div className="flex flex-col sm:flex-row gap-2">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="location-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search place, city, or address..."
                className="w-full pl-9 pr-24 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              <button
                id="search-location-submit-button"
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
              </button>
            </form>

            <button
              id="locate-me-button"
              type="button"
              onClick={handleCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl transition-colors whitespace-nowrap"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Crosshair className="w-3.5 h-3.5" />
              )}
              <span>My Location</span>
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              id="location-status-banner"
              className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">{statusMessage}</span>
            </div>
          )}

          {/* Interactive Google Map View */}
          <div
            id="google-maps-container"
            className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-800"
          >
            {apiKey ? (
              <APIProvider apiKey={apiKey}>
                <Map
                  id="interactive-journal-map"
                  style={{ width: '100%', height: '100%' }}
                  defaultCenter={{ lat: selectedLat, lng: selectedLng }}
                  center={{ lat: selectedLat, lng: selectedLng }}
                  defaultZoom={13}
                  mapId="DEMO_MAP_ID"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  onClick={handleMapClick}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                >
                  <AdvancedMarker
                    position={{ lat: selectedLat, lng: selectedLng }}
                    title={locationName || 'Pinned Location'}
                  >
                    <Pin background="#059669" glyphColor="#ffffff" borderColor="#047857" />
                  </AdvancedMarker>
                </Map>
              </APIProvider>
            ) : (
              /* Fallback preview with coordinate indicator when no API key is yet configured */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-radial from-slate-50 to-slate-200 dark:from-slate-850 dark:to-slate-900">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <MapPin className="w-6 h-6 animate-bounce" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  Interactive Map Canvas
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-3">
                  Coordinates pinned at <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{selectedLat.toFixed(4)}, {selectedLng.toFixed(4)}</span>.
                  To load live Google Maps satellite & vector tiles, add your Google Maps API key to your environment.
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 rounded-lg hover:underline"
                  >
                    Get Free Maps Demo Key
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Coordinates Badge */}
            <div className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded-md bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 text-2xs font-mono shadow-xs backdrop-blur-xs border border-slate-200 dark:border-slate-700">
              {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Or pick a popular reflection spot:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PLACES.map((preset) => (
                <button
                  key={preset.name}
                  id={`preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2.5 py-1 text-2xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Location Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location Label / Place Name
              </label>
              <input
                id="location-name-input"
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Kyoto Bamboo Forest, Home Studio"
                className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Formatted Address (Optional)
              </label>
              <input
                id="location-address-input"
                type="text"
                value={formattedAddress}
                onChange={(e) => setFormattedAddress(e.target.value)}
                placeholder="Street address or city"
                className="w-full px-3 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          id="location-modal-footer"
          className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/50"
        >
          <div className="hidden sm:block text-2xs text-slate-500 dark:text-slate-400">
            Powered by Google Maps Platform
          </div>
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              id="cancel-location-pin-button"
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-location-pin-button"
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm<span className="hidden sm:inline"> Location Pin</span></span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
