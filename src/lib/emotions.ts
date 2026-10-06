export type EmotionKey =
  | 'happy'
  | 'neutral'
  | 'sad'
  | 'angry'
  | 'fear'
  | 'disgust'
  | 'surprise';

export interface EmotionMeta {
  key: EmotionKey;
  label: string;
  emoji: string;
  color: string;
}

export const EMOTION_ORDER: EmotionKey[] = [
  'happy',
  'neutral',
  'sad',
  'angry',
  'fear',
  'disgust',
  'surprise',
];

export const EMOTIONS: Record<EmotionKey, EmotionMeta> = {
  happy: { key: 'happy', label: 'Happy', emoji: '😊', color: '#34d399' },
  neutral: { key: 'neutral', label: 'Neutral', emoji: '😐', color: '#94a3b8' },
  sad: { key: 'sad', label: 'Sad', emoji: '😢', color: '#60a5fa' },
  angry: { key: 'angry', label: 'Angry', emoji: '😠', color: '#f87171' },
  fear: { key: 'fear', label: 'Fear', emoji: '😨', color: '#c084fc' },
  disgust: { key: 'disgust', label: 'Disgust', emoji: '🤢', color: '#fbbf24' },
  surprise: { key: 'surprise', label: 'Surprise', emoji: '😲', color: '#f472b6' },
};

/** face-api.js expression keys → MoodLens emotion keys */
export const FACE_EXPRESSION_MAP: Record<string, EmotionKey> = {
  happy: 'happy',
  neutral: 'neutral',
  sad: 'sad',
  angry: 'angry',
  fearful: 'fear',
  disgusted: 'disgust',
  surprised: 'surprise',
};

/** text model (emotion-english-distilroberta-base) labels → MoodLens emotion keys */
export const TEXT_LABEL_MAP: Record<string, EmotionKey> = {
  joy: 'happy',
  happiness: 'happy',
  love: 'happy',
  neutral: 'neutral',
  sadness: 'sad',
  anger: 'angry',
  fear: 'fear',
  disgust: 'disgust',
  surprise: 'surprise',
};

export type EmotionScores = Record<EmotionKey, number>;

export function emptyScores(): EmotionScores {
  return { happy: 0, neutral: 0, sad: 0, angry: 0, fear: 0, disgust: 0, surprise: 0 };
}

export function dominantEmotion(scores: EmotionScores): EmotionKey {
  let best: EmotionKey = 'neutral';
  let bestVal = -1;
  for (const key of EMOTION_ORDER) {
    if (scores[key] > bestVal) {
      bestVal = scores[key];
      best = key;
    }
  }
  return best;
}

export function sortedScores(scores: EmotionScores): { key: EmotionKey; value: number }[] {
  return EMOTION_ORDER.map((key) => ({ key, value: scores[key] })).sort(
    (a, b) => b.value - a.value,
  );
}

export function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
