import type { Metadata } from 'next';
import VideoClient from './VideoClient';

export const metadata: Metadata = {
  title: 'Video Analysis',
  description:
    'Upload a video and chart its emotional arc — frame-by-frame face emotion scanning with a synced heat strip and timeline, all processed on your device.',
};

export default function VideoPage() {
  return <VideoClient />;
}
