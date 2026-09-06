import { UpliftingVideo } from '../types';

export const FUNNY_VIDEOS: UpliftingVideo[] = [
  {
    id: 'baby-laughter-pure-joy',
    title: 'Pure Contagious Baby Giggles',
    description: 'A little baby bursting into uncontrollable giggles while playing peek-a-boo. Guaranteed to make you smile and release tension.',
    category: 'laughter',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/RP4abiHdQpc?autoplay=1&rel=0',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&auto=format&fit=crop&q=80',
    duration: '1:12',
    soundtrack: 'Pure Joyful Giggles',
    quote: 'Laughter is an instant vacation for the nervous system.',
  },
  {
    id: 'goofy-puppy-slip-n-slide',
    title: 'Goofy Puppy Slipping and Doing Happy Rolls',
    description: 'An enthusiastic golden retriever puppy discovering a slippery floor and joyfully sliding like a goofy penguin.',
    category: 'animals',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/5dsGWM5XGdg?autoplay=1&rel=0',
    thumbnailUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
    duration: '1:45',
    soundtrack: 'Playful Whistles',
    quote: 'Pets show us that making a silly mistake is just another reason to wag your tail.',
  },
  {
    id: 'laughing-kookaburra-chorus',
    title: 'The Laughing Kookaburra Symphony',
    description: "Nature's greatest comedian: a kookaburra letting out a hearty, infectious belly laugh that sounds like an old friend having the best day ever.",
    category: 'nature',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/Tqi77vdcsbQ?autoplay=1&rel=0',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=600&auto=format&fit=crop&q=80',
    duration: '0:58',
    soundtrack: 'Wild Forest Chuckles',
    quote: 'Even the birds remember to throw their heads back and laugh at the sky.',
  },
  {
    id: 'clumsy-baby-panda-somersault',
    title: 'Clumsy Baby Panda Rolling Down Grass',
    description: 'A round, fluffy baby panda attempting to walk gracefully, only to turn into a rolling fluffball of pure cuteness and tumble safely into a pile of leaves.',
    category: 'animals',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/hFZFjoX2cGg?autoplay=1&rel=0',
    thumbnailUrl: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef6?w=600&auto=format&fit=crop&q=80',
    duration: '1:30',
    soundtrack: 'Bouncy Marimba',
    quote: 'It does not matter how many times you tumble, as long as you make it look adorable.',
  },
  {
    id: 'silly-sea-otter-belly-drum',
    title: 'Silly Sea Otters Juggling and Drumming',
    description: 'Joyful sea otters floating on their backs, excitedly juggling shiny pebbles and drumming on their bellies in triumph.',
    category: 'animals',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/c0bva0dF7eU?autoplay=1&rel=0',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=600&auto=format&fit=crop&q=80',
    duration: '1:15',
    soundtrack: 'Gentle Ocean Splashes',
    quote: 'Stay buoyant and keep your favorite pebble close to your heart.',
  },
  {
    id: 'wholesome-comedy-bunny-prank',
    title: 'Hilarious Bunny Prank & Flying Berries',
    description: 'A classic lighthearted animated chuckle: a clever bunny outsmarting a clumsy flying squirrel with unexpected comic timing.',
    category: 'comedy',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/wT3RhNY75k4?autoplay=1&rel=0',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&auto=format&fit=crop&q=80',
    duration: '2:10',
    soundtrack: 'Classic Orchestral Slapstick',
    quote: 'A good chuckle rewires the brain from tension to spacious ease.',
  },
  {
    id: 'contagious-laughter-flashmob',
    title: 'The Subway Contagious Laughter Experiment',
    description: 'A stranger on a quiet train starts chuckling at a funny video on his phone, and within 30 seconds the entire train car is laughing out loud together.',
    category: 'laughter',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/qg_wP9o-d8M?autoplay=1&rel=0',
    thumbnailUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80',
    duration: '1:50',
    soundtrack: 'Heartwarming Collective Chuckles',
    quote: 'You are never alone. Laughter is the shortest distance between two humans.',
  },
];

export const getRandomFunnyVideo = (excludeId?: string): UpliftingVideo => {
  const pool = excludeId ? FUNNY_VIDEOS.filter((v) => v.id !== excludeId) : FUNNY_VIDEOS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] || FUNNY_VIDEOS[0];
};

export const getFunnyVideoByCategory = (category: string): UpliftingVideo => {
  const filtered = FUNNY_VIDEOS.filter((v) => v.category === category);
  if (filtered.length === 0) return getRandomFunnyVideo();
  return filtered[Math.floor(Math.random() * filtered.length)];
};
