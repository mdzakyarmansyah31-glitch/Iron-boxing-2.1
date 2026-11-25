import * as THREE from 'three';
import { BeardStyle } from '../types/game';

function shiftHex(hex: string, amount: number): string {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, amount > 0 ? -0.04 : 0.05, amount);
  return `#${c.getHexString()}`;
}

function mixHex(hexA: string, hexB: string, t: number): string {
  const c = new THREE.Color(hexA).lerp(new THREE.Color(hexB), THREE.MathUtils.clamp(t, 0, 1));
  return `#${c.getHexString()}`;
}

export interface FaceTextureConfig {
  eyeSpreadNorm?: number; // ~0.34 default (sinA of eye center)
  browArch?: number; // -0.5 .. 1.0
  browThickness?: number; // 0.8 .. 1.3
  mouthWidthNorm?: number; // ~0.22 default
  lipFullness?: number; // 0.8 .. 1.3
  noseWidthNorm?: number; // ~0.16 default
}

export function createRingCanvasTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.7);
  bg.addColorStop(0, '#253042');
  bg.addColorStop(0.62, '#1a2232');
  bg.addColorStop(1, '#111722');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Fine woven canvas fabric grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Subtle stitched canvas panel seams & scuff patina
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.24)';
  ctx.lineWidth = 2;
  for (const offset of [size * 0.25, size * 0.5, size * 0.75]) {
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, size);
    ctx.stroke();
  }
  for (let i = 0; i < 420; i++) {
    const px = ((i * 197) % 860) + 82;
    const py = ((i * 313) % 860) + 82;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(10,14,22,0.06)';
    ctx.beginPath();
    ctx.ellipse(px, py, 8 + (i % 14), 3 + (i % 6), (i * 0.4) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(229, 169, 60, 0.48)';
  ctx.lineWidth = 8;
  ctx.strokeRect(56, 56, size - 112, size - 112);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 3;
  ctx.strokeRect(76, 76, size - 152, size - 152);

  ctx.fillStyle = 'rgba(185, 28, 28, 0.42)';
  ctx.beginPath();
  ctx.moveTo(56, 56);
  ctx.lineTo(210, 56);
  ctx.lineTo(56, 210);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(29, 78, 216, 0.42)';
  ctx.beginPath();
  ctx.moveTo(size - 56, size - 56);
  ctx.lineTo(size - 210, size - 56);
  ctx.lineTo(size - 56, size - 210);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.translate(size / 2, size / 2);

  ctx.strokeStyle = 'rgba(229, 169, 60, 0.56)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 178, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 152, 0, Math.PI * 2);
  ctx.stroke();

  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * 155, Math.sin(ang) * 155);
    ctx.lineTo(Math.cos(ang) * 174, Math.sin(ang) * 174);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(248, 250, 252, 0.28)';
  ctx.font = '800 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IRON RING', 0, -14);

  ctx.fillStyle = 'rgba(229, 169, 60, 0.38)';
  ctx.font = '700 22px sans-serif';
  ctx.fillText('WORLD CHAMPIONSHIP BOXING', 0, 32);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createApronTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const width = 1024;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#141b29');
  grad.addColorStop(0.5, '#0d121d');
  grad.addColorStop(1, '#070a10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle vertical vinyl tension folds
  for (let x = 24; x < width; x += 64) {
    const fold = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0)');
    fold.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    fold.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fold;
    ctx.fillRect(x - 10, 12, 20, height - 20);
  }

  ctx.fillStyle = '#e5a93c';
  ctx.fillRect(0, 0, width, 11);
  ctx.fillRect(0, height - 8, width, 8);

  // Flanking badge plates
  for (const bx of [118, width - 118]) {
    ctx.fillStyle = 'rgba(229, 169, 60, 0.14)';
    ctx.fillRect(bx - 78, height / 2 - 42, 156, 84);
    ctx.strokeStyle = 'rgba(229, 169, 60, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(bx - 78, height / 2 - 42, 156, 84);
    ctx.fillStyle = '#e5a93c';
    ctx.font = '800 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIVE PPV', bx, height / 2 - 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '700 15px sans-serif';
    ctx.fillText('TITLE BOUT', bx, height / 2 + 18);
  }

  ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.font = '800 62px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IRON RING FIGHT NIGHT', width / 2, height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

