import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Film,
  Search,
  Check,
  Sparkles,
  Link,
  Camera,
  AlertCircle,
} from 'lucide-react';
import { MediaAttachment } from '../types';
import { useTheme, ACCENT_COLORS } from '../theme/ThemeContext';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (media: MediaAttachment) => void;
  mode?: 'all' | 'photo' | 'gif';
}

// Curated contemplative, mindfulness, nature, and emotional GIFs
const CURATED_GIFS: Array<{
  id: string;
  category: string;
  title: string;
  url: string;
  tags: string[];
}> = [
  {
    id: 'gif-calm-1',
    category: 'Calm & Serenity',
    title: 'Gentle Ocean Waves',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    tags: ['calm', 'ocean', 'waves', 'peace', 'water', 'nature'],
  },
  {
    id: 'gif-calm-2',
    category: 'Calm & Serenity',
    title: 'Misty Bamboo Forest',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&auto=format&fit=crop&q=80',
    tags: ['zen', 'forest', 'calm', 'bamboo', 'green', 'peace'],
  },
  {
    id: 'gif-calm-3',
    category: 'Calm & Serenity',
    title: 'Steaming Warm Tea',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    tags: ['tea', 'cozy', 'warm', 'morning', 'mindful', 'calm'],
  },
  {
    id: 'gif-focus-1',
    category: 'Deep Focus & Flow',
    title: 'Rain on Window',
    url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop&q=80',
    tags: ['rain', 'focus', 'cozy', 'storm', 'study', 'reflection'],
  },
  {
    id: 'gif-focus-2',
    category: 'Deep Focus & Flow',
    title: 'Old Library Reading',
    url: 'https://images.unsplash.com/photo-1507842229451-2a9448834991?w=800&auto=format&fit=crop&q=80',
    tags: ['books', 'focus', 'wisdom', 'reading', 'study', 'flow'],
  },
  {
    id: 'gif-focus-3',
    category: 'Deep Focus & Flow',
    title: 'Cosmic Night Sky',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
    tags: ['stars', 'cosmos', 'night', 'sky', 'universe', 'wonder'],
  },
  {
    id: 'gif-joy-1',
    category: 'Joy & Celebration',
    title: 'Golden Sunrise Mountain',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
    tags: ['sunrise', 'mountain', 'golden', 'joy', 'hope', 'new day'],
  },
  {
    id: 'gif-joy-2',
    category: 'Joy & Celebration',
    title: 'Spring Flowers in Bloom',
    url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&auto=format&fit=crop&q=80',
    tags: ['flowers', 'bloom', 'spring', 'joy', 'nature', 'bright'],
  },
  {
    id: 'gif-spark-1',
    category: 'Eureka & Sparks',
    title: 'Warm Campfire Embers',
    url: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=800&auto=format&fit=crop&q=80',
    tags: ['fire', 'flame', 'embers', 'sparks', 'warmth', 'energy'],
  },
  {
    id: 'gif-spark-2',
    category: 'Eureka & Sparks',
    title: 'Solitary Desert Road',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&auto=format&fit=crop&q=80',
    tags: ['journey', 'road', 'horizon', 'clarity', 'direction', 'path'],
  },
];

