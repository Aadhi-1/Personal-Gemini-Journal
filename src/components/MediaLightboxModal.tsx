import React from 'react';
import { X, Download, ExternalLink, Trash2 } from 'lucide-react';
import { MediaAttachment } from '../types';

interface MediaLightboxModalProps {
  media: MediaAttachment | null;
  onClose: () => void;
  onRemove?: (id: string) => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  media,
  onClose,
  onRemove,
}) => {
  if (!media) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = media.url;
    a.download = media.title || `reflection-media-${media.id}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      id="media-lightbox-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between pb-3 text-white text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold">{media.title || (media.type === 'gif' ? 'Emotion GIF' : 'Photo')}</span>
            {media.caption && (
              <span className="opacity-75 italic truncate max-w-xs sm:max-w-md">"{media.caption}"</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>

            {onRemove && (
              <button
                type="button"
                onClick={() => {
                  onRemove(media.id);
                  onClose();
                }}
                className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white cursor-pointer"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Media Container */}
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[80vh] flex items-center justify-center bg-black">
          <img
            src={media.url}
            alt={media.title || 'Attached Media'}
            referrerPolicy="no-referrer"
            className="max-h-[80vh] max-w-full object-contain"
          />
        </div>

        {/* Caption below */}
        {media.caption && (
          <p className="text-stone-300 text-xs text-center mt-3 max-w-lg px-4 bg-black/40 py-1.5 rounded-full backdrop-blur-xs">
            {media.caption}
          </p>
        )}
      </div>
    </div>
  );
};
