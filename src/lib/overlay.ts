import { EMOTIONS, dominantEmotion } from './emotions';
import type { DetectedFace } from './vision';

/* Overlay geometry: media is displayed with object-cover (scale to fill the
   box, cropping the overflow), while detection runs on the raw frame. These
   helpers map raw-frame coordinates into canvas pixel space so boxes sit
   exactly on the faces. */

export interface CoverTransform {
  scale: number;
  offX: number;
  offY: number;
}

export function coverTransform(boxW: number, boxH: number, srcW: number, srcH: number): CoverTransform {
  const scale = Math.max(boxW / srcW, boxH / srcH);
  return {
    scale,
    offX: (boxW - srcW * scale) / 2,
    offY: (boxH - srcH * scale) / 2,
  };
}

/** Prepare a canvas buffer for its displayed size (DPR-aware) and return the
    cover transform from raw media coordinates to canvas pixels. */
export function prepareCanvas(
  canvas: HTMLCanvasElement,
  srcW: number,
  srcH: number,
): { pw: number; ph: number; t: CoverTransform; dpr: number } | null {
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (cw === 0 || ch === 0 || srcW === 0 || srcH === 0) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.round(cw * dpr);
  const ph = Math.round(ch * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  return { pw, ph, t: coverTransform(pw, ph, srcW, srcH), dpr };
}

/** Map a raw-frame face box into canvas pixels, mirroring horizontally when
   the media is displayed mirrored (webcam self-view). */
export function mapFaceBox(
  face: DetectedFace,
  pw: number,
  t: CoverTransform,
  mirrored: boolean,
): { x: number; y: number; width: number; height: number } {
  let x = t.offX + face.box.x * t.scale;
  const y = t.offY + face.box.y * t.scale;
  const width = face.box.width * t.scale;
  const height = face.box.height * t.scale;
  if (mirrored) x = pw - x - width;
  return { x, y, width, height };
}

/** Draw the MoodLens glow box + corner accents + label chip for one face. */
export function drawFaceBox(
  ctx: CanvasRenderingContext2D,
  face: DetectedFace,
  box: { x: number; y: number; width: number; height: number },
  dpr: number,
  opts: { label?: boolean } = {},
) {
  const top = dominantEmotion(face.scores);
  const meta = EMOTIONS[top];
  const { x, y, width, height } = box;
  const r = 14 * dpr;

  ctx.save();
  ctx.strokeStyle = meta.color;
  ctx.lineWidth = 2.5 * dpr;
  ctx.shadowColor = `${meta.color}aa`;
  ctx.shadowBlur = 16 * dpr;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, r);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = meta.color;
  ctx.lineWidth = 3.5 * dpr;
  ctx.lineCap = 'round';
  const c = Math.min(22 * dpr, width / 3, height / 3);
  ctx.beginPath();
  ctx.moveTo(x, y + c); ctx.lineTo(x, y + r * 0.4); ctx.quadraticCurveTo(x, y, x + r * 0.4, y); ctx.lineTo(x + c, y);
  ctx.moveTo(x + width - c, y); ctx.lineTo(x + width - r * 0.4, y); ctx.quadraticCurveTo(x + width, y, x + width, y + r * 0.4); ctx.lineTo(x + width, y + c);
  ctx.moveTo(x + width, y + height - c); ctx.lineTo(x + width, y + height - r * 0.4); ctx.quadraticCurveTo(x + width, y + height, x + width - r * 0.4, y + height); ctx.lineTo(x + width - c, y + height);
  ctx.moveTo(x + c, y + height); ctx.lineTo(x + r * 0.4, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - r * 0.4); ctx.lineTo(x, y + height - c);
  ctx.stroke();
  ctx.restore();

  if (opts.label !== false) {
    const label = `${meta.emoji} ${meta.label} ${Math.round(face.scores[top] * 100)}%`;
    ctx.font = `600 ${12 * dpr}px Outfit, ui-sans-serif, system-ui, sans-serif`;
    const padX = 9 * dpr;
    const textW = ctx.measureText(label).width;
    const chipW = textW + padX * 2;
    const chipH = 24 * dpr;
    const chipY = Math.max(0, y - chipH - 7 * dpr);
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 18, 0.82)';
    ctx.strokeStyle = `${meta.color}88`;
    ctx.lineWidth = 1 * dpr;
    ctx.beginPath();
    ctx.roundRect(x, chipY, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = meta.color;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + padX, chipY + chipH / 2 + 0.5 * dpr);
    ctx.restore();
  }
}
