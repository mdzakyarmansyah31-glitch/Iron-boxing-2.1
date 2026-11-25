import * as THREE from 'three';
import { FighterProfile } from '../types/game';

export interface TunnelArenaHandle {
  group: THREE.Group;
  updateFighters: (left: FighterProfile, right: FighterProfile) => void;
  update: (time: number) => void;
  dispose: () => void;
}

function createTunnelFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, size, size);

  // Dark metallic / rubberized walkout runway panels
  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const shade = (x / step + y / step) % 2 === 0 ? 13 : 17;
      ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 9})`;
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }

  // Subtle brushed streaks along Z
  for (let i = 0; i < 420; i++) {
    const px = (i * 89) % size;
    const py = (i * 151) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.22)';
    ctx.fillRect(px, py, 2, 18);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 14);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createTunnelWallTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#090c14');
  grad.addColorStop(0.55, '#111726');
  grad.addColorStop(1, '#07090f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= size; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createArenaPortalTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Bright distant stadium portal at the end of the tunnel
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.48, 24, w * 0.5, h * 0.5, w * 0.65);
  bg.addColorStop(0, '#fff7ed');
  bg.addColorStop(0.18, '#fde68a');
  bg.addColorStop(0.42, '#38bdf8');
  bg.addColorStop(0.72, '#1e293b');
  bg.addColorStop(1, '#06080f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Volumetric stadium spotlight beams crossing toward the ring
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(w * 0.22, 0);
  ctx.lineTo(w * 0.36, 0);
  ctx.lineTo(w * 0.58, h);
  ctx.lineTo(w * 0.42, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.moveTo(w * 0.64, 0);
  ctx.lineTo(w * 0.78, 0);
  ctx.lineTo(w * 0.58, h);
  ctx.lineTo(w * 0.42, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Distant boxing ring ropes & corner posts silhouette at tunnel exit
  ctx.fillStyle = 'rgba(7, 10, 18, 0.85)';
  ctx.fillRect(w * 0.12, h * 0.72, w * 0.76, h * 0.28);

  // Distant crowd tier dots
  for (let i = 0; i < 160; i++) {
    const cx = w * 0.08 + ((i * 53) % (w * 0.84));
    const cy = h * 0.52 + ((i * 29) % (h * 0.22));
    ctx.fillStyle = i % 5 === 0 ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, i % 5 === 0 ? 3.2 : 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ring ropes & posts silhouette
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
  ctx.lineWidth = 3;
  [0.57, 0.62, 0.67].forEach((ry) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.26, h * ry);
    ctx.lineTo(w * 0.74, h * ry);
    ctx.stroke();
  });

  ctx.fillStyle = '#dc2626';
  ctx.fillRect(w * 0.25, h * 0.54, 14, h * 0.2);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(w * 0.73, h * 0.54, 14, h * 0.2);

  // Overhead arena jumbotron glow bar
  ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
  ctx.fillRect(w * 0.36, h * 0.14, w * 0.28, 12);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createGlowSpriteTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    2,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.32)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawFighterInfoCanvas(
  canvas: HTMLCanvasElement,
  fighter: FighterProfile,
  side: 'left' | 'right',
) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  const isRed = side === 'left';
  const accentHex = isRed ? '#ff3b5c' : '#38bdf8';
  const accentSoft = isRed ? 'rgba(255, 59, 92, 0.28)' : 'rgba(56, 189, 248, 0.28)';
  const accentGlow = isRed ? 'rgba(255, 59, 92, 0.55)' : 'rgba(56, 189, 248, 0.55)';

  // Translucent dark cyber-arena glass board so neon tunnel shows around it
  const bg = ctx.createLinearGradient(isRed ? 0 : w, 0, isRed ? w : 0, h);
  bg.addColorStop(0, 'rgba(8, 12, 22, 0.92)');
  bg.addColorStop(0.65, 'rgba(10, 15, 28, 0.78)');
  bg.addColorStop(1, 'rgba(10, 15, 28, 0.25)');
  ctx.fillStyle = bg;
  ctx.fillRect(10, 10, w - 20, h - 20);

  // Subtle corner glow wash
  const glow = ctx.createRadialGradient(
    isRed ? w * 0.22 : w * 0.78,
    h * 0.35,
    18,
    isRed ? w * 0.3 : w * 0.7,
    h * 0.45,
    w * 0.72,
  );
  glow.addColorStop(0, accentSoft);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(10, 10, w - 20, h - 20);

  // Neon outer frame border
  ctx.strokeStyle = accentGlow;
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  // Inner subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
  ctx.lineWidth = 1.5;
  for (let y = 76; y < h - 24; y += 64) {
    ctx.beginPath();
    ctx.moveTo(22, y);
    ctx.lineTo(w - 22, y);
    ctx.stroke();
  }

  const s = fighter.baseStats;
  const overall = Math.round((s.power + s.speed + s.defense + s.footwork + s.stamina + s.chin) / 6);

  // Keep primary typography anchored toward the outer visible edge so the 3D boxer stands in front of the inner half
  ctx.textAlign = isRed ? 'left' : 'right';
  const anchorX = isRed ? 48 : w - 48;

  // Corner kicker
  ctx.fillStyle = accentHex;
  ctx.font = '800 28px "Barlow Condensed", sans-serif';
  ctx.fillText(isRed ? 'RED CORNER · PLAYER' : 'BLUE CORNER · CPU', anchorX, 66);

  // Huge Display Fighter Name (two lines if needed, crisp high contrast)
  const parts = fighter.name.toUpperCase().split(' ');
  const firstName = parts[0] ?? fighter.name.toUpperCase();
  const lastName = parts.slice(1).join(' ');

  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.font = '800 54px "Barlow Condensed", sans-serif';
  ctx.fillText(firstName, anchorX, 134);

  if (lastName) {
    ctx.fillStyle = '#f8fafc';
    ctx.font = '900 84px "Barlow Condensed", sans-serif';
    ctx.fillText(lastName, anchorX, 214);
  }

  // Nickname & Fighting Style
  const metaY = lastName ? 256 : 186;
  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 30px "Barlow Condensed", sans-serif';
  ctx.fillText(`“${fighter.nickname.toUpperCase()}”`, anchorX, metaY);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 25px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${fighter.styleLabel} · ${fighter.stance}`, anchorX, metaY + 38);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `${fighter.origin} · ${fighter.heightDisplay} · ${fighter.weightDisplay}`,
    anchorX,
    metaY + 72,
  );

  // Big Overall Rating Badge on outer lower corner
  const ovrY = metaY + 132;
  ctx.fillStyle = accentHex;
  ctx.font = '900 72px "Barlow Condensed", sans-serif';
  ctx.fillText(`OVR ${overall}`, anchorX, ovrY);

  // 3 Clean Stat Bars (Power, Speed, Defense) anchored on the visible side
  const barW = 370;
  const barStartX = isRed ? anchorX : anchorX - barW;
  const statRows: [string, number][] = [
    ['POWER', s.power],
    ['SPEED', s.speed],
    ['DEFENSE', s.defense],
    ['CHIN', s.chin],
  ];

  statRows.forEach(([label, val], idx) => {
    const rowY = ovrY + 40 + idx * 54;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 23px "Barlow Condensed", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, barStartX, rowY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${val}`, barStartX + barW, rowY);

    // Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(barStartX, rowY + 9, barW, 12);

    // Fill
    ctx.fillStyle = accentHex;
    const fillW = Math.round((Math.max(0, Math.min(100, val)) / 100) * barW);
    if (isRed) {
      ctx.fillRect(barStartX, rowY + 9, fillW, 12);
    } else {
      ctx.fillRect(barStartX + barW - fillW, rowY + 9, fillW, 12);
    }
  });
}

export function createTunnelArena(
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): TunnelArenaHandle {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const floorTex = track(createTunnelFloorTexture(maxAnisotropy));
  const wallTex = track(createTunnelWallTexture(maxAnisotropy));
  const portalTex = track(createArenaPortalTexture(maxAnisotropy));
  const glowTex = track(createGlowSpriteTexture());

  const floorMat = track(
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.28,
      metalness: 0.28,
    }),
  );
  const wallMat = track(
    new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.65,
      metalness: 0.32,
    }),
  );
  const darkMetalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.42,
      metalness: 0.72,
    }),
  );
  const runwayCenterMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.22,
      metalness: 0.35,
    }),
  );

  // Neon tube materials
  const redNeonMat = track(
    new THREE.MeshBasicMaterial({ color: 0xff2e54 }),
  );
  const blueNeonMat = track(
    new THREE.MeshBasicMaterial({ color: 0x00d9ff }),
  );
  const goldNeonMat = track(
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
  );
  const magentaNeonMat = track(
    new THREE.MeshBasicMaterial({ color: 0xe879f9 }),
  );

  // Tunnel dimensions: stretches from z = +6 down to z = -17 toward the glowing arena exit
  const tunnelLength = 23;
  const tunnelCenterZ = -5.5;
  const tunnelHalfW = 3.65;
  const tunnelH = 4.25;

  // Floor & center runway carpet
  const floor = new THREE.Mesh(
    track(new THREE.PlaneGeometry(tunnelHalfW * 2.2, tunnelLength)),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, tunnelCenterZ);
  floor.receiveShadow = !isSoftwareGl;
  group.add(floor);

  const centerRunway = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.5, 0.015, tunnelLength)),
    runwayCenterMat,
  );
  centerRunway.position.set(0, 0.008, tunnelCenterZ);
  centerRunway.receiveShadow = !isSoftwareGl;
  group.add(centerRunway);

  // Left & Right side walls + Ceiling
  const leftWall = new THREE.Mesh(
    track(new THREE.PlaneGeometry(tunnelLength, tunnelH)),
    wallMat,
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-tunnelHalfW, tunnelH * 0.5, tunnelCenterZ);
  group.add(leftWall);

  const rightWall = new THREE.Mesh(
    track(new THREE.PlaneGeometry(tunnelLength, tunnelH)),
    wallMat,
  );
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(tunnelHalfW, tunnelH * 0.5, tunnelCenterZ);
  group.add(rightWall);

  const ceiling = new THREE.Mesh(
    track(new THREE.PlaneGeometry(tunnelHalfW * 2.1, tunnelLength)),
    wallMat,
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, tunnelH, tunnelCenterZ);
  group.add(ceiling);

  // Continuous Floor Edge Neon Rails (Red left, Cyan right) + inner gold runway edges
  const railGeo = track(new THREE.BoxGeometry(0.055, 0.045, tunnelLength));
  const leftEdgeRail = new THREE.Mesh(railGeo, redNeonMat);
  leftEdgeRail.position.set(-1.32, 0.025, tunnelCenterZ);
  group.add(leftEdgeRail);

  const rightEdgeRail = new THREE.Mesh(railGeo, blueNeonMat);
  rightEdgeRail.position.set(1.32, 0.025, tunnelCenterZ);
  group.add(rightEdgeRail);

  const outerRailGeo = track(new THREE.BoxGeometry(0.06, 0.06, tunnelLength));
  const leftWallBaseNeon = new THREE.Mesh(outerRailGeo, redNeonMat);
  leftWallBaseNeon.position.set(-tunnelHalfW + 0.06, 0.06, tunnelCenterZ);
  group.add(leftWallBaseNeon);

  const rightWallBaseNeon = new THREE.Mesh(outerRailGeo, blueNeonMat);
  rightWallBaseNeon.position.set(tunnelHalfW - 0.06, 0.06, tunnelCenterZ);
  group.add(rightWallBaseNeon);

  // Overhead longitudinal neon ceiling strips
  const ceilStripGeo = track(new THREE.BoxGeometry(0.065, 0.04, tunnelLength));
  const ceilLeftNeon = new THREE.Mesh(ceilStripGeo, redNeonMat);
  ceilLeftNeon.position.set(-1.65, tunnelH - 0.05, tunnelCenterZ);
  group.add(ceilLeftNeon);

  const ceilRightNeon = new THREE.Mesh(ceilStripGeo, blueNeonMat);
  ceilRightNeon.position.set(1.65, tunnelH - 0.05, tunnelCenterZ);
  group.add(ceilRightNeon);

  // Repeating Steel Ribbed Arches + Vertical Neon Tubes down the corridor!
  const pillarGeo = track(new THREE.BoxGeometry(0.28, tunnelH, 0.28));
  const beamGeo = track(new THREE.BoxGeometry(tunnelHalfW * 2 + 0.2, 0.26, 0.28));
  const tubeVertGeo = track(new THREE.BoxGeometry(0.055, tunnelH - 0.55, 0.055));
  const tubeTopGeo = track(new THREE.BoxGeometry(2.6, 0.055, 0.055));

  const glowHaloMatRed = track(
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xff2e54,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const glowHaloMatBlue = track(
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0x00d9ff,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const haloGeo = track(new THREE.PlaneGeometry(0.9, 3.6));

  const archNeonMeshes: THREE.Mesh[] = [];
  const archZPositions = [2.4, -0.2, -2.8, -5.4, -8.0, -10.6, -13.2, -15.8];

  archZPositions.forEach((az, idx) => {
    const lPil = new THREE.Mesh(pillarGeo, darkMetalMat);
    lPil.position.set(-tunnelHalfW + 0.14, tunnelH * 0.5, az);
    group.add(lPil);

    const rPil = new THREE.Mesh(pillarGeo, darkMetalMat);
    rPil.position.set(tunnelHalfW - 0.14, tunnelH * 0.5, az);
    group.add(rPil);

    const topBeam = new THREE.Mesh(beamGeo, darkMetalMat);
    topBeam.position.set(0, tunnelH - 0.13, az);
    group.add(topBeam);

    // Neon vertical light bars mounted inside each arch rib
    const lNeon = new THREE.Mesh(tubeVertGeo, idx % 3 === 2 ? magentaNeonMat : redNeonMat);
    lNeon.position.set(-tunnelHalfW + 0.31, tunnelH * 0.5 - 0.05, az + 0.12);
    group.add(lNeon);
    archNeonMeshes.push(lNeon);

    const rNeon = new THREE.Mesh(tubeVertGeo, blueNeonMat);
    rNeon.position.set(tunnelHalfW - 0.31, tunnelH * 0.5 - 0.05, az + 0.12);
    group.add(rNeon);
    archNeonMeshes.push(rNeon);

    // Overhead gold neon crossbar
    const topNeon = new THREE.Mesh(tubeTopGeo, goldNeonMat);
    topNeon.position.set(0, tunnelH - 0.28, az + 0.12);
    group.add(topNeon);
    archNeonMeshes.push(topNeon);

    // Soft additive glow halos on alternating arches for rich neon bloom
    if (idx % 2 === 0) {
      const lHalo = new THREE.Mesh(haloGeo, glowHaloMatRed);
      lHalo.position.set(-tunnelHalfW + 0.35, tunnelH * 0.5, az + 0.16);
      lHalo.rotation.y = Math.PI / 3;
      group.add(lHalo);

      const rHalo = new THREE.Mesh(haloGeo, glowHaloMatBlue);
      rHalo.position.set(tunnelHalfW - 0.35, tunnelH * 0.5, az + 0.16);
      rHalo.rotation.y = -Math.PI / 3;
      group.add(rHalo);
    }
  });

  // Distant Glowing Arena Portal at the end of the tunnel (z = -16.8)
  const portalMat = track(
    new THREE.MeshBasicMaterial({
      map: portalTex,
    }),
  );
  const arenaPortal = new THREE.Mesh(
    track(new THREE.PlaneGeometry(7.2, 4.3)),
    portalMat,
  );
  arenaPortal.position.set(0, 2.08, -16.8);
  group.add(arenaPortal);

  // Volumetric portal glow halo
  const portalGlowMat = track(
    new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xfde68a,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const portalGlow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(6.4, 4.4)),
    portalGlowMat,
  );
  portalGlow.position.set(0, 2.0, -16.2);
  group.add(portalGlow);

  // 3D Fighter Info Backdrops BEHIND the characters (z = -0.58, boxers stand at z = +0.85!)
  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = 1024;
  leftCanvas.height = 768;
  const leftTex = track(new THREE.CanvasTexture(leftCanvas));
  leftTex.colorSpace = THREE.SRGBColorSpace;
  leftTex.anisotropy = maxAnisotropy;

  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = 1024;
  rightCanvas.height = 768;
  const rightTex = track(new THREE.CanvasTexture(rightCanvas));
  rightTex.colorSpace = THREE.SRGBColorSpace;
  rightTex.anisotropy = maxAnisotropy;

  const leftBoardMat = track(
    new THREE.MeshBasicMaterial({
      map: leftTex,
      transparent: true,
      opacity: 0.96,
    }),
  );
  const rightBoardMat = track(
    new THREE.MeshBasicMaterial({
      map: rightTex,
      transparent: true,
      opacity: 0.96,
    }),
  );

  const boardGeo = track(new THREE.PlaneGeometry(2.35, 1.76));
  const leftInfoBoard = new THREE.Mesh(boardGeo, leftBoardMat);
  leftInfoBoard.position.set(-1.38, 1.38, -0.55);
  leftInfoBoard.rotation.y = 0.12;
  group.add(leftInfoBoard);

  const rightInfoBoard = new THREE.Mesh(boardGeo, rightBoardMat);
  rightInfoBoard.position.set(1.38, 1.38, -0.55);
  rightInfoBoard.rotation.y = -0.12;
  group.add(rightInfoBoard);

  // Neon corridor lights illuminating the walls and casting red/blue rim accents on the boxers
  const tunnelPortalLight = new THREE.PointLight(0xfde68a, 4.5, 14, 1.3);
  tunnelPortalLight.position.set(0, 2.5, -12.5);
  group.add(tunnelPortalLight);

  const midRedLight = new THREE.PointLight(0xff2e54, 4.2, 8.5, 1.5);
  midRedLight.position.set(-2.5, 1.9, -2.5);
  group.add(midRedLight);

  const midBlueLight = new THREE.PointLight(0x00d9ff, 4.2, 8.5, 1.5);
  midBlueLight.position.set(2.5, 1.9, -2.5);
  group.add(midBlueLight);

  const updateFighters = (left: FighterProfile, right: FighterProfile) => {
    drawFighterInfoCanvas(leftCanvas, left, 'left');
    leftTex.needsUpdate = true;
    drawFighterInfoCanvas(rightCanvas, right, 'right');
    rightTex.needsUpdate = true;
  };

  const update = (time: number) => {
    const pulse = 0.28 + Math.sin(time * 2.2) * 0.08;
    glowHaloMatRed.opacity = pulse;
    glowHaloMatBlue.opacity = 0.28 + Math.cos(time * 2.2) * 0.08;
    portalGlowMat.opacity = 0.36 + Math.sin(time * 1.6) * 0.08;
    leftInfoBoard.position.y = 1.38 + Math.sin(time * 1.4) * 0.015;
    rightInfoBoard.position.y = 1.38 + Math.sin(time * 1.4 + 0.9) * 0.015;
    for (let i = 0; i < archNeonMeshes.length; i++) {
      const m = archNeonMeshes[i];
      const wave = 0.99 + Math.sin(time * 2.8 - i * 0.35) * 0.01;
      m.scale.setScalar(wave);
    }
  };

  const dispose = () => {
    for (const d of disposables) {
      d.dispose();
    }
  };

  return { group, updateFighters, update, dispose };
}
