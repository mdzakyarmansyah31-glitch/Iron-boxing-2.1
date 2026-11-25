import * as THREE from 'three';
import { BoxerAppearance } from '../types/game';
import {
  buildDomedIrisGeometry,
  buildHairLockGeometry,
  buildSculptedDeltoidGeometry,
  buildSculptedEyelidGeometry,
  buildSculptedHairCapGeometry,
  buildSculptedHeadGeometry,
  buildSculptedLimbGeometry,
  buildSculptedNeckGeometry,
  buildSculptedTorsoGeometry,
  resolveFacialTraits,
} from './boxerMesh';
import {
  createContactShadowTexture,
  createFaceTextures,
  createHairTextures,
  createIrisTexture,
  createLimbSkinTextures,
} from './textures';

export type RefereeMode =
  | 'stand_corner'
  | 'countdown'
  | 'officiate'
  | 'knockdown_count'
  | 'wave_off';

export interface RefereeRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  leftForearmRoll: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  rightForearmRoll: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  shadowMesh: THREE.Mesh;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

export interface RefereeAnimState {
  time: number;
  mode: RefereeMode;
  velX: number;
  velZ: number;
  facingAngle: number;
  smoothForward: number;
  smoothStrafe: number;
  gaitPhase: number;
  gaitWeight: number;
  countdownValue: number; // 3, 2, 1, or 0
  countBeat: number; // 0..1 impulse decaying after each count tick
  knockdownCount: number;
  headLookYaw: number;
}

let sharedRefShadowTex: THREE.CanvasTexture | null = null;

function createRefereeShirtTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  // Classic championship referee powder-blue shirt base
  ctx.fillStyle = '#a3c1de';
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle woven cotton texture
  for (let y = 0; y < size; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)';
    ctx.fillRect(0, y, size, 1);
    bCtx.fillStyle = y % 4 === 0 ? '#8c8c8c' : '#747474';
    bCtx.fillRect(0, y, size, 1);
  }

  // Center front button placket (u = 0.5 -> x = size/2)
  const midX = size * 0.5;
  ctx.fillStyle = '#8eb1d3';
  ctx.fillRect(midX - 7, 16, 14, size - 24);
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(midX - 7, 16, 14, size - 24);

  bCtx.fillStyle = '#a4a4a4';
  bCtx.fillRect(midX - 7, 16, 14, size - 24);

  // Crisp shirt buttons down the placket
  for (let by = 42; by < size - 24; by += 34) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(midX, by, 2.8, 0, Math.PI * 2);
    ctx.fill();
    bCtx.fillStyle = '#c8c8c8';
    bCtx.beginPath();
    bCtx.arc(midX, by, 2.8, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Left chest athletic commission patch
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(midX + 26, 74, 24, 28);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(midX + 26, 74, 24, 28);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(midX + 31, 82, 14, 3);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(midX + 31, 89, 14, 3);

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

function createSlacksTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  ctx.fillStyle = '#1a1e28';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < size; i += 3) {
    ctx.fillStyle = i % 6 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, i, size, 1);
    bCtx.fillStyle = i % 6 === 0 ? '#8a8a8a' : '#767676';
    bCtx.fillRect(0, i, size, 1);
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createRefereeRig(
  isSoftwareGl: boolean,
  maxAnisotropy = 4,
): RefereeRig {
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

  const refAppearance: BoxerAppearance = {
    skinColor: '#d9a47b',
    trunksColor: '#1a1e28',
    trunksTrimColor: '#a3c1de',
    gloveColor: '#1a1e28',
    gloveTrimColor: '#ffffff',
    bootColor: '#111318',
    hairStyle: 'side_part',
    hairColor: '#25211f',
    beardStyle: 'stubble',
    faceShape: 'classic_sculpted',
    eyeColor: '#2d3748',
    heightScale: 1.0,
    bulkScale: 0.94,
  };

  const facialTraits = resolveFacialTraits(refAppearance);

  const faceTex = createFaceTextures(
    refAppearance.skinColor,
    refAppearance.hairColor,
    refAppearance.beardStyle,
    maxAnisotropy,
    {
      eyeSpreadNorm: 0.34 * facialTraits.eyeSpacing,
      browArch: facialTraits.browArch,
      browThickness: facialTraits.browThickness,
      mouthWidthNorm: 0.22 * facialTraits.mouthWidth,
      lipFullness: facialTraits.lipFullness,
      noseWidthNorm: 0.16 * facialTraits.noseWidth,
    },
  );
  trackTex(faceTex.map);
  trackTex(faceTex.bumpMap);

  const limbTex = createLimbSkinTextures(refAppearance.skinColor, maxAnisotropy);
  trackTex(limbTex.map);
  trackTex(limbTex.bumpMap);

  const hairTex = createHairTextures(refAppearance.hairColor, maxAnisotropy);
  trackTex(hairTex.map);
  trackTex(hairTex.bumpMap);

  const irisTex = trackTex(createIrisTexture(facialTraits.irisColor, maxAnisotropy));

  const shirtTex = createRefereeShirtTextures(maxAnisotropy);
  trackTex(shirtTex.map);
  trackTex(shirtTex.bumpMap);

  const slacksTex = createSlacksTextures(maxAnisotropy);
  trackTex(slacksTex.map);
  trackTex(slacksTex.bumpMap);

  const skinMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: limbTex.map,
      bumpMap: limbTex.bumpMap,
      bumpScale: 0.004,
      roughness: 0.48,
      metalness: 0.01,
      clearcoat: isSoftwareGl ? 0 : 0.16,
    }),
  );

  const headMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: faceTex.map,
      bumpMap: faceTex.bumpMap,
      bumpScale: 0.004,
      roughness: 0.5,
      metalness: 0.01,
      clearcoat: isSoftwareGl ? 0 : 0.14,
    }),
  );

  const shirtMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: shirtTex.map,
      bumpMap: shirtTex.bumpMap,
      bumpScale: 0.006,
      roughness: 0.72,
      metalness: 0.03,
    }),
  );

  const collarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb8d1e8,
      roughness: 0.68,
      metalness: 0.03,
    }),
  );

  const slacksMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: slacksTex.map,
      bumpMap: slacksTex.bumpMap,
      bumpScale: 0.007,
      roughness: 0.8,
      metalness: 0.04,
    }),
  );

  const bowTieMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f1219,
      roughness: 0.55,
      metalness: 0.08,
    }),
  );

  const buckleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.24,
      metalness: 0.85,
    }),
  );

  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: hairTex.map,
      bumpMap: hairTex.bumpMap,
      bumpScale: 0.007,
      roughness: 0.65,
      metalness: 0.03,
    }),
  );

  const shoeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.42,
      metalness: 0.12,
    }),
  );

  const soleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090b10,
      roughness: 0.9,
    }),
  );

  const scleraMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xeae5dd,
      roughness: 0.14,
      clearcoat: isSoftwareGl ? 0 : 0.85,
    }),
  );

  const irisMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: irisTex,
      roughness: 0.12,
      clearcoat: isSoftwareGl ? 0 : 0.9,
    }),
  );

  const lashMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x181412,
      roughness: 0.75,
    }),
  );

  const root = new THREE.Group();

  if (!sharedRefShadowTex) {
    sharedRefShadowTex = createContactShadowTexture();
  }
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(1.25, 1.25));
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: sharedRefShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.58,
    }),
  );
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.014;
  root.add(shadowMesh);

  const bodyScaleGroup = new THREE.Group();
  bodyScaleGroup.scale.set(
    refAppearance.bulkScale,
    refAppearance.heightScale,
    refAppearance.bulkScale,
  );
  root.add(bodyScaleGroup);

  // Pelvis (Tailored Referee Slacks Waist + Belt)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.94, 0);
  bodyScaleGroup.add(pelvis);

  const waistProfile = [
    new THREE.Vector2(0.001, -0.13),
    new THREE.Vector2(0.178, -0.12),
    new THREE.Vector2(0.18, 0.02),
    new THREE.Vector2(0.168, 0.13),
    new THREE.Vector2(0.001, 0.14),
  ];
  const waistGeo = trackGeo(new THREE.LatheGeometry(waistProfile, 18));
  const waistMesh = new THREE.Mesh(waistGeo, slacksMat);
  waistMesh.scale.set(1.03, 1, 0.78);
  waistMesh.castShadow = true;
  pelvis.add(waistMesh);

  const beltGeo = trackGeo(new THREE.CylinderGeometry(0.174, 0.174, 0.032, 20));
  const belt = new THREE.Mesh(beltGeo, bowTieMat);
  belt.scale.set(1.03, 1, 0.79);
  belt.position.set(0, 0.102, 0);
  pelvis.add(belt);

  const buckleGeo = trackGeo(new THREE.BoxGeometry(0.044, 0.034, 0.014));
  const buckle = new THREE.Mesh(buckleGeo, buckleMat);
  buckle.position.set(0, 0.102, 0.138);
  pelvis.add(buckle);

  // Torso (Referee Collared Shirt)
  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0);
  pelvis.add(torso);

  const torsoGeo = trackGeo(buildSculptedTorsoGeometry());
  const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
  torsoMesh.scale.set(1.01, 1.0, 1.02);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torso.add(torsoMesh);

  // Shirt Collar & Classic Black Referee Bow Tie
  const collarGeo = trackGeo(new THREE.CylinderGeometry(0.084, 0.095, 0.052, 18, 1, true));
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.set(0, 0.494, 0.004);
  torso.add(collar);

  const bowGroup = new THREE.Group();
  bowGroup.position.set(0, 0.478, 0.094);
  torso.add(bowGroup);

  const bowKnotGeo = trackGeo(new THREE.BoxGeometry(0.02, 0.018, 0.014));
  bowGroup.add(new THREE.Mesh(bowKnotGeo, bowTieMat));

  const bowWingGeo = trackGeo(new THREE.ConeGeometry(0.022, 0.048, 4));
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(bowWingGeo, bowTieMat);
    wing.rotation.z = side * (Math.PI / 2);
    wing.scale.set(0.75, 1, 0.45);
    wing.position.set(side * 0.028, 0, 0);
    bowGroup.add(wing);
  }

  // Anatomical Neck
  const neckGeo = trackGeo(buildSculptedNeckGeometry());
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 0.502, 0.005);
  neckMesh.castShadow = true;
  torso.add(neckMesh);

  // Sculpted Realistic Referee Head & Thick Full-Crown Hair
  const head = new THREE.Group();
  head.position.set(0, 0.572, 0.016);
  torso.add(head);

  const headGeo = trackGeo(buildSculptedHeadGeometry(facialTraits));
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.012, 12, 10));
  const irisGeo = trackGeo(buildDomedIrisGeometry(0.0056));
  const upperLidGeo = trackGeo(buildSculptedEyelidGeometry(true, facialTraits.eyeOpenness, false));
  const upperLashGeo = trackGeo(buildSculptedEyelidGeometry(true, facialTraits.eyeOpenness, true));
  const lowerLidGeo = trackGeo(buildSculptedEyelidGeometry(false, facialTraits.eyeOpenness, false));

  const eyeSin = Math.min(0.6, 0.34 * facialTraits.eyeSpacing);
  const eyeCos = Math.sqrt(1 - eyeSin * eyeSin);
  const eyeSocketZ =
    eyeCos * 0.102 * facialTraits.headDepthScale - 0.0152 * (0.72 + facialTraits.browDepth * 0.28);

  for (const side of [-1, 1]) {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(
      side * 0.084 * facialTraits.headWidthScale * eyeSin,
      0.119,
      eyeSocketZ,
    );
    eyeGroup.rotation.y = side * 0.16;
    eyeGroup.rotation.z = side * facialTraits.eyeTilt;

    const eyeball = new THREE.Mesh(eyeGeo, scleraMat);
    eyeball.scale.set(1.06, 0.92, 0.84);
    eyeGroup.add(eyeball);

    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(0, 0.0002, 0.012 * 0.84 - 0.0006);
    eyeGroup.add(iris);

    eyeGroup.add(new THREE.Mesh(upperLidGeo, skinMat));
    eyeGroup.add(new THREE.Mesh(upperLashGeo, lashMat));
    eyeGroup.add(new THREE.Mesh(lowerLidGeo, skinMat));
    head.add(eyeGroup);
  }

  // Ears
  const earGeo = trackGeo(new THREE.SphereGeometry(0.02, 10, 8));
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.scale.set(0.36, 1.05, 0.65);
    ear.position.set(side * 0.085 * facialTraits.headWidthScale, 0.11, -0.008);
    ear.rotation.y = side * -0.22;
    head.add(ear);
  }

  // Thick Full-Crown Human Hair (side-parted neat referee cut)
  const hairPivot = new THREE.Group();
  hairPivot.position.set(0, 0.164, -0.004);
  hairPivot.scale.set(facialTraits.headWidthScale, 1, facialTraits.headDepthScale);
  head.add(hairPivot);

  const hairCapGeo = trackGeo(
    buildSculptedHairCapGeometry(facialTraits, {
      topThickness: 0.016,
      sideThickness: 0.0115,
      frontVMin: 0.68,
      templeVMin: 0.61,
      sideVMin: 0.565,
      backVMin: 0.34,
      crownLift: 0.003,
      waves: 14,
      waveAmp: 0.002,
    }),
  );
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.castShadow = true;
  hairPivot.add(hairCap);

  const sideLockGeo = trackGeo(buildHairLockGeometry(0.064, 0.017, 0.024, 0.016));
  [-0.044, -0.02, 0.004, 0.028, 0.046].forEach((lx) => {
    const lock = new THREE.Mesh(sideLockGeo, hairMat);
    lock.position.set(lx, 0.058, 0.056 - Math.abs(lx) * 0.25);
    lock.rotation.set(0.12, 0.48 + lx * 1.1, -0.34);
    hairPivot.add(lock);
  });

  // Short-Sleeved Referee Arms + Bare Sculpted Hands
  const palmGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.07, 0.054));
  const fingersGeo = trackGeo(new THREE.BoxGeometry(0.03, 0.05, 0.046));
  const thumbGeo = trackGeo(new THREE.CapsuleGeometry(0.0105, 0.026, 4, 8));

  const buildRefArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.192, 0.436, 0.004);
    torso.add(shoulder);

    const deltGeo = trackGeo(buildSculptedDeltoidGeometry(side));
    const delt = new THREE.Mesh(deltGeo, shirtMat);
    delt.scale.set(1.06, 1.04, 1.06);
    delt.castShadow = true;
    shoulder.add(delt);

    // Short-sleeve cuff covering upper half of upper arm
    const sleeveGeo = trackGeo(new THREE.CylinderGeometry(0.064, 0.062, 0.155, 14));
    const sleeve = new THREE.Mesh(sleeveGeo, shirtMat);
    sleeve.position.set(0, -0.075, 0);
    sleeve.castShadow = true;
    shoulder.add(sleeve);

    const upperArmGeo = trackGeo(buildSculptedLimbGeometry(0.28, 'upperArm'));
    const upperArm = new THREE.Mesh(upperArmGeo, skinMat);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);

    const elbowCapGeo = trackGeo(new THREE.SphereGeometry(0.044, 10, 8));
    elbow.add(new THREE.Mesh(elbowCapGeo, skinMat));

    const forearmRoll = new THREE.Group();
    elbow.add(forearmRoll);

    const forearmGeo = trackGeo(buildSculptedLimbGeometry(0.24, 'forearm'));
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.castShadow = true;
    forearmRoll.add(forearm);

    // Watch / Wristband detail on left wrist
    if (side === -1) {
      const watchGeo = trackGeo(new THREE.CylinderGeometry(0.037, 0.036, 0.022, 12));
      const watch = new THREE.Mesh(watchGeo, bowTieMat);
      watch.position.set(0, -0.225, 0);
      forearmRoll.add(watch);
    }

    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.275, 0.008);
    forearmRoll.add(handGroup);

    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.castShadow = true;
    handGroup.add(palm);

    const fingers = new THREE.Mesh(fingersGeo, skinMat);
    fingers.position.set(-side * 0.004, -0.042, 0.006);
    fingers.rotation.z = side * 0.15;
    handGroup.add(fingers);

    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(-side * 0.019, -0.011, 0.03);
    thumb.rotation.x = 0.45;
    handGroup.add(thumb);

    return { shoulder, elbow, forearmRoll };
  };

  const leftArm = buildRefArm(-1);
  const rightArm = buildRefArm(1);

  // Tailored Referee Slacks & Ring Shoes
  const buildRefLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.104, -0.075, 0);
    pelvis.add(hip);

    const thighGeo = trackGeo(buildSculptedLimbGeometry(0.42, 'thigh'));
    const thigh = new THREE.Mesh(thighGeo, slacksMat);
    thigh.scale.set(1.13, 1.0, 1.13);
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    hip.add(knee);

    const kneeCapGeo = trackGeo(new THREE.SphereGeometry(0.056, 10, 8));
    knee.add(new THREE.Mesh(kneeCapGeo, slacksMat));

    const calfGeo = trackGeo(buildSculptedLimbGeometry(0.36, 'calf'));
    const calf = new THREE.Mesh(calfGeo, slacksMat);
    calf.scale.set(1.14, 1.0, 1.14);
    calf.castShadow = true;
    knee.add(calf);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.385, 0);
    knee.add(ankle);

    const ankleJointGeo = trackGeo(new THREE.SphereGeometry(0.04, 10, 8));
    ankle.add(new THREE.Mesh(ankleJointGeo, shoeMat));

    const heelGeo = trackGeo(new THREE.CapsuleGeometry(0.037, 0.034, 5, 8));
    const heel = new THREE.Mesh(heelGeo, shoeMat);
    heel.rotation.x = Math.PI / 2;
    heel.position.set(0, -0.022, -0.014);
    heel.castShadow = true;
    ankle.add(heel);

    const toeGeo = trackGeo(new THREE.CapsuleGeometry(0.04, 0.1, 5, 10));
    const toe = new THREE.Mesh(toeGeo, shoeMat);
    toe.rotation.x = Math.PI / 2;
    toe.scale.set(1.04, 1, 0.7);
    toe.position.set(0, -0.02, 0.048);
    toe.castShadow = true;
    ankle.add(toe);

    const soleGeo = trackGeo(new THREE.CapsuleGeometry(0.042, 0.112, 5, 10));
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.rotation.x = Math.PI / 2;
    sole.scale.set(1.06, 1, 0.32);
    sole.position.set(0, -0.046, 0.04);
    ankle.add(sole);

    return { hip, knee, ankle };
  };

  const leftLeg = buildRefLeg(-1);
  const rightLeg = buildRefLeg(1);

  return {
    root,
    pelvis,
    torso,
    head,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    leftForearmRoll: leftArm.forearmRoll,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    rightForearmRoll: rightArm.forearmRoll,
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    leftAnkle: leftLeg.ankle,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    rightAnkle: rightLeg.ankle,
    shadowMesh,
    geometries,
    materials,
    textures,
  };
}