export function createArenaPosterTexture(
  variant: number,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 512;
  const h = 720;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const palettes = [
    { bgTop: '#24090f', bgBot: '#090b12', accent: '#ef4444', gold: '#fbbf24', tag: 'MAIN EVENT', titleA: 'DRAGO', titleB: 'VS REYES', sub: 'HEAVYWEIGHT WORLD TITLE' },
    { bgTop: '#0d1b38', bgBot: '#070a12', accent: '#38bdf8', gold: '#eab308', tag: 'CHAMPIONSHIP SERIES', titleA: 'IRON RING', titleB: 'UNDISPUTED', sub: 'LIVE CHAMPIONSHIP ARENA' },
    { bgTop: '#2b1808', bgBot: '#090b12', accent: '#f59e0b', gold: '#fde68a', tag: 'FRIDAY FIGHT NIGHT', titleA: 'KNOCKOUT', titleB: 'KINGS', sub: '12 ROUNDS • NO MERCY' },
    { bgTop: '#1c102b', bgBot: '#080910', accent: '#f43f5e', gold: '#e2e8f0', tag: 'WORLD FEDERATION', titleA: 'CHAMPIONS', titleB: 'LEGACY', sub: 'LAS VEGAS • TOKYO • LONDON' },
  ];
  const p = palettes[((variant % palettes.length) + palettes.length) % palettes.length];

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, p.bgTop);
  bg.addColorStop(0.55, '#111521');
  bg.addColorStop(1, p.bgBot);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Diagonal arena spotlight rays behind poster graphic
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(w * 0.12, 0);
  ctx.lineTo(w * 0.42, 0);
  ctx.lineTo(w * 0.78, h * 0.75);
  ctx.lineTo(w * 0.26, h * 0.75);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = p.gold;
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.moveTo(w * 0.62, 0);
  ctx.lineTo(w * 0.88, 0);
  ctx.lineTo(w * 0.45, h * 0.78);
  ctx.lineTo(w * 0.18, h * 0.78);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Outer border & top banner bar
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, w - 32, h - 32);

  ctx.fillStyle = p.accent;
  ctx.fillRect(34, 38, w - 68, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.tag, w / 2, 60);

  // Center championship emblem / silhouette artwork
  ctx.save();
  ctx.translate(w / 2, h * 0.44);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 128, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(8, 11, 18, 0.72)';
  ctx.beginPath();
  ctx.arc(0, 0, 118, 0, Math.PI * 2);
  ctx.fill();

  if (variant % 2 === 0) {
    // Facing fighter silhouettes
    for (const side of [-1, 1]) {
      ctx.fillStyle = side < 0 ? 'rgba(248, 250, 252, 0.85)' : p.accent;
      ctx.beginPath();
      ctx.ellipse(side * 46, -26, 26, 33, side * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(side * 16, 18);
      ctx.lineTo(side * 90, 12);
      ctx.lineTo(side * 96, 86);
      ctx.lineTo(side * 10, 86);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Championship belt star & gloves crest
    ctx.fillStyle = p.gold;
    ctx.beginPath();
    ctx.ellipse(0, 4, 88, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.ellipse(0, 4, 64, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.font = '900 30px sans-serif';
    ctx.fillText('CHAMP', 0, 6);
  }
  ctx.restore();

  // Main headline typography
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 62px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.titleA, w / 2, h * 0.71);

  ctx.fillStyle = p.gold;
  ctx.font = '900 54px sans-serif';
  ctx.fillText(p.titleB, w / 2, h * 0.79);

  ctx.fillStyle = 'rgba(226, 232, 240, 0.84)';
  ctx.font = '700 21px sans-serif';
  ctx.fillText(p.sub, w / 2, h * 0.88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createFasciaBannerTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#0b1020');
  grad.addColorStop(0.25, '#3b0a18');
  grad.addColorStop(0.5, '#111827');
  grad.addColorStop(0.75, '#0f2347');
  grad.addColorStop(1, '#0b1020');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#e5a93c';
  ctx.fillRect(0, 0, w, 6);
  ctx.fillRect(0, h - 6, w, 6);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IRON RING CHAMPIONSHIP   •   LIVE MAIN EVENT   •   PPV', w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createJumbotronTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.5, '#1e293b');
  bg.addColorStop(1, '#090d16');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, w * 0.5, 14);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(w * 0.5, 0, w * 0.5, 14);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, h - 10, w, 10);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IRON RING', w / 2, h * 0.42);

  ctx.fillStyle = '#eab308';
  ctx.font = '800 26px sans-serif';
  ctx.fillText('WORLD CHAMPIONSHIP ARENA', w / 2, h * 0.72);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createWalkoutSignTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#450a0a');
  grad.addColorStop(0.32, '#0f172a');
  grad.addColorStop(0.68, '#0f172a');
  grad.addColorStop(1, '#172554');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 66px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIGHTERS ENTRANCE', w / 2, h * 0.43);

  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 28px sans-serif';
  ctx.fillText('WALKOUT TUNNEL  •  EXIT TO LOCKER ROOMS', w / 2, h * 0.76);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createArenaFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0d111a';
  ctx.fillRect(0, 0, size, size);

  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const shade = ((x / step + y / step) % 2 === 0 ? 14 : 18);
      ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 10})`;
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }

  for (let i = 0; i < 1600; i++) {
    const px = (i * 97) % size;
    const py = (i * 151) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.16)';
    ctx.fillRect(px, py, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createLightBeamTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 245, 220, 0.85)');
  grad.addColorStop(0.25, 'rgba(255, 243, 214, 0.42)');
  grad.addColorStop(0.7, 'rgba(255, 243, 214, 0.14)');
  grad.addColorStop(1, 'rgba(255, 243, 214, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    8,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export interface AnatomicalTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

/**
 * Generates realistic UV-aligned torso skin albedo + anatomical muscle bump map
 * u = 0.5 is front center (+Z), v = 1 is top shoulders/collarbone, v = 0 is waist.
 */
export function createTorsoSkinTextures(
  baseSkinHex: string,
  maxAnisotropy: number,
): AnatomicalTextureSet {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  const shadowTone = shiftHex(baseSkinHex, -0.15);
  const deepCrease = shiftHex(baseSkinHex, -0.24);
  const highlightTone = shiftHex(baseSkinHex, 0.08);
  const warmFlush = shiftHex(baseSkinHex, -0.05);

  ctx.fillStyle = baseSkinHex;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const cx = size * 0.5;

  // Subtle collarbone & suprasternal notch shading (fades cleanly to baseSkinHex at top edge)
  ctx.strokeStyle = highlightTone;
  ctx.lineWidth = 4.5;
  ctx.globalAlpha = 0.26;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 14, size * 0.135);
    ctx.quadraticCurveTo(cx + side * 48, size * 0.125, cx + side * 82, size * 0.095);
    ctx.stroke();

    bCtx.strokeStyle = '#a8a8a8';
    bCtx.lineWidth = 5;
    bCtx.beginPath();
    bCtx.moveTo(cx + side * 14, size * 0.135);
    bCtx.quadraticCurveTo(cx + side * 48, size * 0.125, cx + side * 82, size * 0.095);
    bCtx.stroke();
  }
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = shadowTone;
  ctx.beginPath();
  ctx.ellipse(cx, size * 0.14, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Gentle upper-chest tone flush that blends back to baseSkinHex at top seam (y = 0)
  const chestShade = ctx.createLinearGradient(0, size * 0.02, 0, size * 0.48);
  chestShade.addColorStop(0, baseSkinHex);
  chestShade.addColorStop(0.26, warmFlush);
  chestShade.addColorStop(1, baseSkinHex);
  ctx.fillStyle = chestShade;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(size * 0.15, size * 0.02, size * 0.7, size * 0.46);
  ctx.globalAlpha = 1;

  // Pectorals & deltoid-pectoral separation lines
  for (const side of [-1, 1]) {
    const px = cx + side * 46;
    const py = size * 0.295;
    const pecGrad = ctx.createRadialGradient(px, py - 8, 6, px, py + 6, 48);
    pecGrad.addColorStop(0, highlightTone);
    pecGrad.addColorStop(0.68, baseSkinHex);
    pecGrad.addColorStop(1, shadowTone);
    ctx.fillStyle = pecGrad;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(px, py, 44, 34, side * -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Under-pectoral shadow crease
    ctx.strokeStyle = shadowTone;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.44;
    ctx.beginPath();
    ctx.arc(px, py + 4, 34, side > 0 ? 0.25 : 0.65, side > 0 ? 2.5 : 2.9);
    ctx.stroke();

    const bGrad = bCtx.createRadialGradient(px, py - 4, 4, px, py, 44);
    bGrad.addColorStop(0, '#cccccc');
    bGrad.addColorStop(0.85, '#929292');
    bGrad.addColorStop(1, '#646464');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.ellipse(px, py, 42, 32, 0, 0, Math.PI * 2);
    bCtx.fill();

    // Realistic muted areola detail
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = deepCrease;
    ctx.beginPath();
    ctx.arc(cx + side * 56, size * 0.335, 4.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Central sternum & linea alba shadow
  ctx.strokeStyle = shadowTone;
  ctx.lineWidth = 4.5;
  ctx.globalAlpha = 0.44;
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.21);
  ctx.lineTo(cx, size * 0.85);
  ctx.stroke();

  bCtx.strokeStyle = '#565656';
  bCtx.lineWidth = 5;
  bCtx.beginPath();
  bCtx.moveTo(cx, size * 0.21);
  bCtx.lineTo(cx, size * 0.85);
  bCtx.stroke();
  ctx.globalAlpha = 1;

  // Sculpted 6-Pack Abdominal Definition (3 rows x 2 columns)
  for (let row = 0; row < 3; row++) {
    const ay = size * (0.48 + row * 0.112);
    for (const side of [-1, 1]) {
      const ax = cx + side * 21;
      const abGrad = ctx.createRadialGradient(ax, ay - 3, 2, ax, ay, 24);
      abGrad.addColorStop(0, highlightTone);
      abGrad.addColorStop(0.68, baseSkinHex);
      abGrad.addColorStop(1, shadowTone);
      ctx.fillStyle = abGrad;
      ctx.globalAlpha = 0.48;
      ctx.beginPath();
      ctx.ellipse(ax, ay, 18.5, 16.5, 0, 0, Math.PI * 2);
      ctx.fill();

      const abBump = bCtx.createRadialGradient(ax, ay, 2, ax, ay, 22);
      abBump.addColorStop(0, '#c4c4c4');
      abBump.addColorStop(0.8, '#888888');
      abBump.addColorStop(1, '#585858');
      bCtx.fillStyle = abBump;
      bCtx.beginPath();
      bCtx.ellipse(ax, ay, 18, 16, 0, 0, Math.PI * 2);
      bCtx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // External obliques V-taper & Serratus rib contours
  ctx.strokeStyle = shadowTone;
  ctx.lineWidth = 3.2;
  ctx.globalAlpha = 0.34;
  for (const side of [-1, 1]) {
    for (let r = 0; r < 3; r++) {
      const ry = size * (0.44 + r * 0.062);
      ctx.beginPath();
      ctx.moveTo(cx + side * 52, ry);
      ctx.quadraticCurveTo(cx + side * 74, ry + 8, cx + side * 90, ry + 2);
      ctx.stroke();
    }
    // Lower oblique V-line
    ctx.beginPath();
    ctx.moveTo(cx + side * 66, size * 0.68);
    ctx.quadraticCurveTo(cx + side * 48, size * 0.84, cx + side * 26, size * 0.94);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Navel
  ctx.fillStyle = deepCrease;
  ctx.globalAlpha = 0.58;
  ctx.beginPath();
  ctx.ellipse(cx, size * 0.805, 3.0, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Spine groove & scapular shadow on back (u = 0 and u = 1)
  ctx.strokeStyle = shadowTone;
  ctx.lineWidth = 8;
  ctx.globalAlpha = 0.36;
  ctx.beginPath();
  ctx.moveTo(4, size * 0.14);
  ctx.lineTo(4, size * 0.88);
  ctx.moveTo(size - 4, size * 0.14);
  ctx.lineTo(size - 4, size * 0.88);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Subtle organic skin pore & sweat sheen grain
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.032)' : 'rgba(0,0,0,0.038)';
    ctx.fillRect(x, y, 1.4, 1.4);
    if (i % 3 === 0) {
      bCtx.fillStyle = i % 2 === 0 ? '#8a8a8a' : '#767676';
      bCtx.fillRect(x, y, 1.4, 1.4);
    }
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

/**
 * Generates realistic vascular muscle & skin pore texture for neck, arms, and legs
 */
export function createLimbSkinTextures(
  baseSkinHex: string,
  maxAnisotropy: number,
): AnatomicalTextureSet {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  const shadowTone = shiftHex(baseSkinHex, -0.1);
  const highlightTone = shiftHex(baseSkinHex, 0.06);

  ctx.fillStyle = baseSkinHex;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle longitudinal muscle fiber & vein shading
  for (let i = 0; i < 8; i++) {
    const x = (i / 8) * size + 16;
    const grad = ctx.createLinearGradient(x - 10, 0, x + 10, 0);
    grad.addColorStop(0, shadowTone);
    grad.addColorStop(0.5, highlightTone);
    grad.addColorStop(1, shadowTone);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(x - 10, 0, 20, size);
  }
  ctx.globalAlpha = 1;

  // Fine vascular lines (forearm/bicep realism)
  ctx.strokeStyle = shadowTone;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.22;
  for (let v = 0; v < 4; v++) {
    const sx = 42 + v * 52;
    ctx.beginPath();
    ctx.moveTo(sx, 12);
    ctx.bezierCurveTo(sx + 10, 80, sx - 12, 165, sx + 4, 240);
    ctx.stroke();

    bCtx.strokeStyle = '#9b9b9b';
    bCtx.lineWidth = 2;
    bCtx.beginPath();
    bCtx.moveTo(sx, 12);
    bCtx.bezierCurveTo(sx + 10, 80, sx - 12, 165, sx + 4, 240);
    bCtx.stroke();
  }
  ctx.globalAlpha = 1;

  // Organic skin micro-pores
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.028)' : 'rgba(0,0,0,0.032)';
    ctx.fillRect(x, y, 1.3, 1.3);
    if (i % 2 === 0) {
      bCtx.fillStyle = i % 4 === 0 ? '#8c8c8c' : '#747474';
      bCtx.fillRect(x, y, 1.3, 1.3);
    }
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

/**
 * Generates high-detail UV-aligned human face texture (u = 0.5 is face front, v = 1 is crown / canvas y = 0).
 * Coordinates match buildSculptedHeadGeometry vertex positions 1:1.
 */
export function createFaceTextures(
  baseSkinHex: string,
  hairHex: string,
  beardStyle: BeardStyle,
  maxAnisotropy: number,
  config: FaceTextureConfig = {},
): AnatomicalTextureSet {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  const shadowTone = shiftHex(baseSkinHex, -0.16);
  const deepTone = shiftHex(baseSkinHex, -0.28);
  const warmFlush = mixHex(baseSkinHex, '#b55644', 0.14);
  const highlightTone = shiftHex(baseSkinHex, 0.085);

  const eyeSpreadNorm = config.eyeSpreadNorm ?? 0.34;
  const browArch = config.browArch ?? 0.3;
  const browThick = config.browThickness ?? 1.0;
  const mouthWidthNorm = config.mouthWidthNorm ?? 0.22;
  const lipFull = config.lipFullness ?? 1.0;
  const noseWidthNorm = config.noseWidthNorm ?? 0.16;

  // Convert normalized sinA (~u offset) to exact canvas pixels
  const sinToPx = (s: number) => (Math.asin(THREE.MathUtils.clamp(s, -0.98, 0.98)) / (Math.PI * 2)) * size;
  const eyeCenterPx = sinToPx(eyeSpreadNorm); // ~28 px
  const mouthHalfPx = sinToPx(mouthWidthNorm); // ~18 px
  const noseWingPx = sinToPx(noseWidthNorm * 0.65); // ~8.5 px

  // Exact v -> canvas Y alignment with buildSculptedHeadGeometry
  const eyeY = size * 0.5; // v = 0.50
  const browY = size * 0.43; // v = 0.57
  const noseBaseY = size * 0.66; // v = 0.34
  const mouthY = size * 0.775; // v = 0.225

  ctx.fillStyle = baseSkinHex;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const cx = size * 0.5;

  // Forehead highlight & subtle brow warmth (v ~ 0.64..0.78 -> y = 0.22..0.36)
  const fhGrad = ctx.createRadialGradient(cx, size * 0.28, 6, cx, size * 0.28, 56);
  fhGrad.addColorStop(0, highlightTone);
  fhGrad.addColorStop(1, baseSkinHex);
  ctx.fillStyle = fhGrad;
  ctx.globalAlpha = 0.38;
  ctx.fillRect(cx - 64, size * 0.16, 128, 84);

  // Subtle forehead micro-texture lines
  ctx.strokeStyle = shadowTone;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.15;
  for (let row = 0; row < 2; row++) {
    const fy = size * (0.28 + row * 0.028);
    ctx.beginPath();
    ctx.moveTo(cx - 24, fy);
    ctx.quadraticCurveTo(cx, fy - 1.5, cx + 24, fy);
    ctx.stroke();
  }

  // Orbital eye socket shading, under-eye tear trough & sculpted feathered eyebrows
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeCenterPx;
    const orbGrad = ctx.createRadialGradient(ex, eyeY, 3, ex, eyeY, 20);
    orbGrad.addColorStop(0, deepTone);
    orbGrad.addColorStop(0.55, shadowTone);
    orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orbGrad;
    ctx.globalAlpha = 0.52;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 17, 11.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle tear-trough / lower orbital shadow
    ctx.strokeStyle = shadowTone;
    ctx.lineWidth = 2.0;
    ctx.globalAlpha = 0.24;
    ctx.beginPath();
    ctx.moveTo(ex - side * 12, eyeY + 6);
    ctx.quadraticCurveTo(ex, eyeY + 12, ex + side * 13, eyeY + 7);
    ctx.stroke();

    // Natural feathered eyebrow hair strokes aligned with supraorbital ridge
    const browColor = mixHex(hairHex, '#181412', 0.28);
    ctx.strokeStyle = browColor;
    ctx.lineWidth = 1.35 * browThick;
    ctx.globalAlpha = 0.78;
    const hairCount = 24;
    for (let h = 0; h < hairCount; h++) {
      const t = h / (hairCount - 1);
      const hx = cx + side * (eyeCenterPx - 14 + t * 29);
      const arch = Math.sin(t * Math.PI) * (2.6 + browArch * 2.2) - t * 1.4;
      const hy = browY - arch;
      ctx.beginPath();
      ctx.moveTo(hx, hy + 2.3 * browThick);
      ctx.lineTo(hx + side * (2.0 + t * 1.2), hy - 2.3 * browThick);
      ctx.stroke();

      bCtx.strokeStyle = '#a8a8a8';
      bCtx.lineWidth = 1.4;
      bCtx.beginPath();
      bCtx.moveTo(hx, hy + 2.2);
      bCtx.lineTo(hx + side * 2.2, hy - 2.2);
      bCtx.stroke();
    }
  }

  // Cheekbone vascular warmth, malar highlight & sub-malar buccal hollow contour
  for (const side of [-1, 1]) {
    const malarX = cx + side * 34;
    const chGrad = ctx.createRadialGradient(malarX, size * 0.58, 3, malarX, size * 0.58, 25);
    chGrad.addColorStop(0, warmFlush);
    chGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = chGrad;
    ctx.globalAlpha = 0.36;
    ctx.beginPath();
    ctx.ellipse(malarX, size * 0.59, 25, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sub-cheek hollow & temple contour (sculpts real cheekbone/jaw contrast)
    const hollowGrad = ctx.createRadialGradient(
      cx + side * 43,
      size * 0.71,
      2,
      cx + side * 43,
      size * 0.71,
      24,
    );
    hollowGrad.addColorStop(0, shadowTone);
    hollowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hollowGrad;
    ctx.globalAlpha = 0.32;
    ctx.beginPath();
    ctx.ellipse(cx + side * 43, size * 0.71, 22, 13, side * -0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nasal bridge highlight, lateral sidewall shadow, alar crease & recessed underside shadow
  ctx.fillStyle = highlightTone;
  ctx.globalAlpha = 0.38;
  ctx.beginPath();
  ctx.ellipse(cx, size * 0.555, 3.6, 23, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const side of [-1, 1]) {
    // Lateral nose sidewall shadow
    const nwGrad = ctx.createLinearGradient(cx + side * 3, 0, cx + side * 14, 0);
    nwGrad.addColorStop(0, 'rgba(0,0,0,0)');
    nwGrad.addColorStop(0.55, shadowTone);
    nwGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nwGrad;
    ctx.globalAlpha = 0.26;
    ctx.fillRect(cx + (side > 0 ? 3 : -14), size * 0.46, 11, size * 0.19);

    // Alar nostril crease
    ctx.strokeStyle = shadowTone;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.arc(cx + side * noseWingPx, noseBaseY - 4, 4.6, side > 0 ? -0.4 : Math.PI - 1.2, side > 0 ? 1.2 : Math.PI + 0.4);
    ctx.stroke();

    // Soft recessed underside nostril shadow (subtle, since real 3D geometry holds the nostrils)
    ctx.fillStyle = deepTone;
    ctx.globalAlpha = 0.48;
    ctx.beginPath();
    ctx.ellipse(cx + side * (noseWingPx * 0.65), noseBaseY + 1.5, 3.2, 1.8, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nasolabial folds & Philtrum columns
  ctx.strokeStyle = shadowTone;
  ctx.lineWidth = 1.8;
  ctx.globalAlpha = 0.24;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * (noseWingPx + 3), noseBaseY - 2);
    ctx.quadraticCurveTo(cx + side * (mouthHalfPx + 4), size * 0.72, cx + side * (mouthHalfPx + 2), mouthY + 8);
    ctx.stroke();
  }
  ctx.strokeStyle = highlightTone;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.34;
  ctx.beginPath();
  ctx.moveTo(cx - 2.6, noseBaseY + 4);
  ctx.lineTo(cx - 2.2, mouthY - 8);
  ctx.moveTo(cx + 2.6, noseBaseY + 4);
  ctx.lineTo(cx + 2.2, mouthY - 8);
  ctx.stroke();

  // Realistic Male Natural Lips (no harsh painted outline; skin-harmonized upper/lower cushion)
  const lipUpperHex = mixHex(shiftHex(baseSkinHex, -0.15), '#7a403a', 0.24);
  const lipLowerHex = mixHex(shiftHex(baseSkinHex, -0.07), '#9e5a50', 0.26);
  const upperLipH = 4.6 * lipFull;
  const lowerLipH = 5.4 * lipFull;

  // Soft outer lip feathering so edges blend smoothly into surrounding skin
  ctx.save();
  ctx.globalAlpha = 0.68;
  ctx.fillStyle = lipUpperHex;
  ctx.beginPath();
  ctx.moveTo(cx - mouthHalfPx, mouthY);
  ctx.quadraticCurveTo(cx - mouthHalfPx * 0.42, mouthY - upperLipH * 1.15, cx, mouthY - upperLipH * 0.68);
  ctx.quadraticCurveTo(cx + mouthHalfPx * 0.42, mouthY - upperLipH * 1.15, cx + mouthHalfPx, mouthY);
  ctx.quadraticCurveTo(cx, mouthY + 1.4, cx - mouthHalfPx, mouthY);
  ctx.fill();

  const lowerGrad = ctx.createRadialGradient(
    cx,
    mouthY + lowerLipH * 0.55,
    1.5,
    cx,
    mouthY + lowerLipH * 0.5,
    mouthHalfPx * 0.9,
  );
  lowerGrad.addColorStop(0, lipLowerHex);
  lowerGrad.addColorStop(0.7, lipLowerHex);
  lowerGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lowerGrad;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + 1.0, mouthHalfPx * 0.88, lowerLipH, 0, 0, Math.PI);
  ctx.fill();

  // Subtle lower-lip specular cushion + mentolabial chin crease below
  ctx.fillStyle = highlightTone;
  ctx.globalAlpha = 0.24;
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + lowerLipH * 0.45, mouthHalfPx * 0.42, 1.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lip parting line & mouth corner commissure shadows
  ctx.strokeStyle = deepTone;
  ctx.lineWidth = 1.9;
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.moveTo(cx - mouthHalfPx, mouthY + 0.3);
  ctx.quadraticCurveTo(cx - mouthHalfPx * 0.35, mouthY - 0.5, cx, mouthY + 0.5);
  ctx.quadraticCurveTo(cx + mouthHalfPx * 0.35, mouthY - 0.5, cx + mouthHalfPx, mouthY + 0.3);
  ctx.stroke();

  ctx.fillStyle = deepTone;
  ctx.globalAlpha = 0.42;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * (mouthHalfPx + 0.8), mouthY + 0.6, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mentolabial fold shadow between lower lip and chin
  ctx.fillStyle = shadowTone;
  ctx.globalAlpha = 0.34;
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + lowerLipH + 8, mouthHalfPx * 0.72, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Facial hair with individual hair/stubble strokes aligned below nose & around mouth
  if (beardStyle !== 'none') {
    ctx.strokeStyle = hairHex;
    ctx.fillStyle = hairHex;
    const drawWhiskers = (
      areaX: number,
      areaY: number,
      rx: number,
      ry: number,
      count: number,
      alpha: number,
      len: number,
      excludeMouth = false,
    ) => {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.25;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random());
        const px = areaX + Math.cos(ang) * rx * rad;
        const py = areaY + Math.sin(ang) * ry * rad;
        if (
          excludeMouth &&
          Math.abs(px - cx) < mouthHalfPx + 2.5 &&
          py > mouthY - upperLipH - 1.5 &&
          py < mouthY + lowerLipH + 2.5
        ) {
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + (Math.random() - 0.5) * 1.4, py + len);
        ctx.stroke();

        bCtx.fillStyle = '#9c9c9c';
        bCtx.fillRect(px, py, 1.3, len * 0.7);
      }
    };

    if (beardStyle === 'stubble') {
      drawWhiskers(cx, size * 0.726, 17, 4.5, 180, 0.34, 2.2, true);
      drawWhiskers(cx, size * 0.87, 45, 32, 640, 0.28, 2.5, true);
    } else if (beardStyle === 'goatee') {
      drawWhiskers(cx, size * 0.726, 19, 5, 320, 0.62, 3.4, true);
      drawWhiskers(cx, size * 0.88, 21, 22, 540, 0.66, 4.0, true);
    } else if (beardStyle === 'full') {
      drawWhiskers(cx, size * 0.726, 20, 5.5, 340, 0.65, 3.6, true);
      drawWhiskers(cx, size * 0.865, 58, 42, 1320, 0.68, 4.4, true);
    }
  }
  ctx.globalAlpha = 1;

  // Natural skin pores & micro-variation
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.032)';
    ctx.fillRect(x, y, 1.3, 1.3);
    if (i % 3 === 0) {
      bCtx.fillStyle = i % 2 === 0 ? '#8a8a8a' : '#747474';
      bCtx.fillRect(x, y, 1.3, 1.3);
    }
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

/**
 * Generates realistic textured human iris + limbal ring + radial stroma + pupil texture
 */
export function createIrisTexture(irisHex: string, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size * 0.5;
  const cy = size * 0.5;
  const outerR = size * 0.48;
  const limbalDark = shiftHex(irisHex, -0.24);
  const brightStroma = shiftHex(irisHex, 0.14);
  const amberRing = mixHex(irisHex, '#b47a32', 0.35);

  ctx.fillStyle = limbalDark;
  ctx.fillRect(0, 0, size, size);

  // Base iris radial gradient with dark outer limbal ring
  const rad = ctx.createRadialGradient(cx, cy, outerR * 0.25, cx, cy, outerR);
  rad.addColorStop(0, amberRing);
  rad.addColorStop(0.28, brightStroma);
  rad.addColorStop(0.75, irisHex);
  rad.addColorStop(0.92, limbalDark);
  rad.addColorStop(1, '#09090b');
  ctx.fillStyle = rad;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();

  // Radial stroma fibers
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
    ctx.strokeStyle = i % 2 === 0 ? brightStroma : limbalDark;
    ctx.globalAlpha = i % 3 === 0 ? 0.34 : 0.22;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * outerR * 0.28, cy + Math.sin(a) * outerR * 0.28);
    ctx.lineTo(cx + Math.cos(a) * outerR * 0.9, cy + Math.sin(a) * outerR * 0.9);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Deep central pupil
  ctx.fillStyle = '#070709';
  ctx.beginPath();
  ctx.arc(cx, cy, outerR * 0.36, 0, Math.PI * 2);
  ctx.fill();

  // Subtle top eyelid shadow across top edge of iris
  const lidShadow = ctx.createLinearGradient(0, 0, 0, size * 0.55);
  lidShadow.addColorStop(0, 'rgba(0,0,0,0.45)');
  lidShadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lidShadow;
  ctx.fillRect(0, 0, size, size * 0.55);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Generates directional fibrous hair texture & normal/bump relief for realistic hair strands
 */
export function createHairTextures(
  hairHex: string,
  maxAnisotropy: number,
): AnatomicalTextureSet {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  const darkStrand = shiftHex(hairHex, -0.09);
  const sheenStrand = shiftHex(hairHex, 0.11);

  ctx.fillStyle = hairHex;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#7c7c7c';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    ctx.strokeStyle = i % 3 === 0 ? sheenStrand : darkStrand;
    ctx.globalAlpha = i % 3 === 0 ? 0.35 : 0.45;
    ctx.lineWidth = 1 + Math.random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 14, size * 0.5, x + (Math.random() - 0.5) * 10, size);
    ctx.stroke();

    bCtx.strokeStyle = i % 2 === 0 ? '#b6b6b6' : '#4a4a4a';
    bCtx.lineWidth = 1.4;
    bCtx.beginPath();
    bCtx.moveTo(x, 0);
    bCtx.lineTo(x + (Math.random() - 0.5) * 8, size);
    bCtx.stroke();
  }
  ctx.globalAlpha = 1;

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

/**
 * Generates athletic boxing shorts fabric texture with vertical drape folds & elastic waistband
 */
export function createShortsTextures(
  trunksHex: string,
  trimHex: string,
  maxAnisotropy: number,
  includeWaistband = true,
): AnatomicalTextureSet {
  const size = 512;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  const foldDark = shiftHex(trunksHex, -0.1);
  const foldLight = shiftHex(trunksHex, 0.06);

  ctx.fillStyle = trunksHex;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  const foldTop = includeWaistband ? 60 : 0;

  // Vertical fabric folds & natural creases
  for (let i = 0; i < 28; i++) {
    const x = (i / 28) * size + (Math.sin(i * 3.1) * 8);
    const w = 8 + (i % 4) * 4;
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, foldDark);
    grad.addColorStop(0.5, foldLight);
    grad.addColorStop(1, foldDark);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(x, foldTop, w, size - foldTop);

    const bGrad = bCtx.createLinearGradient(x, 0, x + w, 0);
    bGrad.addColorStop(0, '#5a5a5a');
    bGrad.addColorStop(0.5, '#b2b2b2');
    bGrad.addColorStop(1, '#5a5a5a');
    bCtx.fillStyle = bGrad;
    bCtx.fillRect(x, foldTop, w, size - foldTop);
  }
  ctx.globalAlpha = 1;

  // Elastic gathered waistband at top (pelvis mesh only)
  if (includeWaistband) {
    ctx.fillStyle = foldDark;
    ctx.fillRect(0, 0, size, 64);
    for (let x = 0; x < size; x += 10) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, 4, 4, 56);
      bCtx.fillStyle = '#b8b8b8';
      bCtx.fillRect(x, 0, 5, 64);
    }
  }

  // Side accent trim stripes
  ctx.fillStyle = trimHex;
  ctx.globalAlpha = 0.72;
  ctx.fillRect(size * 0.24, includeWaistband ? 68 : 0, 8, size - (includeWaistband ? 80 : 12));
  ctx.fillRect(size * 0.74, includeWaistband ? 68 : 0, 8, size - (includeWaistband ? 80 : 12));
  ctx.globalAlpha = 1;

  // Bottom stitched hem
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, size - 14);
  ctx.lineTo(size, size - 14);
  ctx.stroke();

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}

/**
 * Generates pebbled leather boxing glove texture with stitched seams & knuckle padding creases
 */
export function createGloveTextures(
  gloveHex: string,
  trimHex: string,
  maxAnisotropy: number,
): AnatomicalTextureSet {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  const creaseDark = shiftHex(gloveHex, -0.15);

  ctx.fillStyle = gloveHex;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle pebbled leather grain
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.065)';
    ctx.fillRect(x, y, 1.8, 1.8);
    bCtx.fillStyle = i % 2 === 0 ? '#9c9c9c' : '#646464';
    bCtx.fillRect(x, y, 1.8, 1.8);
  }

  // Leather stitching & knuckle fold seam across finger box
  ctx.strokeStyle = creaseDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(16, size * 0.42);
  ctx.quadraticCurveTo(size * 0.5, size * 0.48, size - 16, size * 0.42);
  ctx.stroke();

  bCtx.strokeStyle = '#484848';
  bCtx.lineWidth = 3.5;
  bCtx.beginPath();
  bCtx.moveTo(16, size * 0.42);
  bCtx.quadraticCurveTo(size * 0.5, size * 0.48, size - 16, size * 0.42);
  bCtx.stroke();

  // Piped leather seam accent
  ctx.strokeStyle = trimHex;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(18, size * 0.45);
  ctx.quadraticCurveTo(size * 0.5, size * 0.51, size - 18, size * 0.45);
  ctx.stroke();
  ctx.setLineDash([]);

  // Brand cuff patch accent
  ctx.fillStyle = trimHex;
  ctx.fillRect(size * 0.32, size * 0.76, size * 0.36, 28);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('IRON', size * 0.5, size * 0.76 + 14);

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;
  bumpMap.needsUpdate = true;

  return { map, bumpMap };
}
