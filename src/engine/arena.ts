import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createApronTexture,
  createArenaFloorTexture,
  createArenaPosterTexture,
  createFasciaBannerTexture,
  createJumbotronTexture,
  createLightBeamTexture,
  createRingCanvasTexture,
  createWalkoutSignTexture,
} from './textures';

export interface RopeContact {
  x: number;
  z: number;
  minY: number;
  maxY: number;
  radius: number;
  vx: number;
  vz: number;
}

export interface ArenaHandle {
  group: THREE.Group;
  crowdMesh: THREE.InstancedMesh;
  crowdCount: number;
  crowdBaseMatrices: Float32Array;
  updateCrowd: (time: number, excitement: number, dt?: number) => void;
  updateRopes: (dt: number, contacts: readonly RopeContact[]) => void;
  setCornerStoolsVisible: (visible: boolean) => void;
  triggerCameraFlash: (burstCount?: number) => void;
  dispose: () => void;
}

export const RING_HALF_SIZE = 3.7;
export const PLAYABLE_HALF_BOUND = 3.64;
export const ROPE_CONTACT_THRESHOLD = 3.32;

const ROPE_SPINE_NODES = 25;
const ROPE_RADIAL_SEGS = 8;
const ROPE_RADIUS = 0.025;
const ROPE_SPAN_HALF = RING_HALF_SIZE - 0.24;

// Zero-GC scratch vectors for dynamic rope mesh updates
const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _binormal = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

interface DynamicRope {
  axis: 'x' | 'z';
  sideSign: -1 | 1;
  baseY: number;
  geometry: THREE.BufferGeometry;
  disp: Float32Array;
  vel: Float32Array;
  sag: Float32Array;
  velSag: Float32Array;
  posArray: Float32Array;
  normArray: Float32Array;
  dirty: boolean;
}

interface RopeSpacer {
  mesh: THREE.Mesh;
  axis: 'x' | 'z';
  sideSign: -1 | 1;
  alongCoord: number;
  nodeIndex: number;
}