export function disposeRefereeRig(rig: RefereeRig) {
  for (const g of rig.geometries) g.dispose();
  for (const m of rig.materials) m.dispose();
  for (const t of rig.textures) t.dispose();
}

export function updateRefereePose(rig: RefereeRig, state: RefereeAnimState, dt: number) {
  const d = Math.min(dt, 0.05);
  const t = state.time;

  // Decay beat pulse smoothly
  if (state.countBeat > 0) {
    state.countBeat = Math.max(0, state.countBeat - d * 2.4);
  }

  // Transform world velocity into referee's local forward & strafe components
  const sinY = Math.sin(state.facingAngle);
  const cosY = Math.cos(state.facingAngle);
  const rawForward = state.velX * sinY + state.velZ * cosY;
  const rawStrafe = state.velX * cosY - state.velZ * sinY;

  state.smoothForward = THREE.MathUtils.damp(state.smoothForward, rawForward, 12, d);
  state.smoothStrafe = THREE.MathUtils.damp(state.smoothStrafe, rawStrafe, 12, d);

  const groundSpeed = Math.hypot(state.smoothForward, state.smoothStrafe);
  const targetGaitW = THREE.MathUtils.clamp(groundSpeed / 0.85, 0, 1);
  state.gaitWeight = THREE.MathUtils.damp(state.gaitWeight, targetGaitW, 10, d);

  if (groundSpeed > 0.04) {
    const rate = 2.8 + groundSpeed * 4.6;
    state.gaitPhase = (state.gaitPhase + rate * d) % (Math.PI * 2);
  }

  const w = state.gaitWeight;
  const p = state.gaitPhase;
  const s = Math.sin(p);
  const c = Math.cos(p);
  const dbl = Math.cos(p * 2);

  // Forward direction sign (+1 forward, -1 backing up)
  const fwdRatio =
    groundSpeed > 0.05 ? THREE.MathUtils.clamp(state.smoothForward / groundSpeed, -1, 1) : 1;
  const strafeRatio =
    groundSpeed > 0.05 ? THREE.MathUtils.clamp(state.smoothStrafe / groundSpeed, -1, 1) : 0;

  // Base locomotion posture (heel-to-toe bipedal gait + agile lateral referee sidestep)
  let pelvisYOffset = (-0.014 + dbl * 0.018) * w;
  let pelvisXOffset = s * 0.018 * w;
  let pelvisRotX = 0.015 * w;
  let pelvisRotY = c * 0.085 * w * (0.45 + 0.55 * Math.abs(fwdRatio));
  let pelvisRotZ = s * 0.026 * w;

  let torsoRotX = 0.025 + dbl * 0.012 * w;
  let torsoRotY = -c * 0.105 * w * (0.45 + 0.55 * Math.abs(fwdRatio));
  let torsoRotZ = -s * 0.024 * w;

  let headRotX = 0.02;
  let headRotY = THREE.MathUtils.clamp(state.headLookYaw, -0.55, 0.55);
  let headRotZ = 0;

  // Leg kinematics: realistic swing, knee clearance, and natural outward shoulder-width stance
  const fwdStride = 0.36 * w * fwdRatio;
  const lLift = Math.max(0, s) * 0.42 * w;
  const rLift = Math.max(0, -s) * 0.42 * w;
  const lSwing = c * fwdStride;
  const rSwing = -c * fwdStride;

  let lHipX = lSwing - lLift * 0.4 - 0.04 * (1 - w);
  let rHipX = rSwing - rLift * 0.4 + 0.04 * (1 - w);
  let lHipZ = -0.105 - (Math.max(0, s) * 0.16 * Math.abs(strafeRatio) + strafeRatio * 0.05 * s) * w;
  let rHipZ = 0.105 + (Math.max(0, -s) * 0.16 * Math.abs(strafeRatio) - strafeRatio * 0.05 * s) * w;

  let lKneeX = 0.1 + lLift * 0.86 + Math.max(0, -lSwing) * 0.18;
  let rKneeX = 0.1 + rLift * 0.86 + Math.max(0, -rSwing) * 0.18;
  const lAnkleBias = (-lLift * 0.22 + Math.max(0, lSwing) * 0.26 - Math.max(0, -lSwing) * 0.14) * w;
  const rAnkleBias = (-rLift * 0.22 + Math.max(0, rSwing) * 0.26 - Math.max(0, -rSwing) * 0.14) * w;

  // Default relaxed athletic arm swing (negative lShZ / positive rShZ = outward away from ribs!)
  const armSwing = c * 0.3 * w * fwdRatio;
  let lShX = -0.14 - armSwing;
  let lShY = 0.08;
  let lShZ = -0.14;
  let lElX = -0.52 - Math.max(0, s) * 0.22 * w;
  let lRoll = 0.24;

  let rShX = -0.14 + armSwing;
  let rShY = -0.08;
  let rShZ = 0.14;
  let rElX = -0.52 - Math.max(0, -s) * 0.22 * w;
  let rRoll = -0.24;

  if (state.mode === 'stand_corner') {
    const breath = Math.sin(t * 2.0);
    pelvisYOffset += breath * 0.006 * (1 - w);
    torsoRotX = 0.015 + breath * 0.01;
    headRotX = 0.015;
    headRotY += Math.sin(t * 0.85) * 0.08 * (1 - w);

    lShX = THREE.MathUtils.lerp(-0.1, lShX, w);
    lShY = 0.06;
    lShZ = -0.13;
    lElX = THREE.MathUtils.lerp(-0.38 - breath * 0.02, lElX, w);
    lRoll = 0.22;

    rShX = THREE.MathUtils.lerp(-0.1, rShX, w);
    rShY = -0.06;
    rShZ = 0.13;
    rElX = THREE.MathUtils.lerp(-0.38 - breath * 0.02, rElX, w);
    rRoll = -0.22;
  } else if (state.mode === 'officiate') {
    // Tall, poised pro-boxing referee stance: attentive weight balance & ready hands without hunching
    const poiseBreath = Math.sin(t * 2.8) * (1 - w);
    const weightShift = Math.sin(t * 1.45) * 0.024 * (1 - w);
    pelvisYOffset += poiseBreath * 0.008;
    pelvisRotZ += weightShift;
    torsoRotX = 0.038 + 0.018 * w;
    torsoRotZ -= weightShift * 0.8;
    headRotX = 0.02;

    lHipZ = Math.min(-0.115, lHipZ);
    rHipZ = Math.max(0.115, rHipZ);
    lKneeX = Math.max(lKneeX, 0.14);
    rKneeX = Math.max(rKneeX, 0.14);

    const readyMicro = Math.sin(t * 2.6) * 0.035 * (1 - w);
    lShX = -0.28 - armSwing * 0.52 + readyMicro;
    lShY = 0.14;
    lShZ = -0.17;
    lElX = -0.82 - Math.max(0, s) * 0.16 * w;
    lRoll = 0.34;

    rShX = -0.28 + armSwing * 0.52 - readyMicro;
    rShY = -0.14;
    rShZ = 0.17;
    rElX = -0.82 - Math.max(0, -s) * 0.16 * w;
    rRoll = -0.34;
  } else if (state.mode === 'countdown') {
    // Commanding 3-second pre-fight countdown ("3... 2... 1... BOX!")
    const beat = state.countBeat; // 1 on tick -> decays to 0
    const beatArc = Math.sin(beat * Math.PI);
    const snapDown = 1 - beat;

    pelvisYOffset = -beatArc * 0.016;
    pelvisRotY = 0.04;
    torsoRotX = 0.03 + beatArc * 0.05;
    torsoRotY = -0.08 + beatArc * 0.14;
    headRotX = 0.03 + beatArc * 0.06;

    lHipX = -0.08;
    lHipZ = -0.13;
    lKneeX = 0.16;
    rHipX = 0.08;
    rHipZ = 0.13;
    rKneeX = 0.14;

    if (state.countdownValue > 0) {
      // Left arm holds steady commanding chest-level check between corners
      lShX = -0.58;
      lShY = 0.18;
      lShZ = -0.22;
      lElX = -0.92;
      lRoll = 0.42;

      // Right arm snaps cleanly upward at tick start and chops crisply downward on each count
      const chop = Math.min(1, snapDown * 1.45);
      rShX = THREE.MathUtils.lerp(-1.82, -0.76, chop);
      rShY = -0.08;
      rShZ = THREE.MathUtils.lerp(0.24, 0.16, chop);
      rElX = THREE.MathUtils.lerp(-0.75, -0.52, chop);
      rRoll = -0.2;
    } else {
      // Authoritative "BOX!" open-arms chop apart
      const openSweep = Math.min(1, snapDown * 1.6);
      torsoRotY = 0;
      torsoRotX = 0.06;
      lShX = THREE.MathUtils.lerp(-1.12, -0.64, openSweep);
      lShY = THREE.MathUtils.lerp(0.18, -0.24, openSweep);
      lShZ = THREE.MathUtils.lerp(-0.18, -0.72, openSweep);
      lElX = -0.34;
      lRoll = 0.25;

      rShX = THREE.MathUtils.lerp(-1.12, -0.64, openSweep);
      rShY = THREE.MathUtils.lerp(-0.18, 0.24, openSweep);
      rShZ = THREE.MathUtils.lerp(0.18, 0.72, openSweep);
      rElX = -0.34;
      rRoll = -0.25;
    }
  } else if (state.mode === 'knockdown_count') {
    // Crisp championship knockdown count: wide lunge stance, left arm signals neutral corner, right arm sweeps count
    const beat = state.countBeat;
    const sweep = Math.sin(t * 5.0 + state.knockdownCount * 0.6);
    const countSwing = beat > 0.02 ? Math.sin((1 - beat) * Math.PI) : Math.max(0, sweep);

    pelvisYOffset = -0.02;
    torsoRotX = 0.11;
    torsoRotY = 0.14;
    headRotX = 0.15;
    headRotY = -0.08;

    lHipX = -0.14;
    lHipZ = -0.15;
    lKneeX = 0.25;
    rHipX = 0.14;
    rHipZ = 0.15;
    rKneeX = 0.23;

    // Left arm firmly directs standing fighter toward corner (outward, never clipping chest/head)
    lShX = -0.82;
    lShY = -0.32;
    lShZ = -0.74;
    lElX = -0.2;
    lRoll = 0.24;

    // Right arm sweeps high-to-low with decisive cadence on every count
    rShX = -1.74 + countSwing * 1.06;
    rShY = 0.08;
    rShZ = 0.22;
    rElX = -0.36 - (1 - countSwing) * 0.28;
    rRoll = -0.18;
  } else if (state.mode === 'wave_off') {
    // Classic championship boxing KO/TKO chest-level horizontal scissor wave-off
    const crossSweep = Math.sin(t * 11.5); // -1 = crossed in front, +1 = swept wide horizontally
    pelvisYOffset = -0.015;
    torsoRotX = 0.04;
    torsoRotY = 0;
    headRotX = 0.03;
    headRotY = crossSweep * 0.22;

    lHipX = -0.1;
    lHipZ = -0.14;
    lKneeX = 0.18;
    rHipX = 0.1;
    rHipZ = 0.14;
    rKneeX = 0.18;

    // Slight depth stagger (-1.16 vs -1.26) so forearms cross cleanly without intersecting
    lShX = -1.16;
    lShY = 0.26 - crossSweep * 0.34;
    lShZ = -0.34 - crossSweep * 0.64;
    lElX = -0.44;
    lRoll = 0.32;

    rShX = -1.26;
    rShY = -0.26 + crossSweep * 0.34;
    rShZ = 0.34 + crossSweep * 0.64;
    rElX = -0.44;
    rRoll = -0.32;
  }

  // Clamp hip abduction so thighs never cross inward
  lHipZ = Math.min(0.02, Math.max(-0.32, lHipZ));
  rHipZ = Math.max(-0.02, Math.min(0.32, rHipZ));

  // Ground-contact pelvis solver (thigh 0.42 + calf/ankle 0.385 + hipOffsetY 0.075 + sole 0.062)
  const lDrop =
    0.075 +
    (0.42 * Math.cos(lHipX) + 0.385 * Math.cos(lHipX + lKneeX)) * Math.cos(lHipZ) +
    0.062;
  const rDrop =
    0.075 +
    (0.42 * Math.cos(rHipX) + 0.385 * Math.cos(rHipX + rKneeX)) * Math.cos(rHipZ) +
    0.062;
  const targetPelvisY = Math.max(0.76, Math.max(lDrop, rDrop) + pelvisYOffset);

  const lAnkX = THREE.MathUtils.clamp(-(lHipX + lKneeX) + lAnkleBias, -0.55, 0.65);
  const rAnkX = THREE.MathUtils.clamp(-(rHipX + rKneeX) + rAnkleBias, -0.55, 0.65);
  const lAnkZ = THREE.MathUtils.clamp(-lHipZ * 0.85 - pelvisRotZ * 0.5, -0.35, 0.35);
  const rAnkZ = THREE.MathUtils.clamp(-rHipZ * 0.85 - pelvisRotZ * 0.5, -0.35, 0.35);

  const dampRate = state.mode === 'wave_off' || state.mode === 'countdown' ? 20 : 14;

  rig.pelvis.position.x = THREE.MathUtils.damp(rig.pelvis.position.x, pelvisXOffset, dampRate, d);
  rig.pelvis.position.y = THREE.MathUtils.damp(rig.pelvis.position.y, targetPelvisY, dampRate, d);
  rig.pelvis.position.z = THREE.MathUtils.damp(rig.pelvis.position.z, 0, dampRate, d);

  rig.pelvis.rotation.x = THREE.MathUtils.damp(rig.pelvis.rotation.x, pelvisRotX, dampRate, d);
  rig.pelvis.rotation.y = THREE.MathUtils.damp(rig.pelvis.rotation.y, pelvisRotY, dampRate, d);
  rig.pelvis.rotation.z = THREE.MathUtils.damp(rig.pelvis.rotation.z, pelvisRotZ, dampRate, d);

  rig.torso.rotation.x = THREE.MathUtils.damp(rig.torso.rotation.x, torsoRotX, dampRate, d);
  rig.torso.rotation.y = THREE.MathUtils.damp(rig.torso.rotation.y, torsoRotY, dampRate, d);
  rig.torso.rotation.z = THREE.MathUtils.damp(rig.torso.rotation.z, torsoRotZ, dampRate, d);

  rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, headRotX, dampRate, d);
  rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, headRotY, dampRate, d);
  rig.head.rotation.z = THREE.MathUtils.damp(rig.head.rotation.z, headRotZ, dampRate, d);

  rig.leftShoulder.rotation.x = THREE.MathUtils.damp(rig.leftShoulder.rotation.x, lShX, dampRate, d);
  rig.leftShoulder.rotation.y = THREE.MathUtils.damp(rig.leftShoulder.rotation.y, lShY, dampRate, d);
  rig.leftShoulder.rotation.z = THREE.MathUtils.damp(rig.leftShoulder.rotation.z, lShZ, dampRate, d);
  rig.leftElbow.rotation.x = THREE.MathUtils.damp(rig.leftElbow.rotation.x, lElX, dampRate, d);
  rig.leftForearmRoll.rotation.y = THREE.MathUtils.damp(rig.leftForearmRoll.rotation.y, lRoll, dampRate, d);

  rig.rightShoulder.rotation.x = THREE.MathUtils.damp(rig.rightShoulder.rotation.x, rShX, dampRate, d);
  rig.rightShoulder.rotation.y = THREE.MathUtils.damp(rig.rightShoulder.rotation.y, rShY, dampRate, d);
  rig.rightShoulder.rotation.z = THREE.MathUtils.damp(rig.rightShoulder.rotation.z, rShZ, dampRate, d);
  rig.rightElbow.rotation.x = THREE.MathUtils.damp(rig.rightElbow.rotation.x, rElX, dampRate, d);
  rig.rightForearmRoll.rotation.y = THREE.MathUtils.damp(rig.rightForearmRoll.rotation.y, rRoll, dampRate, d);

  rig.leftHip.rotation.x = THREE.MathUtils.damp(rig.leftHip.rotation.x, lHipX, dampRate, d);
  rig.leftHip.rotation.z = THREE.MathUtils.damp(rig.leftHip.rotation.z, lHipZ, dampRate, d);
  rig.leftKnee.rotation.x = THREE.MathUtils.damp(rig.leftKnee.rotation.x, lKneeX, dampRate, d);
  rig.leftAnkle.rotation.x = THREE.MathUtils.damp(rig.leftAnkle.rotation.x, lAnkX, dampRate, d);
  rig.leftAnkle.rotation.z = THREE.MathUtils.damp(rig.leftAnkle.rotation.z, lAnkZ, dampRate, d);

  rig.rightHip.rotation.x = THREE.MathUtils.damp(rig.rightHip.rotation.x, rHipX, dampRate, d);
  rig.rightHip.rotation.z = THREE.MathUtils.damp(rig.rightHip.rotation.z, rHipZ, dampRate, d);
  rig.rightKnee.rotation.x = THREE.MathUtils.damp(rig.rightKnee.rotation.x, rKneeX, dampRate, d);
  rig.rightAnkle.rotation.x = THREE.MathUtils.damp(rig.rightAnkle.rotation.x, rAnkX, dampRate, d);
  rig.rightAnkle.rotation.z = THREE.MathUtils.damp(rig.rightAnkle.rotation.z, rAnkZ, dampRate, d);

  rig.root.updateMatrixWorld(true);
}
