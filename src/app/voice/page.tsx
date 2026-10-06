import type { Metadata } from 'next';
import VoiceClient from './VoiceClient';

export const metadata: Metadata = {
  title: 'Voice Fusion',
  description:
    'Speak and MoodLens reads the emotion in your words with a transformer model — optionally comparing them with your facial expressions in real time. On-device only.',
};

export default function VoicePage() {
  return <VoiceClient />;
}
