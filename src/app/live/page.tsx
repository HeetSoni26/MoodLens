import type { Metadata } from 'next';
import LiveClient from './LiveClient';

export const metadata: Metadata = {
  title: 'Live Detection',
  description:
    'Real-time webcam emotion recognition in your browser — multi-face tracking, seven emotion classes, live probability bars and session recording. 100% on-device.',
};

export default function LivePage() {
  return <LiveClient />;
}
