import type { Metadata } from 'next';
import ImageClient from './ImageClient';

export const metadata: Metadata = {
  title: 'Photo Batch',
  description:
    'Batch-analyze up to 12 photos at once — every face detected, read across seven emotions, and annotated with downloadable results. Runs fully on-device.',
};

export default function ImagePage() {
  return <ImageClient />;
}