const GIF_CATEGORIES = ['All', 'Calm & Serenity', 'Deep Focus & Flow', 'Joy & Celebration', 'Eureka & Sparks'];

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  mode = 'all',
}) => {
  const { currentTheme, accentColorId } = useTheme();
  const [activeTab, setActiveTab] = useState<'upload' | 'gif' | 'url'>(
    mode === 'gif' ? 'gif' : 'upload'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [urlInput, setUrlInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process image file to base64 with auto-compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WEBP, GIF).');
      return;
    }

    // Size limit check (10MB maximum)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds 10MB limit.');
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;

        // Auto-scale in canvas if dimension exceeds 1280px for optimal speed and memory
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedBase64 = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);

            const media: MediaAttachment = {
              id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              type: file.type.includes('gif') ? 'gif' : 'photo',
              url: optimizedBase64,
              base64: optimizedBase64,
              mimeType: file.type,
              title: file.name,
              caption: captionInput.trim() || undefined,
              source: 'upload',
              dimensions: { width, height },
            };

            onSelectMedia(media);
            onClose();
          } else {
            // Fallback to original
            const media: MediaAttachment = {
              id: `media-${Date.now()}`,
              type: file.type.includes('gif') ? 'gif' : 'photo',
              url: base64Data,
              base64: base64Data,
              mimeType: file.type,
              title: file.name,
              caption: captionInput.trim() || undefined,
              source: 'upload',
            };
            onSelectMedia(media);
            onClose();
          }
          setIsProcessing(false);
        };
        img.onerror = () => {
          setIsProcessing(false);
          setErrorMessage('Failed to decode image file.');
        };
        img.src = base64Data;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Image processing error:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'Failed to process image.');
    }
  };

  // Select Curated GIF
  const handleSelectCuratedGif = (gif: typeof CURATED_GIFS[0]) => {
    const media: MediaAttachment = {
      id: `gif-${Date.now()}-${gif.id}`,
      type: 'gif',
      url: gif.url,
      title: gif.title,
      caption: captionInput.trim() || gif.title,
      source: 'giphy',
    };
    onSelectMedia(media);
    onClose();
  };

  // Submit Direct URL
  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setErrorMessage('Please enter a valid web URL starting with https://');
      return;
    }

    const isGif = url.toLowerCase().includes('.gif');
    const media: MediaAttachment = {
      id: `url-media-${Date.now()}`,
      type: isGif ? 'gif' : 'photo',
      url,
      title: captionInput.trim() || 'Linked Image',
      caption: captionInput.trim() || undefined,
      source: 'url',
    };

    onSelectMedia(media);
    onClose();
  };

  // Filter GIFs
  const filteredGifs = CURATED_GIFS.filter((gif) => {
    const matchesCategory = selectedCategory === 'All' || gif.category === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      gif.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gif.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  return (
    <div
      id="media-picker-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="media-picker-modal"
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        style={{
          backgroundColor: currentTheme.bgSurface,
          borderColor: currentTheme.borderColor,
          color: currentTheme.textMain,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: currentTheme.borderColor }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
              style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
            >
              {activeTab === 'gif' ? <Film className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Attach Photo or Emotion GIF</h3>
              <p className="text-[11px] opacity-75" style={{ color: currentTheme.textMuted }}>
                Add visual contemplation to your reflection for Gemini Multimodal Vision analysis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            style={{ borderColor: currentTheme.borderColor }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex border-b px-6 pt-3 gap-2 shrink-0 overflow-x-auto"
          style={{ borderColor: currentTheme.borderColor }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('upload');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'upload' ? 'border-amber-500 text-amber-600' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('gif');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'gif' ? 'border-amber-500 text-amber-600' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Emotion & Mood GIFs</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('url');
              setErrorMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'url' ? 'border-amber-500 text-amber-600' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Web Image URL</span>
          </button>
        </div>

        {/* Caption Field (Optional for all modes) */}
        <div className="px-6 pt-3 pb-1 shrink-0">
          <input
            type="text"
            placeholder="Optional caption or emotional context for this visual..."
            value={captionInput}
            onChange={(e) => setCaptionInput(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 transition-all"
            style={{
              backgroundColor: currentTheme.bgMain,
              borderColor: currentTheme.borderColor,
              color: currentTheme.textMain,
            }}
          />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 my-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: UPLOAD PHOTO */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-500/5 transition-all flex flex-col items-center justify-center gap-3"
                style={{ borderColor: currentTheme.borderColor }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: `${ACCENT_COLORS[accentColorId].hex}15`, color: ACCENT_COLORS[accentColorId].hex }}
                >
                  <Camera className="w-6 h-6" />
                </div>

                <div>
                  <p className="text-sm font-semibold">Click to select or drag and drop a photo</p>
                  <p className="text-xs opacity-75 mt-1" style={{ color: currentTheme.textMuted }}>
                    PNG, JPG, WEBP, or GIF up to 10MB
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                  style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
                >
                  {isProcessing ? 'Processing Image...' : 'Browse Device Files'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl border text-xs leading-relaxed opacity-85" style={{ borderColor: currentTheme.borderColor, backgroundColor: currentTheme.bgMain }}>
                <p className="font-semibold text-amber-600 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Gemini Multimodal Vision Analysis
                </p>
                When you attach a photo, Gemini can visually inspect the scene, detect mood and color psychology, and weave visual symbolism into your reflection.
              </div>
            </div>
          )}

          {/* TAB 2: GIF SEARCH & BROWSE */}
          {activeTab === 'gif' && (
            <div className="space-y-4">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search mood GIFs (e.g. calm, rain, ocean, stars, focus, joy)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 shadow-2xs"
                  style={{
                    backgroundColor: currentTheme.bgMain,
                    borderColor: currentTheme.borderColor,
                    color: currentTheme.textMain,
                  }}
                />
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {GIF_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-semibold shrink-0 border transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* GIF Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredGifs.map((gif) => (
                  <div
                    key={gif.id}
                    onClick={() => handleSelectCuratedGif(gif)}
                    className="group relative rounded-xl overflow-hidden border aspect-video cursor-pointer hover:shadow-md transition-all hover:scale-[1.02]"
                    style={{ borderColor: currentTheme.borderColor }}
                  >
                    <img
                      src={gif.url}
                      alt={gif.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2 opacity-90 group-hover:opacity-100">
                      <span className="text-[11px] font-medium text-white truncate drop-shadow-sm">
                        {gif.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {filteredGifs.length === 0 && (
                <div className="text-center py-8 text-xs opacity-75">
                  No GIFs found matching "{searchQuery}". Try searching for calm, rain, ocean, or joy.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WEB IMAGE URL */}
          {activeTab === 'url' && (
            <form onSubmit={handleSubmitUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Direct Image or GIF URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg or https://media.giphy.com/media/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1"
                  style={{
                    backgroundColor: currentTheme.bgMain,
                    borderColor: currentTheme.borderColor,
                    color: currentTheme.textMain,
                  }}
                  required
                />
              </div>

              {urlInput && (
                <div className="rounded-xl overflow-hidden border max-h-48 aspect-video flex items-center justify-center bg-black/10">
                  <img
                    src={urlInput}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain"
                    onError={() => setErrorMessage('Could not load image from this URL. Please verify the link.')}
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
                style={{ backgroundColor: ACCENT_COLORS[accentColorId].hex }}
              >
                Attach Image from URL
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-2xs opacity-75 shrink-0"
          style={{ borderColor: currentTheme.borderColor, color: currentTheme.textMuted }}
        >
          <span>Encrypted with AES-256-GCM in Web Worker Enclave</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border hover:bg-stone-100 transition-colors cursor-pointer"
            style={{ borderColor: currentTheme.borderColor }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
