import React, { useState } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCw, Heart, Sparkles, Film, ExternalLink, Check } from 'lucide-react';
import { UpliftingVideo } from '../types';
import { FUNNY_VIDEOS, getRandomFunnyVideo } from '../data/funnyVideos';

interface FunnyVideoPlayerProps {
  initialVideo?: UpliftingVideo;
  onClose?: () => void;
  inline?: boolean;
}

export const FunnyVideoPlayer: React.FC<FunnyVideoPlayerProps> = ({
  initialVideo,
  inline = false,
}) => {
  const [currentVideo, setCurrentVideo] = useState<UpliftingVideo>(
    initialVideo || getRandomFunnyVideo()
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasEasedMood, setHasEasedMood] = useState(false);
  const [showDirectVideo, setShowDirectVideo] = useState(false);

  const handleNextVideo = () => {
    const next = getRandomFunnyVideo(currentVideo.id);
    setCurrentVideo(next);
    setIsPlaying(false);
    setHasEasedMood(false);
    setShowDirectVideo(false);
  };

  const handleSelectCategory = (category: string) => {
    const pool = FUNNY_VIDEOS.filter((v) => v.category === category);
    if (pool.length > 0) {
      const selected = pool[Math.floor(Math.random() * pool.length)];
      setCurrentVideo(selected);
      setIsPlaying(false);
      setHasEasedMood(false);
    }
  };

  return (
    <div
      id={`funny-video-card-${currentVideo.id}`}
      className={`rounded-2xl border transition-all overflow-hidden ${
        inline
          ? 'bg-amber-50/70 border-amber-200/90 shadow-sm my-3'
          : 'bg-white border-stone-200 shadow-md'
      }`}
    >
      {/* Header Banner */}
      <div className="px-4 py-2.5 bg-linear-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 border-b border-amber-200/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs shrink-0 shadow-2xs font-bold">
            😂
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-amber-950 truncate">
              {currentVideo.title}
            </h4>
            <p className="text-[10px] text-amber-800/80 font-medium truncate">
              Mood Easing & Contagious Laughter • {currentVideo.duration}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleNextVideo}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-900 bg-white/80 hover:bg-white border border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Watch another funny laughing video"
          >
            <RotateCw className="w-3 h-3 text-amber-600" />
            <span>Next Laugh</span>
          </button>
        </div>
      </div>

      {/* Video Display Container */}
      <div className="relative aspect-video w-full bg-stone-950 flex items-center justify-center overflow-hidden">
        {currentVideo.embedUrl && !showDirectVideo ? (
          <iframe
            src={currentVideo.embedUrl}
            title={currentVideo.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="no-referrer"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              src={currentVideo.videoUrl}
              poster={currentVideo.thumbnailUrl}
              controls
              autoPlay={isPlaying}
              muted={isMuted}
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Video Metadata & Interactive Mood Bar */}
      <div className="p-3.5 space-y-2.5">
        <p className="text-xs text-stone-700 leading-relaxed">
          {currentVideo.description}
        </p>

        {currentVideo.quote && (
          <div className="flex items-start gap-1.5 text-[11px] italic text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200/60">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
            <span>"{currentVideo.quote}"</span>
          </div>
        )}

        {/* Category Pills & Interactive Feedback Button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
          <div className="flex items-center gap-1 flex-wrap text-[10px]">
            <span className="font-semibold text-stone-500 mr-1">Categories:</span>
            <button
              type="button"
              onClick={() => handleSelectCategory('animals')}
              className={`px-2 py-0.5 rounded-full border font-medium transition-colors cursor-pointer ${
                currentVideo.category === 'animals'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              🐾 Silly Animals
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory('laughter')}
              className={`px-2 py-0.5 rounded-full border font-medium transition-colors cursor-pointer ${
                currentVideo.category === 'laughter'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              👶 Contagious Laughter
            </button>
            <button
              type="button"
              onClick={() => handleSelectCategory('comedy')}
              className={`px-2 py-0.5 rounded-full border font-medium transition-colors cursor-pointer ${
                currentVideo.category === 'comedy'
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
              }`}
            >
              🎭 Wholesome Comedy
            </button>
          </div>

          <button
            type="button"
            onClick={() => setHasEasedMood(!hasEasedMood)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs ${
              hasEasedMood
                ? 'bg-emerald-600 text-white shadow-emerald-200'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
            }`}
          >
            {hasEasedMood ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Mood Eased! 😊</span>
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Made Me Smile</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
