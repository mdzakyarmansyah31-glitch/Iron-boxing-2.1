import * as THREE from 'three';
import {
  BeardStyle,
  BoxerAppearance,
  CelebrationStyleId,
  FaceShapeId,
} from '../types/game';
import {
  buildDomedIrisGeometry,
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

export type CoachMode =
  | 'walk_with_boxer'
  | 'apron_support'
  | 'celebrate_with_boxer'
  | 'console_corner';

export interface CoachRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  towelGroup: THREE.Group;
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

export interface CoachAnimState {
  time: number;
  mode: CoachMode;
  moveSpeed: number;
  gaitPhase: number;
  stairWeight: number;
  ropeDuck: number;
  boxerSideSign: -1 | 1; // -1 if boxer is on coach's left, +1 if on coach's right
  celebrationStyle: CelebrationStyleId;
  celebrationProgress: number;
  walkoutProgress: number;
  cadenceScale: number;
  handBias: -1 | 1;
}

const SKIN_PALETTE = ['#eac09e', '#d69d72', '#b97c52', '#8f5938', '#683c24'];
const HAIR_PALETTE = ['#1b191b', '#3b281c', '#4b5563', '#6b7280', '#27272a'];
const FACE_SHAPES: FaceShapeId[] = [
  'oval_lean',
  'square_jaw',
  'chiseled',
  'broad_power',
  'rugged',
  'classic_sculpted',
];
const BEARDS: BeardStyle[] = ['stubble', 'goatee', 'full', 'none'];

let sharedCoachShadowTex: THREE.CanvasTexture | null = null;

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createTracksuitTextures(
  primaryHex: string,
  trimHex: string,
  isJacket: boolean,
  maxAnisotropy: number,
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const size = 256;
  const albedo = document.createElement('canvas');
  albedo.width = size;
  albedo.height = size;
  const ctx = albedo.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle athletic poly-knit weave
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let y = 0; y < size; y += 4) {
    ctx.fillRect(0, y, size, 1.5);
    bCtx.fillStyle = y % 8 === 0 ? '#8a8a8a' : '#767676';
    bCtx.fillRect(0, y, size, 2);
  }

  // Side / shoulder racing trim stripes
  ctx.fillStyle = trimHex;
  ctx.fillRect(size * 0.22, 0, 8, size);
  ctx.fillRect(size * 0.78 - 8, 0, 8, size);

  if (isJacket) {
    // Front zipper seam line at u = 0.5 (or wrap center)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(size * 0.5 - 3, 0, 6, size);
    ctx.fillStyle = trimHex;
    ctx.fillRect(size * 0.5 - 1, 0, 2, size);

    // Subtle chest corner badge
    ctx.fillStyle = trimHex;
    ctx.fillRect(size * 0.5 + 16, size * 0.28, 22, 10);
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

export function createCoachRig(
  fighterId: string,
  corner: 'red' | 'blue',
  isSoftwareGl: boolean,
  maxAnisotropy = 4,
): CoachRig {
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

  const seed = hashString(`coach_${fighterId}_${corner}`);
  const skinColor = SKIN_PALETTE[seed % SKIN_PALETTE.length];
  const hairColor = HAIR_PALETTE[(seed >>> 3) % HAIR_PALETTE.length];
  const beardStyle = BEARDS[(seed >>> 6) % BEARDS.length];
  const faceShape = FACE_SHAPES[(seed >>> 9) % FACE_SHAPES.length];
  const wearsCap = ((seed >>> 12) & 1) === 1;

  const jacketHex = corner === 'red' ? '#991b1b' : '#1e3a8a';
  const pantsHex = '#111827';
  const trimHex = corner === 'red' ? '#fbbf24' : '#38bdf8';

  const coachAppearance: BoxerAppearance = {
    skinColor,
    hairColor,
    hairStyle: 'fade',
    beardStyle,
    faceShape,
    trunksColor: pantsHex,
    trunksTrimColor: trimHex,
    gloveColor: jacketHex,
    gloveTrimColor: trimHex,
    bootColor: '#f8fafc',
    heightScale: 0.96 + ((seed & 0x3f) / 63) * 0.05,
    bulkScale: 1.0 + (((seed >>> 6) & 0x3f) / 63) * 0.06,
  };

  const facialTraits = resolveFacialTraits(coachAppearance);

  const limbTex = createLimbSkinTextures(skinColor, maxAnisotropy);
  trackTex(limbTex.map);
  trackTex(limbTex.bumpMap);

  const faceTex = createFaceTextures(
    skinColor,
    hairColor,
    beardStyle,
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

  const irisTex = trackTex(createIrisTexture(facialTraits.irisColor, maxAnisotropy));
  const hairTex = createHairTextures(hairColor, maxAnisotropy);
  trackTex(hairTex.map);
  trackTex(hairTex.bumpMap);

  const jacketTex = createTracksuitTextures(jacketHex, trimHex, true, maxAnisotropy);
  trackTex(jacketTex.map);
  trackTex(jacketTex.bumpMap);

  const pantsTex = createTracksuitTextures(pantsHex, trimHex, false, maxAnisotropy);
  trackTex(pantsTex.map);
  trackTex(pantsTex.bumpMap);

  const skinMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: limbTex.map,
      bumpMap: limbTex.bumpMap,
      bumpScale: 0.004,
      roughness: 0.52,
      metalness: 0.02,
      clearcoat: isSoftwareGl ? 0 : 0.16,
    }),
  );

  const headMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: faceTex.map,
      bumpMap: faceTex.bumpMap,
      bumpScale: 0.004,
      roughness: 0.52,
      metalness: 0.01,
      clearcoat: isSoftwareGl ? 0 : 0.14,
    }),
  );

  const jacketMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: jacketTex.map,
      bumpMap: jacketTex.bumpMap,
      bumpScale: 0.008,
      roughness: 0.72,
      metalness: 0.05,
    }),
  );

  const pantsMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: pantsTex.map,
      bumpMap: pantsTex.bumpMap,
      bumpScale: 0.008,
      roughness: 0.78,
      metalness: 0.04,
    }),
  );

  const capMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: corner === 'red' ? '#7f1d1d' : '#172554',
      roughness: 0.75,
      metalness: 0.04,
    }),
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(trimHex),
      roughness: 0.45,
      metalness: 0.25,
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

  const towelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.94,
      metalness: 0.0,
    }),
  );

  const shoeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.55,
      metalness: 0.06,
    }),
  );

  const soleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
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
      color: new THREE.Color(hairColor).multiplyScalar(0.45),
      roughness: 0.75,
    }),
  );

  const root = new THREE.Group();

  if (!sharedCoachShadowTex) {
    sharedCoachShadowTex = createContactShadowTexture();
  }
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(1.3, 1.3));
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: sharedCoachShadowTex,
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
    coachAppearance.bulkScale,
    coachAppearance.heightScale,
    coachAppearance.bulkScale,
  );
  root.add(bodyScaleGroup);

  // Pelvis (Tracksuit waist)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.94, 0);
  bodyScaleGroup.add(pelvis);

  const waistProfile = [
    new THREE.Vector2(0.001, -0.13),
    new THREE.Vector2(0.184, -0.12),
    new THREE.Vector2(0.186, 0.02),
    new THREE.Vector2(0.172, 0.13),
    new THREE.Vector2(0.001, 0.14),
  ];
  const waistGeo = trackGeo(new THREE.LatheGeometry(waistProfile, 18));
  const waistMesh = new THREE.Mesh(waistGeo, pantsMat);
  waistMesh.scale.set(1.04, 1, 0.79);
  waistMesh.castShadow = true;
  pelvis.add(waistMesh);

  // Torso (Tracksuit Jacket)
  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0);
  pelvis.add(torso);

  const torsoGeo = trackGeo(buildSculptedTorsoGeometry());
  const torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
  torsoMesh.scale.set(1.03, 1.0, 1.05);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torso.add(torsoMesh);

  // Jacket collar rim
  const collarGeo = trackGeo(new THREE.CylinderGeometry(0.088, 0.098, 0.062, 18, 1, true));
  const collar = new THREE.Mesh(collarGeo, jacketMat);
  collar.position.set(0, 0.495, 0.004);
  torso.add(collar);

  // Cornerman Towel draped cleanly over jacket collar & shoulders
  const towelGroup = new THREE.Group();
  towelGroup.position.set(0, 0.485, 0.01);
  torso.add(towelGroup);

  const neckDrapeGeo = trackGeo(new THREE.TorusGeometry(0.105, 0.024, 8, 20, Math.PI * 1.45));
  const neckDrape = new THREE.Mesh(neckDrapeGeo, towelMat);
  neckDrape.rotation.x = Math.PI / 2 + 0.18;
  neckDrape.rotation.z = -Math.PI * 0.22;
  neckDrape.position.set(0, 0.01, -0.008);
  neckDrape.castShadow = true;
  towelGroup.add(neckDrape);

  const towelHangGeo = trackGeo(new THREE.CapsuleGeometry(0.024, 0.24, 6, 10));
  for (const side of [-1, 1]) {
    const hang = new THREE.Mesh(towelHangGeo, towelMat);
    hang.scale.set(1.15, 1.0, 0.58);
    hang.position.set(side * 0.085, -0.12, 0.098);
    hang.rotation.set(-0.18, 0, side * -0.08);
    hang.castShadow = true;
    towelGroup.add(hang);
  }

  // Anatomical Neck
  const neckGeo = trackGeo(buildSculptedNeckGeometry());
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 0.502, 0.005);
  neckMesh.castShadow = true;
  torso.add(neckMesh);

  // Sculpted Realistic Coach Head & Eyes
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

  // Coach Hair or Corner Baseball Cap
  const hairCapGeo = trackGeo(
    buildSculptedHairCapGeometry(facialTraits, {
      topThickness: 0.012,
      sideThickness: 0.009,
      frontVMin: 0.68,
      templeVMin: 0.61,
      sideVMin: 0.565,
      backVMin: 0.34,
      waves: 14,
      waveAmp: 0.0018,
      forHeadRoot: true,
    }),
  );
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.castShadow = true;
  head.add(hairCap);

  const crownPivot = new THREE.Group();
  crownPivot.position.set(0, 0.125, -0.004);
  head.add(crownPivot);

  if (wearsCap) {
    const capDomeGeo = trackGeo(
      new THREE.SphereGeometry(0.099, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
    );
    const capDome = new THREE.Mesh(capDomeGeo, capMat);
    capDome.position.set(0, 0.026, -0.002);
    capDome.rotation.x = -0.14;
    capDome.scale.set(
      1.03 * facialTraits.headWidthScale,
      1.09,
      1.13 * facialTraits.headDepthScale,
    );
    capDome.castShadow = true;
    crownPivot.add(capDome);

    const visorGeo = trackGeo(
      new THREE.CylinderGeometry(0.09, 0.096, 0.01, 16, 1, false, -Math.PI * 0.36, Math.PI * 0.72),
    );
    const visor = new THREE.Mesh(visorGeo, capMat);
    visor.position.set(0, 0.032, 0.058);
    visor.rotation.x = 0.22;
    visor.scale.set(1, 1, 1.35);
    visor.castShadow = true;
    crownPivot.add(visor);

    const badgeGeo = trackGeo(new THREE.BoxGeometry(0.036, 0.018, 0.006));
    const badge = new THREE.Mesh(badgeGeo, trimMat);
    badge.position.set(0, 0.068, 0.092 * facialTraits.headDepthScale);
    badge.rotation.x = -0.22;
    crownPivot.add(badge);
  }

  // Sleeved Arms with Bare Sculpted Hands (no gloves!)
  const palmGeo = trackGeo(new THREE.BoxGeometry(0.038, 0.072, 0.056));
  const fingersGeo = trackGeo(new THREE.BoxGeometry(0.032, 0.052, 0.048));
  const thumbGeo = trackGeo(new THREE.CapsuleGeometry(0.011, 0.028, 4, 8));

  const buildCoachArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.196, 0.436, 0.004);
    torso.add(shoulder);

    const deltGeo = trackGeo(buildSculptedDeltoidGeometry(side));
    const delt = new THREE.Mesh(deltGeo, jacketMat);
    delt.scale.set(1.06, 1.04, 1.06);
    delt.castShadow = true;
    shoulder.add(delt);

    const upperArmGeo = trackGeo(buildSculptedLimbGeometry(0.28, 'upperArm'));
    const upperArm = new THREE.Mesh(upperArmGeo, jacketMat);
    upperArm.scale.set(1.12, 1.0, 1.12);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);

    const elbowCapGeo = trackGeo(new THREE.SphereGeometry(0.05, 10, 8));
    elbow.add(new THREE.Mesh(elbowCapGeo, jacketMat));

    const forearmRoll = new THREE.Group();
    elbow.add(forearmRoll);

    const forearmGeo = trackGeo(buildSculptedLimbGeometry(0.24, 'forearm'));
    const forearm = new THREE.Mesh(forearmGeo, jacketMat);
    forearm.scale.set(1.12, 1.0, 1.12);
    forearm.castShadow = true;
    forearmRoll.add(forearm);

    // Jacket sleeve rib cuff
    const cuffGeo = trackGeo(new THREE.CylinderGeometry(0.043, 0.04, 0.036, 12));
    const cuff = new THREE.Mesh(cuffGeo, trimMat);
    cuff.position.set(0, -0.23, 0);
    forearmRoll.add(cuff);

    // Bare hand
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.278, 0.008);
    forearmRoll.add(handGroup);

    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.castShadow = true;
    handGroup.add(palm);

    const fingers = new THREE.Mesh(fingersGeo, skinMat);
    fingers.position.set(-side * 0.004, -0.044, 0.006);
    fingers.rotation.z = side * 0.16;
    handGroup.add(fingers);

    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(-side * 0.02, -0.012, 0.032);
    thumb.rotation.x = 0.45;
    handGroup.add(thumb);

    return { shoulder, elbow, forearmRoll };
  };

  const leftArm = buildCoachArm(-1);
  const rightArm = buildCoachArm(1);

  // Tracksuit Trousers & Athletic Sneakers
  const buildCoachLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.106, -0.075, 0);
    pelvis.add(hip);

    const thighGeo = trackGeo(buildSculptedLimbGeometry(0.42, 'thigh'));
    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.scale.set(1.16, 1.0, 1.16);
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    hip.add(knee);

    const kneeCapGeo = trackGeo(new THREE.SphereGeometry(0.06, 10, 8));
    knee.add(new THREE.Mesh(kneeCapGeo, pantsMat));

    const calfGeo = trackGeo(buildSculptedLimbGeometry(0.36, 'calf'));
    const calf = new THREE.Mesh(calfGeo, pantsMat);
    calf.scale.set(1.18, 1.0, 1.18);
    calf.castShadow = true;
    knee.add(calf);

    const ankle = new THREE.Group();
    ankle.position.set(0, -0.385, 0);
    knee.add(ankle);

    const ankleJointGeo = trackGeo(new THREE.SphereGeometry(0.042, 10, 8));
    ankle.add(new THREE.Mesh(ankleJointGeo, shoeMat));

    const heelGeo = trackGeo(new THREE.CapsuleGeometry(0.038, 0.034, 5, 8));
    const heel = new THREE.Mesh(heelGeo, shoeMat);
    heel.rotation.x = Math.PI / 2;
    heel.position.set(0, -0.022, -0.014);
    heel.castShadow = true;
    ankle.add(heel);

    const toeGeo = trackGeo(new THREE.CapsuleGeometry(0.041, 0.102, 5, 10));
    const toe = new THREE.Mesh(toeGeo, shoeMat);
    toe.rotation.x = Math.PI / 2;
    toe.scale.set(1.06, 1, 0.72);
    toe.position.set(0, -0.02, 0.048);
    toe.castShadow = true;
    ankle.add(toe);

    const soleGeo = trackGeo(new THREE.CapsuleGeometry(0.043, 0.114, 5, 10));
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.rotation.x = Math.PI / 2;
    sole.scale.set(1.08, 1, 0.34);
    sole.position.set(0, -0.046, 0.04);
    ankle.add(sole);

    return { hip, knee, ankle };
  };

  const leftLeg = buildCoachLeg(-1);
  const rightLeg = buildCoachLeg(1);

  return {
    root,
    pelvis,
    torso,
    head,
    towelGroup,
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

export function disposeCoachRig(rig: CoachRig) {
  for (const g of rig.geometries) g.dispose();
  for (const m of rig.materials) m.dispose();
  for (const t of rig.textures) t.dispose();
}

export function updateCoachPose(rig: CoachRig, state: CoachAnimState, dt: number) {
  const d = Math.min(dt, 0.05);
  const t = state.time;

  let pelvisYOffset = 0;
  let pelvisXOffset = 0;
  let pelvisRotX = 0;
  let pelvisRotY = 0;
  let pelvisRotZ = 0;

  let torsoRotX = 0.04;
  let torsoRotY = 0;
  let torsoRotZ = 0;

  let headRotX = 0.02;
  let headRotY = 0;
  let headRotZ = 0;

  let lShX = -0.14;
  let lShY = 0.08;
  let lShZ = -0.14;
  let lElX = -0.45;
  let lRoll = 0.22;

  let rShX = -0.14;
  let rShY = -0.08;
  let rShZ = 0.14;
  let rElX = -0.45;
  let rRoll = -0.22;

  let lHipX = -0.06;
  let lHipZ = -0.09;
  let lKneeX = 0.12;
  let lAnkleBias = 0;

  let rHipX = 0.06;
  let rHipZ = 0.09;
  let rKneeX = 0.12;
  let rAnkleBias = 0;

  let towelWaveX = 0;
  let towelWaveZ = 0;

  if (state.mode === 'walk_with_boxer') {
    const stairW = THREE.MathUtils.clamp(state.stairWeight, 0, 1);
    const ropeDuck = THREE.MathUtils.clamp(state.ropeDuck, 0, 1);
    const walkW = THREE.MathUtils.clamp(state.moveSpeed / 1.4, 0, 1.15);

    const rate = (5.0 + walkW * 2.1) * state.cadenceScale;
    state.gaitPhase = (state.gaitPhase + rate * d * Math.max(0.2, walkW)) % (Math.PI * 2);

    const p = state.gaitPhase;
    const s = Math.sin(p);
    const c = Math.cos(p);
    const dbl = Math.cos(p * 2);
    const w = Math.min(1, walkW);

    pelvisYOffset = (-0.014 + dbl * 0.019) * w - ropeDuck * 0.065;
    pelvisXOffset = s * 0.018 * w;
    pelvisRotY = c * 0.09 * w;
    pelvisRotZ = s * 0.03 * w;
    pelvisRotX = stairW * 0.05 + ropeDuck * 0.11;

    // Coach walks tall and focused beside boxer with sharp tactical encouragement
    const talkCycle = Math.sin(t * 2.5 + state.handBias);
    const coachTowardBoxer = state.boxerSideSign; // -1 = left, +1 = right
    torsoRotX = 0.04 + stairW * 0.12 + ropeDuck * 0.3 + dbl * 0.014 * w;
    torsoRotY = -c * 0.11 * w + coachTowardBoxer * (0.14 + Math.max(0, talkCycle) * 0.1);
    torsoRotZ = -s * 0.026 * w;

    headRotX = 0.02 - ropeDuck * 0.16 + Math.sin(t * 4.2) * 0.035;
    headRotY = coachTowardBoxer * (0.26 + talkCycle * 0.16);
    headRotZ = Math.sin(t * 2.9) * 0.028;

    // Legs with clean stair lift & outward natural track
    const stride = (0.34 + stairW * 0.1) * w;
    const lLift = Math.max(0, s) * (0.42 + stairW * 0.52) * w;
    const rLift = Math.max(0, -s) * (0.42 + stairW * 0.52) * w;

    lHipX = c * stride - lLift * 0.42 - ropeDuck * 0.12;
    rHipX = -c * stride - rLift * 0.42 - ropeDuck * 0.12;
    lHipZ = -0.095;
    rHipZ = 0.095;

    lKneeX = 0.12 + lLift * 0.86 + Math.max(0, -c) * 0.14 * w + ropeDuck * 0.28;
    rKneeX = 0.12 + rLift * 0.86 + Math.max(0, c) * 0.14 * w + ropeDuck * 0.28;
    lAnkleBias = (-lLift * 0.22 + Math.max(0, c) * 0.24) * w;
    rAnkleBias = (-rLift * 0.22 + Math.max(0, -c) * 0.24) * w;

    // Delayed-phase arm swing + authoritative tactical cue toward boxer
    const swing = 0.34 * w;
    const lLag = Math.max(0, Math.sin(p - 0.65)) * 0.28 * w;
    const rLag = Math.max(0, Math.sin(p + Math.PI - 0.65)) * 0.28 * w;

    lShX = -0.08 - c * swing;
    lShZ = -0.15;
    lElX = -0.42 - lLag;
    rShX = -0.08 + c * swing;
    rShZ = 0.15;
    rElX = -0.42 - rLag;

    const pepWave = Math.sin(state.walkoutProgress * Math.PI * 3.2);
    const gestureActive = THREE.MathUtils.clamp(pepWave * 0.5 + 0.45, 0.15, 0.95);
    const pointBob = Math.sin(t * 4.8) * 0.1;
    if (coachTowardBoxer < 0) {
      lShX = THREE.MathUtils.lerp(lShX, -0.74 + pointBob, gestureActive);
      lShY = 0.2;
      lShZ = -0.22;
      lElX = THREE.MathUtils.lerp(lElX, -1.02 - Math.abs(pointBob), gestureActive);
      lRoll = 0.44;
    } else {
      rShX = THREE.MathUtils.lerp(rShX, -0.74 + pointBob, gestureActive);
      rShY = -0.2;
      rShZ = 0.22;
      rElX = THREE.MathUtils.lerp(rElX, -1.02 - Math.abs(pointBob), gestureActive);
      rRoll = -0.44;
    }

    towelWaveX = dbl * 0.028 * w;
    towelWaveZ = s * 0.036 * w;
  } else if (state.mode === 'apron_support') {
    // Assertive, poised corner coaching: grounded stance, sharp asymmetrical tactical hand cues
    const cadence = Math.sin(t * 2.25 + state.handBias);
    const sharpCue = Math.pow(Math.max(0, Math.sin(t * 1.85)), 2);
    const weightSway = Math.sin(t * 1.15) * 0.035;

    pelvisYOffset = Math.sin(t * 3.1) * 0.008;
    pelvisRotY = state.boxerSideSign * 0.08 + weightSway;
    pelvisRotZ = weightSway * 0.5;

    torsoRotX = 0.075 + sharpCue * 0.055;
    torsoRotY = state.boxerSideSign * 0.12 + cadence * 0.09;
    torsoRotZ = -weightSway * 0.45;

    headRotX = -0.02 + sharpCue * 0.05;
    headRotY = state.boxerSideSign * 0.14 + Math.sin(t * 1.35) * 0.14;
    headRotZ = Math.sin(t * 2.1) * 0.025;

    // Grounded shoulder-width athletic stance
    lHipX = -0.1 + weightSway * 0.4;
    lHipZ = -0.125;
    lKneeX = 0.18;
    rHipX = 0.1 - weightSway * 0.4;
    rHipZ = 0.125;
    rKneeX = 0.16;

    // Lead coaching hand gives crisp combo / guard instructions; support hand rests ready at chest/hip
    const cuePunch = Math.max(0, Math.sin(t * 4.6)) * sharpCue;
    if (state.boxerSideSign <= 0) {
      lShX = -0.64 - cuePunch * 0.48;
      lShY = 0.16 - cuePunch * 0.08;
      lShZ = -0.22;
      lElX = -1.26 + cuePunch * 0.44;
      lRoll = 0.42;

      rShX = -0.34 - Math.sin(t * 2.4) * 0.08;
      rShY = -0.12;
      rShZ = 0.18;
      rElX = -0.96 - Math.cos(t * 2.4) * 0.08;
      rRoll = -0.26;
    } else {
      rShX = -0.64 - cuePunch * 0.48;
      rShY = -0.16 + cuePunch * 0.08;
      rShZ = 0.22;
      rElX = -1.26 + cuePunch * 0.44;
      rRoll = -0.42;

      lShX = -0.34 - Math.sin(t * 2.4) * 0.08;
      lShY = 0.12;
      lShZ = -0.18;
      lElX = -0.96 - Math.cos(t * 2.4) * 0.08;
      lRoll = 0.26;
    }

    towelWaveX = sharpCue * 0.04;
    towelWaveZ = weightSway * 0.5;
  } else if (state.mode === 'celebrate_with_boxer') {
    // Dynamic, crisp coach celebration paired cleanly with the winning fighter!
    const cs = state.celebrationStyle;
    const hop = Math.abs(Math.sin(t * 5.6));
    const clap = Math.sin(t * 9.2);
    const towelSpin = Math.sin(t * 8.0);

    lHipZ = -0.12;
    rHipZ = 0.12;

    if (cs === 'corner_salute_bow' || cs === 'kneel_prayer_rise') {
      // Respectful proud coach applause + warm nod toward champion
      const clapWave = Math.sin(t * 7.6) * 0.5 + 0.5;
      pelvisYOffset = Math.sin(t * 2.4) * 0.01;
      torsoRotX = 0.05;
      torsoRotY = state.boxerSideSign * 0.22;
      headRotX = 0.04 + Math.sin(t * 3.2) * 0.04;
      headRotY = state.boxerSideSign * 0.2;

      lShX = -0.86;
      lShY = 0.34 - clapWave * 0.16;
      lShZ = -0.16;
      lElX = -1.22;
      lRoll = 0.4;

      rShX = -0.86;
      rShY = -0.34 + clapWave * 0.16;
      rShZ = 0.16;
      rElX = -1.22;
      rRoll = -0.4;

      lHipX = -0.08;
      lKneeX = 0.16;
      rHipX = 0.08;
      rKneeX = 0.16;
    } else if (cs === 'coach_arm_raise') {
      // Coach steps beside the champion, raises victory arm skyward & pumps free fist cleanly outward!
      const liftEnv = THREE.MathUtils.clamp(state.celebrationProgress * 2.1, 0, 1);
      const liftPulse = Math.sin(t * 4.4) * 0.07;
      pelvisYOffset = hop * 0.022;
      torsoRotX = -0.03;
      torsoRotY = state.boxerSideSign * 0.28;
      headRotX = -0.12;
      headRotY = state.boxerSideSign * 0.16;

      if (state.boxerSideSign < 0) {
        lShX = THREE.MathUtils.lerp(-0.4, -2.42 + liftPulse, liftEnv);
        lShY = 0.18;
        lShZ = -0.34;
        lElX = -0.22;
        lRoll = 0.3;

        rShX = -1.78 - hop * 0.32;
        rShY = -0.12;
        rShZ = 0.28;
        rElX = -0.56;
        rRoll = -0.3;
      } else {
        rShX = THREE.MathUtils.lerp(-0.4, -2.42 + liftPulse, liftEnv);
        rShY = -0.18;
        rShZ = 0.34;
        rElX = -0.22;
        rRoll = -0.3;

        lShX = -1.78 - hop * 0.32;
        lShY = 0.12;
        lShZ = -0.28;
        lElX = -0.56;
        lRoll = 0.3;
      }

      lHipX = -0.1;
      lKneeX = 0.2;
      rHipX = 0.1;
      rKneeX = 0.18;
    } else if (cs === 'double_fist_jump' || cs === 'spin_fist_pump' || cs === 'chest_beat_roar') {
      // Energetic victory fist pumps with outward elbow clearance & cushioned knees
      pelvisYOffset = hop * 0.065 - 0.015;
      torsoRotX = -0.06 + Math.sin(t * 5.6) * 0.05;
      torsoRotY = Math.sin(t * 3.2) * 0.2;
      headRotX = -0.15;
      headRotY = Math.sin(t * 2.6) * 0.22;

      lShX = -2.28 + Math.sin(t * 7.0) * 0.24;
      lShY = 0.1;
      lShZ = -0.36;
      lElX = -0.44 - Math.abs(clap) * 0.3;
      lRoll = 0.28;

      rShX = -2.28 + Math.cos(t * 7.0) * 0.24;
      rShY = -0.1;
      rShZ = 0.36;
      rElX = -0.44 - Math.abs(clap) * 0.3;
      rRoll = -0.28;

      lHipX = -0.14 + hop * 0.16;
      lKneeX = 0.28 - hop * 0.14;
      rHipX = 0.1 + hop * 0.14;
      rKneeX = 0.24 - hop * 0.12;

      towelWaveX = 0.14 + hop * 0.18;
      towelWaveZ = towelSpin * 0.2;
    } else {
      // Confident alternating fist-pumps & proud hype shouts toward champion and crowd
      pelvisYOffset = hop * 0.04;
      torsoRotX = -0.02 + Math.sin(t * 5.8) * 0.045;
      torsoRotY = state.boxerSideSign * 0.2 + Math.sin(t * 2.8) * 0.16;
      headRotX = -0.1;
      headRotY = state.boxerSideSign * 0.2 + Math.sin(t * 3.3) * 0.14;

      lShX = -1.62 - Math.max(0, clap) * 0.52;
      lShY = 0.14;
      lShZ = -0.28;
      lElX = -0.78 + Math.max(0, clap) * 0.36;
      lRoll = 0.26;

      rShX = -1.62 - Math.max(0, -clap) * 0.52;
      rShY = -0.14;
      rShZ = 0.28;
      rElX = -0.78 + Math.max(0, -clap) * 0.36;
      rRoll = -0.26;

      lHipX = -0.12;
      lKneeX = 0.22;
      rHipX = 0.1;
      rKneeX = 0.2;

      towelWaveX = 0.07;
      towelWaveZ = Math.sin(t * 6.2) * 0.1;
    }
  } else {
    // 'console_corner': composed, supportive ringside stance
    const breath = Math.sin(t * 2.0);
    pelvisYOffset = breath * 0.006;
    torsoRotX = 0.05 + breath * 0.012;
    torsoRotY = state.boxerSideSign * 0.16;
    headRotX = 0.05;
    headRotY = state.boxerSideSign * 0.22;

    lHipX = -0.08;
    lHipZ = -0.105;
    lKneeX = 0.16;
    rHipX = 0.08;
    rHipZ = 0.105;
    rKneeX = 0.16;

    lShX = -0.22;
    lShZ = -0.15;
    lElX = -0.62;
    lRoll = 0.26;

    rShX = -0.2;
    rShZ = 0.15;
    rElX = -0.58;
    rRoll = -0.26;

    if (state.boxerSideSign < 0) {
      lShX = -0.64;
      lShY = 0.18;
      lShZ = -0.22;
      lElX = -0.88;
      lRoll = 0.38;
    } else {
      rShX = -0.64;
      rShY = -0.18;
      rShZ = 0.22;
      rElX = -0.88;
      rRoll = -0.38;
    }
  }

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

  const dampRate = 13;

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

  rig.towelGroup.rotation.x = THREE.MathUtils.damp(rig.towelGroup.rotation.x, towelWaveX, dampRate, d);
  rig.towelGroup.rotation.z = THREE.MathUtils.damp(rig.towelGroup.rotation.z, towelWaveZ, dampRate, d);

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
