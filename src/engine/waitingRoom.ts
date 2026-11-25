import * as THREE from 'three';

export interface WaitingRoomHandle {
  group: THREE.Group;
  update: (time: number) => void;
  dispose: () => void;
}

function createFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#12151d';
  ctx.fillRect(0, 0, size, size);

  // Subtle rubber gym mat interlocking tile grid & micro-speckle
  const step = 64;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const shade = ((x / step + y / step) % 2 === 0 ? 18 : 22);
      ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 9})`;
      ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
    }
  }

  // Fine surface grain
  for (let i = 0; i < 1800; i++) {
    const px = (i * 73) % size;
    const py = (i * 137) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.18)';
    ctx.fillRect(px, py, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createWallTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#131620');
  grad.addColorStop(0.6, '#171b26');
  grad.addColorStop(1, '#0e1118');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Architectural wall panel seams
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= size; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += 128) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createBackdropScreenTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 768;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Deep midnight-indigo to crimson arena LED backdrop
  const bg = ctx.createRadialGradient(w * 0.52, h * 0.44, 40, w * 0.5, h * 0.5, w * 0.72);
  bg.addColorStop(0, '#38bdf8');
  bg.addColorStop(0.26, '#1e3a8a');
  bg.addColorStop(0.62, '#111827');
  bg.addColorStop(1, '#070910');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle diagonal light beams
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#93c5fd';
  ctx.beginPath();
  ctx.moveTo(w * 0.15, 0);
  ctx.lineTo(w * 0.34, 0);
  ctx.lineTo(w * 0.65, h);
  ctx.lineTo(w * 0.42, h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Stylized monochrome hero boxer bust silhouette in center of LED display
  ctx.save();
  const cx = w * 0.52;
  const cy = h * 0.55;
  const silGrad = ctx.createLinearGradient(cx, h * 0.16, cx, h);
  silGrad.addColorStop(0, 'rgba(241, 245, 249, 0.88)');
  silGrad.addColorStop(0.45, 'rgba(148, 163, 184, 0.68)');
  silGrad.addColorStop(1, 'rgba(15, 23, 42, 0.95)');
  ctx.fillStyle = silGrad;

  // Head
  ctx.beginPath();
  ctx.ellipse(cx, cy - 155, 74, 94, 0, 0, Math.PI * 2);
  ctx.fill();

  // Neck + Trapezius + Shoulders
  ctx.beginPath();
  ctx.moveTo(cx - 48, cy - 82);
  ctx.lineTo(cx + 48, cy - 82);
  ctx.lineTo(cx + 76, cy - 22);
  ctx.quadraticCurveTo(cx + 225, cy + 10, cx + 268, cy + 165);
  ctx.lineTo(cx + 245, h);
  ctx.lineTo(cx - 245, h);
  ctx.lineTo(cx - 268, cy + 165);
  ctx.quadraticCurveTo(cx - 225, cy + 10, cx - 76, cy - 22);
  ctx.closePath();
  ctx.fill();

  // Dramatic shadow side across left half of silhouette
  const faceShadow = ctx.createLinearGradient(cx - 110, 0, cx + 80, 0);
  faceShadow.addColorStop(0, 'rgba(7, 11, 22, 0.85)');
  faceShadow.addColorStop(0.55, 'rgba(15, 23, 42, 0.28)');
  faceShadow.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
  ctx.fillStyle = faceShadow;
  ctx.fillRect(cx - 280, cy - 260, 560, 620);
  ctx.restore();

  // Subtle octagon / ring-rope lattice shadow overlay (echoing the broadcast screen look)
  ctx.strokeStyle = 'rgba(5, 8, 16, 0.42)';
  ctx.lineWidth = 10;
  for (let i = -h; i < w + h; i += 86) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h * 0.65, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i + h * 0.65, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }

  // Vertical Fight Night typography strip on screen edge
  ctx.save();
  ctx.translate(72, h * 0.72);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.font = '800 32px "Barlow Condensed", sans-serif';
  ctx.fillText('WORLD CHAMPIONSHIP', 0, 0);
  ctx.fillStyle = 'rgba(229, 169, 60, 0.95)';
  ctx.font = '700 24px "Barlow Condensed", sans-serif';
  ctx.fillText('BOXER STAGING ROOM', 0, 30);
  ctx.restore();

  // Top-right pink/crimson marquee glow accent
  ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
  ctx.fillRect(w * 0.56, 0, w * 0.44, 140);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createMarqueeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090b12';
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createLinearGradient(0, 0, w, 0);
  glow.addColorStop(0, '#0f172a');
  glow.addColorStop(0.45, '#3b0764');
  glow.addColorStop(1, '#831843');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Bold pink/crimson architectural marquee letters
  ctx.fillStyle = '#fb527c';
  ctx.font = 'italic 900 165px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FIGHT NIGHT', 36, h * 0.54);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createPosterTexture(
  title: string,
  subtitle: string,
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 256;
  const h = 360;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111520';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, w - 24, h - 24);

  ctx.fillStyle = accentHex;
  ctx.fillRect(24, 34, w - 48, 8);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 34px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, w / 2, 118);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle, w / 2, 160);

  // Minimalist championship ring emblem
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, 245, 44, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(248,250,252,0.75)';
  ctx.font = '800 22px "Barlow Condensed", sans-serif';
  ctx.fillText('MAIN EVENT', w / 2, 252);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBoxerWaitingRoom(
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): WaitingRoomHandle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // 1. Locker / Staging Room Floor (y = 0)
  const floorTex = createFloorTexture(maxAnisotropy);
  textures.push(floorTex);
  const floorGeo = trackGeo(new THREE.PlaneGeometry(14, 12));
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.42,
      metalness: 0.14,
    }),
  );
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Subtle floor spotlight runner rug leading toward the tunnel/ring
  const runnerGeo = trackGeo(new THREE.BoxGeometry(2.6, 0.015, 5.2));
  const runnerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161b28,
      roughness: 0.72,
      metalness: 0.05,
    }),
  );
  const runner = new THREE.Mesh(runnerGeo, runnerMat);
  runner.position.set(0.92, 0.008, 0.35);
  runner.receiveShadow = true;
  group.add(runner);

  // Gold edge trim on the staging mat
  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd99b26,
      roughness: 0.35,
      metalness: 0.72,
    }),
  );
  const trimStripGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.018, 5.2));
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(trimStripGeo, trimMat);
    strip.position.set(0.92 + side * 1.3, 0.01, 0.35);
    group.add(strip);
  }

  // 2. Enclosing Room Walls & Ceiling
  const wallTex = createWallTexture(maxAnisotropy);
  textures.push(wallTex);
  const wallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.85,
      metalness: 0.08,
    }),
  );

  const backWall = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(14, 6)), wallMat);
  backWall.position.set(0, 3, -3.4);
  backWall.receiveShadow = true;
  group.add(backWall);

  const leftWall = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(12, 6)), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-4.6, 3, 1.4);
  leftWall.receiveShadow = true;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(12, 6)), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(4.6, 3, 1.4);
  rightWall.receiveShadow = true;
  group.add(rightWall);

  const ceiling = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(14, 12)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x090b10,
        roughness: 0.9,
        metalness: 0.1,
      }),
    ),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 4.9, 1);
  group.add(ceiling);

  // 3. Center-Back Illuminated Fight Night LED Display & Marquee (echoing UFC 5 backstage stage)
  const screenGroup = new THREE.Group();
  screenGroup.position.set(-0.25, 1.85, -2.55);
  screenGroup.rotation.y = 0.22;
  group.add(screenGroup);

  const frameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111520,
      roughness: 0.35,
      metalness: 0.8,
    }),
  );
  const ledBacking = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.45, 2.75, 0.14)), frameMat);
  screenGroup.add(ledBacking);

  const backdropTex = createBackdropScreenTexture(maxAnisotropy);
  textures.push(backdropTex);
  const screenMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: backdropTex,
      emissiveMap: backdropTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.1,
    }),
  );
  const screenFace = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(3.25, 2.55)), screenMat);
  screenFace.position.z = 0.08;
  screenGroup.add(screenFace);

  // Top Pink/Crimson Architectural Marquee Banner above screen
  const marqueeTex = createMarqueeTexture(maxAnisotropy);
  textures.push(marqueeTex);
  const marqueeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: marqueeTex,
      emissiveMap: marqueeTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.2,
    }),
  );
  const marquee = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 0.92, 0.16)), marqueeMat);
  marquee.position.set(1.1, 1.98, -0.05);
  screenGroup.add(marquee);

  // Right-side secondary blue/indigo broadcast wall panel behind boxer
  const sidePanelTex = createPosterTexture('FIGHT NIGHT', 'WORLD TITLE BOUT', '#3b82f6', maxAnisotropy);
  textures.push(sidePanelTex);
  const rightBackdrop = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(2.7, 2.9)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x172554,
        emissive: 0x1e40af,
        emissiveIntensity: 0.42,
        roughness: 0.4,
        metalness: 0.2,
      }),
    ),
  );
  rightBackdrop.position.set(2.35, 1.65, -2.15);
  rightBackdrop.rotation.y = -0.18;
  group.add(rightBackdrop);

  // 4. Steel Boxer Lockers (Left Wall Area)
  const lockerGroup = new THREE.Group();
  lockerGroup.position.set(-3.1, 0, -1.2);
  lockerGroup.rotation.y = 0.42;
  group.add(lockerGroup);

  const lockerBodyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e2430,
      roughness: 0.42,
      metalness: 0.72,
    }),
  );
  const lockerDoorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x262e3d,
      roughness: 0.38,
      metalness: 0.76,
    }),
  );
  const brassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe5a93c,
      roughness: 0.28,
      metalness: 0.88,
    }),
  );

  for (let i = 0; i < 4; i++) {
    const lx = (i - 1.5) * 0.62;
    const cabinet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.58, 2.25, 0.54)), lockerBodyMat);
    cabinet.position.set(lx, 1.125, 0);
    cabinet.castShadow = !isSoftwareGl;
    cabinet.receiveShadow = true;
    lockerGroup.add(cabinet);

    const door = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 2.15, 0.03)), lockerDoorMat);
    door.position.set(lx, 1.125, 0.28);
    lockerGroup.add(door);

    // Gold nameplate
    const plate = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.07, 0.02)), brassMat);
    plate.position.set(lx, 1.88, 0.305);
    lockerGroup.add(plate);

    // Handle
    const handle = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.03, 0.16, 0.04)), brassMat);
    handle.position.set(lx + 0.19, 1.14, 0.31);
    lockerGroup.add(handle);

    // Vent louvers
    for (let v = 0; v < 3; v++) {
      const vent = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.32, 0.025, 0.02)),
        frameMat,
      );
      vent.position.set(lx, 1.62 - v * 0.07, 0.3);
      lockerGroup.add(vent);
    }
  }

  // Hanging red boxing robe / towel on locker side
  const robeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.72,
      metalness: 0.06,
    }),
  );
  const robe = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.2, 1.05, 10)), robeMat);
  robe.position.set(1.36, 1.45, 0.1);
  robe.castShadow = !isSoftwareGl;
  lockerGroup.add(robe);

  // 5. Foreground-Left Gear Bench / Staging Table (anchors bottom-left under menu, just like UFC 5 table)
  const benchGroup = new THREE.Group();
  benchGroup.position.set(-1.35, 0, 0.85);
  benchGroup.rotation.y = 0.18;
  group.add(benchGroup);

  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b2618,
      roughness: 0.55,
      metalness: 0.08,
    }),
  );
  const paddedTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x11131b,
      roughness: 0.62,
      metalness: 0.08,
    }),
  );

  // Draped dark equipment bench / locker table
  const benchTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.55, 0.1, 0.78)), woodMat);
  benchTop.position.set(0, 0.54, 0);
  benchTop.castShadow = !isSoftwareGl;
  benchTop.receiveShadow = true;
  benchGroup.add(benchTop);

  const benchSkirt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.5, 0.5, 0.72)), paddedTopMat);
  benchSkirt.position.set(0, 0.25, 0);
  benchSkirt.receiveShadow = true;
  benchGroup.add(benchSkirt);

  // Leather gym duffel bag on bench
  const duffelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.68,
      metalness: 0.12,
    }),
  );
  const duffel = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.16, 0.34, 6, 12)), duffelMat);
  duffel.rotation.z = Math.PI / 2;
  duffel.position.set(-0.55, 0.74, -0.04);
  duffel.castShadow = !isSoftwareGl;
  benchGroup.add(duffel);

  // Spare red boxing gloves + hand-wrap tape + water bottle on bench
  const spareGloveMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.34,
      metalness: 0.12,
    }),
  );
  for (const gx of [0.22, 0.42]) {
    const gMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.1, 12, 10)), spareGloveMat);
    gMesh.scale.set(1.05, 0.85, 1.3);
    gMesh.position.set(gx, 0.67, 0.08);
    gMesh.castShadow = !isSoftwareGl;
    benchGroup.add(gMesh);
  }

  const wrapMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );
  const tapeRoll = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.07, 12)), wrapMat);
  tapeRoll.position.set(0.72, 0.625, 0.1);
  benchGroup.add(tapeRoll);

  const bottleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.15,
    }),
  );
  const bottle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12)), bottleMat);
  bottle.position.set(0.9, 0.71, -0.08);
  benchGroup.add(bottle);

  // 6. Warm-Up Hanging Heavy Punching Bag (Back-Right Corner)
  const heavyBagPivot = new THREE.Group();
  heavyBagPivot.position.set(2.55, 3.6, -0.45);
  group.add(heavyBagPivot);

  const chainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.28,
      metalness: 0.9,
    }),
  );
  const bagLeatherMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1a1518,
      roughness: 0.48,
      metalness: 0.14,
    }),
  );
  const bagBandMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.45,
      metalness: 0.1,
    }),
  );

  // Suspension swivel + chain
  const chain = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 1.05, 8)), chainMat);
  chain.position.y = -0.52;
  heavyBagPivot.add(chain);

  const bagBody = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.24, 1.15, 8, 16)), bagLeatherMat);
  bagBody.position.y = -1.78;
  bagBody.castShadow = !isSoftwareGl;
  heavyBagPivot.add(bagBody);

  const bagStripe = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.245, 0.245, 0.22, 16)), bagBandMat);
  bagStripe.position.y = -1.48;
  heavyBagPivot.add(bagStripe);

  // 7. Wall Fight Posters & Exposed Steel Ceiling Beams
  const poster1Tex = createPosterTexture('MAIN EVENT', 'TITLE ELIMINATOR', '#e5a93c', maxAnisotropy);
  textures.push(poster1Tex);
  const poster1 = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.75, 1.05)),
    trackMat(
      new THREE.MeshStandardMaterial({
        map: poster1Tex,
        roughness: 0.45,
        metalness: 0.05,
      }),
    ),
  );
  poster1.position.set(3.45, 2.15, -1.85);
  poster1.rotation.y = -0.35;
  group.add(poster1);

  const beamGeo = trackGeo(new THREE.BoxGeometry(11.5, 0.22, 0.22));
  for (const bz of [-2.2, -0.4, 1.4]) {
    const beam = new THREE.Mesh(beamGeo, frameMat);
    beam.position.set(0, 4.65, bz);
    group.add(beam);
  }

  // Ceiling LED Accent Strips + Warm Pendant Spot Hoods
  const warmLedMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xfef3c7 }));
  const accentPinkMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xf43f5e }));

  const heroLamp = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.24, 0.2, 14)), frameMat);
  heroLamp.position.set(0.95, 4.15, 0.75);
  group.add(heroLamp);

  const heroBulb = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.18, 14)), warmLedMat);
  heroBulb.rotation.x = Math.PI / 2;
  heroBulb.position.set(0.95, 4.04, 0.75);
  group.add(heroBulb);

  const soffitStrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.5, 0.04, 0.05)), accentPinkMat);
  soffitStrip.position.set(0.5, 3.92, -3.32);
  group.add(soffitStrip);

  // Subtle backstage warm/crimson fill point light
  const backGlowLight = new THREE.PointLight(0xf43f5e, 4.5, 8, 1.6);
  backGlowLight.position.set(0.3, 2.5, -1.6);
  group.add(backGlowLight);

  const heroRimPoint = new THREE.PointLight(0x60a5fa, 3.8, 7, 1.6);
  heroRimPoint.position.set(2.2, 2.3, -0.8);
  group.add(heroRimPoint);

  const update = (time: number) => {
    // Gentle realistic pendulum sway on heavy punching bag
    heavyBagPivot.rotation.z = Math.sin(time * 0.85) * 0.032;
    heavyBagPivot.rotation.x = Math.cos(time * 0.62) * 0.018;
    // Subtle pulse on LED backdrop glow
    screenMat.emissiveIntensity = 0.62 + Math.sin(time * 1.4) * 0.05;
    backGlowLight.intensity = 4.2 + Math.sin(time * 1.4) * 0.45;
  };

  const dispose = () => {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
  };

  return {
    group,
    update,
    dispose,
  };
}