function createDynamicRopeGeometry(): THREE.BufferGeometry {
  const ringVerts = ROPE_RADIAL_SEGS + 1;
  const vertCount = ROPE_SPINE_NODES * ringVerts;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices: number[] = [];

  for (let i = 0; i < ROPE_SPINE_NODES; i++) {
    const u = i / (ROPE_SPINE_NODES - 1);
    for (let r = 0; r <= ROPE_RADIAL_SEGS; r++) {
      const idx = i * ringVerts + r;
      uvs[idx * 2] = u * 16;
      uvs[idx * 2 + 1] = r / ROPE_RADIAL_SEGS;
    }
  }

  for (let i = 0; i < ROPE_SPINE_NODES - 1; i++) {
    for (let r = 0; r < ROPE_RADIAL_SEGS; r++) {
      const a = i * ringVerts + r;
      const b = (i + 1) * ringVerts + r;
      const c = (i + 1) * ringVerts + r + 1;
      const d = i * ringVerts + r + 1;
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function getRopePoint(rope: DynamicRope, i: number, out: THREE.Vector3) {
  const t = -1 + (2 * i) / (ROPE_SPINE_NODES - 1);
  const along = t * ROPE_SPAN_HALF;
  const d = rope.disp[i];
  const y = rope.baseY + rope.sag[i];
  if (rope.axis === 'x') {
    out.set(along, y, rope.sideSign * (RING_HALF_SIZE + d));
  } else {
    out.set(rope.sideSign * (RING_HALF_SIZE + d), y, along);
  }
}

function rebuildRopeVertices(rope: DynamicRope) {
  const ringVerts = ROPE_RADIAL_SEGS + 1;
  const pos = rope.posArray;
  const norm = rope.normArray;

  for (let i = 0; i < ROPE_SPINE_NODES; i++) {
    const iPrev = Math.max(0, i - 1);
    const iNext = Math.min(ROPE_SPINE_NODES - 1, i + 1);
    getRopePoint(rope, iPrev, _p0);
    getRopePoint(rope, iNext, _p1);
    _tangent.subVectors(_p1, _p0).normalize();

    getRopePoint(rope, i, _p0);
    _binormal.crossVectors(_tangent, _up);
    if (_binormal.lengthSq() < 1e-6) {
      _binormal.set(1, 0, 0);
    } else {
      _binormal.normalize();
    }
    _normal.crossVectors(_binormal, _tangent).normalize();

    for (let r = 0; r <= ROPE_RADIAL_SEGS; r++) {
      const theta = (r / ROPE_RADIAL_SEGS) * Math.PI * 2;
      const cs = Math.cos(theta);
      const sn = Math.sin(theta);

      const nx = _binormal.x * cs + _normal.x * sn;
      const ny = _binormal.y * cs + _normal.y * sn;
      const nz = _binormal.z * cs + _normal.z * sn;

      const vIdx = (i * ringVerts + r) * 3;
      pos[vIdx] = _p0.x + nx * ROPE_RADIUS;
      pos[vIdx + 1] = _p0.y + ny * ROPE_RADIUS;
      pos[vIdx + 2] = _p0.z + nz * ROPE_RADIUS;

      norm[vIdx] = nx;
      norm[vIdx + 1] = ny;
      norm[vIdx + 2] = nz;
    }
  }

  (rope.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  (rope.geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
  rope.geometry.computeBoundingSphere();
}

function createStadiumSeatGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Seat cushion pan
  const pan = new THREE.BoxGeometry(0.46, 0.08, 0.42);
  pan.translate(0, 0.24, 0.04);
  parts.push(pan);

  // Contoured backrest angled slightly backward (-Z local)
  const back = new THREE.BoxGeometry(0.46, 0.44, 0.07);
  back.rotateX(-0.14);
  back.translate(0, 0.48, -0.17);
  parts.push(back);

  // Left & right armrests / brackets
  for (const sx of [-0.24, 0.24]) {
    const arm = new THREE.BoxGeometry(0.045, 0.05, 0.36);
    arm.translate(sx, 0.36, -0.01);
    parts.push(arm);

    const leg = new THREE.BoxGeometry(0.04, 0.26, 0.05);
    leg.translate(sx * 0.85, 0.13, 0);
    parts.push(leg);
  }

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

function createSpectatorGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Seated torso + chest
  const torso = new THREE.BoxGeometry(0.36, 0.42, 0.2);
  torso.translate(0, 0.46, -0.02);
  parts.push(torso);

  // Broadened shoulders
  const shoulders = new THREE.CapsuleGeometry(0.11, 0.24, 4, 6);
  shoulders.rotateZ(Math.PI / 2);
  shoulders.translate(0, 0.63, -0.02);
  parts.push(shoulders);

  // Head
  const head = new THREE.SphereGeometry(0.115, 8, 7);
  head.scale(0.92, 1.08, 0.96);
  head.translate(0, 0.83, 0.0);
  parts.push(head);

  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export function createBoxingArena(
  maxAnisotropy: number,
  isSoftwareGl: boolean,
): ArenaHandle {
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
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  // =========================================================================
  // 1. ARENA CONCOURSE FLOOR & PERIMETER STADIUM WALLS
  // =========================================================================
  const floorTex = trackTex(createArenaFloorTexture(maxAnisotropy));
  const arenaFloorGeo = trackGeo(new THREE.CircleGeometry(36, 56));
  const arenaFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.82,
      metalness: 0.14,
    }),
  );
  const arenaFloor = new THREE.Mesh(arenaFloorGeo, arenaFloorMat);
  arenaFloor.rotation.x = -Math.PI / 2;
  arenaFloor.position.y = -1.1;
  arenaFloor.receiveShadow = true;
  group.add(arenaFloor);

  // Subtle ringside safety mat surrounding the ring skirt
  const ringsideMatGeo = trackGeo(new THREE.BoxGeometry(10.6, 0.04, 10.6));
  const ringsideMatMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x101622,
      roughness: 0.88,
      metalness: 0.06,
    }),
  );
  const ringsideMat = new THREE.Mesh(ringsideMatGeo, ringsideMatMat);
  ringsideMat.position.y = -1.08;
  ringsideMat.receiveShadow = true;
  group.add(ringsideMat);

  // Outer arena acoustic bowl wall & upper mezzanine columns
  const stadiumWallGeo = trackGeo(
    new THREE.CylinderGeometry(20.5, 20.5, 11.5, 24, 1, true),
  );
  const stadiumWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b0f18,
      roughness: 0.9,
      metalness: 0.12,
      side: THREE.BackSide,
    }),
  );
  const stadiumWall = new THREE.Mesh(stadiumWallGeo, stadiumWallMat);
  stadiumWall.position.y = 4.5;
  group.add(stadiumWall);

  // Upper illuminated LED fascia ribbon circling the stadium bowl
  const fasciaTex = trackTex(createFasciaBannerTexture(maxAnisotropy));
  const fasciaGeo = trackGeo(
    new THREE.CylinderGeometry(16.6, 16.6, 0.95, 40, 1, true),
  );
  const fasciaMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: fasciaTex,
      side: THREE.BackSide,
    }),
  );
  const fasciaRing = new THREE.Mesh(fasciaGeo, fasciaMat);
  fasciaRing.position.y = 3.55;
  group.add(fasciaRing);

  // Structural stadium columns around outer bowl (skipping -Z walkout corridor)
  const columnGeo = trackGeo(new THREE.BoxGeometry(0.65, 11.2, 0.75));
  const columnMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x151c2a,
      roughness: 0.55,
      metalness: 0.5,
    }),
  );
  const colCount = 12;
  for (let c = 0; c < colCount; c++) {
    const angle = (c / colCount) * Math.PI * 2;
    const cx = Math.cos(angle) * 19.6;
    const cz = Math.sin(angle) * 19.6;
    // Leave walkout entrance tunnel (-Z) clear
    if (cz < -14 && Math.abs(cx) < 4.5) continue;
    const col = new THREE.Mesh(columnGeo, columnMat);
    col.position.set(cx, 4.4, cz);
    col.lookAt(0, 4.4, 0);
    group.add(col);
  }

  // =========================================================================
  // 2. FRAMED & BACKLIT BOXING EVENT POSTERS AROUND THE ARENA
  // =========================================================================
  const posterTextures = [0, 1, 2, 3].map((v) =>
    trackTex(createArenaPosterTexture(v, maxAnisotropy)),
  );
  const posterMaterials = posterTextures.map((tex) =>
    trackMat(
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: 0.42,
        roughness: 0.42,
        metalness: 0.08,
      }),
    ),
  );
  const posterFrameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.78,
    }),
  );
  const posterLampMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfde68a,
    }),
  );

  const posterPlacements: Array<{
    x: number;
    y: number;
    z: number;
    rotY: number;
    scale: number;
    variant: number;
  }> = [
    // Flanking the Boxer Entrance Tunnel (clearly visible behind fighters in broadcast view)
    { x: -4.2, y: 1.85, z: -12.35, rotY: 0.16, scale: 1.05, variant: 0 },
    { x: 4.2, y: 1.85, z: -12.35, rotY: -0.16, scale: 1.05, variant: 1 },
    { x: -6.9, y: 2.1, z: -11.4, rotY: 0.36, scale: 1.12, variant: 2 },
    { x: 6.9, y: 2.1, z: -11.4, rotY: -0.36, scale: 1.12, variant: 3 },
    // Concourse & upper mezzanine fight posters around left, right & front-sides
    { x: -15.8, y: 2.8, z: -5.2, rotY: Math.PI / 2 - 0.32, scale: 1.35, variant: 1 },
    { x: -16.2, y: 2.8, z: 3.4, rotY: Math.PI / 2 + 0.22, scale: 1.35, variant: 2 },
    { x: 15.8, y: 2.8, z: -5.2, rotY: -Math.PI / 2 + 0.32, scale: 1.35, variant: 3 },
    { x: 16.2, y: 2.8, z: 3.4, rotY: -Math.PI / 2 - 0.22, scale: 1.35, variant: 0 },
    { x: -6.5, y: 2.9, z: 15.6, rotY: Math.PI - 0.35, scale: 1.35, variant: 0 },
    { x: 6.5, y: 2.9, z: 15.6, rotY: Math.PI + 0.35, scale: 1.35, variant: 2 },
  ];

  const posterPlaneGeo = trackGeo(new THREE.PlaneGeometry(1.75, 2.46));
  const posterBoxGeo = trackGeo(new THREE.BoxGeometry(1.94, 2.66, 0.12));
  const posterLightBarGeo = trackGeo(new THREE.BoxGeometry(1.5, 0.06, 0.14));

  for (const p of posterPlacements) {
    const posterGroup = new THREE.Group();
    posterGroup.position.set(p.x, p.y, p.z);
    posterGroup.rotation.y = p.rotY;
    posterGroup.scale.setScalar(p.scale);

    const frame = new THREE.Mesh(posterBoxGeo, posterFrameMat);
    posterGroup.add(frame);

    const art = new THREE.Mesh(
      posterPlaneGeo,
      posterMaterials[p.variant % posterMaterials.length],
    );
    art.position.z = 0.065;
    posterGroup.add(art);

    const topBar = new THREE.Mesh(posterLightBarGeo, posterLampMat);
    topBar.position.set(0, 1.36, 0.12);
    posterGroup.add(topBar);

    group.add(posterGroup);
  }

  // =========================================================================
  // 3. BOXER ENTRANCE & EXIT TUNNEL / WALKOUT STAGE (-Z AXIS)
  // =========================================================================
  const walkoutGroup = new THREE.Group();
  group.add(walkoutGroup);

  const rampMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b0d14,
      roughness: 0.72,
      metalness: 0.08,
    }),
  );
  const trimSteelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.32,
      metalness: 0.82,
    }),
  );
  const darkTrussMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.82,
    }),
  );
  const goldStripMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
  );
  const redNeonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xef4444 }),
  );
  const blueNeonMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x3b82f6 }),
  );

  // Walkout Runway carpet from tunnel (z = -17.5) up to ring steps (z = -4.9)
  const runwayGeo = trackGeo(new THREE.BoxGeometry(2.5, 0.08, 12.8));
  const runway = new THREE.Mesh(runwayGeo, rampMat);
  runway.position.set(0, -1.06, -11.3);
  runway.receiveShadow = true;
  walkoutGroup.add(runway);

  // Illuminated LED runway edge rails + stanchion crowd barriers
  const railStripGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.04, 12.6));
  const barrierPostGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.038, 0.88, 8));
  const barrierCordGeo = trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 8));
  for (const sx of [-1.28, 1.28]) {
    const strip = new THREE.Mesh(railStripGeo, sx < 0 ? redNeonMat : blueNeonMat);
    strip.position.set(sx, -1.01, -11.2);
    walkoutGroup.add(strip);

    for (let z = -5.4; z >= -11.6; z -= 2.0) {
      const stanchion = new THREE.Mesh(barrierPostGeo, trimSteelMat);
      stanchion.position.set(sx * 1.14, -0.66, z);
      walkoutGroup.add(stanchion);

      if (z > -11.4) {
        const cord = new THREE.Mesh(
          barrierCordGeo,
          sx < 0 ? redNeonMat : blueNeonMat,
        );
        cord.rotation.x = Math.PI / 2;
        cord.position.set(sx * 1.14, -0.34, z - 1.0);
        walkoutGroup.add(cord);
      }
    }
  }

  // Ring Entrance Stairs connecting Walkout Runway (-1.06) to Ring Apron (0)
  const stepWidth = 1.95;
  const stepMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.65,
    }),
  );
  const stepTreadGeo = trackGeo(new THREE.BoxGeometry(stepWidth, 0.14, 0.34));
  const stepLedGeo = trackGeo(new THREE.BoxGeometry(stepWidth - 0.16, 0.025, 0.04));
  for (let s = 0; s < 4; s++) {
    const sy = -0.94 + s * 0.27;
    const sz = -4.98 + s * 0.27;
    const step = new THREE.Mesh(stepTreadGeo, stepMat);
    step.position.set(0, sy, sz);
    step.castShadow = !isSoftwareGl;
    step.receiveShadow = true;
    walkoutGroup.add(step);

    const stepLed = new THREE.Mesh(stepLedGeo, goldStripMat);
    stepLed.position.set(0, sy + 0.072, sz - 0.15);
    walkoutGroup.add(stepLed);
  }

  // Grand Boxer Entrance / Exit Portal Arch at z = -12.6
  const portalPillarGeo = trackGeo(new THREE.BoxGeometry(0.62, 4.1, 0.72));
  for (const sx of [-2.15, 2.15]) {
    const pillar = new THREE.Mesh(portalPillarGeo, darkTrussMat);
    pillar.position.set(sx, 0.95, -12.6);
    walkoutGroup.add(pillar);

    // Vertical corner-colored LED light strip along the tunnel entrance
    const ledGeo = trackGeo(new THREE.BoxGeometry(0.12, 3.6, 0.12));
    const led = new THREE.Mesh(ledGeo, sx < 0 ? redNeonMat : blueNeonMat);
    led.position.set(sx + (sx < 0 ? 0.32 : -0.32), 0.9, -12.22);
    walkoutGroup.add(led);
  }

  // Overhead Walkout Sign Gantry
  const walkoutSignTex = trackTex(createWalkoutSignTexture(maxAnisotropy));
  const gantryBoxGeo = trackGeo(new THREE.BoxGeometry(5.2, 1.15, 0.65));
  const gantryBox = new THREE.Mesh(gantryBoxGeo, darkTrussMat);
  gantryBox.position.set(0, 3.25, -12.55);
  walkoutGroup.add(gantryBox);

  const walkoutSignGeo = trackGeo(new THREE.PlaneGeometry(4.85, 0.98));
  const walkoutSignMat = trackMat(
    new THREE.MeshBasicMaterial({ map: walkoutSignTex }),
  );
  const walkoutSign = new THREE.Mesh(walkoutSignGeo, walkoutSignMat);
  walkoutSign.position.set(0, 3.25, -12.21);
  walkoutGroup.add(walkoutSign);

  // Receding Walkout Tunnel Corridor (walls, ceiling, atmospheric backstage glow)
  const tunnelSideGeo = trackGeo(new THREE.BoxGeometry(0.35, 3.8, 6.2));
  const tunnelWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0c111d,
      roughness: 0.75,
      metalness: 0.25,
    }),
  );
  for (const sx of [-2.0, 2.0]) {
    const tw = new THREE.Mesh(tunnelSideGeo, tunnelWallMat);
    tw.position.set(sx, 0.8, -15.7);
    walkoutGroup.add(tw);
  }
  const tunnelCeilGeo = trackGeo(new THREE.BoxGeometry(4.3, 0.35, 6.2));
  const tunnelCeil = new THREE.Mesh(tunnelCeilGeo, tunnelWallMat);
  tunnelCeil.position.set(0, 2.85, -15.7);
  walkoutGroup.add(tunnelCeil);

  // Backlit locker-room haze door at far end of tunnel
  const tunnelBackGeo = trackGeo(new THREE.PlaneGeometry(3.6, 3.7));
  const tunnelBackMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x1e3a5f,
      transparent: true,
      opacity: 0.52,
    }),
  );
  const tunnelBack = new THREE.Mesh(tunnelBackGeo, tunnelBackMat);
  tunnelBack.position.set(0, 0.78, -18.6);
  walkoutGroup.add(tunnelBack);

  // =========================================================================
  // 4. REALISTIC TIERED STADIUM RISERS, SEATS & SPECTATORS
  // =========================================================================
  const riserMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x131926,
      roughness: 0.85,
      metalness: 0.14,
    }),
  );
  const seatGeo = trackGeo(createStadiumSeatGeometry());
  const seatMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.22,
    }),
  );

  // Guardrail separating ringside apron from stadium lower bowl
  const railPostGeo = trackGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6));
  const railBarGeo = trackGeo(new THREE.BoxGeometry(1.4, 0.045, 0.045));
  const guardRailCount = 24;
  for (let g = 0; g < guardRailCount; g++) {
    const ang = (g / guardRailCount) * Math.PI * 2;
    const gx = Math.cos(ang) * 7.65;
    const gz = Math.sin(ang) * 7.65;
    // Open gap at -Z for boxer entrance/exit tunnel
    if (gz < -5.8 && Math.abs(gx) < 2.2) continue;

    const rp = new THREE.Mesh(railPostGeo, trimSteelMat);
    rp.position.set(gx, -0.65, gz);
    group.add(rp);

    const bar = new THREE.Mesh(railBarGeo, trimSteelMat);
    bar.position.set(gx, -0.24, gz);
    bar.rotation.y = -ang + Math.PI / 2;
    group.add(bar);
  }

  // Build 4 concentric stepped bleacher tiers (in 7 sectors, skipping -Z walkout)
  const seatPlacements: Array<{
    x: number;
    y: number;
    z: number;
    tier: number;
    idx: number;
  }> = [];

  const numTiers = 4;
  const arcSegments = 28;
  for (let tier = 0; tier < numTiers; tier++) {
    const radius = 8.65 + tier * 1.48;
    const riserHeight = 0.58 + tier * 0.56;
    const riserY = -1.1 + riserHeight / 2;

    // Stepped concrete riser segments around the bowl (leaving -Z walkout gap open)
    const segLen = (2 * Math.PI * radius) / arcSegments + 0.14;
    const riserBlockGeo = trackGeo(new THREE.BoxGeometry(segLen, riserHeight, 1.42));

    for (let s = 0; s < arcSegments; s++) {
      const ang = (s / arcSegments) * Math.PI * 2;
      const sx = Math.cos(ang) * radius;
      const sz = Math.sin(ang) * radius;
      // Leave -Z Boxer Entrance corridor open
      if (sz < -5 && Math.abs(sx) < 2.8) continue;

      const block = new THREE.Mesh(riserBlockGeo, riserMat);
      block.position.set(sx, riserY, sz);
      block.rotation.y = -ang + Math.PI / 2;
      block.receiveShadow = true;
      group.add(block);
    }

    // Place stadium seats along this tier
    const seatsInTier = 72 + tier * 12;
    for (let k = 0; k < seatsInTier; k++) {
      const ang = (k / seatsInTier) * Math.PI * 2 + tier * 0.03;
      // Narrow aisle gaps every ~45 degrees
      const sectorMod = ((ang + Math.PI) % (Math.PI / 4));
      if (sectorMod < 0.08) continue;

      const x = Math.cos(ang) * radius;
      const z = Math.sin(ang) * radius;
      if (z < -4.5 && Math.abs(x) < 2.85) continue;

      const floorY = -1.1 + riserHeight;
      seatPlacements.push({ x, y: floorY, z, tier, idx: seatPlacements.length });
    }
  }

  const dummy = new THREE.Object3D();
  const seatCount = seatPlacements.length;
  const seatMesh = new THREE.InstancedMesh(seatGeo, seatMat, seatCount);
  seatMesh.frustumCulled = false;
  for (let i = 0; i < seatCount; i++) {
    const sp = seatPlacements[i];
    dummy.position.set(sp.x, sp.y, sp.z);
    dummy.lookAt(0, sp.y, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    seatMesh.setMatrixAt(i, dummy.matrix);
  }
  seatMesh.instanceMatrix.needsUpdate = true;
  seatMesh.computeBoundingSphere();
  group.add(seatMesh);

  // Realistic Spectators seated in the stadium chairs (InstancedMesh)
  const crowdCount = Math.min(260, seatCount);
  const crowdGeo = trackGeo(createSpectatorGeometry());
  const crowdMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.06,
    }),
  );
  const crowdMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdCount);
  crowdMesh.frustumCulled = false;

  const color = new THREE.Color();
  const crowdBaseMatrices = new Float32Array(crowdCount * 4); // x, y, z, phase
  const stride = seatCount / crowdCount;

  for (let i = 0; i < crowdCount; i++) {
    const seatIdx = Math.min(seatCount - 1, Math.floor(i * stride + (i % 3 === 0 ? 0 : 0.4)));
    const sp = seatPlacements[seatIdx];
    const x = sp.x;
    const y = sp.y + 0.04;
    const z = sp.z;

    crowdBaseMatrices[i * 4 + 0] = x;
    crowdBaseMatrices[i * 4 + 1] = y;
    crowdBaseMatrices[i * 4 + 2] = z;
    crowdBaseMatrices[i * 4 + 3] = (i * 0.73) % (Math.PI * 2);

    dummy.position.set(x, y, z);
    dummy.lookAt(0, y, 0);
    const scale = 0.9 + ((i * 17) % 9) * 0.022;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(i, dummy.matrix);

    const paletteIdx = i % 7;
    if (paletteIdx === 0) color.setHex(0x1e293b);
    else if (paletteIdx === 1) color.setHex(0x475569);
    else if (paletteIdx === 2) color.setHex(0x7f1d1d);
    else if (paletteIdx === 3) color.setHex(0x1e3a8a);
    else if (paletteIdx === 4) color.setHex(0x3f3f46);
    else if (paletteIdx === 5) color.setHex(0x78350f);
    else color.setHex(0x312e81);
    crowdMesh.setColorAt(i, color);
  }
  crowdMesh.instanceMatrix.needsUpdate = true;
  if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  crowdMesh.computeBoundingSphere();
  group.add(crowdMesh);

  // Ringside Commentator / Judges Tables (+Z, +X, -X sides — low profile below camera)
  const tableGeo = trackGeo(new THREE.BoxGeometry(2.8, 0.72, 0.72));
  const tableMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.25,
    }),
  );
  const monitorGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.26, 0.04));
  const monitorMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
  );
  for (const tbl of [
    { x: 0, z: 5.25, rotY: 0 },
    { x: -5.25, z: 0, rotY: Math.PI / 2 },
    { x: 5.25, z: 0, rotY: -Math.PI / 2 },
  ]) {
    const tGroup = new THREE.Group();
    tGroup.position.set(tbl.x, -0.74, tbl.z);
    tGroup.rotation.y = tbl.rotY;
    const table = new THREE.Mesh(tableGeo, tableMat);
    tGroup.add(table);
    for (const mx of [-0.72, 0, 0.72]) {
      const mon = new THREE.Mesh(monitorGeo, monitorMat);
      mon.position.set(mx, 0.48, 0.05);
      mon.rotation.x = -0.3;
      tGroup.add(mon);
    }
    group.add(tGroup);
  }

  // Stadium Camera Flashes (lightweight InstancedMesh in bleachers, zero GC)
  const FLASH_COUNT = 14;
  const flashGeo = trackGeo(new THREE.PlaneGeometry(0.28, 0.28));
  const flashMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  const flashMesh = new THREE.InstancedMesh(flashGeo, flashMat, FLASH_COUNT);
  flashMesh.frustumCulled = false;
  const flashLife = new Float32Array(FLASH_COUNT);
  const flashCoords = new Float32Array(FLASH_COUNT * 3);
  for (let i = 0; i < FLASH_COUNT; i++) {
    // Spread around bleachers skipping the -Z entrance tunnel sector
    const tNorm = i / FLASH_COUNT;
    const angle = -Math.PI * 0.72 + tNorm * Math.PI * 1.44;
    const radius = 9.4 + (i % 3) * 1.35;
    flashCoords[i * 3 + 0] = Math.sin(angle) * radius;
    flashCoords[i * 3 + 1] = 0.95 + (i % 4) * 0.65;
    flashCoords[i * 3 + 2] = Math.cos(angle) * radius;
    dummy.position.set(0, -30, 0);
    dummy.scale.setScalar(0.001);
    dummy.updateMatrix();
    flashMesh.setMatrixAt(i, dummy.matrix);
  }
  flashMesh.instanceMatrix.needsUpdate = true;
  group.add(flashMesh);

  // Corner Stools (shown only during between_rounds corner recovery)
  const stoolGroup = new THREE.Group();
  stoolGroup.visible = false;
  const stoolSeatGeo = trackGeo(new THREE.CylinderGeometry(0.21, 0.2, 0.06, 16));
  const stoolLegGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.015, 0.44, 8));
  const stoolChromeMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.85 }),
  );
  const stoolConfigs = [
    { x: -2.92, z: -2.92, color: 0xb91c1c },
    { x: 2.92, z: 2.92, color: 0x1d4ed8 },
  ];
  for (const sc of stoolConfigs) {
    const sItem = new THREE.Group();
    sItem.position.set(sc.x, 0, sc.z);
    const cushionMat = trackMat(
      new THREE.MeshStandardMaterial({ color: sc.color, roughness: 0.48, metalness: 0.08 }),
    );
    const seat = new THREE.Mesh(stoolSeatGeo, cushionMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    sItem.add(seat);
    for (let l = 0; l < 4; l++) {
      const a = (l / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = new THREE.Mesh(stoolLegGeo, stoolChromeMat);
      leg.position.set(Math.cos(a) * 0.13, 0.22, Math.sin(a) * 0.13);
      leg.rotation.z = Math.cos(a) * 0.1;
      leg.rotation.x = -Math.sin(a) * 0.1;
      sItem.add(leg);
    }
    stoolGroup.add(sItem);
  }
  group.add(stoolGroup);

  // =========================================================================
  // 5. REALISTIC BOXING RING PLATFORM, APRON, CORNER POSTS & TURNBUCKLES
  // =========================================================================
  const canvasTex = trackTex(createRingCanvasTexture(maxAnisotropy));
  const matSurfaceGeo = trackGeo(
    new THREE.BoxGeometry(RING_HALF_SIZE * 2 + 0.72, 0.14, RING_HALF_SIZE * 2 + 0.72),
  );
  const matSurfaceMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: canvasTex,
      roughness: 0.76,
      metalness: 0.04,
    }),
  );
  const matSurface = new THREE.Mesh(matSurfaceGeo, matSurfaceMat);
  matSurface.position.y = -0.07; // Top flush at y = 0
  matSurface.receiveShadow = true;
  group.add(matSurface);

  // Padded bevel canvas apron rail lip
  const padLipGeo = trackGeo(
    new THREE.BoxGeometry(RING_HALF_SIZE * 2 + 0.78, 0.07, RING_HALF_SIZE * 2 + 0.78),
  );
  const padLipMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.68,
      metalness: 0.1,
    }),
  );
  const padLip = new THREE.Mesh(padLipGeo, padLipMat);
  padLip.position.y = -0.145;
  group.add(padLip);

  // Ring Apron Skirt
  const apronTex = trackTex(createApronTexture(maxAnisotropy));
  const apronGeo = trackGeo(
    new THREE.BoxGeometry(RING_HALF_SIZE * 2 + 0.74, 0.94, RING_HALF_SIZE * 2 + 0.74),
  );
  const apronMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: apronTex,
      roughness: 0.72,
      metalness: 0.12,
    }),
  );
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.position.y = -0.63;
  apron.receiveShadow = true;
  group.add(apron);

  // Corner Posts, Flared Bases, Cushions & Individual Turnbuckles
  const postMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.28,
      metalness: 0.88,
    }),
  );
  const postConfigs = [
    { x: -RING_HALF_SIZE, z: -RING_HALF_SIZE, color: 0xb91c1c }, // Red Corner
    { x: RING_HALF_SIZE, z: RING_HALF_SIZE, color: 0x1d4ed8 }, // Blue Corner
    { x: RING_HALF_SIZE, z: -RING_HALF_SIZE, color: 0xe2e8f0 }, // Neutral
    { x: -RING_HALF_SIZE, z: RING_HALF_SIZE, color: 0xe2e8f0 }, // Neutral
  ];

  const postGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.095, 1.62, 14));
  const postCollarGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.17, 0.12, 14));
  const padGeo = trackGeo(new THREE.BoxGeometry(0.24, 1.18, 0.24));
  const capGeo = trackGeo(new THREE.SphereGeometry(0.098, 12, 10));

  for (const cfg of postConfigs) {
    const post = new THREE.Mesh(postGeo, postMetalMat);
    post.position.set(cfg.x, 0.72, cfg.z);
    post.castShadow = true;
    group.add(post);

    const collar = new THREE.Mesh(postCollarGeo, postMetalMat);
    collar.position.set(cfg.x, -0.02, cfg.z);
    group.add(collar);

    const cap = new THREE.Mesh(capGeo, postMetalMat);
    cap.position.set(cfg.x, 1.54, cfg.z);
    group.add(cap);

    const padMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.44,
        metalness: 0.08,
      }),
    );
    const pad = new THREE.Mesh(padGeo, padMat);
    const inwardX = cfg.x > 0 ? -0.12 : 0.12;
    const inwardZ = cfg.z > 0 ? -0.12 : 0.12;
    pad.position.set(cfg.x + inwardX, 0.84, cfg.z + inwardZ);
    pad.rotation.y = Math.PI / 4;
    pad.castShadow = true;
    group.add(pad);
  }

  // =========================================================================
  // 6. DYNAMIC RUBBER-ELASTIC RING ROPES, TURNBUCKLES & SPACER STRAPS
  // =========================================================================
  const ropeHeights = [0.42, 0.74, 1.06, 1.38];
  const ropeColors = [0xdc2626, 0xf1f5f9, 0xf1f5f9, 0x2563eb];
  const dynamicRopes: DynamicRope[] = [];
  const ropeSpacers: RopeSpacer[] = [];

  const turnbuckleCableGeo = trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8));
  const turnbuckleSleeveGeo = trackGeo(new THREE.CylinderGeometry(0.034, 0.034, 0.15, 8));
  const spacerGeo = trackGeo(new THREE.BoxGeometry(0.042, 1.0, 0.036));
  const spacerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.58,
      metalness: 0.1,
    }),
  );

  const ropeMaterials = ropeColors.map((col) =>
    trackMat(
      new THREE.MeshStandardMaterial({
        color: col,
        roughness: 0.36,
        metalness: 0.08,
      }),
    ),
  );

  const ropeSides: Array<{ axis: 'x' | 'z'; sideSign: -1 | 1 }> = [
    { axis: 'x', sideSign: -1 },
    { axis: 'x', sideSign: 1 },
    { axis: 'z', sideSign: -1 },
    { axis: 'z', sideSign: 1 },
  ];

  for (const side of ropeSides) {
    ropeHeights.forEach((y, rIdx) => {
      const geo = trackGeo(createDynamicRopeGeometry());
      const rope: DynamicRope = {
        axis: side.axis,
        sideSign: side.sideSign,
        baseY: y,
        geometry: geo,
        disp: new Float32Array(ROPE_SPINE_NODES),
        vel: new Float32Array(ROPE_SPINE_NODES),
        sag: new Float32Array(ROPE_SPINE_NODES),
        velSag: new Float32Array(ROPE_SPINE_NODES),
        posArray: (geo.attributes.position as THREE.BufferAttribute)
          .array as Float32Array,
        normArray: (geo.attributes.normal as THREE.BufferAttribute)
          .array as Float32Array,
        dirty: true,
      };
      rebuildRopeVertices(rope);
      rope.dirty = false;
      dynamicRopes.push(rope);

      const mesh = new THREE.Mesh(geo, ropeMaterials[rIdx]);
      mesh.castShadow = !isSoftwareGl;
      group.add(mesh);

      // Turnbuckle hardware bridging corner posts (±3.7) to rope ends (±3.46)
      for (const endSign of [-1, 1] as const) {
        const endCenter = endSign * (RING_HALF_SIZE - 0.12);
        const cable = new THREE.Mesh(turnbuckleCableGeo, postMetalMat);
        const sleeve = new THREE.Mesh(turnbuckleSleeveGeo, postMetalMat);
        if (side.axis === 'x') {
          cable.rotation.z = Math.PI / 2;
          sleeve.rotation.z = Math.PI / 2;
          cable.position.set(endCenter, y, side.sideSign * RING_HALF_SIZE);
          sleeve.position.set(endCenter, y, side.sideSign * RING_HALF_SIZE);
        } else {
          cable.rotation.x = Math.PI / 2;
          sleeve.rotation.x = Math.PI / 2;
          cable.position.set(side.sideSign * RING_HALF_SIZE, y, endCenter);
          sleeve.position.set(side.sideSign * RING_HALF_SIZE, y, endCenter);
        }
        group.add(cable);
        group.add(sleeve);
      }
    });

    // Two vertical canvas rope spacers per side that ride on the ropes
    for (const alongCoord of [-1.42, 1.42]) {
      const spacer = new THREE.Mesh(spacerGeo, spacerMat);
      const midY = (ropeHeights[0] + ropeHeights[3]) * 0.5;
      if (side.axis === 'x') {
        spacer.position.set(alongCoord, midY, side.sideSign * RING_HALF_SIZE);
      } else {
        spacer.position.set(side.sideSign * RING_HALF_SIZE, midY, alongCoord);
      }
      group.add(spacer);

      const tNorm = (alongCoord / ROPE_SPAN_HALF + 1) * 0.5;
      const nodeIndex = Math.round(tNorm * (ROPE_SPINE_NODES - 1));
      ropeSpacers.push({
        mesh: spacer,
        axis: side.axis,
        sideSign: side.sideSign,
        alongCoord,
        nodeIndex,
      });
    }
  }

  // =========================================================================
  // 7. OVERHEAD BOXING LIGHTING TRUSS, JUMBOTRON & SPOTLIGHT BEAMS
  // =========================================================================
  const trussMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.34,
      metalness: 0.86,
    }),
  );
  const lampHousingMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.78,
    }),
  );
  const lampGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfff3d6,
    }),
  );

  const trussY = 6.15;
  const outerSpan = 8.4;
  const innerSpan = 4.2;
  const outerBeamXGeo = trackGeo(new THREE.BoxGeometry(outerSpan, 0.24, 0.24));
  const outerBeamZGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.24, outerSpan));
  const innerBeamXGeo = trackGeo(new THREE.BoxGeometry(innerSpan, 0.18, 0.18));
  const innerBeamZGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.18, innerSpan));
  const diagStrutGeo = trackGeo(new THREE.BoxGeometry(2.95, 0.12, 0.12));
  const cableGeo = trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 4.5, 6));

  for (const s of [-1, 1]) {
    const ob1 = new THREE.Mesh(outerBeamXGeo, trussMat);
    ob1.position.set(0, trussY, s * (outerSpan / 2));
    group.add(ob1);

    const ob2 = new THREE.Mesh(outerBeamZGeo, trussMat);
    ob2.position.set(s * (outerSpan / 2), trussY, 0);
    group.add(ob2);

    const ib1 = new THREE.Mesh(innerBeamXGeo, trussMat);
    ib1.position.set(0, trussY - 0.18, s * (innerSpan / 2));
    group.add(ib1);

    const ib2 = new THREE.Mesh(innerBeamZGeo, trussMat);
    ib2.position.set(s * (innerSpan / 2), trussY - 0.18, 0);
    group.add(ib2);
  }

  // Diagonal corner truss connectors & roof suspension cables
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const diag = new THREE.Mesh(diagStrutGeo, trussMat);
      diag.position.set(sx * 3.1, trussY - 0.08, sz * 3.1);
      diag.rotation.y = Math.atan2(sz, sx) * -1;
      group.add(diag);

      const cable = new THREE.Mesh(cableGeo, postMetalMat);
      cable.position.set(sx * (outerSpan / 2), trussY + 2.25, sz * (outerSpan / 2));
      group.add(cable);
    }
  }

  // Center 4-sided Boxing Arena Jumbotron Canopy + downward LED floodlights
  const jumboTex = trackTex(createJumbotronTexture(maxAnisotropy));
  const jumboCoreGeo = trackGeo(new THREE.BoxGeometry(2.6, 1.1, 2.6));
  const jumboPanelGeo = trackGeo(new THREE.PlaneGeometry(2.35, 0.92));
  const jumboPanelMat = trackMat(new THREE.MeshBasicMaterial({ map: jumboTex }));
  const floodPanelGeo = trackGeo(new THREE.PlaneGeometry(1.5, 1.5));

  const jumboGroup = new THREE.Group();
  jumboGroup.position.set(0, trussY - 0.62, 0);
  jumboGroup.add(new THREE.Mesh(jumboCoreGeo, trussMat));

  const jumboSides = [
    { x: 0, z: 1.31, ry: 0 },
    { x: 0, z: -1.31, ry: Math.PI },
    { x: 1.31, z: 0, ry: Math.PI / 2 },
    { x: -1.31, z: 0, ry: -Math.PI / 2 },
  ];
  for (const js of jumboSides) {
    const screen = new THREE.Mesh(jumboPanelGeo, jumboPanelMat);
    screen.position.set(js.x, 0, js.z);
    screen.rotation.y = js.ry;
    jumboGroup.add(screen);
  }

  // Downward LED light bank under the jumbotron
  const underFlood = new THREE.Mesh(floodPanelGeo, lampGlowMat);
  underFlood.position.set(0, -0.56, 0);
  underFlood.rotation.x = Math.PI / 2;
  jumboGroup.add(underFlood);
  group.add(jumboGroup);

  // 12 Par-Can Boxing Spotlights + Soft Volumetric Light Cones
  const parBarrelGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.21, 0.36, 12));
  const parLensGeo = trackGeo(new THREE.CircleGeometry(0.18, 12));
  const beamTex = trackTex(createLightBeamTexture());
  const beamConeGeo = trackGeo(
    new THREE.ConeGeometry(1.95, 5.6, 16, 1, true),
  );
  // Shift cone apex to origin (0,0,0) pointing downward (-Y)
  beamConeGeo.translate(0, -2.8, 0);

  const beamMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: beamTex,
      color: 0xfff2d6,
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );

  const spotlightCoords: Array<{ x: number; z: number; hasBeam: boolean }> = [
    { x: -3.2, z: -4.2, hasBeam: true },
    { x: 0, z: -4.2, hasBeam: false },
    { x: 3.2, z: -4.2, hasBeam: true },
    { x: -3.2, z: 4.2, hasBeam: true },
    { x: 0, z: 4.2, hasBeam: false },
    { x: 3.2, z: 4.2, hasBeam: true },
    { x: -4.2, z: -2.2, hasBeam: true },
    { x: -4.2, z: 2.2, hasBeam: true },
    { x: 4.2, z: -2.2, hasBeam: true },
    { x: 4.2, z: 2.2, hasBeam: true },
    { x: -2.1, z: -2.1, hasBeam: false },
    { x: 2.1, z: 2.1, hasBeam: false },
  ];

  for (const sc of spotlightCoords) {
    const fixture = new THREE.Group();
    fixture.position.set(sc.x, trussY - 0.16, sc.z);
    // Aim spotlight toward ring center
    fixture.lookAt(sc.x * 0.22, 0.4, sc.z * 0.22);

    const barrel = new THREE.Mesh(parBarrelGeo, lampHousingMat);
    barrel.rotation.x = Math.PI / 2;
    fixture.add(barrel);

    const lens = new THREE.Mesh(parLensGeo, lampGlowMat);
    lens.position.z = 0.185;
    fixture.add(lens);

    if (sc.hasBeam) {
      const cone = new THREE.Mesh(beamConeGeo, beamMat);
      // Cone points along -Y locally; rotate +90deg around X so it shoots along +Z (lookAt forward)
      cone.rotation.x = Math.PI / 2;
      cone.position.z = 0.18;
      fixture.add(cone);
    }

    group.add(fixture);
  }

  // =========================================================================
  // 8. UPDATE CALLBACKS (CROWD & RUBBER-ELASTIC ROPE PHYSICS)
  // =========================================================================
  let flashCursor = 0;
  let nextAutoFlashTime = 0;

  const triggerCameraFlash = (burstCount = 2) => {
    const count = Math.min(FLASH_COUNT, Math.max(1, burstCount));
    for (let k = 0; k < count; k++) {
      const idx = (flashCursor + k) % FLASH_COUNT;
      flashLife[idx] = 0.16 + Math.random() * 0.08;
    }
    flashCursor = (flashCursor + count) % FLASH_COUNT;
  };

  const setCornerStoolsVisible = (visible: boolean) => {
    stoolGroup.visible = visible;
  };

  const updateCrowd = (time: number, excitement: number, dt = 0.016) => {
    const amp = 0.025 + excitement * 0.2;
    const speed = 2.6 + excitement * 7.8;
    for (let i = 0; i < crowdCount; i++) {
      const bx = crowdBaseMatrices[i * 4 + 0];
      const by = crowdBaseMatrices[i * 4 + 1];
      const bz = crowdBaseMatrices[i * 4 + 2];
      const phase = crowdBaseMatrices[i * 4 + 3];
      const bob = Math.max(0, Math.sin(time * speed + phase)) * amp;
      dummy.position.set(bx, by + bob, bz);
      dummy.lookAt(0, by + bob, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      crowdMesh.setMatrixAt(i, dummy.matrix);
    }
    crowdMesh.instanceMatrix.needsUpdate = true;

    if (excitement > 0.35 && time >= nextAutoFlashTime) {
      triggerCameraFlash(excitement > 0.72 ? 3 : 1);
      nextAutoFlashTime = time + Math.max(0.22, 1.35 - excitement * 1.05);
    }
    let anyFlash = false;
    for (let i = 0; i < FLASH_COUNT; i++) {
      if (flashLife[i] > 0) {
        anyFlash = true;
        flashLife[i] = Math.max(0, flashLife[i] - dt);
        const s = flashLife[i] > 0 ? (flashLife[i] / 0.22) * 1.65 : 0.001;
        dummy.position.set(
          flashCoords[i * 3 + 0],
          flashLife[i] > 0 ? flashCoords[i * 3 + 1] : -30,
          flashCoords[i * 3 + 2],
        );
        dummy.lookAt(0, flashCoords[i * 3 + 1], 0);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        flashMesh.setMatrixAt(i, dummy.matrix);
      }
    }
    if (anyFlash) {
      flashMesh.instanceMatrix.needsUpdate = true;
    }
  };

  const updateRopes = (dt: number, contacts: readonly RopeContact[]) => {
    const clampedDt = Math.min(Math.max(dt, 0.001), 0.035);
    const substeps = 4;
    const subDt = clampedDt / substeps;
    const tension = 380;
    const anchorK = 26;
    const damping = 6.2;

    for (let rIdx = 0; rIdx < dynamicRopes.length; rIdx++) {
      const rope = dynamicRopes[rIdx];
      let maxEnergy = 0;

      // Apply external boxer contacts directly as elastic boundary envelope
      for (let c = 0; c < contacts.length; c++) {
        const ct = contacts[c];
        // Vertical proximity to this rope height
        if (rope.baseY < ct.minY - 0.16 || rope.baseY > ct.maxY + 0.12) continue;

        const perpCoord = rope.axis === 'x' ? ct.z : ct.x;
        const alongCoord = rope.axis === 'x' ? ct.x : ct.z;
        const perpVel = rope.axis === 'x' ? ct.vz : ct.vx;

        // Distance from fighter center to this rope's side in outward direction
        const signedCoord = perpCoord * rope.sideSign;
        const penetration = signedCoord + ct.radius - RING_HALF_SIZE;
        if (penetration > 0) {
          const contactHalfSpan = ct.radius + 0.28;
          const outwardVel = Math.max(0, perpVel * rope.sideSign);

          for (let i = 1; i < ROPE_SPINE_NODES - 1; i++) {
            const nodeAlong =
              (-1 + (2 * i) / (ROPE_SPINE_NODES - 1)) * ROPE_SPAN_HALF;
            const distAlong = Math.abs(nodeAlong - alongCoord);
            if (distAlong < contactHalfSpan) {
              const weight = Math.cos(
                (distAlong / contactHalfSpan) * (Math.PI * 0.5),
              );
              const targetDisp = Math.min(0.56, penetration * weight);
              if (rope.disp[i] < targetDisp) {
                rope.disp[i] = targetDisp;
                rope.vel[i] = Math.max(rope.vel[i], outwardVel * 0.72 * weight);
                rope.sag[i] = Math.min(0.025, targetDisp * 0.09);
                rope.dirty = true;
              }
            }
          }
        }
      }

      // Check if rope needs physics integration
      for (let i = 1; i < ROPE_SPINE_NODES - 1; i++) {
        const e =
          Math.abs(rope.disp[i]) +
          Math.abs(rope.vel[i]) * 0.08 +
          Math.abs(rope.sag[i]);
        if (e > maxEnergy) maxEnergy = e;
      }

      if (maxEnergy < 0.0006 && !rope.dirty) {
        continue;
      }

      // 1D rubber-cord spring wave integration (Euler-Cromer substeps)
      for (let step = 0; step < substeps; step++) {
        for (let i = 1; i < ROPE_SPINE_NODES - 1; i++) {
          const lap = rope.disp[i - 1] - 2 * rope.disp[i] + rope.disp[i + 1];
          const acc =
            tension * lap - anchorK * rope.disp[i] - damping * rope.vel[i];
          rope.vel[i] += acc * subDt;

          const lapSag = rope.sag[i - 1] - 2 * rope.sag[i] + rope.sag[i + 1];
          const accSag =
            tension * 0.55 * lapSag - 38 * rope.sag[i] - 7.5 * rope.velSag[i];
          rope.velSag[i] += accSag * subDt;
        }
        for (let i = 1; i < ROPE_SPINE_NODES - 1; i++) {
          rope.disp[i] = THREE.MathUtils.clamp(
            rope.disp[i] + rope.vel[i] * subDt,
            -0.32,
            0.62,
          );
          rope.sag[i] = THREE.MathUtils.clamp(
            rope.sag[i] + rope.velSag[i] * subDt,
            -0.08,
            0.09,
          );
        }
      }

      // Re-clamp against penetration after spring integration so fighter never clips through
      for (let c = 0; c < contacts.length; c++) {
        const ct = contacts[c];
        if (rope.baseY < ct.minY - 0.16 || rope.baseY > ct.maxY + 0.12) continue;
        const perpCoord = rope.axis === 'x' ? ct.z : ct.x;
        const alongCoord = rope.axis === 'x' ? ct.x : ct.z;
        const penetration = perpCoord * rope.sideSign + ct.radius - RING_HALF_SIZE;
        if (penetration > 0) {
          const contactHalfSpan = ct.radius + 0.24;
          for (let i = 1; i < ROPE_SPINE_NODES - 1; i++) {
            const nodeAlong =
              (-1 + (2 * i) / (ROPE_SPINE_NODES - 1)) * ROPE_SPAN_HALF;
            const distAlong = Math.abs(nodeAlong - alongCoord);
            if (distAlong < contactHalfSpan) {
              const weight = Math.cos(
                (distAlong / contactHalfSpan) * (Math.PI * 0.5),
              );
              const minDisp = Math.min(0.56, penetration * weight);
              if (rope.disp[i] < minDisp) rope.disp[i] = minDisp;
            }
          }
        }
      }

      let residual = 0;
      for (let i = 1; i < ROPE_SPINE_NODES - 1; i++) {
        residual += Math.abs(rope.disp[i]) + Math.abs(rope.vel[i]) * 0.05;
      }

      if (residual < 0.002) {
        rope.disp.fill(0);
        rope.vel.fill(0);
        rope.sag.fill(0);
        rope.velSag.fill(0);
        rebuildRopeVertices(rope);
        rope.dirty = false;
      } else {
        rebuildRopeVertices(rope);
        rope.dirty = true;
      }
    }

    // Update vertical rope spacer straps so they move smoothly with the 4 ropes
    for (let s = 0; s < ropeSpacers.length; s++) {
      const sp = ropeSpacers[s];
      let dSum = 0;
      let dBottom = 0;
      let dTop = 0;
      for (let r = 0; r < dynamicRopes.length; r++) {
        const dr = dynamicRopes[r];
        if (dr.axis === sp.axis && dr.sideSign === sp.sideSign) {
          const val = dr.disp[sp.nodeIndex];
          dSum += val;
          if (dr.baseY < 0.5) dBottom = val;
          if (dr.baseY > 1.3) dTop = val;
        }
      }
      const avgDisp = dSum * 0.25;
      const tiltAngle = Math.atan2(dTop - dBottom, 0.96);
      if (sp.axis === 'x') {
        sp.mesh.position.z = sp.sideSign * (RING_HALF_SIZE + avgDisp);
        sp.mesh.rotation.x = sp.sideSign * tiltAngle;
      } else {
        sp.mesh.position.x = sp.sideSign * (RING_HALF_SIZE + avgDisp);
        sp.mesh.rotation.z = -sp.sideSign * tiltAngle;
      }
    }
  };

  const dispose = () => {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
  };

  return {
    group,
    crowdMesh,
    crowdCount,
    crowdBaseMatrices,
    updateCrowd,
    updateRopes,
    setCornerStoolsVisible,
    triggerCameraFlash,
    dispose,
  };
}
