'use client';

import { motion } from 'framer-motion';

/* Fixed aurora backdrop: three slowly drifting gradient blobs on deep ink.
   Pure transform/opacity animation — GPU friendly, no repaint. */
export default function AuroraBackground({ intensity = 1 }: { intensity?: number }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-ink-950" aria-hidden="true">
      <div
        className="absolute -top-[20%] -left-[15%] h-[55vmax] w-[55vmax] rounded-full animate-aurora-a"
        style={{
          background: `radial-gradient(circle at center, rgba(139, 92, 246, ${0.24 * intensity}) 0%, rgba(139, 92, 246, 0) 62%)`,
          filter: 'blur(46px)',
        }}
      />
      <div
        className="absolute top-[30%] -right-[18%] h-[50vmax] w-[50vmax] rounded-full animate-aurora-b"
        style={{
          background: `radial-gradient(circle at center, rgba(34, 211, 238, ${0.17 * intensity}) 0%, rgba(34, 211, 238, 0) 62%)`,
          filter: 'blur(52px)',
        }}
      />
      <div
        className="absolute -bottom-[25%] left-[20%] h-[48vmax] w-[48vmax] rounded-full animate-aurora-c"
        style={{
          background: `radial-gradient(circle at center, rgba(244, 63, 94, ${0.13 * intensity}) 0%, rgba(244, 63, 94, 0) 60%)`,
          filter: 'blur(56px)',
        }}
      />
      {/* subtle dot grid texture */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.35]">
        <defs>
          <pattern id="aurora-dots" width="34" height="34" patternUnits="userSpaceOnUse">
            <circle cx="1.4" cy="1.4" r="1.1" fill="rgba(255,255,255,0.05)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#aurora-dots)" />
      </svg>
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(4,5,13,0.72)_100%)]" />
      <motion.div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-aurora-violet/60 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />
    </div>
  );
}
