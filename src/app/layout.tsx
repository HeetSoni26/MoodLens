import type { Metadata, Viewport } from 'next';
import { Outfit, Space_Grotesk } from 'next/font/google';
import AuroraBackground from '@/components/shell/AuroraBackground';
import AppShell from '@/components/shell/AppShell';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'MoodLens | Real-Time Emotion AI, 100% On-Device',
    template: '%s · MoodLens',
  },
  description:
    'MoodLens reads emotions from your face, words, photos and videos, running entirely in your browser. Live webcam detection, batch photo analysis, video emotion timelines, text & voice mood reading, and a session dashboard. Nothing ever leaves your device.',
  keywords: [
    'emotion detection',
    'facial emotion recognition',
    'mood detection',
    'emotion AI',
    'on-device AI',
    'webcam emotion',
    'text emotion analysis',
    'computer vision',
    'MoodLens',
    'Heet Soni',
  ],
  authors: [{ name: 'Heet Soni', url: 'https://heet-portfolio-two.vercel.app' }],
  creator: 'Heet Soni',
  metadataBase: new URL('https://mood-lens-rho.vercel.app'),
  openGraph: {
    title: 'MoodLens | Real-Time Emotion AI',
    description:
      'Reads emotions from faces, words, photos and videos, 100% in your browser. No uploads, no tracking, no accounts.',
    type: 'website',
    siteName: 'MoodLens',
    url: 'https://mood-lens-rho.vercel.app',
    images: [
      {
        url: '/og/og-cover.png',
        width: 1200,
        height: 630,
        alt: 'MoodLens | Real-Time Emotion AI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MoodLens | Real-Time Emotion AI',
    description: 'Face · Photo · Video · Text · Voice emotion AI running fully on-device.',
    images: ['/og/og-cover.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#04050d',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AuroraBackground />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
