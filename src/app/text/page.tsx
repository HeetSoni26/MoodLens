import type { Metadata } from 'next';
import TextClient from './TextClient';

export const metadata: Metadata = {
  title: 'Text Emotions',
  description:
    'Analyze the emotion behind any text with a DistilRoBERTa transformer running fully in your browser. Seven emotion classes, per-sentence breakdown, nothing uploaded.',
};

export default function TextPage() {
  return <TextClient />;
}
