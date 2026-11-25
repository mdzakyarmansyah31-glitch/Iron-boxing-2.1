import * as THREE from 'three';
import {
  AttackTarget,
  AttackType,
  BoxerAppearance,
  BoxingPostureId,
  CelebrationStyleId,
  FaceOffSwitchStyleId,
  FaceShapeId,
  WalkoutStyleId,
} from '../types/game';
import {
  createContactShadowTexture,
  createFaceTextures,
  createGloveTextures,
  createHairTextures,
  createIrisTexture,
  createLimbSkinTextures,
  createShortsTextures,
  createTorsoSkinTextures,
} from './textures';

export interface RagdollLimbState {
  angleX: number;
  angleY: number;
  angleZ: number;
  velX: number;
  velY: number;
  velZ: number;
}

export interface RagdollBodyState {
  active: boolean;
  pelvisY: number;
  pelvisVelY: number;
  pelvisOffsetX: number;
  pelvisOffsetZ: number;
  pelvisVelX: number;
  pelvisVelZ: number;
  pelvisRotX: number;
  pelvisRotY: number;
  pelvisRotZ: number;
  pelvisAngVelX: number;
  pelvisAngVelZ: number;
  torso: RagdollLimbState;
  head: RagdollLimbState;
  leftShoulder: RagdollLimbState;
  leftElbow: RagdollLimbState;
  rightShoulder: RagdollLimbState;
  rightElbow: RagdollLimbState;
  leftHip: RagdollLimbState;
  leftKnee: RagdollLimbState;
  rightHip: RagdollLimbState;
  rightKnee: RagdollLimbState;
}

export interface HairStrandHandle {
  pivot: THREE.Group;
  baseRotX: number;
  baseRotY: number;
  baseRotZ: number;
  flexScale: number;
  phaseOffset: number;
}

export interface BoxerRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  hairPivot: THREE.Group;
  hairStrands: HairStrandHandle[];
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
  leftGloveWorldPos: THREE.Vector3;
  rightGloveWorldPos: THREE.Vector3;
  headWorldPos: THREE.Vector3;
  skinMat: THREE.MeshPhysicalMaterial;
  torsoMat: THREE.MeshPhysicalMaterial;
  headMat: THREE.MeshPhysicalMaterial;
  gloveMat: THREE.MeshPhysicalMaterial;
  beltGroup?: THREE.Group;
  shadowMesh: THREE.Mesh;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
}

export interface BoxerAnimState {
  stance: 'Orthodox' | 'Southpaw';
  time: number;
  moveSpeed: number;
  moveForward: number;
  moveStrafe: number;
  prevMoveForward: number;
  prevMoveStrafe: number;
  gaitPhase: number;
  gaitWeight: number;
  smoothForward: number;
  smoothStrafe: number;
  isGuarding: boolean;
  dodgeTimer: number;
  dodgeDuration: number;
  dodgeDirX: number;
  dodgeDirZ: number;
  attackType: AttackType | null;
  attackTarget?: AttackTarget;
  attackProgress: number;
  hitStunTimer: number;
  hitFlash: number;
  knockdownProgress: number;
  headSpringX: number;
  headSpringZ: number;
  headSpringVelX: number;
  headSpringVelZ: number;
  torsoSpringX: number;
  torsoSpringY: number;
  torsoSpringZ: number;
  torsoSpringVelX: number;
  torsoSpringVelY: number;
  torsoSpringVelZ: number;
  hairSpringX: number;
  hairSpringZ: number;
  hairVelX: number;
  hairVelZ: number;
  guardShock: number;
  sweatLevel?: number;
  bruiseLevel?: number;
  clinchMode?: boolean;
  cornerRestMode?: boolean;
  waitingRoomMode?: boolean;
  waitingSpecialKind?: number;
  waitingSpecialProgress?: number;
  waitingConfirmProgress?: number;
  motionProfile?: FighterMotionProfile;
  walkoutMode?: boolean;
  walkoutProgress?: number;
  walkoutStairWeight?: number;
  walkoutRopeDuck?: number;
  celebrationMode?: boolean;
  celebrationProgress?: number;
  loserCornerMode?: boolean;
  neutralWalkMode?: boolean;
  faceOffMode?: boolean;
  faceOffSwitchProgress?: number;
  ragdoll: RagdollBodyState;
}

export interface FighterMotionProfile {
  walkoutStyle: WalkoutStyleId;
  celebrationStyle: CelebrationStyleId;
  postureStyle: BoxingPostureId;
  faceOffSwitchStyle: FaceOffSwitchStyleId;
  postureCrouchBias: number;
  postureGuardBias: number;
  postureBladeBias: number;
  cadenceScale: number;
  swaggerAmp: number;
  armSwingBias: number;
  bounceFreq: number;
  handBias: -1 | 1;
}

const WALKOUT_STYLES: WalkoutStyleId[] = [
  'champ_swagger',
  'shadow_combo',
  'brawler_march',
  'slick_groove',
  'stoic_warrior',
  'explosive_sprint',
  'crowd_conductor',
  'tight_focus',
  'showboat_strut',
  'royal_salute',
];

const CELEBRATION_STYLES: CelebrationStyleId[] = [
  'double_fist_jump',
  'belt_waist_flex',
  'shadow_flurry_roar',
  'kneel_prayer_rise',
  'crowd_ear_cup',
  'chest_beat_roar',
  'spin_fist_pump',
  'corner_salute_bow',
  'gloves_high_march',
  'coach_arm_raise',
];

const POSTURE_STYLES: BoxingPostureId[] = [
  'classic_euro',
  'philly_shell',
  'peekaboo',
  'long_guard',
  'high_fortress',
  'low_sling',
  'mummy_cross',
  'crouch_brawler',
];

const FACEOFF_SWITCH_STYLES: FaceOffSwitchStyleId[] = [
  'step_in_jab_cross',
  'glove_bang_roar',
  'shoulder_roll_snap',
  'uppercut_taunt',
  'spin_pivot_lock',
  'hook_whip_glare',
  'bow_and_guard',
  'bounce_flurry',
  'neck_crack_flex',
  'raised_fist_salute',
];

const ROSTER_MOTION_OVERRIDES: Record<
  string,
  {
    walkoutStyle: WalkoutStyleId;
    celebrationStyle: CelebrationStyleId;
    postureStyle?: BoxingPostureId;
    faceOffSwitchStyle?: FaceOffSwitchStyleId;
  }
> = {
  drago_p: {
    walkoutStyle: 'champ_swagger',
    celebrationStyle: 'double_fist_jump',
    postureStyle: 'classic_euro',
    faceOffSwitchStyle: 'raised_fist_salute',
  },
  drago: {
    walkoutStyle: 'champ_swagger',
    celebrationStyle: 'double_fist_jump',
    postureStyle: 'classic_euro',
    faceOffSwitchStyle: 'raised_fist_salute',
  },
  reyes: {
    walkoutStyle: 'slick_groove',
    celebrationStyle: 'crowd_ear_cup',
    postureStyle: 'crouch_brawler',
    faceOffSwitchStyle: 'hook_whip_glare',
  },
  reyes_p: {
    walkoutStyle: 'slick_groove',
    celebrationStyle: 'crowd_ear_cup',
    postureStyle: 'crouch_brawler',
    faceOffSwitchStyle: 'hook_whip_glare',
  },
  vance: {
    walkoutStyle: 'tight_focus',
    celebrationStyle: 'corner_salute_bow',
    postureStyle: 'classic_euro',
    faceOffSwitchStyle: 'step_in_jab_cross',
  },
  vance_p: {
    walkoutStyle: 'tight_focus',
    celebrationStyle: 'corner_salute_bow',
    postureStyle: 'classic_euro',
    faceOffSwitchStyle: 'step_in_jab_cross',
  },
  kowalski: {
    walkoutStyle: 'brawler_march',
    celebrationStyle: 'chest_beat_roar',
    postureStyle: 'mummy_cross',
    faceOffSwitchStyle: 'glove_bang_roar',
  },
  kowalski_p: {
    walkoutStyle: 'brawler_march',
    celebrationStyle: 'chest_beat_roar',
    postureStyle: 'mummy_cross',
    faceOffSwitchStyle: 'glove_bang_roar',
  },
  mercer: {
    walkoutStyle: 'showboat_strut',
    celebrationStyle: 'belt_waist_flex',
    postureStyle: 'peekaboo',
    faceOffSwitchStyle: 'uppercut_taunt',
  },
  mercer_p: {
    walkoutStyle: 'showboat_strut',
    celebrationStyle: 'belt_waist_flex',
    postureStyle: 'peekaboo',
    faceOffSwitchStyle: 'uppercut_taunt',
  },
  mercier: {
    walkoutStyle: 'showboat_strut',
    celebrationStyle: 'belt_waist_flex',
    postureStyle: 'peekaboo',
    faceOffSwitchStyle: 'uppercut_taunt',
  },
  sato: {
    walkoutStyle: 'stoic_warrior',
    celebrationStyle: 'kneel_prayer_rise',
    postureStyle: 'crouch_brawler',
    faceOffSwitchStyle: 'bow_and_guard',
  },
  sato_p: {
    walkoutStyle: 'stoic_warrior',
    celebrationStyle: 'kneel_prayer_rise',
    postureStyle: 'crouch_brawler',
    faceOffSwitchStyle: 'bow_and_guard',
  },
  silva: {
    walkoutStyle: 'explosive_sprint',
    celebrationStyle: 'shadow_flurry_roar',
    postureStyle: 'low_sling',
    faceOffSwitchStyle: 'bounce_flurry',
  },
  silva_p: {
    walkoutStyle: 'explosive_sprint',
    celebrationStyle: 'shadow_flurry_roar',
    postureStyle: 'low_sling',
    faceOffSwitchStyle: 'bounce_flurry',
  },
  okafor: {
    walkoutStyle: 'royal_salute',
    celebrationStyle: 'coach_arm_raise',
    postureStyle: 'mummy_cross',
    faceOffSwitchStyle: 'raised_fist_salute',
  },
  okafor_p: {
    walkoutStyle: 'royal_salute',
    celebrationStyle: 'coach_arm_raise',
    postureStyle: 'mummy_cross',
    faceOffSwitchStyle: 'raised_fist_salute',
  },
  dubois: {
    walkoutStyle: 'crowd_conductor',
    celebrationStyle: 'spin_fist_pump',
    postureStyle: 'long_guard',
    faceOffSwitchStyle: 'spin_pivot_lock',
  },
  dubois_p: {
    walkoutStyle: 'crowd_conductor',
    celebrationStyle: 'spin_fist_pump',
    postureStyle: 'long_guard',
    faceOffSwitchStyle: 'spin_pivot_lock',
  },
  volkov: {
    walkoutStyle: 'brawler_march',
    celebrationStyle: 'gloves_high_march',
    postureStyle: 'mummy_cross',
    faceOffSwitchStyle: 'neck_crack_flex',
  },
  volkov_p: {
    walkoutStyle: 'brawler_march',
    celebrationStyle: 'gloves_high_march',
    postureStyle: 'mummy_cross',
    faceOffSwitchStyle: 'neck_crack_flex',
  },
  brooks: {
    walkoutStyle: 'slick_groove',
    celebrationStyle: 'crowd_ear_cup',
    postureStyle: 'philly_shell',
    faceOffSwitchStyle: 'shoulder_roll_snap',
  },
  jackson: {
    walkoutStyle: 'shadow_combo',
    celebrationStyle: 'chest_beat_roar',
    postureStyle: 'peekaboo',
    faceOffSwitchStyle: 'hook_whip_glare',
  },
  diallo: {
    walkoutStyle: 'royal_salute',
    celebrationStyle: 'corner_salute_bow',
    postureStyle: 'long_guard',
    faceOffSwitchStyle: 'spin_pivot_lock',
  },
  carter: {
    walkoutStyle: 'slick_groove',
    celebrationStyle: 'spin_fist_pump',
    postureStyle: 'philly_shell',
    faceOffSwitchStyle: 'uppercut_taunt',
  },
  kessler: {
    walkoutStyle: 'brawler_march',
    celebrationStyle: 'gloves_high_march',
    postureStyle: 'high_fortress',
    faceOffSwitchStyle: 'glove_bang_roar',
  },
  rossi: {
    walkoutStyle: 'showboat_strut',
    celebrationStyle: 'crowd_ear_cup',
    postureStyle: 'classic_euro',
    faceOffSwitchStyle: 'bow_and_guard',
  },
  morales: {
    walkoutStyle: 'explosive_sprint',
    celebrationStyle: 'shadow_flurry_roar',
    postureStyle: 'low_sling',
    faceOffSwitchStyle: 'bounce_flurry',
  },
  takahashi: {
    walkoutStyle: 'stoic_warrior',
    celebrationStyle: 'kneel_prayer_rise',
    postureStyle: 'crouch_brawler',
    faceOffSwitchStyle: 'bow_and_guard',
  },
  gallagher: {
    walkoutStyle: 'shadow_combo',
    celebrationStyle: 'chest_beat_roar',
    postureStyle: 'crouch_brawler',
    faceOffSwitchStyle: 'hook_whip_glare',
  },
  lindqvist: {
    walkoutStyle: 'tight_focus',
    celebrationStyle: 'corner_salute_bow',
    postureStyle: 'long_guard',
    faceOffSwitchStyle: 'step_in_jab_cross',
  },
  kuroda: {
    walkoutStyle: 'stoic_warrior',
    celebrationStyle: 'kneel_prayer_rise',
    postureStyle: 'philly_shell',
    faceOffSwitchStyle: 'spin_pivot_lock',
  },
  santos_p: {
    walkoutStyle: 'crowd_conductor',
    celebrationStyle: 'spin_fist_pump',
    postureStyle: 'crouch_brawler',
    faceOffSwitchStyle: 'shoulder_roll_snap',
  },
  thorne_p: {
    walkoutStyle: 'champ_swagger',
    celebrationStyle: 'belt_waist_flex',
    postureStyle: 'high_fortress',
    faceOffSwitchStyle: 'neck_crack_flex',
  },
  grant: {
    walkoutStyle: 'brawler_march',
    celebrationStyle: 'double_fist_jump',
    postureStyle: 'high_fortress',
    faceOffSwitchStyle: 'glove_bang_roar',
  },
};

export function resolveFighterMotionProfile(
  fighterId: string,
  styleLabel = '',
): FighterMotionProfile {
  const key = `${fighterId}|${styleLabel}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const seed = h >>> 0;

  const baseId = fighterId.replace(/_p$/, '');
  const override = ROSTER_MOTION_OVERRIDES[fighterId] ?? ROSTER_MOTION_OVERRIDES[baseId];

  // Combine deterministic prime strides so every fighter gets a distinct profile
  const wIdx = seed % WALKOUT_STYLES.length;
  const cIdx = ((seed >>> 5) + ((seed >>> 11) % 7) * 3) % CELEBRATION_STYLES.length;
  const pIdx = ((seed >>> 3) + ((seed >>> 9) % 5) * 3) % POSTURE_STYLES.length;
  const fIdx = ((seed >>> 7) + ((seed >>> 13) % 7) * 5) % FACEOFF_SWITCH_STYLES.length;

  return {
    walkoutStyle: override?.walkoutStyle ?? WALKOUT_STYLES[wIdx],
    celebrationStyle: override?.celebrationStyle ?? CELEBRATION_STYLES[cIdx],
    postureStyle: override?.postureStyle ?? POSTURE_STYLES[pIdx],
    faceOffSwitchStyle: override?.faceOffSwitchStyle ?? FACEOFF_SWITCH_STYLES[fIdx],
    postureCrouchBias: (((seed >>> 4) & 0xff) / 255 - 0.5) * 0.12,
    postureGuardBias: (((seed >>> 12) & 0xff) / 255 - 0.5) * 0.22,
    postureBladeBias: (((seed >>> 20) & 0xff) / 255 - 0.5) * 0.16,
    cadenceScale: 0.9 + ((seed & 0xff) / 255) * 0.22,
    swaggerAmp: 0.85 + (((seed >>> 8) & 0xff) / 255) * 0.4,
    armSwingBias: 0.85 + (((seed >>> 16) & 0xff) / 255) * 0.35,
    bounceFreq: 0.9 + (((seed >>> 24) & 0xff) / 255) * 0.25,
    handBias: (seed & 1) === 0 ? 1 : -1,
  };
}

export function createInitialRagdollState(): RagdollBodyState {
  const zeroLimb = (): RagdollLimbState => ({
    angleX: 0,
    angleY: 0,
    angleZ: 0,
    velX: 0,
    velY: 0,
    velZ: 0,
  });
  return {
    active: false,
    pelvisY: 0.94,
    pelvisVelY: 0,
    pelvisOffsetX: 0,
    pelvisOffsetZ: 0,
    pelvisVelX: 0,
    pelvisVelZ: 0,
    pelvisRotX: 0,
    pelvisRotY: 0,
    pelvisRotZ: 0,
    pelvisAngVelX: 0,
    pelvisAngVelZ: 0,
    torso: zeroLimb(),
    head: zeroLimb(),
    leftShoulder: zeroLimb(),
    leftElbow: zeroLimb(),
    rightShoulder: zeroLimb(),
    rightElbow: zeroLimb(),
    leftHip: zeroLimb(),
    leftKnee: zeroLimb(),
    rightHip: zeroLimb(),
    rightKnee: zeroLimb(),
  };
}

let sharedShadowTex: THREE.CanvasTexture | null = null;

/**
 * Custom asymmetric anatomical limb geometry (bicep/tricep, forearm/wrist, quad/hamstring, calf/ankle).
 * Top at y = 0, extends downward to y = -length.
 */
export function buildSculptedLimbGeometry(
  length: number,
  kind: 'upperArm' | 'forearm' | 'thigh' | 'calf',
): THREE.BufferGeometry {
  const uSegs = 20;
  const vSegs = 16;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= vSegs; iy++) {
    const t = iy / vSegs; // 0 = top joint, 1 = bottom joint
    const y = -t * length;

    let rx = 0.05;
    let rz = 0.05;
    let frontBulge = 0;
    let backBulge = 0;

    if (kind === 'upperArm') {
      // Taper top inside deltoid sleeve, swell through bicep/tricep belly, taper cleanly to elbow
      const sinM = Math.sin(t * Math.PI);
      const topTuck = t < 0.22 ? THREE.MathUtils.lerp(0.82, 1.0, Math.sin((t / 0.22) * (Math.PI / 2))) : 1;
      rx = (THREE.MathUtils.lerp(0.056, 0.044, t) + sinM * 0.011) * topTuck;
      rz = (THREE.MathUtils.lerp(0.058, 0.044, t) + sinM * 0.014) * topTuck;
      frontBulge = Math.sin(Math.pow(t, 0.85) * Math.PI) * 0.012 * topTuck; // Bicep peak
      backBulge = Math.sin(Math.pow(1 - t * 0.8, 1.4) * Math.PI) * 0.008 * topTuck; // Tricep
    } else if (kind === 'forearm') {
      // Muscular brachioradialis upper third tapering cleanly to anatomical flat oval wrist
      const upperBell = Math.sin(Math.pow(t, 0.55) * Math.PI);
      rx = THREE.MathUtils.lerp(0.046, 0.036, t) + upperBell * 0.01;
      rz = THREE.MathUtils.lerp(0.045, 0.025, t) + upperBell * 0.009; // Wrist is flatter front-to-back!
      frontBulge = Math.sin(Math.min(1, t * 2.2) * Math.PI) * 0.006;
    } else if (kind === 'thigh') {
      // Heavy quad teardrop & hamstring taper
      const midQuad = Math.sin(Math.pow(t, 0.72) * Math.PI);
      rx = THREE.MathUtils.lerp(0.088, 0.056, t) + midQuad * 0.014;
      rz = THREE.MathUtils.lerp(0.092, 0.058, t) + midQuad * 0.018;
      frontBulge = Math.sin(Math.pow(t, 0.75) * Math.PI) * 0.014;
      backBulge = Math.sin(Math.pow(t, 0.55) * Math.PI) * 0.008;
    } else {
      // Calf: prominent gastrocnemius in upper half, slim Achilles tendon above boot
      const calfBell = Math.exp(-Math.pow((t - 0.34) / 0.24, 2));
      rx = THREE.MathUtils.lerp(0.055, 0.038, t) + calfBell * 0.015;
      rz = THREE.MathUtils.lerp(0.056, 0.042, t) + calfBell * 0.018;
      backBulge = calfBell * 0.018;
    }

    for (let ix = 0; ix <= uSegs; ix++) {
      const u = ix / uSegs;
      const angle = (u - 0.5) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      const x = sinA * rx;
      let z = cosA * rz;
      if (cosA > 0) z += Math.pow(cosA, 1.4) * frontBulge;
      else z -= Math.pow(-cosA, 1.4) * backBulge;

      positions.push(x, y, z);
      uvs.push(u, 1 - t);
    }
  }

  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * (uSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (uSegs + 1) + ix;
      const d = c + 1;
      indices.push(a, d, b, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Custom sculpted anatomical human neck (wide muscular column, sweeping trapezius wings, SCM V-cords)
 */
export function buildSculptedNeckGeometry(): THREE.BufferGeometry {
  const uSegs = 28;
  const vSegs = 16;
  const height = 0.165;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= vSegs; iy++) {
    const v = iy / vSegs; // 0 = anchored inside upper torso, 1 = inside skull base
    const y = -0.055 + v * height;

    // Athletic muscular neck thickness with smooth wide flare into traps & collarbones
    const flare = Math.pow(Math.max(0, 1 - v / 0.56), 1.8);
    const trapSweep = Math.pow(Math.max(0, 1 - v / 0.66), 1.65);
    const rx = THREE.MathUtils.lerp(0.074, 0.066, v) + flare * 0.068;
    const rz = THREE.MathUtils.lerp(0.077, 0.068, v) + flare * 0.026;

    for (let ix = 0; ix <= uSegs; ix++) {
      const u = ix / uSegs;
      const angle = (u - 0.5) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      // Lateral & posterior trapezius flare sweeping down toward the shoulders
      const sideTrapMask =
        Math.pow(Math.abs(sinA), 1.15) *
        (cosA < 0.35 ? 1 : Math.max(0, 1 - (cosA - 0.35) / 0.65));
      const backMask = cosA < 0 ? Math.pow(-cosA, 1.1) : 0;

      const x = sinA * (rx + trapSweep * sideTrapMask * 0.048);
      let z = cosA * (rz + trapSweep * backMask * 0.018);

      // Sternocleidomastoid (SCM) V-cords converging toward suprasternal pit at base
      if (cosA > 0.12) {
        const absX = Math.abs(sinA);
        const targetAbsX = THREE.MathUtils.lerp(0.18, 0.64, v);
        const scmDist = Math.abs(absX - targetAbsX);
        if (scmDist < 0.25) {
          const ridge = Math.cos((scmDist / 0.25) * (Math.PI / 2));
          z += ridge * Math.pow(cosA, 1.15) * 0.007;
        }
        // Subtle laryngeal prominence (Adam's apple)
        if (absX < 0.22 && v > 0.4 && v < 0.74) {
          const adams = Math.sin(((v - 0.4) / 0.34) * Math.PI) * (1 - absX / 0.22);
          z += adams * 0.0055;
        }
      } else if (cosA < -0.22) {
        // Subtle cervical spine groove between left & right trapezius ridges
        const absX = Math.abs(sinA);
        if (absX < 0.24) {
          z += Math.pow(-cosA, 1.15) * (1 - absX / 0.24) * 0.007;
        }
      }

      // Natural forward athletic cervical posture
      z += v * 0.013;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * (uSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (uSegs + 1) + ix;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Custom vertex-sculpted athletic human torso geometry with integrated shoulder sockets and trapezius slope.
 * u = 0.5 corresponds to dead-center front (+Z), v = 1 tucks seamlessly into neck base, v = 0 is waist.
 */
export function buildSculptedTorsoGeometry(): THREE.BufferGeometry {
  const uSegs = 36;
  const vSegs = 30;
  const height = 0.535;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= vSegs; iy++) {
    const v = iy / vSegs;
    const y = v * height;

    let rx = 0.148;
    let rz = 0.106;
    if (v < 0.24) {
      const t = v / 0.24;
      rx = THREE.MathUtils.lerp(0.148, 0.156, t);
      rz = THREE.MathUtils.lerp(0.106, 0.112, t);
    } else if (v < 0.72) {
      const t = (v - 0.24) / 0.48;
      rx = THREE.MathUtils.lerp(0.156, 0.228, Math.pow(t, 0.82));
      rz = THREE.MathUtils.lerp(0.112, 0.145, Math.pow(t, 0.85));
    } else if (v < 0.86) {
      // Broad upper chest & shoulder-socket bridge that anchors the deltoid medially
      const t = (v - 0.72) / 0.14;
      const smooth = t * t * (3 - 2 * t);
      rx = THREE.MathUtils.lerp(0.228, 0.204, smooth);
      rz = THREE.MathUtils.lerp(0.145, 0.126, smooth);
    } else if (v < 0.95) {
      // Smooth trapezius / clavicle slope toward neck
      const t = (v - 0.86) / 0.09;
      const smooth = t * t * (3 - 2 * t);
      rx = THREE.MathUtils.lerp(0.204, 0.108, smooth);
      rz = THREE.MathUtils.lerp(0.126, 0.086, smooth);
    } else {
      // Top rim tucks smoothly inside neck base (zero hard shelf)
      const t = (v - 0.95) / 0.05;
      rx = THREE.MathUtils.lerp(0.108, 0.068, t);
      rz = THREE.MathUtils.lerp(0.086, 0.064, t);
    }

    for (let ix = 0; ix <= uSegs; ix++) {
      const u = ix / uSegs;
      const angle = (u - 0.5) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const absX = Math.abs(sinA);

      let x = sinA * rx;
      let z = cosA * rz;

      // Front anatomical muscle relief (+Z)
      if (cosA > 0.12) {
        const frontMask = Math.pow(cosA, 1.3);

        // Clavicle collarbone ridge (v = 0.82..0.93)
        if (v > 0.82 && v < 0.93 && absX > 0.16 && absX < 0.78) {
          const clavV = Math.sin(((v - 0.82) / 0.11) * Math.PI);
          z += frontMask * clavV * 0.007;
        }

        // Pectoral shelf (v = 0.54..0.86)
        if (v > 0.54 && v < 0.86) {
          const pecV = Math.sin(((v - 0.54) / 0.32) * Math.PI);
          const pecSplit = Math.min(1, absX / 0.22);
          const pecOuter = Math.max(0, 1 - Math.pow(absX / 0.88, 2));
          z += frontMask * pecV * pecSplit * pecOuter * 0.029;
        }

        // 6-Pack Abdominal ridges (v = 0.10..0.54)
        if (v > 0.1 && v < 0.54 && absX < 0.52) {
          const abRow = Math.abs(Math.sin(((v - 0.1) / 0.44) * Math.PI * 3));
          const abSplit = Math.min(1, absX / 0.14);
          const abOuter = Math.max(0, 1 - Math.pow(absX / 0.48, 2));
          z += frontMask * abRow * abSplit * abOuter * 0.014;
        }

        // External oblique V-taper ridge
        if (v > 0.08 && v < 0.36 && absX > 0.48 && absX < 0.82) {
          const oblV = Math.sin(((v - 0.08) / 0.28) * Math.PI);
          z += frontMask * oblV * 0.008;
        }
      }

      // Upper trapezius muscle slope & back scapular relief (-Z / lateral)
      if (cosA < 0.25 && v > 0.74 && v < 0.97) {
        const trapV = Math.sin(((v - 0.74) / 0.23) * Math.PI);
        const trapBack = cosA < 0 ? Math.pow(-cosA, 0.85) : 1 - cosA / 0.25;
        z -= trapBack * trapV * 0.013;
        if (absX > 0.35 && absX < 0.9) {
          x += Math.sign(sinA) * trapV * 0.008;
        }
      }

      // Back spine groove & shoulder blade relief (-Z)
      if (cosA < -0.15) {
        const backMask = Math.pow(-cosA, 1.3);
        if (absX < 0.16) {
          z += backMask * (1 - absX / 0.16) * 0.013;
        } else if (v > 0.55 && v < 0.85 && absX < 0.74) {
          z -= backMask * 0.014;
        }
      }

      z += (v - 0.3) * 0.016;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * (uSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (uSegs + 1) + ix;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Custom sculpted anatomical deltoid muscle that anchors medially inside the upper torso/clavicle
 * and sweeps naturally down into a V-insertion on the upper arm without spherical ball-joint seams.
 */
export function buildSculptedDeltoidGeometry(side: -1 | 1): THREE.BufferGeometry {
  const uSegs = 28;
  const vSegs = 20;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= vSegs; iy++) {
    const t = iy / vSegs; // 0 = acromion/clavicular origin inside torso, 1 = deltoid V-insertion on humerus
    const y = THREE.MathUtils.lerp(0.052, -0.145, t);

    // Medial-to-lateral sweep from inside the upper chest/trap shelf out onto the humeral axis
    const topSweep = t < 0.38 ? Math.pow(1 - t / 0.38, 1.45) : 0;
    const centerX = -side * 0.09 * topSweep;
    const centerZ = -0.002 * topSweep;

    let rx: number;
    let rz: number;
    if (t < 0.36) {
      const k = Math.sin((t / 0.36) * (Math.PI / 2));
      rx = THREE.MathUtils.lerp(0.03, 0.062, k);
      rz = THREE.MathUtils.lerp(0.04, 0.07, k);
    } else {
      const k = (t - 0.36) / 0.64;
      // Smooth athletic curve tapering inside upperArm diameter at t = 1 (0.044 < upperArm 0.061)
      rx = THREE.MathUtils.lerp(0.062, 0.044, Math.pow(k, 1.2));
      rz = THREE.MathUtils.lerp(0.07, 0.045, Math.pow(k, 1.15));
    }

    for (let ix = 0; ix <= uSegs; ix++) {
      const u = ix / uSegs;
      const angle = (u - 0.5) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      const latFactor = sinA * side; // +1 = outer shoulder, -1 = medial chest/armpit

      // Flatten medial face cleanly into torso chest/armpit; keep outer deltoid contoured & athletic
      const xRadius = latFactor < 0 ? rx * 0.8 : rx;
      let x = centerX + sinA * xRadius;
      let z = centerZ + cosA * rz;

      // Subtle anterior/lateral/posterior deltoid head fullness & teardrop V-insertion
      if (t > 0.18 && t < 0.82 && latFactor > -0.15) {
        const vBelly = Math.sin(((t - 0.18) / 0.64) * Math.PI);
        const outerMask = Math.max(0, (latFactor + 0.15) / 1.15);
        x += side * outerMask * vBelly * 0.006;
        z += cosA * Math.abs(cosA) * vBelly * 0.005;
      }

      // Drop lateral deltoid V-peak slightly lower than front/back on the humerus
      const yOffset =
        t > 0.45 && latFactor > 0.25
          ? -Math.sin(((t - 0.45) / 0.55) * Math.PI) * latFactor * 0.012
          : 0;

      positions.push(x, y + yOffset, z);
      uvs.push(u, 1 - t);
    }
  }

  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * (uSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (uSegs + 1) + ix;
      const d = c + 1;
      indices.push(a, d, b, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export interface FacialTraits {
  faceShape: FaceShapeId;
  headWidthScale: number;
  headDepthScale: number;
  jawWidth: number;
  jawSquareness: number;
  chinWidth: number;
  chinProjection: number;
  cheekbone: number;
  browDepth: number;
  browArch: number;
  browThickness: number;
  eyeSpacing: number;
  eyeTilt: number;
  eyeOpenness: number;
  noseBridge: number;
  noseLength: number;
  noseWidth: number;
  mouthWidth: number;
  lipFullness: number;
  irisColor: string;
}

function hashAppearance(appearance: BoxerAppearance): number {
  const key = `${appearance.skinColor}|${appearance.hairStyle}|${appearance.hairColor}|${appearance.beardStyle}|${appearance.faceShape ?? ''}|${appearance.bulkScale.toFixed(2)}|${appearance.heightScale.toFixed(2)}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const FACE_SHAPE_FALLBACKS: FaceShapeId[] = [
  'chiseled',
  'square_jaw',
  'oval_lean',
  'broad_power',
  'angular_hawk',
  'rugged',
  'athletic_round',
  'classic_sculpted',
];

const IRIS_PALETTE = ['#2c1b12', '#4f331f', '#68592e', '#7a5422', '#3b647d', '#396249'];

export function resolveFacialTraits(appearance: BoxerAppearance): FacialTraits {
  const seed = hashAppearance(appearance);
  const rand = (shift: number, span: number) => (((seed >> shift) & 0xff) / 255 - 0.5) * 2 * span;

  const faceShape = appearance.faceShape ?? FACE_SHAPE_FALLBACKS[seed % FACE_SHAPE_FALLBACKS.length];
  const irisColor = appearance.eyeColor ?? IRIS_PALETTE[(seed >>> 4) % IRIS_PALETTE.length];

  const base: Record<FaceShapeId, Omit<FacialTraits, 'faceShape' | 'irisColor'>> = {
    chiseled: {
      headWidthScale: 0.99,
      headDepthScale: 1.02,
      jawWidth: 1.05,
      jawSquareness: 0.88,
      chinWidth: 0.98,
      chinProjection: 1.12,
      cheekbone: 1.18,
      browDepth: 1.16,
      browArch: 0.25,
      browThickness: 1.05,
      eyeSpacing: 0.99,
      eyeTilt: 0.05,
      eyeOpenness: 0.92,
      noseBridge: 1.14,
      noseLength: 1.06,
      noseWidth: 0.94,
      mouthWidth: 1.0,
      lipFullness: 0.96,
    },
    square_jaw: {
      headWidthScale: 1.03,
      headDepthScale: 1.01,
      jawWidth: 1.13,
      jawSquareness: 0.96,
      chinWidth: 1.14,
      chinProjection: 1.08,
      cheekbone: 1.06,
      browDepth: 1.14,
      browArch: 0.15,
      browThickness: 1.12,
      eyeSpacing: 1.01,
      eyeTilt: 0.02,
      eyeOpenness: 0.94,
      noseBridge: 1.06,
      noseLength: 1.0,
      noseWidth: 1.04,
      mouthWidth: 1.03,
      lipFullness: 0.98,
    },
    oval_lean: {
      headWidthScale: 0.95,
      headDepthScale: 0.99,
      jawWidth: 0.88,
      jawSquareness: 0.38,
      chinWidth: 0.84,
      chinProjection: 0.98,
      cheekbone: 1.02,
      browDepth: 0.92,
      browArch: 0.42,
      browThickness: 0.92,
      eyeSpacing: 0.97,
      eyeTilt: 0.07,
      eyeOpenness: 1.02,
      noseBridge: 0.98,
      noseLength: 0.96,
      noseWidth: 0.9,
      mouthWidth: 0.95,
      lipFullness: 1.02,
    },
    broad_power: {
      headWidthScale: 1.07,
      headDepthScale: 1.04,
      jawWidth: 1.15,
      jawSquareness: 0.82,
      chinWidth: 1.15,
      chinProjection: 1.05,
      cheekbone: 1.1,
      browDepth: 1.24,
      browArch: 0.1,
      browThickness: 1.22,
      eyeSpacing: 1.05,
      eyeTilt: -0.02,
      eyeOpenness: 0.88,
      noseBridge: 1.08,
      noseLength: 1.02,
      noseWidth: 1.16,
      mouthWidth: 1.06,
      lipFullness: 1.04,
    },
    angular_hawk: {
      headWidthScale: 0.96,
      headDepthScale: 1.04,
      jawWidth: 0.93,
      jawSquareness: 0.72,
      chinWidth: 0.86,
      chinProjection: 1.14,
      cheekbone: 1.25,
      browDepth: 1.12,
      browArch: 0.55,
      browThickness: 0.96,
      eyeSpacing: 0.96,
      eyeTilt: 0.08,
      eyeOpenness: 0.95,
      noseBridge: 1.22,
      noseLength: 1.11,
      noseWidth: 0.9,
      mouthWidth: 0.96,
      lipFullness: 0.92,
    },
    rugged: {
      headWidthScale: 1.02,
      headDepthScale: 1.01,
      jawWidth: 1.08,
      jawSquareness: 0.76,
      chinWidth: 1.06,
      chinProjection: 1.06,
      cheekbone: 0.96,
      browDepth: 1.22,
      browArch: 0.08,
      browThickness: 1.18,
      eyeSpacing: 1.02,
      eyeTilt: -0.04,
      eyeOpenness: 0.89,
      noseBridge: 1.04,
      noseLength: 1.03,
      noseWidth: 1.12,
      mouthWidth: 1.04,
      lipFullness: 0.94,
    },
    athletic_round: {
      headWidthScale: 1.04,
      headDepthScale: 0.98,
      jawWidth: 1.02,
      jawSquareness: 0.52,
      chinWidth: 1.02,
      chinProjection: 0.94,
      cheekbone: 0.92,
      browDepth: 0.96,
      browArch: 0.34,
      browThickness: 1.04,
      eyeSpacing: 1.03,
      eyeTilt: 0.03,
      eyeOpenness: 1.0,
      noseBridge: 0.92,
      noseLength: 0.95,
      noseWidth: 1.18,
      mouthWidth: 1.08,
      lipFullness: 1.22,
    },
    classic_sculpted: {
      headWidthScale: 1.0,
      headDepthScale: 1.02,
      jawWidth: 1.0,
      jawSquareness: 0.7,
      chinWidth: 0.98,
      chinProjection: 1.04,
      cheekbone: 1.08,
      browDepth: 1.04,
      browArch: 0.32,
      browThickness: 1.0,
      eyeSpacing: 1.0,
      eyeTilt: 0.04,
      eyeOpenness: 0.98,
      noseBridge: 1.08,
      noseLength: 1.03,
      noseWidth: 0.98,
      mouthWidth: 1.0,
      lipFullness: 1.04,
    },
  };

  const p = base[faceShape];
  return {
    faceShape,
    irisColor,
    headWidthScale: p.headWidthScale + rand(0, 0.02),
    headDepthScale: p.headDepthScale + rand(3, 0.02),
    jawWidth: p.jawWidth + rand(6, 0.04),
    jawSquareness: THREE.MathUtils.clamp(p.jawSquareness + rand(9, 0.08), 0.2, 1.0),
    chinWidth: p.chinWidth + rand(12, 0.04),
    chinProjection: p.chinProjection + rand(15, 0.04),
    cheekbone: p.cheekbone + rand(18, 0.05),
    browDepth: p.browDepth + rand(21, 0.05),
    browArch: THREE.MathUtils.clamp(p.browArch + rand(2, 0.12), -0.1, 0.8),
    browThickness: p.browThickness + rand(5, 0.06),
    eyeSpacing: p.eyeSpacing + rand(8, 0.025),
    eyeTilt: THREE.MathUtils.clamp(p.eyeTilt + rand(11, 0.03), -0.08, 0.12),
    eyeOpenness: THREE.MathUtils.clamp(p.eyeOpenness + rand(14, 0.04), 0.84, 1.1),
    noseBridge: p.noseBridge + rand(17, 0.05),
    noseLength: p.noseLength + rand(20, 0.04),
    noseWidth: p.noseWidth + rand(1, 0.05),
    mouthWidth: p.mouthWidth + rand(4, 0.04),
    lipFullness: p.lipFullness + rand(7, 0.06),
  };
}

/**
 * Custom vertex-sculpted human head geometry with per-fighter bone structure,
 * realistic multi-plane nose, Cupid's-bow lips, mentolabial sulcus, orbital sockets, and cheekbones.
 * u = 0.5 is face front (+Z), v = 0 is chin, v = 1 is crown.
 */
export function buildSculptedHeadGeometry(traits: FacialTraits): THREE.BufferGeometry {
  const uSegs = 48;
  const vSegs = 38;
  const headHeight = 0.238;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= vSegs; iy++) {
    const v = iy / vSegs;
    const y = v * headHeight;

    let rx: number;
    let rz: number;
    if (v >= 0.45) {
      const t = Math.sin(v * Math.PI);
      rx = 0.084 * Math.pow(t, 0.5) * traits.headWidthScale;
      rz = 0.102 * Math.pow(t, 0.5) * traits.headDepthScale;
    } else {
      const jt = v / 0.45;
      const chinCap = v < 0.07 ? Math.pow(Math.sin((v / 0.07) * (Math.PI / 2)), 0.55) : 1;
      rx =
        0.084 *
        traits.headWidthScale *
        THREE.MathUtils.lerp(0.56 * traits.jawWidth, 0.99, Math.pow(jt, 0.62)) *
        chinCap;
      rz =
        0.102 *
        traits.headDepthScale *
        THREE.MathUtils.lerp(0.66, 0.98, Math.pow(jt, 0.58)) *
        chinCap;
    }

    for (let ix = 0; ix <= uSegs; ix++) {
      const u = ix / uSegs;
      const angle = (u - 0.5) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);
      const absX = Math.abs(sinA);

      let x = sinA * rx;
      let z = cosA * rz;

      if (cosA > 0) {
        const front = Math.pow(cosA, 1.3);

        // Mandibular gonial jaw corner (v = 0.11..0.30, lateral jaw)
        if (v > 0.1 && v < 0.32 && absX > 0.54 && absX < 0.93) {
          const gonialV = Math.sin(((v - 0.1) / 0.22) * Math.PI);
          const gonialX = Math.sin(((absX - 0.54) / 0.39) * Math.PI);
          x += Math.sign(sinA) * gonialV * gonialX * (0.004 + traits.jawSquareness * 0.0085);
          z += gonialV * gonialX * traits.jawSquareness * 0.003;
        }

        // Chin prominence (v = 0.02..0.16)
        if (v > 0.02 && v < 0.17 && absX < 0.36 * traits.chinWidth) {
          const chinV = Math.sin(((v - 0.02) / 0.15) * Math.PI);
          const chinX = Math.cos((absX / (0.36 * traits.chinWidth)) * (Math.PI / 2));
          z += front * chinV * chinX * 0.014 * traits.chinProjection;
        }

        // Mentolabial sulcus (concave dip between lower lip and chin, v = 0.15..0.19)
        if (v > 0.15 && v < 0.195 && absX < 0.26) {
          const sulV = Math.sin(((v - 0.15) / 0.045) * Math.PI);
          const sulX = Math.cos((absX / 0.26) * (Math.PI / 2));
          z -= front * sulV * sulX * 0.0055;
        }

        // Sub-malar buccal cheek hollow (sculpts lean vs fuller face structure)
        if (v > 0.2 && v < 0.37 && absX > 0.38 && absX < 0.78) {
          const bucV = Math.sin(((v - 0.2) / 0.17) * Math.PI);
          const bucX = Math.sin(((absX - 0.38) / 0.4) * Math.PI);
          z -= front * bucV * bucX * 0.0048 * traits.cheekbone;
        }

        // Anatomically Sculpted Lips & Mouth Commissure (v = 0.185..0.265)
        const mouthLim = 0.24 * traits.mouthWidth;
        if (v > 0.185 && v < 0.268 && absX < mouthLim) {
          const mouthW = Math.cos((absX / mouthLim) * (Math.PI / 2));
          const lipDist = Math.abs(v - 0.225);
          if (lipDist < 0.0065) {
            // Crisp oral parting crease
            z -= front * mouthW * (1 - lipDist / 0.0065) * 0.0046;
          } else if (v >= 0.225) {
            // Upper lip with subtle Cupid's bow modulation
            const upperT = Math.sin(((v - 0.225) / 0.043) * Math.PI);
            const bowMod = absX < 0.045 ? 0.85 : 1.04;
            z += front * mouthW * upperT * bowMod * 0.0076 * traits.lipFullness;
          } else {
            // Lower lip cushion
            const lowerT = Math.sin(((v - 0.185) / 0.04) * Math.PI);
            z += front * mouthW * lowerT * 0.0086 * traits.lipFullness;
          }
          // Recessed mouth corners (commissures)
          if (absX > mouthLim * 0.76 && lipDist < 0.016) {
            z -= front * 0.0032;
          }
        }

        // Philtrum columns & central dimple (v = 0.265..0.335)
        if (v > 0.265 && v < 0.338 && absX < 0.085) {
          const phV = Math.sin(((v - 0.265) / 0.073) * Math.PI);
          if (absX < 0.032) {
            z -= front * phV * (1 - absX / 0.032) * 0.0026;
          } else {
            z += front * phV * Math.sin(((absX - 0.032) / 0.053) * Math.PI) * 0.0022;
          }
        }

        // Multi-Plane 3D Human Nose: Radix -> Dorsum -> Tip -> Columella + Alar Wings (v = 0.332..0.555)
        if (v > 0.332 && v < 0.555 && absX < 0.2 * traits.noseWidth) {
          const bridgeW = 0.115 * (0.65 + traits.noseWidth * 0.35);
          const vNorm = (v - 0.332) / 0.223; // 0 = subnasale, 1 = radix between brows
          if (absX < bridgeW) {
            const bridgeProfile = Math.pow(Math.max(0, 1 - absX / bridgeW), 1.32);
            // Tip peaks cleanly around vNorm = 0.22 then curves sharply under into subnasale
            const profileCurve =
              vNorm < 0.22
                ? Math.sin((vNorm / 0.22) * (Math.PI / 2))
                : Math.pow(1 - (vNorm - 0.22) / 0.78, 0.85) * (0.72 + traits.noseBridge * 0.28);
            z += front * bridgeProfile * profileCurve * 0.026 * traits.noseLength;
          }
          // Alar nostril wings (v = 0.335..0.41) & alar crease
          const wingOuter = 0.175 * traits.noseWidth;
          if (vNorm < 0.36 && absX > 0.042 && absX < wingOuter) {
            const wingMask =
              Math.sin((vNorm / 0.36) * Math.PI) *
              Math.sin(((absX - 0.042) / (wingOuter - 0.042)) * Math.PI);
            z += front * wingMask * 0.0092;
            x += Math.sign(sinA) * wingMask * 0.0025 * traits.noseWidth;
          } else if (vNorm < 0.36 && absX >= wingOuter && absX < wingOuter + 0.032) {
            z -= front * Math.sin((vNorm / 0.36) * Math.PI) * 0.0022;
          }
        }

        // Zygomatic Cheekbone prominence (v = 0.36..0.51)
        if (v > 0.36 && v < 0.52 && absX > 0.24 && absX < 0.78) {
          const cm = Math.sin(((v - 0.36) / 0.16) * Math.PI);
          const cxMask = Math.sin(((absX - 0.24) / 0.54) * Math.PI);
          z += front * cm * cxMask * 0.0115 * traits.cheekbone;
          x += Math.sign(sinA) * cm * cxMask * 0.0028 * traits.cheekbone;
        }

        // Sculpted Orbital Eye Sockets centered at v = 0.50, sinA = 0.34 * eyeSpacing
        const eyeSin = 0.34 * traits.eyeSpacing;
        if (v > 0.435 && v < 0.565 && absX > eyeSin - 0.19 && absX < eyeSin + 0.2) {
          const em = Math.sin(((v - 0.435) / 0.13) * Math.PI);
          const ew = Math.sin(((absX - (eyeSin - 0.19)) / 0.39) * Math.PI);
          z -= front * em * ew * 0.0145 * traits.browDepth;
        }

        // Subtle Temple Hollow above zygomatic arch (v = 0.55..0.72)
        if (v > 0.55 && v < 0.72 && absX > 0.65 && absX < 0.92) {
          const tm = Math.sin(((v - 0.55) / 0.17) * Math.PI);
          const tx = Math.sin(((absX - 0.65) / 0.27) * Math.PI);
          x -= Math.sign(sinA) * tm * tx * 0.0032;
        }

        // Supraorbital Brow Ridge (v = 0.54..0.65)
        if (v > 0.54 && v < 0.65 && absX < 0.66) {
          const bm = Math.sin(((v - 0.54) / 0.11) * Math.PI);
          const bx = Math.cos((absX / 0.66) * (Math.PI / 2));
          z += front * bm * (0.45 + bx * 0.55) * 0.011 * traits.browDepth;
        }
      } else {
        // Cranial occipital curve at back of skull
        z -= Math.pow(-cosA, 1.5) * Math.sin(v * Math.PI) * 0.013;
      }

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * (uSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (uSegs + 1) + ix;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export interface HairCapOptions {
  topThickness?: number;
  sideThickness?: number;
  frontVMin?: number;
  templeVMin?: number;
  sideVMin?: number;
  backVMin?: number;
  crownLift?: number;
  waves?: number;
  waveAmp?: number;
  forHeadRoot?: boolean;
}

/**
 * Custom anatomically fitted sculpted hair cap matching buildSculptedHeadGeometry,
 * adding realistic outward & crown thickness so human hair fully covers the top/sides/nape
 * without ever exposing bare cranium through the crown.
 */
export function buildSculptedHairCapGeometry(
  traits: FacialTraits,
  opts: HairCapOptions = {},
): THREE.BufferGeometry {
  const {
    topThickness = 0.015,
    sideThickness = 0.011,
    frontVMin = 0.68,
    templeVMin = 0.61,
    sideVMin = 0.565,
    backVMin = 0.34,
    crownLift = 0,
    waves = 14,
    waveAmp = 0.0022,
    forHeadRoot = false,
  } = opts;

  const uSegs = 44;
  const vSegs = 18;
  const headHeight = 0.238;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= vSegs; iy++) {
    const s = iy / vSegs; // 0 = hairline edge, 1 = crown apex
    const edgeTaper = 0.16 + 0.84 * Math.min(1, s / 0.14);
    const poleClosure = Math.pow(Math.max(0, 1 - s), 0.35);

    for (let ix = 0; ix <= uSegs; ix++) {
      const u = ix / uSegs;
      const angle = (u - 0.5) * Math.PI * 2;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      let vMin: number;
      if (cosA >= 0) {
        const sideBlend = Math.pow(1 - cosA, 0.85);
        vMin =
          THREE.MathUtils.lerp(frontVMin, sideVMin, sideBlend) -
          Math.sin(sideBlend * Math.PI) * Math.max(0, frontVMin - templeVMin) * 0.45;
      } else {
        const backBlend = Math.pow(-cosA, 0.85);
        vMin = THREE.MathUtils.lerp(sideVMin, backVMin, backBlend);
      }

      const v = THREE.MathUtils.lerp(vMin, 1.0, s);
      const t = Math.sin(v * Math.PI);
      const rx = 0.084 * Math.pow(Math.max(0, t), 0.5) * traits.headWidthScale;
      const rz = 0.102 * Math.pow(Math.max(0, t), 0.5) * traits.headDepthScale;

      let hx = sinA * rx;
      let hz = cosA * rz;
      let hy = v * headHeight;

      if (cosA <= 0) {
        hz -= Math.pow(-cosA, 1.5) * t * 0.013;
      }

      const wave =
        (Math.sin(angle * waves + s * 3.6) * 0.6 +
          Math.cos(angle * (waves * 0.5) - s * 4.8) * 0.4) *
        waveAmp *
        Math.sin(s * Math.PI);

      const radialThick =
        (0.002 + sideThickness * edgeTaper * (0.45 + 0.55 * t) + wave) * poleClosure;
      hx += sinA * radialThick;
      hz += cosA * radialThick;

      const upBlend = Math.pow(Math.max(0, (v - 0.46) / 0.54), 0.72);
      const topThick =
        0.0016 + (topThickness + crownLift) * upBlend * edgeTaper + wave * 0.4 * upBlend;
      hy += topThick;

      const px = forHeadRoot ? hx : hx / traits.headWidthScale;
      const py = forHeadRoot ? hy : hy - 0.164;
      const pz = forHeadRoot ? hz : (hz + 0.004) / traits.headDepthScale;

      positions.push(px, py, pz);
      uvs.push(u, s);
    }
  }

  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * (uSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (uSegs + 1) + ix;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Curved front iris dome so the textured iris hugs the cornea curvature seamlessly
 */
export function buildDomedIrisGeometry(radius: number): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(radius, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const r2 = Math.min(1, (x * x + y * y) / (radius * radius));
    pos.setZ(i, (1 - r2) * 0.0018);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpted almond-curved human eyelid hood / lower rim that wraps cleanly around the eyeball
 */
export function buildSculptedEyelidGeometry(
  isUpper: boolean,
  openness: number,
  isLashRim = false,
): THREE.BufferGeometry {
  const uSegs = 18;
  const vSegs = 4;
  const halfW = 0.0132;
  const eyeZRadius = 0.0114;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= vSegs; iy++) {
    const v = iy / vSegs; // 0 = aperture edge touching eye, 1 = outer orbital fold
    for (let ix = 0; ix <= uSegs; ix++) {
      const u = (ix / uSegs) * 2 - 1; // -1 = inner corner, +1 = outer corner
      const x = u * halfW;
      const arch = Math.max(0, 1 - u * u);
      const apertureY = (isUpper ? 0.0038 : -0.0044) * openness * Math.pow(arch, 0.72);
      const thickness = isLashRim
        ? 0.0012 * Math.pow(arch, 0.5)
        : (isUpper ? 0.0052 : 0.0026) * Math.pow(arch, 0.65);

      const y = isUpper ? apertureY + v * thickness : apertureY - v * thickness;
      const zSphere = Math.sqrt(Math.max(0.00001, eyeZRadius * eyeZRadius - x * x * 0.72));
      const tuck = v * 0.0016;
      const z = zSphere - tuck + (isLashRim ? 0.0004 : 0.0002);

      positions.push(x, y, z);
    }
  }

  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * (uSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (uSegs + 1) + ix;
      const d = c + 1;
      if (isUpper) {
        indices.push(a, b, d, a, d, c);
      } else {
        indices.push(a, d, b, a, c, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Custom ergonomic boxing glove fist geometry:
 * padded knuckle dome, finger-curl underside pocket, and flat palm channel.
 */
function buildAnatomicalGloveGeometry(): THREE.BufferGeometry {
  const uSegs = 24;
  const vSegs = 20;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iy = 0; iy <= vSegs; iy++) {
    const v = iy / vSegs; // 0 = wrist cuff edge, 1 = top knuckle edge
    const theta = v * Math.PI;
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);

    for (let ix = 0; ix <= uSegs; ix++) {
      const u = ix / uSegs;
      const phi = (u - 0.5) * Math.PI * 2;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      let x = sinT * sinP * 0.074;
      let y = -cosT * 0.098 - 0.022;
      let z = sinT * cosP * 0.086;

      // Dorsal knuckle padding dome (+Z)
      if (cosP > 0 && v > 0.25 && v < 0.88) {
        const kMask = Math.pow(cosP, 1.3) * Math.sin(((v - 0.25) / 0.63) * Math.PI);
        z += kMask * 0.022;
      }

      // Ergonomic curled-finger palm recess (-Z, lower half)
      if (cosP < -0.15 && v > 0.15 && v < 0.65) {
        const pMask = Math.pow(-cosP, 1.2) * Math.sin(((v - 0.15) / 0.5) * Math.PI);
        z += pMask * 0.018;
      }

      // Subtle knuckle finger-tip curl tuck near top/front
      if (v > 0.72) {
        const tipT = (v - 0.72) / 0.28;
        z -= tipT * 0.018;
      }

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iy = 0; iy < vSegs; iy++) {
    for (let ix = 0; ix < uSegs; ix++) {
      const a = iy * (uSegs + 1) + ix;
      const b = a + 1;
      const c = (iy + 1) * (uSegs + 1) + ix;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Tapered sculpted curved hair strand geometry for lifelike layered moving hair locks
 */
export function buildHairLockGeometry(
  length: number,
  width: number,
  bendZ: number,
  bendY: number,
  tipKickZ = 0,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, bendY * 0.35, bendZ * 0.42),
    new THREE.Vector3(0, bendY - length * 0.48, bendZ * 0.85),
    new THREE.Vector3(0, bendY - length, bendZ + tipKickZ),
  ]);
  const tube = new THREE.TubeGeometry(curve, 9, width, 6, false);
  // Taper tip smoothly toward root and pointed feather end
  const pos = tube.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i);
    const y = pos.getY(i);
    const distNorm = Math.min(1, Math.hypot(y, z) / Math.max(0.01, length + Math.abs(bendZ)));
    const taper = THREE.MathUtils.clamp(1.12 - distNorm * 0.96, 0.14, 1.12);
    pos.setX(i, pos.getX(i) * taper);
  }
  tube.computeVertexNormals();
  return tube;
}

export function createBoxerRig(
  appearance: BoxerAppearance,
  isSoftwareGl: boolean,
  maxAnisotropy = 4,
  hasBelt = false,
): BoxerRig {
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

  const facialTraits = resolveFacialTraits(appearance);

  // Procedural Anatomical Textures
  const torsoTexSet = createTorsoSkinTextures(appearance.skinColor, maxAnisotropy);
  trackTex(torsoTexSet.map);
  trackTex(torsoTexSet.bumpMap);

  const limbTexSet = createLimbSkinTextures(appearance.skinColor, maxAnisotropy);
  trackTex(limbTexSet.map);
  trackTex(limbTexSet.bumpMap);

  const faceTexSet = createFaceTextures(
    appearance.skinColor,
    appearance.hairColor,
    appearance.beardStyle,
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
  trackTex(faceTexSet.map);
  trackTex(faceTexSet.bumpMap);

  const irisTex = trackTex(createIrisTexture(facialTraits.irisColor, maxAnisotropy));

  const hairTexSet = createHairTextures(appearance.hairColor, maxAnisotropy);
  trackTex(hairTexSet.map);
  trackTex(hairTexSet.bumpMap);

  const shortsTexSet = createShortsTextures(
    appearance.trunksColor,
    appearance.trunksTrimColor,
    maxAnisotropy,
    true,
  );
  trackTex(shortsTexSet.map);
  trackTex(shortsTexSet.bumpMap);

  const shortsLegTexSet = createShortsTextures(
    appearance.trunksColor,
    appearance.trunksTrimColor,
    maxAnisotropy,
    false,
  );
  trackTex(shortsLegTexSet.map);
  trackTex(shortsLegTexSet.bumpMap);

  const gloveTexSet = createGloveTextures(
    appearance.gloveColor,
    appearance.gloveTrimColor,
    maxAnisotropy,
  );
  trackTex(gloveTexSet.map);
  trackTex(gloveTexSet.bumpMap);

  // Vascular skin material for neck, arms, hands/wrists, and legs (harmonized with torsoMat)
  const skinMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: limbTexSet.map,
      bumpMap: limbTexSet.bumpMap,
      bumpScale: 0.0045,
      roughness: 0.48,
      metalness: 0.02,
      clearcoat: isSoftwareGl ? 0 : 0.24,
      clearcoatRoughness: 0.4,
    }),
  );

  // Detailed anatomical Torso material (matched reflectance so neck & deltoids blend seamlessly)
  const torsoMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: torsoTexSet.map,
      bumpMap: torsoTexSet.bumpMap,
      bumpScale: 0.0085,
      roughness: 0.48,
      metalness: 0.02,
      clearcoat: isSoftwareGl ? 0 : 0.24,
      clearcoatRoughness: 0.4,
    }),
  );

  // Detailed Portrait Face material
  const headMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: faceTexSet.map,
      bumpMap: faceTexSet.bumpMap,
      bumpScale: 0.0045,
      roughness: 0.48,
      metalness: 0.01,
      clearcoat: isSoftwareGl ? 0 : 0.18,
      clearcoatRoughness: 0.46,
    }),
  );

  // Fibrous glossy hair strand material
  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: hairTexSet.map,
      bumpMap: hairTexSet.bumpMap,
      bumpScale: 0.008,
      roughness: 0.58,
      metalness: 0.04,
    }),
  );

  const trunksMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: shortsTexSet.map,
      bumpMap: shortsTexSet.bumpMap,
      bumpScale: 0.012,
      roughness: 0.86,
      metalness: 0.04,
    }),
  );

  const trunksLegMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: shortsLegTexSet.map,
      bumpMap: shortsLegTexSet.bumpMap,
      bumpScale: 0.012,
      roughness: 0.86,
      metalness: 0.04,
    }),
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(appearance.trunksTrimColor),
      roughness: 0.35,
      metalness: 0.45,
    }),
  );

  const gloveMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: gloveTexSet.map,
      bumpMap: gloveTexSet.bumpMap,
      bumpScale: 0.009,
      roughness: 0.26,
      metalness: 0.05,
      clearcoat: isSoftwareGl ? 0 : 0.58,
      clearcoatRoughness: 0.24,
    }),
  );

  const gloveTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(appearance.gloveTrimColor),
      roughness: 0.44,
      metalness: 0.16,
    }),
  );

  const bootMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(appearance.bootColor),
      roughness: 0.62,
      metalness: 0.08,
    }),
  );

  const soleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.92,
      metalness: 0.0,
    }),
  );

  const scleraMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xeae5dd,
      roughness: 0.12,
      clearcoat: isSoftwareGl ? 0 : 0.95,
      clearcoatRoughness: 0.06,
    }),
  );

  const irisMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: irisTex,
      roughness: 0.12,
      clearcoat: isSoftwareGl ? 0 : 1.0,
      clearcoatRoughness: 0.05,
    }),
  );

  const lashMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(appearance.hairColor).multiplyScalar(0.45),
      roughness: 0.72,
    }),
  );

  const innerEarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(appearance.skinColor).multiplyScalar(0.76),
      roughness: 0.65,
    }),
  );

  const nostrilMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(appearance.skinColor).multiplyScalar(0.45),
      roughness: 0.8,
    }),
  );

  const silverChainMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.2,
      metalness: 0.9,
    }),
  );

  const tapeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.88,
      metalness: 0.0,
    }),
  );

  const root = new THREE.Group();
  const bulk = appearance.bulkScale;
  const height = appearance.heightScale;

  if (!sharedShadowTex) {
    sharedShadowTex = createContactShadowTexture();
  }
  const shadowGeo = trackGeo(new THREE.PlaneGeometry(1.42, 1.42));
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: sharedShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.66,
    }),
  );
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.014;
  root.add(shadowMesh);

  const bodyScaleGroup = new THREE.Group();
  bodyScaleGroup.scale.set(bulk, height, bulk);
  root.add(bodyScaleGroup);

  // 1. Pelvis & Relaxed Athletic Shorts
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.94, 0);
  bodyScaleGroup.add(pelvis);

  const trunksProfile = [
    new THREE.Vector2(0.001, -0.14),
    new THREE.Vector2(0.184, -0.13),
    new THREE.Vector2(0.188, -0.02),
    new THREE.Vector2(0.175, 0.08),
    new THREE.Vector2(0.164, 0.14),
    new THREE.Vector2(0.001, 0.145),
  ];
  const trunksGeo = trackGeo(new THREE.LatheGeometry(trunksProfile, 22));
  const trunksMesh = new THREE.Mesh(trunksGeo, trunksMat);
  trunksMesh.scale.set(1.04, 1, 0.78);
  trunksMesh.castShadow = true;
  trunksMesh.receiveShadow = true;
  pelvis.add(trunksMesh);

  const cordGeo = trackGeo(new THREE.CylinderGeometry(0.004, 0.004, 0.13, 6));
  for (const s of [-1, 1]) {
    const cord = new THREE.Mesh(cordGeo, trimMat);
    cord.position.set(s * 0.012, 0.055, 0.136);
    cord.rotation.z = s * 0.06;
    pelvis.add(cord);
  }

  let beltGroup: THREE.Group | undefined;
  if (hasBelt) {
    beltGroup = new THREE.Group();
    beltGroup.position.set(0, 0.105, 0);

    const strapMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x171717,
        roughness: 0.42,
        metalness: 0.16,
      }),
    );
    const goldMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.18,
        metalness: 0.92,
      }),
    );
    const rubyMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.22,
        metalness: 0.35,
      }),
    );

    const strapGeo = trackGeo(new THREE.CylinderGeometry(0.175, 0.178, 0.088, 22, 1, true));
    const strap = new THREE.Mesh(strapGeo, strapMat);
    strap.scale.set(1.06, 1, 0.82);
    beltGroup.add(strap);

    const centerPlateGeo = trackGeo(new THREE.CylinderGeometry(0.082, 0.082, 0.02, 8));
    const centerPlate = new THREE.Mesh(centerPlateGeo, goldMat);
    centerPlate.rotation.x = Math.PI / 2;
    centerPlate.scale.set(1.18, 1, 0.92);
    centerPlate.position.set(0, 0, 0.145);
    beltGroup.add(centerPlate);

    const jewelGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.024, 6));
    const jewel = new THREE.Mesh(jewelGeo, rubyMat);
    jewel.rotation.x = Math.PI / 2;
    jewel.position.set(0, 0, 0.15);
    beltGroup.add(jewel);

    const sidePlateGeo = trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.016, 6));
    for (const s of [-1, 1]) {
      const sidePlate = new THREE.Mesh(sidePlateGeo, goldMat);
      sidePlate.position.set(s * 0.145, 0, 0.09);
      sidePlate.rotation.x = Math.PI / 2;
      sidePlate.rotation.z = -s * 0.72;
      beltGroup.add(sidePlate);
    }

    beltGroup.visible = false;
    pelvis.add(beltGroup);
  }

  // 2. Sculpted Athletic Torso & Sculpted Anatomical Neck
  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0);
  pelvis.add(torso);

  const torsoGeo = trackGeo(buildSculptedTorsoGeometry());
  const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torso.add(torsoMesh);

  // Subtle metallic necklace chain draped naturally on collarbone
  const chainGeo = trackGeo(new THREE.TorusGeometry(0.088, 0.0048, 8, 24));
  const chain = new THREE.Mesh(chainGeo, silverChainMat);
  chain.position.set(0, 0.494, 0.024);
  chain.rotation.x = Math.PI / 2 + 0.36;
  torso.add(chain);

  // Sculpted Anatomical Neck (trapezius wings + SCM V-cords + natural athletic proportion)
  const neckGeo = trackGeo(buildSculptedNeckGeometry());
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.set(0, 0.502, 0.005);
  neckMesh.castShadow = true;
  torso.add(neckMesh);

  // 3. Sculpted Realistic Human Head, Multi-Part Eyes/Eyelids/Ears & Moving Dynamic Hair
  const head = new THREE.Group();
  head.position.set(0, 0.572, 0.016);
  torso.add(head);

  const headGeo = trackGeo(buildSculptedHeadGeometry(facialTraits));
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  // Recessed underside nostril openings tucked cleanly under nasal tip & wings
  const nostrilGeo = trackGeo(new THREE.SphereGeometry(0.0032, 6, 6));
  const noseTipZ =
    0.102 * facialTraits.headDepthScale + 0.017 * facialTraits.noseLength;
  for (const side of [-1, 1]) {
    const nst = new THREE.Mesh(nostrilGeo, nostrilMat);
    nst.scale.set(1.15, 0.42, 1.35);
    nst.position.set(side * 0.0072 * facialTraits.noseWidth, 0.081, noseTipZ - 0.01);
    nst.rotation.x = 0.35;
    head.add(nst);
  }

  // Realistic Composite Human Eyes: Textured Iris with Limbal Ring, Off-White Cornea, Almond Eyelids & Lash Line
  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.0124, 16, 12));
  const irisGeo = trackGeo(buildDomedIrisGeometry(0.0058));
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
    iris.position.set(0, 0.0002, 0.0124 * 0.84 - 0.0006);
    eyeGroup.add(iris);

    const upperLid = new THREE.Mesh(upperLidGeo, skinMat);
    eyeGroup.add(upperLid);

    const upperLash = new THREE.Mesh(upperLashGeo, lashMat);
    eyeGroup.add(upperLash);

    const lowerLid = new THREE.Mesh(lowerLidGeo, skinMat);
    eyeGroup.add(lowerLid);

    head.add(eyeGroup);
  }

  // Multi-Part Sculpted Human Ears aligned from brow to nose base
  const earHelixGeo = trackGeo(new THREE.TorusGeometry(0.0145, 0.0046, 8, 14, Math.PI * 1.45));
  const earLobeGeo = trackGeo(new THREE.SphereGeometry(0.0072, 8, 8));
  const earConchaGeo = trackGeo(new THREE.SphereGeometry(0.0105, 8, 8));
  for (const side of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.083 * facialTraits.headWidthScale, 0.108, -0.005);
    earGroup.rotation.y = side * 0.24;
    earGroup.rotation.x = -0.14;

    const helix = new THREE.Mesh(earHelixGeo, skinMat);
    helix.rotation.y = Math.PI / 2;
    helix.rotation.x = -0.45;
    helix.scale.set(0.75, 1.32, 0.85);
    earGroup.add(helix);

    const lobe = new THREE.Mesh(earLobeGeo, skinMat);
    lobe.position.set(0, -0.018, 0.002);
    lobe.scale.set(0.55, 1.0, 0.75);
    earGroup.add(lobe);

    const concha = new THREE.Mesh(earConchaGeo, innerEarMat);
    concha.position.set(-side * 0.002, 0, 0);
    concha.scale.set(0.32, 1.05, 0.72);
    earGroup.add(concha);

    head.add(earGroup);
  }

  // Dynamic Articulated Hair System (scaled cleanly to each character's unique cranium shape)
  const hairPivot = new THREE.Group();
  hairPivot.position.set(0, 0.164, -0.004);
  hairPivot.scale.set(facialTraits.headWidthScale, 1, facialTraits.headDepthScale);
  head.add(hairPivot);

  const hairStrands: HairStrandHandle[] = [];

  const addHairStrand = (
    geo: THREE.BufferGeometry,
    px: number,
    py: number,
    pz: number,
    rx: number,
    ry: number,
    rz: number,
    flexScale: number,
    phaseOffset: number,
    castShadow = true,
  ) => {
    const strandPivot = new THREE.Group();
    strandPivot.position.set(px, py, pz);
    strandPivot.rotation.set(rx, ry, rz);
    const mesh = new THREE.Mesh(geo, hairMat);
    mesh.castShadow = castShadow;
    strandPivot.add(mesh);
    hairPivot.add(strandPivot);
    hairStrands.push({
      pivot: strandPivot,
      baseRotX: rx,
      baseRotY: ry,
      baseRotZ: rz,
      flexScale,
      phaseOffset,
    });
  };

  const addCrownCap = (
    opts: HairCapOptions = {},
    mat: THREE.Material = hairMat,
    castShadow = true,
  ) => {
    const capGeo = trackGeo(buildSculptedHairCapGeometry(facialTraits, opts));
    const cap = new THREE.Mesh(capGeo, mat);
    cap.castShadow = castShadow;
    hairPivot.add(cap);
  };

  const fadeSideMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(appearance.skinColor).lerp(new THREE.Color(appearance.hairColor), 0.62),
      roughness: 0.72,
    }),
  );

  switch (appearance.hairStyle) {
    case 'bald': {
      break;
    }
    case 'buzz': {
      addCrownCap({
        topThickness: 0.0068,
        sideThickness: 0.0052,
        frontVMin: 0.68,
        templeVMin: 0.61,
        sideVMin: 0.56,
        backVMin: 0.34,
        waves: 20,
        waveAmp: 0.0008,
      });
      break;
    }
    case 'fade':
    case 'slick': {
      const isSlick = appearance.hairStyle === 'slick';
      addCrownCap(
        {
          topThickness: 0.005,
          sideThickness: 0.0042,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: isSlick ? 0.0185 : 0.0165,
        sideThickness: isSlick ? 0.0135 : 0.012,
        frontVMin: 0.69,
        templeVMin: 0.66,
        sideVMin: 0.68,
        backVMin: isSlick ? 0.42 : 0.54,
        crownLift: 0.003,
        waves: isSlick ? 12 : 16,
        waveAmp: 0.0024,
      });
      const lockGeoFront = trackGeo(
        buildHairLockGeometry(isSlick ? 0.072 : 0.056, 0.017, isSlick ? -0.04 : 0.026, 0.016),
      );
      const lockGeoCrown = trackGeo(
        buildHairLockGeometry(0.078, 0.0195, isSlick ? -0.044 : -0.026, 0.016),
      );
      const frontOffsets = [-0.05, -0.032, -0.014, 0.004, 0.024, 0.044];
      frontOffsets.forEach((lx, idx) => {
        const baseRotY = lx * 2.1 + (isSlick ? 0.16 : idx % 2 === 0 ? 0.06 : -0.06);
        const baseRotX = isSlick ? -0.62 : 0.08;
        const baseRotZ = lx * -1.1;
        addHairStrand(
          lockGeoFront,
          lx,
          0.056 + (idx % 2) * 0.004,
          0.064 - Math.abs(lx) * 0.32,
          baseRotX,
          baseRotY,
          baseRotZ,
          1.15 + (idx % 3) * 0.16,
          idx * 0.65,
        );
      });
      const crownSpecs = [
        { x: -0.036, y: 0.074, z: 0.028, ry: -0.2 },
        { x: 0.0, y: 0.082, z: 0.032, ry: 0.05 },
        { x: 0.036, y: 0.074, z: 0.028, ry: 0.2 },
        { x: -0.03, y: 0.074, z: -0.018, ry: -0.28 },
        { x: 0.0, y: 0.08, z: -0.022, ry: 0.0 },
        { x: 0.03, y: 0.074, z: -0.018, ry: 0.28 },
      ];
      crownSpecs.forEach((sp, idx) => {
        addHairStrand(
          lockGeoCrown,
          sp.x,
          sp.y,
          sp.z,
          isSlick ? -0.66 : -0.26,
          sp.ry,
          0,
          0.9 + idx * 0.08,
          idx * 0.85,
          false,
        );
      });
      break;
    }
    case 'mohawk': {
      addCrownCap(
        {
          topThickness: 0.0055,
          sideThickness: 0.0042,
          frontVMin: 0.69,
          templeVMin: 0.62,
          sideVMin: 0.56,
          backVMin: 0.36,
          waves: 16,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.012,
        sideThickness: 0.006,
        frontVMin: 0.72,
        templeVMin: 0.78,
        sideVMin: 0.82,
        backVMin: 0.46,
        crownLift: 0.006,
        waves: 10,
        waveAmp: 0.002,
      });
      const tuftGeo = trackGeo(buildHairLockGeometry(0.062, 0.023, 0.014, 0.052, 0.008));
      for (let i = 0; i < 10; i++) {
        const t = i / 9;
        addHairStrand(
          tuftGeo,
          0,
          0.056 + Math.sin(t * Math.PI) * 0.024,
          0.066 - t * 0.16,
          -0.24 - t * 0.68,
          0,
          0,
          1.2,
          i * 0.4,
        );
      }
      break;
    }
    case 'high_top': {
      addCrownCap(
        {
          topThickness: 0.0052,
          sideThickness: 0.0045,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.018,
        sideThickness: 0.013,
        frontVMin: 0.7,
        templeVMin: 0.68,
        sideVMin: 0.68,
        backVMin: 0.5,
        waves: 16,
        waveAmp: 0.0025,
      });
      const topBoxGeo = trackGeo(new THREE.CylinderGeometry(0.079, 0.075, 0.076, 22));
      const topBox = new THREE.Mesh(topBoxGeo, hairMat);
      topBox.position.set(0, 0.088, -0.004);
      topBox.scale.set(0.98, 1.0, 1.15);
      topBox.castShadow = true;
      hairPivot.add(topBox);
      const puffGeo = trackGeo(new THREE.SphereGeometry(0.027, 10, 8));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        addHairStrand(
          puffGeo,
          Math.cos(a) * 0.044,
          0.118,
          Math.sin(a) * 0.05 - 0.004,
          0,
          0,
          0,
          0.32,
          i * 0.7,
          false,
        );
      }
      addHairStrand(puffGeo, 0, 0.122, 0.0, 0, 0, 0, 0.25, 0.1, false);
      break;
    }
    case 'dreadlocks': {
      addCrownCap({
        topThickness: 0.016,
        sideThickness: 0.012,
        frontVMin: 0.67,
        templeVMin: 0.6,
        sideVMin: 0.56,
        backVMin: 0.34,
        waves: 16,
        waveAmp: 0.0032,
      });
      const crownDreadGeo = trackGeo(buildHairLockGeometry(0.088, 0.0145, -0.026, 0.014, -0.004));
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        addHairStrand(
          crownDreadGeo,
          Math.sin(ang) * 0.034,
          0.084,
          Math.cos(ang) * 0.038 - 0.004,
          0.14,
          ang,
          0,
          1.15,
          i * 0.55,
        );
      }
      const dreadGeo = trackGeo(buildHairLockGeometry(0.172, 0.0145, -0.038, 0.012, -0.006));
      const dreadCount = 18;
      for (let i = 0; i < dreadCount; i++) {
        const angle = (i / dreadCount) * Math.PI * 2;
        const px = Math.sin(angle) * 0.072;
        const pz = Math.cos(angle) * 0.08 - 0.006;
        const py = 0.058 + (i % 2) * 0.01;
        const rotY =
          angle + (Math.abs(px) < 0.035 && pz > 0.04 ? (i % 2 === 0 ? 0.55 : -0.55) : 0);
        addHairStrand(dreadGeo, px, py, pz, 0.24, rotY, 0, 1.55 + (i % 3) * 0.16, i * 0.45);
      }
      break;
    }
    case 'cornrows': {
      addCrownCap(
        {
          topThickness: 0.005,
          sideThickness: 0.0042,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.011,
        sideThickness: 0.009,
        frontVMin: 0.68,
        templeVMin: 0.63,
        sideVMin: 0.6,
        backVMin: 0.36,
        waves: 14,
        waveAmp: 0.0022,
      });
      const rowGeo = trackGeo(new THREE.CapsuleGeometry(0.0125, 0.145, 6, 10));
      const xs = [-0.058, -0.038, -0.019, 0, 0.019, 0.038, 0.058];
      xs.forEach((rx, idx) => {
        const row = new THREE.Mesh(rowGeo, hairMat);
        row.position.set(rx, 0.068 - Math.abs(rx) * 0.26, -0.008);
        row.rotation.set(Math.PI / 2 - 0.15, 0, rx * -2.0);
        row.castShadow = true;
        hairPivot.add(row);
        const tailGeo = trackGeo(buildHairLockGeometry(0.078, 0.0115, -0.026, 0));
        addHairStrand(tailGeo, rx * 0.86, 0.014, -0.088, 0.3, Math.PI, 0, 1.3, idx * 0.55);
      });
      break;
    }
    case 'afro': {
      addCrownCap({
        topThickness: 0.034,
        sideThickness: 0.03,
        frontVMin: 0.65,
        templeVMin: 0.56,
        sideVMin: 0.5,
        backVMin: 0.3,
        crownLift: 0.012,
        waves: 16,
        waveAmp: 0.0045,
      });
      const afroGeo = trackGeo(new THREE.SphereGeometry(0.142, 24, 18));
      const afro = new THREE.Mesh(afroGeo, hairMat);
      afro.position.set(0, 0.044, -0.012);
      afro.scale.set(1.04, 1.02, 1.09);
      afro.castShadow = true;
      hairPivot.add(afro);
      const puffGeo = trackGeo(new THREE.SphereGeometry(0.048, 12, 10));
      const puffPts = [
        [-0.086, 0.076, 0.022],
        [0.086, 0.076, 0.022],
        [0, 0.12, 0.02],
        [-0.048, 0.106, 0.052],
        [0.048, 0.106, 0.052],
        [-0.062, 0.092, -0.068],
        [0.062, 0.092, -0.068],
        [0, 0.108, -0.058],
        [0, 0.054, -0.106],
      ];
      puffPts.forEach(([x, y, z], idx) => {
        addHairStrand(puffGeo, x, y, z, 0, 0, 0, 0.5, idx * 0.7, false);
      });
      break;
    }
    case 'pompadour': {
      addCrownCap(
        {
          topThickness: 0.0052,
          sideThickness: 0.0045,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.0175,
        sideThickness: 0.0135,
        frontVMin: 0.69,
        templeVMin: 0.64,
        sideVMin: 0.63,
        backVMin: 0.42,
        crownLift: 0.004,
        waves: 12,
        waveAmp: 0.0024,
      });
      const pompCrestGeo = trackGeo(new THREE.CapsuleGeometry(0.044, 0.084, 8, 14));
      const pomp = new THREE.Mesh(pompCrestGeo, hairMat);
      pomp.position.set(0, 0.082, 0.018);
      pomp.rotation.set(Math.PI / 2 - 0.32, 0, 0);
      pomp.scale.set(1.08, 1.0, 1.24);
      pomp.castShadow = true;
      hairPivot.add(pomp);
      const waveLockGeo = trackGeo(buildHairLockGeometry(0.068, 0.018, -0.04, 0.022));
      [-0.036, -0.016, 0.008, 0.034].forEach((lx, idx) => {
        addHairStrand(waveLockGeo, lx, 0.08, 0.052, -0.46, lx * 1.7, 0, 1.05, idx * 0.6);
      });
      break;
    }
    case 'curly_top': {
      addCrownCap(
        {
          topThickness: 0.0052,
          sideThickness: 0.0045,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.0165,
        sideThickness: 0.013,
        frontVMin: 0.69,
        templeVMin: 0.66,
        sideVMin: 0.66,
        backVMin: 0.48,
        waves: 16,
        waveAmp: 0.0036,
      });
      const curlGeo = trackGeo(new THREE.SphereGeometry(0.029, 10, 8));
      const curls = [
        [-0.05, 0.06, 0.052],
        [-0.02, 0.072, 0.062],
        [0.02, 0.072, 0.062],
        [0.05, 0.06, 0.052],
        [-0.056, 0.074, 0.012],
        [-0.022, 0.088, 0.022],
        [0.022, 0.088, 0.022],
        [0.056, 0.074, 0.012],
        [0.0, 0.092, -0.002],
        [-0.048, 0.074, -0.03],
        [0.0, 0.084, -0.038],
        [0.048, 0.074, -0.03],
        [-0.034, 0.064, -0.066],
        [0.034, 0.064, -0.066],
        [0.0, 0.068, -0.072],
      ];
      curls.forEach(([x, y, z], idx) => {
        addHairStrand(curlGeo, x, y, z, 0, 0, 0, 0.88, idx * 0.5);
      });
      break;
    }
    case 'spiky': {
      addCrownCap(
        {
          topThickness: 0.0052,
          sideThickness: 0.0045,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.016,
        sideThickness: 0.0125,
        frontVMin: 0.68,
        templeVMin: 0.64,
        sideVMin: 0.63,
        backVMin: 0.42,
        waves: 16,
        waveAmp: 0.0028,
      });
      const spikeLockGeo = trackGeo(buildHairLockGeometry(0.058, 0.0165, 0.018, 0.048));
      const spikes = [
        { x: 0, y: 0.068, z: 0.056, rx: -0.18, rz: 0 },
        { x: -0.034, y: 0.064, z: 0.048, rx: -0.14, rz: 0.34 },
        { x: 0.034, y: 0.064, z: 0.048, rx: -0.14, rz: -0.34 },
        { x: -0.052, y: 0.068, z: 0.012, rx: -0.28, rz: 0.48 },
        { x: -0.02, y: 0.082, z: 0.022, rx: -0.28, rz: 0.16 },
        { x: 0.02, y: 0.082, z: 0.022, rx: -0.28, rz: -0.16 },
        { x: 0.052, y: 0.068, z: 0.012, rx: -0.28, rz: -0.48 },
        { x: 0, y: 0.086, z: -0.008, rx: -0.38, rz: 0 },
        { x: -0.04, y: 0.072, z: -0.032, rx: -0.55, rz: 0.34 },
        { x: 0.04, y: 0.072, z: -0.032, rx: -0.55, rz: -0.34 },
        { x: 0, y: 0.072, z: -0.058, rx: -0.68, rz: 0 },
      ];
      spikes.forEach((sp, idx) => {
        addHairStrand(spikeLockGeo, sp.x, sp.y, sp.z, sp.rx, 0, sp.rz, 0.9, idx * 0.4);
      });
      break;
    }
    case 'side_part': {
      addCrownCap(
        {
          topThickness: 0.0052,
          sideThickness: 0.0045,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.017,
        sideThickness: 0.013,
        frontVMin: 0.68,
        templeVMin: 0.63,
        sideVMin: 0.6,
        backVMin: 0.38,
        crownLift: 0.003,
        waves: 14,
        waveAmp: 0.0024,
      });
      const sideLockGeo = trackGeo(buildHairLockGeometry(0.068, 0.018, 0.026, 0.018));
      [-0.048, -0.024, 0.0, 0.024, 0.048].forEach((lx, idx) => {
        addHairStrand(
          sideLockGeo,
          lx,
          0.058 + (idx % 2) * 0.005,
          0.058 - Math.abs(lx) * 0.25,
          0.14,
          0.52 + lx * 1.2,
          -0.36,
          1.15,
          idx * 0.5,
        );
      });
      const crownPartGeo = trackGeo(buildHairLockGeometry(0.072, 0.019, -0.024, 0.014));
      [-0.028, 0.004, 0.032].forEach((cx, idx) => {
        addHairStrand(crownPartGeo, cx, 0.08, 0.01, -0.25, 0.38, -0.24, 0.85, idx * 0.6, false);
      });
      break;
    }
    case 'undercut': {
      addCrownCap(
        {
          topThickness: 0.005,
          sideThickness: 0.004,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.018,
        sideThickness: 0.0125,
        frontVMin: 0.7,
        templeVMin: 0.72,
        sideVMin: 0.74,
        backVMin: 0.56,
        crownLift: 0.004,
        waves: 12,
        waveAmp: 0.0024,
      });
      const topSweepGeo = trackGeo(new THREE.CapsuleGeometry(0.048, 0.092, 8, 14));
      const topSweep = new THREE.Mesh(topSweepGeo, hairMat);
      topSweep.position.set(0, 0.072, 0.002);
      topSweep.rotation.set(Math.PI / 2 - 0.14, 0, 0);
      topSweep.scale.set(1.12, 1.0, 0.85);
      topSweep.castShadow = true;
      hairPivot.add(topSweep);
      const longLockGeo = trackGeo(buildHairLockGeometry(0.092, 0.019, -0.046, 0.014));
      [-0.038, -0.014, 0.014, 0.038].forEach((lx, idx) => {
        addHairStrand(longLockGeo, lx, 0.076, 0.046, -0.52, lx * 1.15, 0, 1.3, idx * 0.6);
      });
      break;
    }
    case 'mullet': {
      addCrownCap(
        {
          topThickness: 0.006,
          sideThickness: 0.005,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0008,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.017,
        sideThickness: 0.013,
        frontVMin: 0.68,
        templeVMin: 0.62,
        sideVMin: 0.58,
        backVMin: 0.34,
        waves: 14,
        waveAmp: 0.0028,
      });
      const frontSpike = trackGeo(buildHairLockGeometry(0.054, 0.017, 0.028, 0.02));
      [-0.036, 0, 0.036].forEach((lx, idx) => {
        addHairStrand(frontSpike, lx, 0.058, 0.058, 0.12, lx * 2, 0, 1.0, idx * 0.5);
      });
      const crownMulletGeo = trackGeo(buildHairLockGeometry(0.072, 0.0185, -0.028, 0.014));
      [-0.028, 0, 0.028].forEach((cx, idx) => {
        addHairStrand(crownMulletGeo, cx, 0.082, 0.006, -0.3, cx * 1.4, 0, 0.95, idx * 0.5, false);
      });
      const backDrapingGeo = trackGeo(buildHairLockGeometry(0.145, 0.0205, -0.046, 0.008, -0.012));
      [-0.058, -0.029, 0, 0.029, 0.058].forEach((bx, idx) => {
        addHairStrand(
          backDrapingGeo,
          bx,
          0.022,
          -0.084,
          0.14,
          Math.PI + bx * 1.8,
          0,
          1.7,
          idx * 0.45,
        );
      });
      break;
    }
    case 'man_bun': {
      addCrownCap({
        topThickness: 0.0145,
        sideThickness: 0.011,
        frontVMin: 0.67,
        templeVMin: 0.6,
        sideVMin: 0.55,
        backVMin: 0.34,
        waves: 14,
        waveAmp: 0.002,
      });
      const bunGeo = trackGeo(new THREE.SphereGeometry(0.046, 16, 12));
      addHairStrand(bunGeo, 0, 0.074, -0.082, 0, 0, 0, 0.72, 0.2);
      const pullGeo = trackGeo(buildHairLockGeometry(0.084, 0.017, -0.044, 0.014));
      [-0.032, 0, 0.032].forEach((px, idx) => {
        addHairStrand(pullGeo, px, 0.078, 0.03, -0.58, px * -1.4, 0, 0.75, idx * 0.5, false);
      });
      const wispGeo = trackGeo(buildHairLockGeometry(0.054, 0.011, -0.018, 0.005));
      addHairStrand(wispGeo, -0.068, 0.024, 0.016, 0.15, -0.8, 0.25, 1.25, 0.4);
      addHairStrand(wispGeo, 0.068, 0.024, 0.016, 0.15, 0.8, -0.25, 1.25, 1.1);
      break;
    }
    case 'long_wavy': {
      addCrownCap({
        topThickness: 0.0175,
        sideThickness: 0.014,
        frontVMin: 0.67,
        templeVMin: 0.59,
        sideVMin: 0.54,
        backVMin: 0.32,
        crownLift: 0.004,
        waves: 14,
        waveAmp: 0.0032,
      });
      const topWaveGeo = trackGeo(buildHairLockGeometry(0.084, 0.0185, -0.03, 0.016));
      [-0.032, 0, 0.032].forEach((tx, idx) => {
        addHairStrand(topWaveGeo, tx, 0.082, 0.018, -0.28, tx * 1.4, 0, 1.0, idx * 0.6, false);
      });
      const longWaveGeo = trackGeo(buildHairLockGeometry(0.18, 0.021, -0.038, 0.01, -0.012));
      const angles = [1.15, 1.55, 1.95, 2.35, 2.75, 3.14, -2.75, -2.35, -1.95, -1.55, -1.15];
      angles.forEach((ang, idx) => {
        const px = Math.sin(ang) * 0.082;
        const pz = Math.cos(ang) * 0.088 - 0.006;
        addHairStrand(
          longWaveGeo,
          px,
          0.048,
          pz,
          0.18,
          ang,
          0,
          1.8 + (idx % 2) * 0.18,
          idx * 0.38,
        );
      });
      const frontSweepGeo = trackGeo(buildHairLockGeometry(0.084, 0.0165, 0.024, 0.012));
      addHairStrand(frontSweepGeo, -0.046, 0.056, 0.058, 0.12, -0.75, 0.25, 1.35, 0.3);
      addHairStrand(frontSweepGeo, 0.046, 0.056, 0.058, 0.12, 0.75, -0.25, 1.35, 0.9);
      break;
    }
    case 'faux_hawk': {
      addCrownCap(
        {
          topThickness: 0.006,
          sideThickness: 0.0048,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0008,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.0155,
        sideThickness: 0.0115,
        frontVMin: 0.69,
        templeVMin: 0.65,
        sideVMin: 0.64,
        backVMin: 0.42,
        crownLift: 0.004,
        waves: 14,
        waveAmp: 0.0025,
      });
      const ridgeGeo = trackGeo(buildHairLockGeometry(0.058, 0.021, 0.02, 0.04));
      for (let i = 0; i < 8; i++) {
        const t = i / 7;
        addHairStrand(
          ridgeGeo,
          0,
          0.064 + Math.sin(t * Math.PI) * 0.016,
          0.056 - t * 0.13,
          -0.22 - t * 0.52,
          0,
          0,
          1.15,
          i * 0.45,
        );
      }
      break;
    }
    case 'flattop': {
      addCrownCap(
        {
          topThickness: 0.0052,
          sideThickness: 0.0045,
          frontVMin: 0.68,
          templeVMin: 0.61,
          sideVMin: 0.56,
          backVMin: 0.34,
          waves: 18,
          waveAmp: 0.0007,
        },
        fadeSideMat,
        false,
      );
      addCrownCap({
        topThickness: 0.016,
        sideThickness: 0.012,
        frontVMin: 0.7,
        templeVMin: 0.68,
        sideVMin: 0.68,
        backVMin: 0.5,
        waves: 16,
        waveAmp: 0.002,
      });
      const flatGeo = trackGeo(new THREE.CylinderGeometry(0.085, 0.08, 0.056, 22));
      const flatMesh = new THREE.Mesh(flatGeo, hairMat);
      flatMesh.position.set(0, 0.075, -0.002);
      flatMesh.scale.set(0.99, 1.0, 1.16);
      flatMesh.castShadow = true;
      hairPivot.add(flatMesh);
      break;
    }
    case 'shaggy': {
      addCrownCap({
        topThickness: 0.018,
        sideThickness: 0.014,
        frontVMin: 0.66,
        templeVMin: 0.58,
        sideVMin: 0.52,
        backVMin: 0.3,
        crownLift: 0.004,
        waves: 16,
        waveAmp: 0.0034,
      });
      const shagCrownGeo = trackGeo(buildHairLockGeometry(0.072, 0.018, 0.022, 0.018));
      [-0.032, 0, 0.032].forEach((cx, idx) => {
        addHairStrand(shagCrownGeo, cx, 0.082, 0.016, 0.05, cx * 2.2, 0, 1.1, idx * 0.5, false);
      });
      const shagFrontGeo = trackGeo(buildHairLockGeometry(0.068, 0.017, 0.034, 0.012));
      const shagBackGeo = trackGeo(buildHairLockGeometry(0.098, 0.019, -0.03, 0.008));
      [-0.054, -0.027, 0, 0.027, 0.054].forEach((lx, idx) => {
        addHairStrand(
          shagFrontGeo,
          lx,
          0.056 + (idx % 2) * 0.005,
          0.062 - Math.abs(lx) * 0.3,
          0.22,
          lx * 3.0,
          lx * -1.8,
          1.4,
          idx * 0.55,
        );
      });
      [-0.064, -0.032, 0, 0.032, 0.064].forEach((bx, idx) => {
        addHairStrand(
          shagBackGeo,
          bx,
          0.036,
          -0.08,
          0.22,
          Math.PI + bx * 2.2,
          0,
          1.45,
          idx * 0.65,
        );
      });
      break;
    }
    case 'wolf_cut': {
      // Signature Wolf Cut: thick layered full-crown coverage, parted curtain bangs, ear-framing layers & flared multi-tier nape
      addCrownCap({
        topThickness: 0.0185,
        sideThickness: 0.0145,
        frontVMin: 0.67,
        templeVMin: 0.59,
        sideVMin: 0.54,
        backVMin: 0.32,
        crownLift: 0.005,
        waves: 14,
        waveAmp: 0.0034,
      });

      const wolfCrownGeo = trackGeo(buildHairLockGeometry(0.074, 0.0185, 0.028, 0.022, 0.008));
      const crownLayers = [
        { x: -0.032, y: 0.076, z: 0.024, rx: 0.06, ry: -0.35, rz: 0.2 },
        { x: 0.0, y: 0.084, z: 0.026, rx: 0.04, ry: 0.08, rz: 0 },
        { x: 0.032, y: 0.076, z: 0.024, rx: 0.06, ry: 0.35, rz: -0.2 },
        { x: -0.042, y: 0.072, z: -0.022, rx: -0.22, ry: -0.8, rz: 0.25 },
        { x: 0.0, y: 0.078, z: -0.026, rx: -0.26, ry: 0.0, rz: 0 },
        { x: 0.042, y: 0.072, z: -0.022, rx: -0.22, ry: 0.8, rz: -0.25 },
      ];
      crownLayers.forEach((cl, idx) => {
        addHairStrand(wolfCrownGeo, cl.x, cl.y, cl.z, cl.rx, cl.ry, cl.rz, 1.15, idx * 0.55, false);
      });

      const curtainBangGeo = trackGeo(buildHairLockGeometry(0.078, 0.0155, 0.032, 0.014, 0.01));
      const curtainSpecs = [
        { x: -0.016, y: 0.062, z: 0.066, rx: 0.14, ry: -0.45, rz: 0.28 },
        { x: 0.016, y: 0.062, z: 0.066, rx: 0.14, ry: 0.45, rz: -0.28 },
        { x: -0.038, y: 0.056, z: 0.056, rx: 0.18, ry: -0.78, rz: 0.32 },
        { x: 0.038, y: 0.056, z: 0.056, rx: 0.18, ry: 0.78, rz: -0.32 },
        { x: -0.058, y: 0.046, z: 0.036, rx: 0.16, ry: -1.12, rz: 0.26 },
        { x: 0.058, y: 0.046, z: 0.036, rx: 0.16, ry: 1.12, rz: -0.26 },
      ];
      curtainSpecs.forEach((cb, idx) => {
        addHairStrand(curtainBangGeo, cb.x, cb.y, cb.z, cb.rx, cb.ry, cb.rz, 1.45, idx * 0.45);
      });

      const sideFrameGeo = trackGeo(buildHairLockGeometry(0.108, 0.0155, -0.014, 0.008, -0.014));
      [
        { x: -0.078, y: 0.03, z: 0.008, ry: -1.48, rz: 0.18 },
        { x: 0.078, y: 0.03, z: 0.008, ry: 1.48, rz: -0.18 },
        { x: -0.08, y: 0.022, z: -0.024, ry: -1.92, rz: 0.14 },
        { x: 0.08, y: 0.022, z: -0.024, ry: 1.92, rz: -0.14 },
      ].forEach((sf, idx) => {
        addHairStrand(sideFrameGeo, sf.x, sf.y, sf.z, 0.12, sf.ry, sf.rz, 1.65, idx * 0.6);
      });

      const upperWolfBackGeo = trackGeo(buildHairLockGeometry(0.11, 0.0185, -0.036, 0.01, -0.016));
      [-0.056, -0.028, 0.0, 0.028, 0.056].forEach((bx, idx) => {
        addHairStrand(
          upperWolfBackGeo,
          bx,
          0.042 + (idx % 2) * 0.006,
          -0.076 + Math.abs(bx) * 0.2,
          0.16,
          Math.PI + bx * 2.4,
          0,
          1.55,
          idx * 0.5,
        );
      });

      const lowerWolfNapeGeo = trackGeo(buildHairLockGeometry(0.145, 0.0165, -0.044, 0.006, -0.024));
      [-0.068, -0.045, -0.022, 0.0, 0.022, 0.045, 0.068].forEach((bx, idx) => {
        addHairStrand(
          lowerWolfNapeGeo,
          bx,
          0.014 + (idx % 2) * 0.005,
          -0.084 + Math.abs(bx) * 0.25,
          0.18,
          Math.PI + bx * 2.8,
          0,
          1.85,
          idx * 0.42,
        );
      });
      break;
    }
  }

  // 4. Anatomically Sculpted Arms, Wrist Hand-Wraps & Ergonomic Boxing Gloves
  const gloveGeo = trackGeo(buildAnatomicalGloveGeometry());
  const thumbGeo = trackGeo(new THREE.CapsuleGeometry(0.022, 0.046, 6, 10));
  const wristBolsterGeo = trackGeo(new THREE.TorusGeometry(0.049, 0.012, 8, 16));

  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.194, 0.436, 0.004);
    torso.add(shoulder);

    const deltGeo = trackGeo(buildSculptedDeltoidGeometry(side));
    const delt = new THREE.Mesh(deltGeo, skinMat);
    delt.castShadow = true;
    shoulder.add(delt);

    const upperArmGeo = trackGeo(buildSculptedLimbGeometry(0.28, 'upperArm'));
    const upperArm = new THREE.Mesh(upperArmGeo, skinMat);
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);

    const elbowCapGeo = trackGeo(new THREE.SphereGeometry(0.046, 12, 10));
    const elbowCap = new THREE.Mesh(elbowCapGeo, skinMat);
    elbow.add(elbowCap);

    // Forearm Roll Group (allows natural wrist/forearm pronation & supination on Jab/Hook/Uppercut!)
    const forearmRoll = new THREE.Group();
    elbow.add(forearmRoll);

    const forearmGeo = trackGeo(buildSculptedLimbGeometry(0.25, 'forearm'));
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.castShadow = true;
    forearmRoll.add(forearm);

    // Layered Athletic Wrist Hand-Wrap Tape
    const cuffGeo = trackGeo(new THREE.CylinderGeometry(0.041, 0.039, 0.062, 16));
    const cuff = new THREE.Mesh(cuffGeo, tapeMat);
    cuff.scale.set(1.08, 1, 0.84); // Matches flat anatomical wrist cross-section!
    cuff.position.set(0, -0.228, 0);
    forearmRoll.add(cuff);

    const gloveGroup = new THREE.Group();
    gloveGroup.position.set(0, -0.305, 0.012);
    forearmRoll.add(gloveGroup);

    // Leather Glove Cuff & Wrist Bolster Pad
    const gloveWristGeo = trackGeo(new THREE.CylinderGeometry(0.056, 0.044, 0.076, 16));
    const gloveWrist = new THREE.Mesh(gloveWristGeo, gloveTrimMat);
    gloveWrist.position.y = 0.046;
    gloveWrist.scale.set(1.04, 1, 0.92);
    gloveWrist.castShadow = true;
    gloveGroup.add(gloveWrist);

    const bolster = new THREE.Mesh(wristBolsterGeo, gloveTrimMat);
    bolster.rotation.x = Math.PI / 2;
    bolster.position.set(0, 0.018, 0);
    gloveGroup.add(bolster);

    // Sculpted Ergonomic Glove Fist (Knuckle Ridge + Curled Fingers Pocket)
    const gloveMain = new THREE.Mesh(gloveGeo, gloveMat);
    gloveMain.castShadow = true;
    gloveGroup.add(gloveMain);

    // Curved Locked Boxing Thumb tucked naturally across palm
    const thumb = new THREE.Mesh(thumbGeo, gloveMat);
    thumb.position.set(-side * 0.062, -0.014, 0.032);
    thumb.rotation.set(0.32, 0, side * 0.48);
    thumb.castShadow = true;
    gloveGroup.add(thumb);

    return { shoulder, elbow, forearmRoll };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // 5. Relaxed Knee-Length Athletic Shorts, Muscular Legs & Boxing Boots
  const buildLeg = (side: -1 | 1) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.106, -0.075, 0);
    pelvis.add(hip);

    const shortLegGeo = trackGeo(buildSculptedLimbGeometry(0.28, 'thigh'));
    const shortLeg = new THREE.Mesh(shortLegGeo, trunksLegMat);
    shortLeg.scale.set(1.16, 1.0, 1.12);
    shortLeg.castShadow = true;
    hip.add(shortLeg);

    const thighGeo = trackGeo(buildSculptedLimbGeometry(0.42, 'thigh'));
    const thigh = new THREE.Mesh(thighGeo, skinMat);
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    hip.add(knee);

    const kneeCapGeo = trackGeo(new THREE.SphereGeometry(0.056, 12, 10));
    const kneeCap = new THREE.Mesh(kneeCapGeo, skinMat);
    knee.add(kneeCap);

    const calfGeo = trackGeo(buildSculptedLimbGeometry(0.36, 'calf'));
    const calf = new THREE.Mesh(calfGeo, skinMat);
    calf.castShadow = true;
    knee.add(calf);

    const bootUpperGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.045, 0.145, 16));
    const bootUpper = new THREE.Mesh(bootUpperGeo, bootMat);
    bootUpper.position.y = -0.32;
    bootUpper.castShadow = true;
    knee.add(bootUpper);

    // Articulated Ankle Hinge (keeps boot sole level with canvas and allows toe push-off)
    const ankle = new THREE.Group();
    ankle.position.set(0, -0.385, 0);
    knee.add(ankle);

    const ankleJointGeo = trackGeo(new THREE.SphereGeometry(0.043, 12, 10));
    const ankleJoint = new THREE.Mesh(ankleJointGeo, bootMat);
    ankleJoint.scale.set(0.96, 0.85, 1.05);
    ankle.add(ankleJoint);

    const heelGeo = trackGeo(new THREE.CapsuleGeometry(0.038, 0.035, 6, 10));
    const heel = new THREE.Mesh(heelGeo, bootMat);
    heel.rotation.x = Math.PI / 2;
    heel.position.set(0, -0.022, -0.014);
    heel.castShadow = true;
    ankle.add(heel);

    const bootToeGeo = trackGeo(new THREE.CapsuleGeometry(0.042, 0.105, 6, 12));
    const bootToe = new THREE.Mesh(bootToeGeo, bootMat);
    bootToe.rotation.x = Math.PI / 2;
    bootToe.scale.set(1.05, 1, 0.72);
    bootToe.position.set(0, -0.02, 0.05);
    bootToe.castShadow = true;
    ankle.add(bootToe);

    const soleGeo = trackGeo(new THREE.CapsuleGeometry(0.044, 0.118, 6, 12));
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.rotation.x = Math.PI / 2;
    sole.scale.set(1.08, 1, 0.34);
    sole.position.set(0, -0.047, 0.042);
    ankle.add(sole);

    return { hip, knee, ankle };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  return {
    root,
    pelvis,
    torso,
    head,
    hairPivot,
    hairStrands,
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
    leftGloveWorldPos: new THREE.Vector3(),
    rightGloveWorldPos: new THREE.Vector3(),
    headWorldPos: new THREE.Vector3(),
    skinMat,
    torsoMat,
    headMat,
    gloveMat,
    beltGroup,
    shadowMesh,
    geometries,
    materials,
    textures,
  };
}

export function disposeBoxerRig(rig: BoxerRig) {
  for (const g of rig.geometries) g.dispose();
  for (const m of rig.materials) m.dispose();
  for (const t of rig.textures) t.dispose();
}

export function triggerHitPhysicsImpulse(
  anim: BoxerAnimState,
  impulseScale: number,
  sideBias: number,
  isUppercut: boolean,
) {
  anim.headSpringVelX -= (isUppercut ? 13.5 : 8.5) * impulseScale;
  anim.headSpringVelZ += sideBias * 10.5 * impulseScale;
  anim.torsoSpringVelX -= (isUppercut ? 4.8 : 6.2) * impulseScale;
  anim.torsoSpringVelY += sideBias * 5.6 * impulseScale;
  anim.torsoSpringVelZ += sideBias * 4.2 * impulseScale;

  // Whip hair violently opposite head snap!
  anim.hairVelX += (isUppercut ? 18 : 11) * impulseScale;
  anim.hairVelZ -= sideBias * 16 * impulseScale;
}

export function triggerKnockdownRagdoll(
  anim: BoxerAnimState,
  fallDirLocalX: number,
  fallDirLocalZ: number,
  intensity: number,
) {
  const rd = anim.ragdoll;
  rd.active = true;
  rd.pelvisY = 0.92;
  rd.pelvisVelY = 0.65 * intensity;
  rd.pelvisOffsetX = 0;
  rd.pelvisOffsetZ = 0;
  rd.pelvisVelX = fallDirLocalX * 1.45 * intensity;
  rd.pelvisVelZ = fallDirLocalZ * 1.85 * intensity;
  rd.pelvisRotX = 0;
  rd.pelvisRotY = 0;
  rd.pelvisRotZ = 0;
  rd.pelvisAngVelX = -3.6 * intensity;
  rd.pelvisAngVelZ = (Math.random() - 0.5) * 1.8;

  rd.torso = {
    angleX: 0.15,
    angleY: 0,
    angleZ: 0,
    velX: -2.2 * intensity,
    velY: (Math.random() - 0.5) * 3.0,
    velZ: (Math.random() - 0.5) * 2.5,
  };
  rd.head = {
    angleX: -0.25,
    angleY: 0,
    angleZ: 0,
    velX: -5.5 * intensity,
    velY: (Math.random() - 0.5) * 3.5,
    velZ: (Math.random() - 0.5) * 4.5,
  };
  rd.leftShoulder = {
    angleX: -1.1,
    angleY: 0.2,
    angleZ: 0.2,
    velX: 3.5 + Math.random() * 2.5,
    velY: -1.5,
    velZ: -4.2 - Math.random() * 2,
  };
  rd.leftElbow = {
    angleX: -1.4,
    angleY: 0,
    angleZ: 0,
    velX: 4.5 + Math.random() * 2,
    velY: 0,
    velZ: 0,
  };
  rd.rightShoulder = {
    angleX: -1.1,
    angleY: -0.2,
    angleZ: -0.2,
    velX: 3.2 + Math.random() * 2.5,
    velY: 1.5,
    velZ: 4.4 + Math.random() * 2,
  };
  rd.rightElbow = {
    angleX: -1.4,
    angleY: 0,
    angleZ: 0,
    velX: 4.2 + Math.random() * 2,
    velY: 0,
    velZ: 0,
  };
  rd.leftHip = {
    angleX: -0.2,
    angleY: 0,
    angleZ: 0,
    velX: 2.2,
    velY: 0,
    velZ: -1.2,
  };
  rd.leftKnee = {
    angleX: 0.35,
    angleY: 0,
    angleZ: 0,
    velX: 3.5,
    velY: 0,
    velZ: 0,
  };
  rd.rightHip = {
    angleX: 0.2,
    angleY: 0,
    angleZ: 0,
    velX: 1.6,
    velY: 0,
    velZ: 1.2,
  };
  rd.rightKnee = {
    angleX: 0.25,
    angleY: 0,
    angleZ: 0,
    velX: 3.0,
    velY: 0,
    velZ: 0,
  };
}

function stepRagdollLimb(
  limb: RagdollLimbState,
  targetX: number,
  targetZ: number,
  stiffness: number,
  damping: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  dt: number,
) {
  const ax = -stiffness * (limb.angleX - targetX) - damping * limb.velX;
  const az = -stiffness * (limb.angleZ - targetZ) - damping * limb.velZ;
  const ay = -stiffness * 0.7 * limb.angleY - damping * limb.velY;

  limb.velX += ax * dt;
  limb.velY += ay * dt;
  limb.velZ += az * dt;

  limb.angleX += limb.velX * dt;
  limb.angleY += limb.velY * dt;
  limb.angleZ += limb.velZ * dt;

  if (limb.angleX < minX) {
    limb.angleX = minX;
    limb.velX *= -0.25;
  } else if (limb.angleX > maxX) {
    limb.angleX = maxX;
    limb.velX *= -0.25;
  }
  if (limb.angleZ < minZ) {
    limb.angleZ = minZ;
    limb.velZ *= -0.25;
  } else if (limb.angleZ > maxZ) {
    limb.angleZ = maxZ;
    limb.velZ *= -0.25;
  }
  limb.angleY = THREE.MathUtils.clamp(limb.angleY, -0.7, 0.7);
}

function applyHairSpringToRig(rig: BoxerRig, state: BoxerAnimState, d: number, accelF: number, accelS: number) {
  // 2nd-order hair spring reacting to footwork acceleration, bobbing, head snaps, and ragdoll gravity
  const stiff = 125;
  const damp = 10.5;

  const inertiaX =
    -accelF * 18 -
    state.headSpringVelX * 0.45 +
    Math.sin(state.time * 7.2) * (0.65 + state.moveSpeed * 0.75);
  const inertiaZ =
    accelS * 18 -
    state.headSpringVelZ * 0.45 +
    Math.cos(state.time * 3.6) * 0.45;

  state.hairVelX += (-stiff * state.hairSpringX - damp * state.hairVelX + inertiaX) * d;
  state.hairVelZ += (-stiff * state.hairSpringZ - damp * state.hairVelZ + inertiaZ) * d;

  state.hairSpringX = THREE.MathUtils.clamp(state.hairSpringX + state.hairVelX * d, -0.45, 0.45);
  state.hairSpringZ = THREE.MathUtils.clamp(state.hairSpringZ + state.hairVelZ * d, -0.45, 0.45);

  rig.hairPivot.rotation.x = state.hairSpringX * 0.35;
  rig.hairPivot.rotation.z = state.hairSpringZ * 0.35;

  for (let i = 0; i < rig.hairStrands.length; i++) {
    const s = rig.hairStrands[i];
    const flutter = Math.sin(state.time * 9.5 + s.phaseOffset) * (0.025 + state.moveSpeed * 0.032);
    s.pivot.rotation.x = s.baseRotX + state.hairSpringX * s.flexScale + flutter;
    s.pivot.rotation.z = s.baseRotZ + state.hairSpringZ * s.flexScale;
  }
}

export function updateBoxerPose(rig: BoxerRig, state: BoxerAnimState, dt: number) {
  const d = Math.min(dt, 0.05);
  const mirror = state.stance === 'Southpaw' ? -1 : 1;
  const t = state.time;

  const accelF = d > 0.0001 ? (state.moveForward - state.prevMoveForward) / d : 0;
  const accelS = d > 0.0001 ? (state.moveStrafe - state.prevMoveStrafe) / d : 0;
  state.prevMoveForward = state.moveForward;
  state.prevMoveStrafe = state.moveStrafe;

  if (rig.beltGroup) {
    rig.beltGroup.visible = Boolean(state.walkoutMode || state.celebrationMode);
  }

  const sweat = THREE.MathUtils.clamp(state.sweatLevel ?? 0, 0, 1);
  const bruise = THREE.MathUtils.clamp(state.bruiseLevel ?? 0, 0, 1);
  if (rig.skinMat.clearcoat > 0) {
    rig.skinMat.clearcoat = 0.24 + sweat * 0.56;
    rig.skinMat.clearcoatRoughness = Math.max(0.14, 0.4 - sweat * 0.24);
  }
  if (rig.torsoMat.clearcoat > 0) {
    rig.torsoMat.clearcoat = 0.24 + sweat * 0.62;
    rig.torsoMat.clearcoatRoughness = Math.max(0.12, 0.4 - sweat * 0.26);
  }
  if (rig.headMat.clearcoat > 0) {
    rig.headMat.clearcoat = 0.18 + sweat * 0.54;
    rig.headMat.clearcoatRoughness = Math.max(0.16, 0.46 - sweat * 0.26);
  }
  rig.headMat.color.setRGB(1 - bruise * 0.14, 1 - bruise * 0.28, 1 - bruise * 0.2);

  if (state.hitFlash > 0) {
    const r = state.hitFlash * 0.55;
    const g = state.hitFlash * 0.08;
    const b = state.hitFlash * 0.06;
    rig.skinMat.emissive.setRGB(r, g, b);
    rig.torsoMat.emissive.setRGB(r, g, b);
    rig.headMat.emissive.setRGB(r, g, b);
  } else {
    rig.skinMat.emissive.setRGB(0, 0, 0);
    rig.torsoMat.emissive.setRGB(0, 0, 0);
    rig.headMat.emissive.setRGB(0, 0, 0);
  }

  if (state.ragdoll.active) {
    const rd = state.ragdoll;

    rd.pelvisVelY -= 14.5 * d;
    rd.pelvisY += rd.pelvisVelY * d;
    rd.pelvisOffsetX += rd.pelvisVelX * d;
    rd.pelvisOffsetZ += rd.pelvisVelZ * d;
    rd.pelvisVelX *= Math.pow(0.08, d);
    rd.pelvisVelZ *= Math.pow(0.08, d);

    if (rd.pelvisY < 0.16) {
      rd.pelvisY = 0.16;
      if (rd.pelvisVelY < -1.1) {
        rd.pelvisVelY = -rd.pelvisVelY * 0.24;
      } else {
        rd.pelvisVelY = 0;
      }
      rd.pelvisAngVelX *= Math.pow(0.04, d);
      rd.pelvisAngVelZ *= Math.pow(0.04, d);
    }

    rd.pelvisAngVelX += (-Math.PI / 2 - rd.pelvisRotX) * 8.5 * d - rd.pelvisAngVelX * 3.8 * d;
    rd.pelvisRotX = THREE.MathUtils.clamp(rd.pelvisRotX + rd.pelvisAngVelX * d, -Math.PI / 2 - 0.06, 0.35);
    rd.pelvisRotZ = THREE.MathUtils.clamp(rd.pelvisRotZ + rd.pelvisAngVelZ * d, -0.45, 0.45);

    stepRagdollLimb(rd.torso, 0.08, 0, 14, 5.2, -0.35, 0.45, -0.35, 0.35, d);
    stepRagdollLimb(rd.head, 0.25, 0.12, 18, 4.5, -0.65, 0.55, -0.5, 0.5, d);
    stepRagdollLimb(rd.leftShoulder, -0.15, -0.85, 9, 3.6, -1.6, 0.5, -1.25, 0.25, d);
    stepRagdollLimb(rd.leftElbow, -0.38, 0, 10, 3.8, -1.9, -0.05, -0.2, 0.2, d);
    stepRagdollLimb(rd.rightShoulder, -0.2, 0.85, 9, 3.6, -1.6, 0.5, -0.25, 1.25, d);
    stepRagdollLimb(rd.rightElbow, -0.42, 0, 10, 3.8, -1.9, -0.05, -0.2, 0.2, d);
    stepRagdollLimb(rd.leftHip, 0.14, -0.18, 12, 4.2, -0.55, 0.45, -0.4, 0.15, d);
    stepRagdollLimb(rd.leftKnee, 0.22, 0, 14, 4.5, 0.02, 1.65, -0.1, 0.1, d);
    stepRagdollLimb(rd.rightHip, 0.08, 0.2, 12, 4.2, -0.55, 0.45, -0.15, 0.4, d);
    stepRagdollLimb(rd.rightKnee, 0.3, 0, 14, 4.5, 0.02, 1.65, -0.1, 0.1, d);

    rig.pelvis.position.set(rd.pelvisOffsetX, rd.pelvisY, rd.pelvisOffsetZ);
    rig.pelvis.rotation.set(rd.pelvisRotX, rd.pelvisRotY, rd.pelvisRotZ);
    rig.torso.rotation.set(rd.torso.angleX, rd.torso.angleY, rd.torso.angleZ);
    rig.head.rotation.set(rd.head.angleX, rd.head.angleY, rd.head.angleZ);

    rig.leftShoulder.rotation.set(rd.leftShoulder.angleX, rd.leftShoulder.angleY, rd.leftShoulder.angleZ);
    rig.leftElbow.rotation.set(rd.leftElbow.angleX, 0, 0);
    rig.leftForearmRoll.rotation.y = 0;
    rig.rightShoulder.rotation.set(rd.rightShoulder.angleX, rd.rightShoulder.angleY, rd.rightShoulder.angleZ);
    rig.rightElbow.rotation.set(rd.rightElbow.angleX, 0, 0);
    rig.rightForearmRoll.rotation.y = 0;

    rig.leftHip.rotation.set(rd.leftHip.angleX, 0, rd.leftHip.angleZ);
    rig.leftKnee.rotation.set(rd.leftKnee.angleX, 0, 0);
    rig.leftAnkle.rotation.set(0.18, 0, 0);
    rig.rightHip.rotation.set(rd.rightHip.angleX, 0, rd.rightHip.angleZ);
    rig.rightKnee.rotation.set(rd.rightKnee.angleX, 0, 0);
    rig.rightAnkle.rotation.set(0.18, 0, 0);

    applyHairSpringToRig(rig, state, d, rd.pelvisVelZ * 0.4, rd.pelvisVelX * 0.4);

    rig.shadowMesh.scale.setScalar(1.45);
    rig.root.updateMatrixWorld(true);
    rig.head.getWorldPosition(rig.headWorldPos);
    rig.leftElbow.getWorldPosition(rig.leftGloveWorldPos);
    rig.rightElbow.getWorldPosition(rig.rightGloveWorldPos);
    return;
  }

  rig.pelvis.position.x = THREE.MathUtils.damp(rig.pelvis.position.x, 0, 12, d);
  rig.pelvis.position.z = THREE.MathUtils.damp(rig.pelvis.position.z, 0, 12, d);

  const headStiff = 155;
  const headDamp = 14;
  state.headSpringVelX += (-headStiff * state.headSpringX - headDamp * state.headSpringVelX) * d;
  state.headSpringVelZ += (-headStiff * state.headSpringZ - headDamp * state.headSpringVelZ) * d;
  state.headSpringX = THREE.MathUtils.clamp(state.headSpringX + state.headSpringVelX * d, -0.65, 0.55);
  state.headSpringZ = THREE.MathUtils.clamp(state.headSpringZ + state.headSpringVelZ * d, -0.55, 0.55);

  const torsoStiff = 110;
  const torsoDamp = 13;
  state.torsoSpringVelX += (-torsoStiff * state.torsoSpringX - torsoDamp * state.torsoSpringVelX) * d;
  state.torsoSpringVelY += (-torsoStiff * state.torsoSpringY - torsoDamp * state.torsoSpringVelY) * d;
  state.torsoSpringVelZ += (-torsoStiff * state.torsoSpringZ - torsoDamp * state.torsoSpringVelZ) * d;
  state.torsoSpringX = THREE.MathUtils.clamp(state.torsoSpringX + state.torsoSpringVelX * d, -0.45, 0.45);
  state.torsoSpringY = THREE.MathUtils.clamp(state.torsoSpringY + state.torsoSpringVelY * d, -0.45, 0.45);
  state.torsoSpringZ = THREE.MathUtils.clamp(state.torsoSpringZ + state.torsoSpringVelZ * d, -0.4, 0.4);

  state.guardShock = Math.max(0, state.guardShock - d * 5.5);

  const mp = state.motionProfile ?? resolveFighterMotionProfile('default');
  const pStyle = mp.postureStyle;
  const crouchBias = mp.postureCrouchBias;
  const guardBias = mp.postureGuardBias;
  const bladeBias = mp.postureBladeBias;

  let pelvisYOffset = 0;
  let pelvisXOffset = 0;
  let pelvisRotX = 0;
  let pelvisRotY = (0.28 + bladeBias) * mirror;
  let pelvisRotZ = 0;

  let torsoRotX = 0.14 + crouchBias * 0.4;
  let torsoRotY = -0.02 * mirror;
  let torsoRotZ = 0;

  let headRotX = 0.05;
  let headRotY = (-0.24 - bladeBias * 0.5) * mirror;
  let headRotZ = 0;

  let leadShX = -1.04 + guardBias * 0.5;
  let leadShY = 0.28 * mirror;
  let leadShZ = 0.16 * mirror;
  let leadElX = -1.56 - guardBias * 0.4;
  let leadElY = 0;
  let leadElZ = 0;
  let leadRoll = 0.12 * mirror;

  let rearShX = -1.08 + guardBias * 0.35;
  let rearShY = -0.24 * mirror;
  let rearShZ = -0.16 * mirror;
  let rearElX = -1.68 - guardBias * 0.3;
  let rearElY = 0;
  let rearElZ = 0;
  let rearRoll = -0.12 * mirror;

  // Athletic balanced boxing stance legs
  let leadHipX = -0.24 - crouchBias * 0.4;
  let leadHipZ = -0.07 * mirror;
  let leadKneeX = 0.38 + crouchBias * 0.7;
  let leadAnkleBias = 0;

  let rearHipX = 0.22 - crouchBias * 0.3;
  let rearHipZ = 0.07 * mirror;
  let rearKneeX = 0.28 + crouchBias * 0.7;
  let rearAnkleBias = 0;

  // Apply fighter-specific authentic boxing posture baseline (used in combat idle & Free Fight)
  if (pStyle === 'philly_shell') {
    pelvisRotY = (0.44 + bladeBias * 0.6) * mirror;
    torsoRotX = 0.09 + crouchBias * 0.3;
    torsoRotY = 0.08 * mirror;
    headRotX = 0.04;
    headRotY = (-0.42 - bladeBias * 0.4) * mirror;
    headRotZ = -0.07 * mirror;
    leadShX = -0.34 + guardBias * 0.35;
    leadShY = 0.56 * mirror;
    leadShZ = -0.1 * mirror;
    leadElX = -1.36;
    leadRoll = 0.54 * mirror;
    rearShX = -1.24 + guardBias * 0.25;
    rearShY = -0.34 * mirror;
    rearShZ = -0.1 * mirror;
    rearElX = -1.86;
    rearRoll = -0.24 * mirror;
    leadHipX = -0.22;
    leadKneeX = 0.34;
    rearHipX = 0.26;
    rearKneeX = 0.26;
  } else if (pStyle === 'peekaboo') {
    pelvisRotY = (0.14 + bladeBias * 0.5) * mirror;
    torsoRotX = 0.24 + crouchBias * 0.45;
    torsoRotY = 0;
    headRotX = 0.14;
    headRotY = -0.12 * mirror;
    leadShX = -1.26 + guardBias * 0.25;
    leadShY = 0.22 * mirror;
    leadShZ = 0.24 * mirror;
    leadElX = -1.88;
    leadRoll = 0.42 * mirror;
    rearShX = -1.26 + guardBias * 0.25;
    rearShY = -0.22 * mirror;
    rearShZ = -0.24 * mirror;
    rearElX = -1.88;
    rearRoll = -0.42 * mirror;
    leadHipX = -0.34;
    leadHipZ = -0.13 * mirror;
    leadKneeX = 0.58;
    rearHipX = 0.18;
    rearHipZ = 0.13 * mirror;
    rearKneeX = 0.46;
  } else if (pStyle === 'long_guard') {
    pelvisRotY = (0.34 + bladeBias * 0.6) * mirror;
    torsoRotX = 0.05 + crouchBias * 0.25;
    torsoRotY = -0.04 * mirror;
    headRotX = 0.03;
    headRotY = -0.28 * mirror;
    leadShX = -1.34 + guardBias * 0.3;
    leadShY = 0.08 * mirror;
    leadShZ = -0.04 * mirror;
    leadElX = -0.62 - guardBias * 0.4;
    leadRoll = -0.34 * mirror;
    rearShX = -1.08;
    rearShY = -0.24 * mirror;
    rearShZ = -0.16 * mirror;
    rearElX = -1.78;
    leadHipX = -0.28;
    leadKneeX = 0.30;
    rearHipX = 0.28;
    rearKneeX = 0.22;
  } else if (pStyle === 'high_fortress') {
    pelvisRotY = (0.16 + bladeBias * 0.4) * mirror;
    torsoRotX = 0.12 + crouchBias * 0.3;
    torsoRotY = 0;
    headRotX = 0.14;
    headRotY = -0.14 * mirror;
    leadShX = -1.32 + guardBias * 0.25;
    leadShY = 0.14 * mirror;
    leadShZ = 0.28 * mirror;
    leadElX = -1.86;
    leadRoll = 0.32 * mirror;
    rearShX = -1.32 + guardBias * 0.25;
    rearShY = -0.14 * mirror;
    rearShZ = -0.28 * mirror;
    rearElX = -1.86;
    rearRoll = -0.32 * mirror;
    leadHipX = -0.20;
    leadHipZ = -0.12 * mirror;
    leadKneeX = 0.34;
    rearHipX = 0.20;
    rearHipZ = 0.12 * mirror;
    rearKneeX = 0.32;
  } else if (pStyle === 'low_sling') {
    pelvisRotY = (0.32 + bladeBias * 0.6) * mirror;
    torsoRotX = 0.04 + crouchBias * 0.2;
    torsoRotY = -0.05 * mirror;
    headRotX = -0.02;
    headRotY = -0.26 * mirror;
    leadShX = -0.44 + guardBias * 0.4;
    leadShY = 0.2 * mirror;
    leadShZ = -0.18 * mirror;
    leadElX = -1.04 - guardBias * 0.3;
    leadRoll = 0.4 * mirror;
    rearShX = -0.66 + guardBias * 0.3;
    rearShY = -0.22 * mirror;
    rearShZ = 0.1 * mirror;
    rearElX = -1.36;
    rearRoll = -0.3 * mirror;
    leadHipX = -0.28;
    leadKneeX = 0.40;
    rearHipX = 0.24;
    rearKneeX = 0.30;
  } else if (pStyle === 'mummy_cross') {
    pelvisRotY = (0.22 + bladeBias * 0.5) * mirror;
    torsoRotX = 0.16 + crouchBias * 0.3;
    torsoRotY = 0.04 * mirror;
    headRotX = 0.08;
    headRotY = -0.2 * mirror;
    leadShX = -0.92 + guardBias * 0.3;
    leadShY = 0.46 * mirror;
    leadShZ = -0.16 * mirror;
    leadElX = -1.42;
    leadRoll = 0.58 * mirror;
    rearShX = -1.02 + guardBias * 0.25;
    rearShY = -0.32 * mirror;
    rearShZ = 0.18 * mirror;
    rearElX = -1.62;
    rearRoll = -0.2 * mirror;
    leadHipX = -0.22;
    leadKneeX = 0.36;
    rearHipX = 0.24;
    rearKneeX = 0.32;
  } else if (pStyle === 'crouch_brawler') {
    pelvisRotY = (0.26 + bladeBias * 0.5) * mirror;
    torsoRotX = 0.2 + crouchBias * 0.35;
    torsoRotY = 0.06 * mirror;
    headRotX = 0.1;
    headRotY = -0.26 * mirror;
    leadShX = -1.06 + guardBias * 0.35;
    leadShY = 0.28 * mirror;
    leadShZ = -0.1 * mirror;
    leadElX = -1.52;
    rearShX = -0.84 + guardBias * 0.3;
    rearShY = -0.26 * mirror;
    rearShZ = 0.16 * mirror;
    rearElX = -1.68;
    rearRoll = -0.36 * mirror;
    leadHipX = -0.3;
    leadKneeX = 0.5;
    rearHipX = 0.2;
    rearKneeX = 0.4;
  }

  if (state.faceOffMode) {
    // Free Fight Selection: expressive per-character boxing posture + signature switch-in animation!
    const breath = Math.sin(t * 2.1 * mp.bounceFreq);
    const sway = Math.sin(t * 2.8 * mp.cadenceScale) * mp.swaggerAmp;
    const bob = Math.sin(t * 4.4 * mp.cadenceScale);

    // Subtle posture-specific living motion in Free Fight lineup
    if (pStyle === 'peekaboo') {
      pelvisYOffset = -Math.abs(bob) * 0.028;
      torsoRotX += Math.abs(bob) * 0.04;
      torsoRotZ += sway * 0.11;
      headRotZ += sway * 0.08;
      leadShX += bob * 0.04;
      rearShX -= bob * 0.04;
    } else if (pStyle === 'philly_shell') {
      pelvisRotY += sway * 0.04 * mirror;
      torsoRotY += sway * 0.06 * mirror;
      torsoRotZ -= sway * 0.04 * mirror;
      leadShX += Math.sin(t * 1.9) * 0.04;
      rearShX += breath * 0.03;
    } else if (pStyle === 'long_guard') {
      const probe = Math.max(0, Math.sin(t * 1.8 * mp.cadenceScale));
      leadShX -= probe * 0.08;
      leadElX += probe * 0.16;
      torsoRotY += probe * 0.06 * mirror;
      headRotY += breath * 0.03;
    } else if (pStyle === 'high_fortress') {
      pelvisYOffset = breath * 0.008;
      torsoRotX += breath * 0.018;
      leadShX += breath * 0.025;
      rearShX += breath * 0.025;
      headRotZ += Math.sin(t * 1.2) * 0.025;
    } else if (pStyle === 'low_sling') {
      pelvisYOffset = Math.abs(bob) * 0.024;
      torsoRotZ += sway * 0.07;
      torsoRotY += sway * 0.08;
      leadShZ -= sway * 0.04 * mirror;
      rearShZ += sway * 0.04 * mirror;
      headRotZ += sway * 0.05;
    } else if (pStyle === 'mummy_cross') {
      const roll = Math.sin(t * 1.45 * mp.cadenceScale);
      torsoRotY += roll * 0.07;
      headRotZ += roll * 0.04;
      leadShX += breath * 0.035;
      rearShX -= breath * 0.035;
    } else if (pStyle === 'crouch_brawler') {
      const feint = Math.max(0, Math.sin(t * 2.5 * mp.cadenceScale));
      pelvisYOffset = -feint * 0.022;
      torsoRotX += feint * 0.045;
      leadShX -= feint * 0.1;
      leadElX += feint * 0.14;
      torsoRotZ += sway * 0.05;
    } else {
      // classic_euro
      pelvisYOffset = bob * 0.012;
      torsoRotZ += sway * 0.035;
      leadShX += breath * 0.035;
      rearShX += breath * 0.025;
    }

    // Character switch-in signature animation (0 -> 1 over ~1.15s)
    const fp = THREE.MathUtils.clamp(state.faceOffSwitchProgress ?? 1, 0, 1);
    if (fp < 0.999) {
      // Stepping gait for the initial step-forward from the tunnel
      if (fp < 0.45) {
        const stepP = fp / 0.45;
        const stepFade = Math.sin(stepP * Math.PI);
        const walkWave = Math.sin(stepP * Math.PI * 2.2);
        leadHipX += walkWave * 0.24 * stepFade;
        rearHipX -= walkWave * 0.24 * stepFade;
        leadKneeX += Math.max(0, walkWave) * 0.36 * stepFade;
        rearKneeX += Math.max(0, -walkWave) * 0.36 * stepFade;
      }

      const env =
        fp < 0.14
          ? Math.sin((fp / 0.14) * (Math.PI / 2))
          : fp > 0.8
            ? Math.sin(((1 - fp) / 0.2) * (Math.PI / 2))
            : 1;
      const fs = mp.faceOffSwitchStyle;

      if (fs === 'step_in_jab_cross') {
        const jab = fp > 0.22 && fp < 0.52 ? Math.sin(((fp - 0.22) / 0.3) * Math.PI) : 0;
        const cross = fp > 0.48 && fp < 0.8 ? Math.sin(((fp - 0.48) / 0.32) * Math.PI) : 0;
        torsoRotY += (jab * 0.36 - cross * 0.52) * mirror * env;
        torsoRotX += cross * 0.12 * env;
        leadShX = THREE.MathUtils.lerp(leadShX, -1.78, jab * env);
        leadElX = THREE.MathUtils.lerp(leadElX, -0.16, jab * env);
        leadRoll = THREE.MathUtils.lerp(leadRoll, -1.35 * mirror, jab * env);
        rearShX = THREE.MathUtils.lerp(rearShX, -1.86, cross * env);
        rearElX = THREE.MathUtils.lerp(rearElX, -0.18, cross * env);
        rearRoll = THREE.MathUtils.lerp(rearRoll, 1.38 * mirror, cross * env);
      } else if (fs === 'glove_bang_roar') {
        const tap = fp > 0.18 && fp < 0.62 ? Math.abs(Math.sin(((fp - 0.18) / 0.44) * Math.PI * 2)) : 0;
        const flare = fp > 0.58 ? Math.sin(((fp - 0.58) / 0.42) * Math.PI) : 0;
        torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.04 - flare * 0.1, env);
        headRotX = THREE.MathUtils.lerp(headRotX, 0.06 - flare * 0.14, env);
        leadShX = THREE.MathUtils.lerp(leadShX, -1.04 - flare * 0.32, env);
        leadShY = THREE.MathUtils.lerp(leadShY, (-0.18 + tap * 0.38 - flare * 0.26) * mirror, env);
        leadShZ = THREE.MathUtils.lerp(leadShZ, (-0.08 - flare * 0.36) * mirror, env);
        leadElX = THREE.MathUtils.lerp(leadElX, -1.48 + flare * 0.4, env);
        rearShX = THREE.MathUtils.lerp(rearShX, -1.04 - flare * 0.32, env);
        rearShY = THREE.MathUtils.lerp(rearShY, (0.18 - tap * 0.38 + flare * 0.26) * mirror, env);
        rearShZ = THREE.MathUtils.lerp(rearShZ, (0.08 + flare * 0.36) * mirror, env);
        rearElX = THREE.MathUtils.lerp(rearElX, -1.48 + flare * 0.4, env);
      } else if (fs === 'shoulder_roll_snap') {
        const slip = fp > 0.16 && fp < 0.6 ? Math.sin(((fp - 0.16) / 0.44) * Math.PI * 2) : 0;
        const snap = fp > 0.56 && fp < 0.86 ? Math.sin(((fp - 0.56) / 0.3) * Math.PI) : 0;
        torsoRotZ += slip * 0.24 * env;
        torsoRotY += (slip * 0.22 + snap * 0.34) * mirror * env;
        headRotZ += slip * 0.16 * env;
        leadShX = THREE.MathUtils.lerp(leadShX, -1.72, snap * env);
        leadElX = THREE.MathUtils.lerp(leadElX, -0.22, snap * env);
      } else if (fs === 'uppercut_taunt') {
        const load = fp > 0.14 && fp < 0.46 ? Math.sin(((fp - 0.14) / 0.32) * Math.PI) : 0;
        const upper = fp > 0.4 && fp < 0.78 ? Math.sin(((fp - 0.4) / 0.38) * Math.PI) : 0;
        leadKneeX += load * 0.35 * env;
        rearKneeX += load * 0.35 * env;
        torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.32 * load - 0.04 * upper, env);
        torsoRotY += (load * 0.3 - upper * 0.52) * mirror * env;
        rearShX = THREE.MathUtils.lerp(rearShX, -0.45 * load - 1.48 * upper, env);
        rearShY = THREE.MathUtils.lerp(rearShY, (-0.2 * load + 0.24 * upper) * mirror, env);
        rearElX = THREE.MathUtils.lerp(rearElX, -1.75 * load - 1.05 * upper, env);
        rearRoll = THREE.MathUtils.lerp(rearRoll, -0.78 * mirror, upper * env);
      } else if (fs === 'spin_pivot_lock') {
        const pivot = fp > 0.15 && fp < 0.55 ? Math.sin(((fp - 0.15) / 0.4) * Math.PI) : 0;
        const dblJab = fp > 0.5 && fp < 0.88 ? Math.abs(Math.sin(((fp - 0.5) / 0.38) * Math.PI * 2)) : 0;
        pelvisRotY += pivot * 0.52 * mirror * env;
        torsoRotY += (pivot * 0.42 + dblJab * 0.24) * mirror * env;
        headRotY -= pivot * 0.36 * mirror * env;
        leadShX = THREE.MathUtils.lerp(leadShX, -1.7, dblJab * env);
        leadElX = THREE.MathUtils.lerp(leadElX, -0.26, dblJab * env);
      } else if (fs === 'hook_whip_glare') {
        const coil = fp > 0.15 && fp < 0.4 ? Math.sin(((fp - 0.15) / 0.25) * Math.PI) : 0;
        const whip = fp > 0.36 && fp < 0.78 ? Math.sin(((fp - 0.36) / 0.42) * Math.PI) : 0;
        torsoRotY += (-coil * 0.28 + whip * 0.66) * mirror * env;
        torsoRotZ += (coil * 0.1 - whip * 0.16) * mirror * env;
        const lift = Math.max(coil * 0.7, whip);
        leadShX = THREE.MathUtils.lerp(leadShX, -0.48, lift * env);
        leadShY = THREE.MathUtils.lerp(leadShY, (-0.3 * coil + 0.74 * whip) * mirror, lift * env);
        leadShZ = THREE.MathUtils.lerp(leadShZ, -1.38 * mirror, lift * env);
        leadElX = THREE.MathUtils.lerp(leadElX, -1.48, lift * env);
      } else if (fs === 'bow_and_guard') {
        const bow = fp > 0.16 && fp < 0.58 ? Math.sin(((fp - 0.16) / 0.42) * Math.PI) : 0;
        torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.38, bow * env);
        headRotX = THREE.MathUtils.lerp(headRotX, 0.26, bow * env);
        leadShX = THREE.MathUtils.lerp(leadShX, -0.82, bow * env);
        leadShY = THREE.MathUtils.lerp(leadShY, -0.12 * mirror, bow * env);
        leadElX = THREE.MathUtils.lerp(leadElX, -1.45, bow * env);
        rearShX = THREE.MathUtils.lerp(rearShX, -0.82, bow * env);
        rearShY = THREE.MathUtils.lerp(rearShY, 0.12 * mirror, bow * env);
        rearElX = THREE.MathUtils.lerp(rearElX, -1.45, bow * env);
      } else if (fs === 'bounce_flurry') {
        const flurry = fp > 0.2 && fp < 0.85 ? (fp - 0.2) / 0.65 : 0;
        const hop = flurry > 0 ? Math.abs(Math.sin(flurry * Math.PI * 4)) : 0;
        const lP = flurry > 0 ? Math.max(0, Math.sin(flurry * Math.PI * 5)) : 0;
        const rP = flurry > 0 ? Math.max(0, -Math.sin(flurry * Math.PI * 5)) : 0;
        pelvisYOffset += hop * 0.045 * env;
        torsoRotY += (lP * 0.25 - rP * 0.25) * mirror * env;
        leadShX = THREE.MathUtils.lerp(leadShX, -1.72, lP * env);
        leadElX = THREE.MathUtils.lerp(leadElX, -0.22, lP * env);
        rearShX = THREE.MathUtils.lerp(rearShX, -1.72, rP * env);
        rearElX = THREE.MathUtils.lerp(rearElX, -0.22, rP * env);
      } else if (fs === 'neck_crack_flex') {
        const tilt = fp > 0.16 && fp < 0.68 ? Math.sin(((fp - 0.16) / 0.52) * Math.PI * 2) : 0;
        const flex = fp > 0.32 && fp < 0.84 ? Math.sin(((fp - 0.32) / 0.52) * Math.PI) : 0;
        headRotZ = THREE.MathUtils.lerp(headRotZ, tilt * 0.26, env);
        headRotY = THREE.MathUtils.lerp(headRotY, tilt * 0.16, env);
        torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.04, flex * env);
        leadShX = THREE.MathUtils.lerp(leadShX, -0.95, flex * env);
        leadShZ = THREE.MathUtils.lerp(leadShZ, -0.45 * mirror, flex * env);
        leadElX = THREE.MathUtils.lerp(leadElX, -1.72, flex * env);
        rearShX = THREE.MathUtils.lerp(rearShX, -0.95, flex * env);
        rearShZ = THREE.MathUtils.lerp(rearShZ, 0.45 * mirror, flex * env);
        rearElX = THREE.MathUtils.lerp(rearElX, -1.72, flex * env);
      } else {
        // raised_fist_salute
        const raise = fp > 0.16 && fp < 0.82 ? Math.sin(((fp - 0.16) / 0.66) * Math.PI) : 0;
        torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.02, raise * env);
        headRotX = THREE.MathUtils.lerp(headRotX, -0.06, raise * env);
        leadShX = THREE.MathUtils.lerp(leadShX, -2.38, raise * env);
        leadShZ = THREE.MathUtils.lerp(leadShZ, -0.28 * mirror, raise * env);
        leadElX = THREE.MathUtils.lerp(leadElX, -0.24, raise * env);
      }
    }
  } else if (state.waitingRoomMode) {
    // Natural, proud athletic boxer posture (slight forward poise, chin tucked, loose bent-elbow arms)
    const breath = Math.sin(t * 1.9);
    const shift = Math.sin(t * 0.9);
    const glance = Math.sin(t * 0.55);

    pelvisRotY = 0.14 * mirror + shift * 0.035;
    pelvisRotZ = shift * 0.015;

    // Upright athletic poise with slight chest-forward readiness (hides neck stalk, highlights traps)
    torsoRotX = 0.055 + breath * 0.014;
    torsoRotY = -0.06 * mirror - shift * 0.025;
    torsoRotZ = -shift * 0.016;

    // Chin subtly tucked like a real boxer
    headRotX = 0.045 + breath * 0.01;
    headRotY = 0.06 + glance * 0.06;
    headRotZ = -shift * 0.015;

    // Loose athletic arms: slight shoulder forward roll + natural bent elbows resting near waist
    leadShX = -0.24 + breath * 0.025;
    leadShY = 0.14 * mirror;
    leadShZ = -0.17 * mirror;
    leadElX = -0.78 - breath * 0.035;
    leadElY = 0;
    leadElZ = 0;
    leadRoll = 0.42 * mirror;

    rearShX = -0.22 + breath * 0.025;
    rearShY = -0.14 * mirror;
    rearShZ = 0.17 * mirror;
    rearElX = -0.82 - breath * 0.035;
    rearElY = 0;
    rearElZ = 0;
    rearRoll = -0.42 * mirror;

    // Grounded shoulder-width athletic stance with subtle stagger
    leadHipX = -0.09 + shift * 0.015;
    leadHipZ = -0.11 * mirror;
    leadKneeX = 0.17 - shift * 0.015;
    rearHipX = 0.08 - shift * 0.015;
    rearHipZ = 0.11 * mirror;
    rearKneeX = 0.15 + shift * 0.015;

    // Menu confirm punch toward camera!
    const cp = THREE.MathUtils.clamp(state.waitingConfirmProgress ?? 0, 0, 1);
    if (cp > 0.001) {
      const cEnv =
        cp < 0.14
          ? Math.sin((cp / 0.14) * (Math.PI / 2))
          : cp > 0.88
            ? Math.sin(((1 - cp) / 0.12) * (Math.PI / 2))
            : 1;
      const coil =
        cp < 0.3
          ? Math.sin((cp / 0.3) * (Math.PI / 2))
          : Math.max(0, 1 - (cp - 0.3) / 0.14);
      const snap =
        cp < 0.24
          ? 0
          : cp < 0.62
            ? Math.sin(((cp - 0.24) / 0.38) * (Math.PI / 2))
            : Math.cos(((cp - 0.62) / 0.38) * (Math.PI / 2));

      pelvisRotY = THREE.MathUtils.lerp(pelvisRotY, (0.28 + coil * 0.16 - snap * 0.48) * mirror, cEnv);
      torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.12 + snap * 0.18, cEnv);
      torsoRotY = THREE.MathUtils.lerp(torsoRotY, (coil * 0.28 - snap * 0.64) * mirror, cEnv);
      headRotX = THREE.MathUtils.lerp(headRotX, 0.08, cEnv);
      headRotY = THREE.MathUtils.lerp(headRotY, snap * 0.24 * mirror, cEnv);

      // Lead glove tucked tight to chin while rear cross rockets straight toward camera!
      leadShX = THREE.MathUtils.lerp(leadShX, -1.28, cEnv);
      leadShY = THREE.MathUtils.lerp(leadShY, 0.34 * mirror, cEnv);
      leadShZ = THREE.MathUtils.lerp(leadShZ, -0.06 * mirror, cEnv);
      leadElX = THREE.MathUtils.lerp(leadElX, -1.86, cEnv);

      rearShX = THREE.MathUtils.lerp(rearShX, THREE.MathUtils.lerp(-1.05, -1.62, snap), cEnv);
      rearShY = THREE.MathUtils.lerp(rearShY, THREE.MathUtils.lerp(-0.28 * mirror, 0.22 * mirror, snap), cEnv);
      rearShZ = THREE.MathUtils.lerp(rearShZ, 0.06 * mirror, cEnv);
      rearElX = THREE.MathUtils.lerp(rearElX, THREE.MathUtils.lerp(-1.68, -0.1, snap), cEnv);
      rearRoll = THREE.MathUtils.lerp(rearRoll, THREE.MathUtils.lerp(-0.18 * mirror, 1.48 * mirror, snap), cEnv);

      leadHipX = THREE.MathUtils.lerp(leadHipX, -0.22, cEnv);
      leadKneeX = THREE.MathUtils.lerp(leadKneeX, 0.34, cEnv);
      rearHipX = THREE.MathUtils.lerp(rearHipX, 0.2, cEnv);
      rearKneeX = THREE.MathUtils.lerp(rearKneeX, 0.28, cEnv);
    }

    // Every 20 seconds: smoothly blend in a signature pre-fight waiting room idle animation
    const sp = THREE.MathUtils.clamp(state.waitingSpecialProgress ?? 0, 0, 1);
    if (sp > 0.001 && cp <= 0.001) {
      const kind = (state.waitingSpecialKind ?? 0) % 3;
      const env =
        sp < 0.16
          ? Math.sin((sp / 0.16) * (Math.PI / 2))
          : sp > 0.84
            ? Math.sin(((1 - sp) / 0.16) * (Math.PI / 2))
            : 1;

      if (kind === 0) {
        // Routine 0: Crisp shadow-box 1-2 air combo + slip
        const jabWave =
          sp > 0.2 && sp < 0.44 ? Math.sin(((sp - 0.2) / 0.24) * Math.PI) : 0;
        const crossWave =
          sp > 0.44 && sp < 0.7 ? Math.sin(((sp - 0.44) / 0.26) * Math.PI) : 0;
        const slipWave =
          sp > 0.68 && sp < 0.88 ? Math.sin(((sp - 0.68) / 0.2) * Math.PI * 2) : 0;

        pelvisRotY = THREE.MathUtils.lerp(pelvisRotY, 0.24 * mirror - crossWave * 0.34 * mirror, env);
        torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.12 + crossWave * 0.12, env);
        torsoRotY = THREE.MathUtils.lerp(
          torsoRotY,
          (jabWave * 0.34 - crossWave * 0.48) * mirror,
          env,
        );
        torsoRotZ = THREE.MathUtils.lerp(torsoRotZ, slipWave * 0.18, env);
        headRotX = THREE.MathUtils.lerp(headRotX, 0.06, env);
        headRotY = THREE.MathUtils.lerp(headRotY, -0.1 * mirror, env);
        headRotZ = THREE.MathUtils.lerp(headRotZ, slipWave * 0.14, env);

        leadShX = THREE.MathUtils.lerp(leadShX, THREE.MathUtils.lerp(-1.12, -1.6, jabWave), env);
        leadShY = THREE.MathUtils.lerp(leadShY, THREE.MathUtils.lerp(0.24 * mirror, -0.05 * mirror, jabWave), env);
        leadShZ = THREE.MathUtils.lerp(leadShZ, -0.08 * mirror, env);
        leadElX = THREE.MathUtils.lerp(leadElX, THREE.MathUtils.lerp(-1.62, -0.14, jabWave), env);
        leadRoll = THREE.MathUtils.lerp(leadRoll, THREE.MathUtils.lerp(0.12 * mirror, -1.35 * mirror, jabWave), env);

        rearShX = THREE.MathUtils.lerp(rearShX, THREE.MathUtils.lerp(-1.14, -1.58, crossWave), env);
        rearShY = THREE.MathUtils.lerp(rearShY, THREE.MathUtils.lerp(-0.22 * mirror, 0.18 * mirror, crossWave), env);
        rearShZ = THREE.MathUtils.lerp(rearShZ, 0.08 * mirror, env);
        rearElX = THREE.MathUtils.lerp(rearElX, THREE.MathUtils.lerp(-1.7, -0.18, crossWave), env);
        rearRoll = THREE.MathUtils.lerp(rearRoll, THREE.MathUtils.lerp(-0.12 * mirror, 1.35 * mirror, crossWave), env);

        leadHipX = THREE.MathUtils.lerp(leadHipX, -0.2, env);
        leadKneeX = THREE.MathUtils.lerp(leadKneeX, 0.32, env);
        rearHipX = THREE.MathUtils.lerp(rearHipX, 0.16, env);
        rearKneeX = THREE.MathUtils.lerp(rearKneeX, 0.24, env);
      } else if (kind === 1) {
        // Routine 1: Double glove-tap check + shoulder & neck roll warm-up
        const tapPulse =
          sp > 0.16 && sp < 0.52 ? Math.abs(Math.sin(((sp - 0.16) / 0.36) * Math.PI * 2)) : 0;
        const neckRoll =
          sp > 0.5 && sp < 0.88 ? Math.sin(((sp - 0.5) / 0.38) * Math.PI * 2) : 0;

        leadShX = THREE.MathUtils.lerp(leadShX, -0.92 - tapPulse * 0.16, env);
        leadShY = THREE.MathUtils.lerp(leadShY, (-0.16 + tapPulse * 0.22) * mirror, env);
        leadShZ = THREE.MathUtils.lerp(leadShZ, -0.08 * mirror, env);
        leadElX = THREE.MathUtils.lerp(leadElX, -1.42, env);

        rearShX = THREE.MathUtils.lerp(rearShX, -0.94 - tapPulse * 0.16, env);
        rearShY = THREE.MathUtils.lerp(rearShY, (0.16 - tapPulse * 0.22) * mirror, env);
        rearShZ = THREE.MathUtils.lerp(rearShZ, 0.08 * mirror, env);
        rearElX = THREE.MathUtils.lerp(rearElX, -1.44, env);

        torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.02, env);
        headRotZ = THREE.MathUtils.lerp(headRotZ, neckRoll * 0.2, env);
        headRotY = THREE.MathUtils.lerp(headRotY, neckRoll * 0.16, env);
        headRotX = THREE.MathUtils.lerp(headRotX, 0.04 + Math.abs(neckRoll) * 0.05, env);
      } else {
        // Routine 2: Torso warm-up twist + confident championship fist salute
        const twistWave =
          sp > 0.12 && sp < 0.48 ? Math.sin(((sp - 0.12) / 0.36) * Math.PI * 2) : 0;
        const saluteWave =
          sp > 0.46 && sp < 0.86 ? Math.sin(((sp - 0.46) / 0.4) * Math.PI) : 0;

        torsoRotY = THREE.MathUtils.lerp(torsoRotY, twistWave * 0.32, env);
        headRotY = THREE.MathUtils.lerp(headRotY, 0.06 - twistWave * 0.1, env);

        // Raise lead fist proudly while keeping rear hand relaxed at side
        leadShX = THREE.MathUtils.lerp(leadShX, -0.32 - saluteWave * 1.32, env);
        leadShY = THREE.MathUtils.lerp(leadShY, 0.1 * mirror, env);
        leadShZ = THREE.MathUtils.lerp(leadShZ, (-0.18 - saluteWave * 0.12) * mirror, env);
        leadElX = THREE.MathUtils.lerp(leadElX, -0.52 - saluteWave * 0.82, env);
        leadRoll = THREE.MathUtils.lerp(leadRoll, -0.35 * mirror * saluteWave, env);

        rearShX = THREE.MathUtils.lerp(rearShX, 0.04 + twistWave * 0.12, env);
        rearShZ = THREE.MathUtils.lerp(rearShZ, 0.16 * mirror, env);
        rearElX = THREE.MathUtils.lerp(rearElX, -0.4, env);
      }
    }
  } else if (state.walkoutMode) {
    // Natural, fluid, non-stiff human walkout gait + per-character walkout personality
    const profile = state.motionProfile ?? resolveFighterMotionProfile('default');
    const wp = THREE.MathUtils.clamp(state.walkoutProgress ?? 0, 0, 1);
    const stairW = THREE.MathUtils.clamp(state.walkoutStairWeight ?? 0, 0, 1);
    const ropeDuck = THREE.MathUtils.clamp(state.walkoutRopeDuck ?? 0, 0, 1);
    const walkActivity = THREE.MathUtils.clamp(state.moveSpeed / 1.45, 0, 1.15);

    const walkRate = (5.2 + walkActivity * 2.2) * profile.cadenceScale;
    state.gaitPhase = (state.gaitPhase + walkRate * d * Math.max(0.25, walkActivity)) % (Math.PI * 2);

    const p = state.gaitPhase;
    const s = Math.sin(p);
    const c = Math.cos(p);
    const dbl = Math.cos(p * 2);
    const w = Math.min(1, walkActivity);

    // 1. Pelvis weight transfer, vertical double-bounce & natural hip yaw
    pelvisYOffset = (-0.018 + dbl * 0.024) * w - ropeDuck * 0.095;
    pelvisXOffset = s * 0.022 * w * profile.swaggerAmp;
    pelvisRotY = c * 0.11 * w * profile.swaggerAmp;
    pelvisRotZ = s * 0.042 * w * profile.swaggerAmp;
    pelvisRotX = stairW * 0.06 + ropeDuck * 0.14;

    // 2. Counter-rotating upper spine & natural chest carriage (never stiff)
    torsoRotX = 0.055 + stairW * 0.14 + ropeDuck * 0.42 + dbl * 0.018 * w;
    torsoRotY = -c * 0.135 * w * profile.swaggerAmp;
    torsoRotZ = -s * 0.036 * w * profile.swaggerAmp;

    // 3. Head counter-stabilization + scanning the roaring arena crowd
    headRotX = 0.02 - ropeDuck * 0.22 + Math.sin(t * 2.4 * profile.bounceFreq) * 0.025;
    headRotY = Math.sin(t * 1.15 + profile.handBias) * 0.18 * (1 - ropeDuck * 0.8);
    headRotZ = s * 0.025 * w;

    // 4. Leg gait with real knee clearance, heel-strike, toe-off & stair stepping
    const stride = (0.36 + stairW * 0.12) * w;
    const leadLift = Math.max(0, s) * (0.48 + stairW * 0.56) * w;
    const rearLift = Math.max(0, -s) * (0.48 + stairW * 0.56) * w;

    leadHipX = c * stride - leadLift * 0.48 - ropeDuck * 0.14;
    rearHipX = -c * stride - rearLift * 0.48 - ropeDuck * 0.14;
    leadHipZ = -0.095 * mirror;
    rearHipZ = 0.095 * mirror;

    leadKneeX = 0.14 + leadLift * 0.92 + Math.max(0, -c) * 0.14 * w + ropeDuck * 0.34;
    rearKneeX = 0.14 + rearLift * 0.92 + Math.max(0, c) * 0.14 * w + ropeDuck * 0.34;
    leadAnkleBias = (-leadLift * 0.25 + Math.max(0, c) * 0.26) * w;
    rearAnkleBias = (-rearLift * 0.25 + Math.max(0, -c) * 0.26) * w;

    // 5. Delayed-phase natural arm swing (forearms lag upper arms cleanly!)
    const swing = 0.4 * w * profile.armSwingBias;
    const leadArmLag = Math.max(0, Math.sin(p - 0.65)) * 0.34 * w;
    const rearArmLag = Math.max(0, Math.sin(p + Math.PI - 0.65)) * 0.34 * w;

    leadShX = -0.06 - c * swing;
    leadShY = 0.08 * mirror;
    leadShZ = -0.17 * mirror;
    leadElX = -0.44 - leadArmLag;
    leadElY = 0;
    leadElZ = 0;
    leadRoll = 0.26 * mirror;

    rearShX = -0.06 + c * swing;
    rearShY = -0.08 * mirror;
    rearShZ = 0.17 * mirror;
    rearElX = -0.44 - rearArmLag;
    rearElY = 0;
    rearElZ = 0;
    rearRoll = -0.26 * mirror;

    // 6. Signature per-character walkout personality layered on top!
    const ws = profile.walkoutStyle;
    const flairGate = THREE.MathUtils.clamp(Math.sin(wp * Math.PI * 2.2) * 0.5 + 0.5, 0.25, 1);

    if (ws === 'champ_swagger') {
      torsoRotZ += Math.sin(t * 2.2) * 0.055;
      if (wp > 0.2 && wp < 0.55) {
        const wave = Math.sin(((wp - 0.2) / 0.35) * Math.PI);
        leadShX = THREE.MathUtils.lerp(leadShX, -2.15, wave);
        leadShZ = THREE.MathUtils.lerp(leadShZ, -0.42 * mirror, wave);
        leadElX = THREE.MathUtils.lerp(leadElX, -0.35, wave);
      }
      if (wp > 0.78) {
        const sal = Math.sin(((wp - 0.78) / 0.22) * Math.PI);
        rearShX = THREE.MathUtils.lerp(rearShX, -2.35, sal);
        rearElX = THREE.MathUtils.lerp(rearElX, -0.25, sal);
      }
    } else if (ws === 'shadow_combo') {
      const punchCycle = (t * 2.1 * profile.cadenceScale) % 3;
      const p1 = punchCycle < 0.8 ? Math.sin((punchCycle / 0.8) * Math.PI) : 0;
      const p2 = punchCycle >= 0.8 && punchCycle < 1.7 ? Math.sin(((punchCycle - 0.8) / 0.9) * Math.PI) : 0;
      leadShX = THREE.MathUtils.lerp(-1.05, -1.78, p1);
      leadElX = THREE.MathUtils.lerp(-1.62, -0.18, p1);
      rearShX = THREE.MathUtils.lerp(-1.08, -1.76, p2);
      rearElX = THREE.MathUtils.lerp(-1.66, -0.22, p2);
      torsoRotY += (p1 * 0.28 - p2 * 0.36) * mirror;
    } else if (ws === 'brawler_march') {
      torsoRotX += 0.06;
      const slam = Math.max(0, Math.sin(t * 3.4));
      leadShX = -0.95 - slam * 0.2;
      leadShY = (-0.28 + slam * 0.35) * mirror;
      leadElX = -1.42;
      rearShX = -0.95 - slam * 0.2;
      rearShY = (0.28 - slam * 0.35) * mirror;
      rearElX = -1.42;
    } else if (ws === 'slick_groove') {
      const shimmy = Math.sin(t * 5.2 * profile.bounceFreq);
      torsoRotY += shimmy * 0.18;
      torsoRotZ += shimmy * 0.06;
      leadShZ -= 0.14 * mirror;
      rearShZ += 0.14 * mirror;
      leadElX = -0.82 + shimmy * 0.22;
      rearElX = -0.82 - shimmy * 0.22;
      headRotZ += shimmy * 0.08;
    } else if (ws === 'stoic_warrior') {
      torsoRotX = 0.04 + stairW * 0.1 + ropeDuck * 0.4;
      leadShX = -0.92;
      leadShY = 0.2 * mirror;
      leadElX = -1.48;
      rearShX = -0.94;
      rearShY = -0.2 * mirror;
      rearElX = -1.5;
      if (wp > 0.84) {
        const bow = Math.sin(((wp - 0.84) / 0.16) * Math.PI);
        torsoRotX += bow * 0.34;
        headRotX += bow * 0.22;
      }
    } else if (ws === 'explosive_sprint') {
      const hop = Math.abs(Math.sin(t * 7.2)) * 0.04 * (1 - ropeDuck);
      pelvisYOffset += hop;
      leadShX = -0.98 - Math.sin(t * 6.5) * 0.45;
      leadElX = -1.38;
      rearShX = -0.98 + Math.sin(t * 6.5) * 0.45;
      rearElX = -1.38;
    } else if (ws === 'crowd_conductor') {
      const wave = Math.sin(t * 2.5) * 0.5 + 0.5;
      leadShX = -0.55 - wave * 1.15;
      leadShZ = (-0.52 - wave * 0.45) * mirror;
      leadElX = -0.45;
      rearShX = -0.55 - (1 - wave) * 1.15;
      rearShZ = (0.52 + (1 - wave) * 0.45) * mirror;
      rearElX = -0.45;
      torsoRotY += Math.sin(t * 1.8) * 0.25;
    } else if (ws === 'tight_focus') {
      torsoRotX += 0.09;
      headRotX += 0.14;
      leadShX = -1.24;
      leadShY = 0.32 * mirror;
      leadElX = -1.78;
      rearShX = -1.26;
      rearShY = -0.32 * mirror;
      rearElX = -1.8;
    } else if (ws === 'showboat_strut') {
      const wave = flairGate;
      pelvisRotY += Math.sin(t * 3.1) * 0.12;
      leadShX = THREE.MathUtils.lerp(leadShX, -1.95 - Math.sin(t * 5) * 0.35, wave);
      leadShZ = THREE.MathUtils.lerp(leadShZ, -0.55 * mirror, wave);
      leadElX = THREE.MathUtils.lerp(leadElX, -0.32, wave);
    } else {
      // royal_salute
      const hold = wp > 0.15 && wp < 0.85 ? 1 : 0.4;
      rearShX = THREE.MathUtils.lerp(rearShX, -2.08, hold * 0.85);
      rearShZ = THREE.MathUtils.lerp(rearShZ, 0.28 * mirror, hold * 0.85);
      rearElX = THREE.MathUtils.lerp(rearElX, -0.36, hold * 0.85);
    }

    // Rope-parting hand gesture when stepping through the ropes
    if (ropeDuck > 0.05) {
      leadShX = THREE.MathUtils.lerp(leadShX, -1.25, ropeDuck);
      leadShZ = THREE.MathUtils.lerp(leadShZ, -0.38 * mirror, ropeDuck);
      leadElX = THREE.MathUtils.lerp(leadElX, -0.55, ropeDuck);
    }
  } else if (state.celebrationMode) {
    // Expressive per-character post-win celebration animations (with coach!)
    const profile = state.motionProfile ?? resolveFighterMotionProfile('default');
    const cp = THREE.MathUtils.clamp(state.celebrationProgress ?? 0, 0, 1);
    const cs = profile.celebrationStyle;
    const pulse = Math.sin(t * 5.2 * profile.bounceFreq);
    const jump = Math.max(0, Math.sin(t * 4.4 * profile.bounceFreq));

    // Grounded celebratory base stance
    pelvisRotY = 0.08 * mirror;
    torsoRotX = -0.04;
    torsoRotY = 0;
    headRotX = -0.1;
    headRotY = Math.sin(t * 1.9) * 0.22;
    leadHipX = -0.1;
    leadHipZ = -0.14 * mirror;
    leadKneeX = 0.18;
    rearHipX = 0.08;
    rearHipZ = 0.14 * mirror;
    rearKneeX = 0.18;

    if (cs === 'double_fist_jump') {
      const hop = Math.pow(jump, 1.3);
      pelvisYOffset = hop * 0.18;
      leadKneeX = 0.22 + hop * 0.38;
      rearKneeX = 0.22 + hop * 0.38;
      torsoRotX = -0.12 - hop * 0.1;
      headRotX = -0.22;
      leadShX = -2.45 + pulse * 0.16;
      leadShZ = -0.45 * mirror;
      leadElX = -0.26;
      rearShX = -2.45 - pulse * 0.16;
      rearShZ = 0.45 * mirror;
      rearElX = -0.26;
    } else if (cs === 'belt_waist_flex') {
      if (cp < 0.45) {
        // Wrap championship belt gesture across waist
        const sweep = Math.sin((cp / 0.45) * Math.PI);
        torsoRotY = Math.sin(t * 3.2) * 0.18;
        leadShX = -0.52;
        leadShY = (-0.25 + sweep * 0.45) * mirror;
        leadElX = -1.45;
        rearShX = -0.52;
        rearShY = (0.25 - sweep * 0.45) * mirror;
        rearElX = -1.45;
      } else {
        // Double bicep championship flex!
        torsoRotX = -0.12;
        torsoRotY = Math.sin(t * 2.1) * 0.28;
        leadShX = -1.48;
        leadShZ = -1.18 * mirror;
        leadElX = -1.85;
        rearShX = -1.48;
        rearShZ = 1.18 * mirror;
        rearElX = -1.85;
      }
    } else if (cs === 'shadow_flurry_roar') {
      if (cp < 0.58) {
        const fl = Math.sin(t * 14);
        pelvisRotY = fl * 0.25 * mirror;
        torsoRotY = fl * 0.48 * mirror;
        leadShX = fl > 0 ? -1.85 : -1.1;
        leadElX = fl > 0 ? -0.15 : -1.6;
        rearShX = fl < 0 ? -1.85 : -1.1;
        rearElX = fl < 0 ? -0.15 : -1.6;
      } else {
        // Skyward roar finish
        pelvisYOffset = Math.max(0, Math.sin((cp - 0.58) * Math.PI * 2.4)) * 0.12;
        torsoRotX = -0.18;
        headRotX = -0.28;
        leadShX = -2.55;
        leadShZ = -0.52 * mirror;
        leadElX = -0.18;
        rearShX = -2.55;
        rearShZ = 0.52 * mirror;
        rearElX = -0.18;
      }
    } else if (cs === 'kneel_prayer_rise') {
      if (cp < 0.48) {
        // Respectful kneel & gratitude
        const kEnv = Math.sin(Math.min(1, cp / 0.2) * (Math.PI / 2)) *
          (cp > 0.4 ? Math.cos(((cp - 0.4) / 0.08) * (Math.PI / 2)) : 1);
        pelvisYOffset = -0.32 * kEnv;
        leadHipX = -0.95 * kEnv;
        leadKneeX = 1.25 * kEnv;
        rearHipX = 0.28 * kEnv;
        rearKneeX = 1.45 * kEnv;
        torsoRotX = 0.24 * kEnv;
        headRotX = 0.35 * kEnv;
        leadShX = -1.05;
        leadShY = -0.24 * mirror;
        leadElX = -1.78;
        rearShX = -0.62;
        rearElX = -1.35;
      } else {
        // Explosive triumphant rise with arms wide to the rafters
        pelvisYOffset = Math.max(0, Math.sin((cp - 0.48) * 6)) * 0.1;
        torsoRotX = -0.14;
        headRotX = -0.24;
        leadShX = -2.32;
        leadShZ = -0.78 * mirror;
        leadElX = -0.2;
        rearShX = -2.32;
        rearShZ = 0.78 * mirror;
        rearElX = -0.2;
      }
    } else if (cs === 'crowd_ear_cup') {
      torsoRotY = Math.sin(t * 2.1) * 0.45;
      torsoRotZ = Math.sin(t * 2.1) * 0.09;
      headRotZ = -0.14;
      // Cup glove behind ear ("I can't hear you!")
      rearShX = -1.62;
      rearShZ = 0.55 * mirror;
      rearElX = -2.08;
      // Other arm waving high
      leadShX = -1.95 + pulse * 0.22;
      leadShZ = -0.58 * mirror;
      leadElX = -0.35;
    } else if (cs === 'chest_beat_roar') {
      const beatCycle = (t * 2.4) % 2;
      if (beatCycle < 1.0) {
        const thump = Math.abs(Math.sin(beatCycle * Math.PI * 2));
        torsoRotX = -0.08;
        leadShX = -1.15;
        leadShY = -0.48 * mirror;
        leadElX = -1.85 + thump * 0.25;
        rearShX = -1.15;
        rearShY = 0.48 * mirror;
        rearElX = -1.85 + thump * 0.25;
      } else {
        torsoRotX = -0.16;
        headRotX = -0.26;
        leadShX = -2.18;
        leadShZ = -0.82 * mirror;
        leadElX = -0.28;
        rearShX = -2.18;
        rearShZ = 0.82 * mirror;
        rearElX = -0.28;
      }
    } else if (cs === 'spin_fist_pump') {
      pelvisRotY = cp * Math.PI * 2;
      pelvisYOffset = Math.max(0, Math.sin(t * 5.8)) * 0.08;
      leadShX = -2.42;
      leadShZ = -0.35 * mirror;
      leadElX = -0.22;
      rearShX = -1.78 + pulse * 0.25;
      rearShZ = 0.62 * mirror;
      rearElX = -0.55;
    } else if (cs === 'corner_salute_bow') {
      if (cp < 0.42) {
        const bow = Math.sin((cp / 0.42) * Math.PI);
        torsoRotX = bow * 0.46;
        headRotX = bow * 0.28;
        leadShX = -0.95;
        leadShY = -0.25 * mirror;
        leadElX = -1.5;
        rearShX = -0.95;
        rearShY = 0.25 * mirror;
        rearElX = -1.5;
      } else {
        torsoRotX = -0.06;
        leadShX = -2.55;
        leadShZ = -0.22 * mirror;
        leadElX = -0.12;
        rearShX = -0.45;
        rearElX = -1.2;
      }
    } else if (cs === 'gloves_high_march') {
      const march = Math.sin(t * 7.2);
      pelvisYOffset = Math.abs(march) * 0.05;
      leadHipX = -0.2 - Math.max(0, march) * 0.45;
      leadKneeX = 0.35 + Math.max(0, march) * 0.75;
      rearHipX = -0.2 - Math.max(0, -march) * 0.45;
      rearKneeX = 0.35 + Math.max(0, -march) * 0.75;
      leadShX = -2.15 - Math.max(0, march) * 0.42;
      leadElX = -0.24;
      rearShX = -2.15 - Math.max(0, -march) * 0.42;
      rearElX = -0.24;
    } else {
      // coach_arm_raise — turns slightly toward coach & raises victory arm!
      torsoRotY = -0.28 * profile.handBias;
      headRotY = -0.36 * profile.handBias;
      pelvisYOffset = Math.max(0, Math.sin(t * 4.2)) * 0.06;
      leadShX = -2.58;
      leadShZ = -0.35 * mirror;
      leadElX = -0.14;
      rearShX = -1.25 + pulse * 0.15;
      rearShZ = 0.55 * mirror;
      rearElX = -1.15;
    }
  } else if (state.neutralWalkMode) {
    // Relaxed pro-boxer walk back to home/neutral corner during knockdown count or KO
    const normSpeed = THREE.MathUtils.clamp(state.moveSpeed / 1.85, 0, 1.15);
    const targetWeight = Math.min(1, normSpeed * 1.15);
    state.gaitWeight = THREE.MathUtils.damp(state.gaitWeight, targetWeight, 11, d);
    state.smoothForward = THREE.MathUtils.damp(state.smoothForward, state.moveForward, 12, d);
    state.smoothStrafe = THREE.MathUtils.damp(state.smoothStrafe, state.moveStrafe, 12, d);

    const strideRate = 4.6 + normSpeed * 3.4;
    state.gaitPhase =
      (state.gaitPhase + strideRate * d * (0.2 + state.gaitWeight * 0.8)) % (Math.PI * 2);

    const w = state.gaitWeight;
    const p = state.gaitPhase;
    const s = Math.sin(p);
    const c = Math.cos(p);
    const dbl = Math.cos(p * 2);
    const breath = Math.sin(t * 2.4);

    pelvisYOffset = (-0.014 + dbl * 0.018) * w;
    pelvisXOffset = s * 0.018 * w;
    pelvisRotY = c * 0.08 * w + 0.08 * mirror * (1 - w);
    pelvisRotZ = s * 0.028 * w;

    torsoRotX = 0.045 + 0.02 * w + breath * 0.012 * (1 - w);
    torsoRotY = -c * 0.095 * w;
    torsoRotZ = -s * 0.024 * w;

    headRotX = 0.03 + breath * 0.01;
    headRotY = -0.06 * mirror * (1 - w) + Math.sin(t * 1.2) * 0.06 * (1 - w);
    headRotZ = 0;

    // Relaxed lowered gloves swinging smoothly while walking back to corner
    const armSwing = c * 0.28 * w;
    const lLag = Math.max(0, Math.sin(p - 0.6)) * 0.22 * w;
    const rLag = Math.max(0, Math.sin(p + Math.PI - 0.6)) * 0.22 * w;
    leadShX = -0.34 - armSwing + breath * 0.02;
    leadShY = 0.14 * mirror;
    leadShZ = -0.17 * mirror;
    leadElX = -0.86 - lLag;
    leadRoll = 0.34 * mirror;

    rearShX = -0.34 + armSwing + breath * 0.02;
    rearShY = -0.14 * mirror;
    rearShZ = 0.17 * mirror;
    rearElX = -0.86 - rLag;
    rearRoll = -0.34 * mirror;

    const stride = 0.34 * w;
    const leadLift = Math.max(0, s) * 0.4 * w;
    const rearLift = Math.max(0, -s) * 0.4 * w;

    leadHipX = c * stride - leadLift * 0.42 - 0.06 * (1 - w);
    rearHipX = -c * stride - rearLift * 0.42 + 0.06 * (1 - w);
    leadHipZ = -0.11 * mirror;
    rearHipZ = 0.11 * mirror;

    leadKneeX = 0.14 + leadLift * 0.84 + Math.max(0, -c) * 0.14 * w;
    rearKneeX = 0.14 + rearLift * 0.84 + Math.max(0, c) * 0.14 * w;
    leadAnkleBias = (-leadLift * 0.22 + Math.max(0, c) * 0.24) * w;
    rearAnkleBias = (-rearLift * 0.22 + Math.max(0, -c) * 0.24) * w;
  } else if (state.clinchMode) {
    // Tight inside clinch: arms wrapped around opponent's upper arms/ribs, head tucked safely
    const sway = Math.sin(t * 5.2);
    pelvisRotY = sway * 0.06 * mirror;
    torsoRotX = 0.2 + Math.sin(t * 6.0) * 0.03;
    torsoRotZ = sway * 0.05;
    headRotX = 0.22;
    headRotY = -0.24 * mirror;
    leadShX = -1.04;
    leadShY = 0.44 * mirror;
    leadShZ = -0.22 * mirror;
    leadElX = -1.38;
    rearShX = -1.02;
    rearShY = -0.44 * mirror;
    rearShZ = 0.22 * mirror;
    rearElX = -1.35;
    leadHipX = -0.14;
    leadKneeX = 0.26;
    rearHipX = 0.14;
    rearKneeX = 0.24;
  } else if (state.cornerRestMode) {
    // Seated/leaning corner recovery between rounds
    const heave = Math.sin(t * 4.4);
    pelvisYOffset = -0.06;
    pelvisRotY = 0.06 * mirror;
    torsoRotX = 0.12 + heave * 0.032;
    headRotX = 0.08 + heave * 0.018;
    leadShX = -0.36;
    leadShY = 0.16 * mirror;
    leadElX = -1.16;
    rearShX = -0.36;
    rearShY = -0.16 * mirror;
    rearElX = -1.16;
    leadHipX = -0.18;
    leadKneeX = 0.34;
    rearHipX = 0.12;
    rearKneeX = 0.28;
  } else if (state.loserCornerMode) {
    // Tired, respectful post-fight corner stance after decision loss
    const breath = Math.sin(t * 3.1);
    pelvisRotY = 0.1 * mirror;
    torsoRotX = 0.16 + breath * 0.025;
    headRotX = 0.18 + breath * 0.02;
    leadShX = -0.52;
    leadShY = 0.14 * mirror;
    leadElX = -1.22;
    rearShX = -0.54;
    rearShY = -0.14 * mirror;
    rearElX = -1.24;
    leadHipX = -0.12;
    leadKneeX = 0.22;
    rearHipX = 0.1;
    rearKneeX = 0.2;
  } else {
    // Integrate continuous stride phase by true movement speed (eliminates foot-sliding & cadence snaps)
    const normSpeed = THREE.MathUtils.clamp(state.moveSpeed / 2.35, 0, 1.25);
    const targetWeight = state.attackType ? normSpeed * 0.28 : Math.min(1, normSpeed * 1.15);
    state.gaitWeight = THREE.MathUtils.damp(state.gaitWeight, targetWeight, 11, d);
    state.smoothForward = THREE.MathUtils.damp(state.smoothForward, state.moveForward, 12, d);
    state.smoothStrafe = THREE.MathUtils.damp(state.smoothStrafe, state.moveStrafe, 12, d);

    const strideRate = 5.4 + normSpeed * 4.4;
    state.gaitPhase = (state.gaitPhase + strideRate * d * (0.25 + state.gaitWeight * 0.75)) % (Math.PI * 2);

    const w = state.gaitWeight;
    const fwd = state.smoothForward;
    const str = state.smoothStrafe;
    const phase = state.gaitPhase;

    // Idle boxer bounce (soft knee spring + rhythmic weight sway)
    const idleBounce = Math.sin(t * 6.4) * (1 - w * 0.65);
    const sway = Math.sin(t * 3.2) * 0.032 * (1 - w * 0.4);
    torsoRotZ += sway;
    leadHipX -= idleBounce * 0.035;
    leadKneeX += idleBounce * 0.065;
    rearHipX -= idleBounce * 0.03;
    rearKneeX += idleBounce * 0.06;

  // Realistic directional boxing footwork
  if (w > 0.005) {
    const absFwd = Math.abs(fwd);
    const absStr = Math.abs(str);
    const dirScale = Math.min(1, Math.hypot(fwd, str));
    const s = Math.sin(phase);
    const c = Math.cos(phase);

    // Forward/backward stride (harmonic hip swing + mid-swing knee lift so boot clears mat)
    const strideAmp = 0.28 * absFwd * w;
    const fwdSign = fwd >= 0 ? 1 : -1;

    const leadSwingLift = Math.max(0, s) * (0.42 * absFwd + 0.24 * absStr) * w;
    const rearSwingLift = Math.max(0, -s) * (0.42 * absFwd + 0.24 * absStr) * w;

    leadHipX += c * strideAmp * fwdSign - leadSwingLift * 0.34;
    rearHipX -= c * strideAmp * fwdSign - rearSwingLift * 0.34;

    leadKneeX += leadSwingLift * 0.62 + Math.max(0, -c * fwdSign) * 0.08 * w;
    rearKneeX += rearSwingLift * 0.62 + Math.max(0, c * fwdSign) * 0.08 * w;

    // Ankle toe-lift on swing & natural heel-push plantarflexion on trailing push-off
    leadAnkleBias += (-leadSwingLift * 0.22 + Math.max(0, c * fwdSign) * 0.26 * absFwd) * w;
    rearAnkleBias += (-rearSwingLift * 0.22 + Math.max(0, -c * fwdSign) * 0.26 * absFwd) * w;

    // Lateral boxing shuffle-step (hip abduction without legs scissoring through each other)
    const latSwing = c * 0.14 * absStr * w;
    leadHipZ += str * 0.05 + latSwing * mirror;
    rearHipZ += str * 0.05 - latSwing * mirror;

    // Natural hip & torso counter-twist + lateral weight shift over stance foot
    const twist = c * 0.075 * dirScale * w * fwdSign;
    pelvisRotY += twist * mirror;
    torsoRotY -= twist * 1.15 * mirror;
    pelvisRotZ += (s * 0.032 * dirScale - str * 0.04) * w;

    // Athletic forward lean & lateral tilt
    torsoRotX += fwd * 0.1 * w;
    torsoRotZ -= str * 0.085 * w;

    // Subtle rhythmic guard bob synced with steps
    const stepBob = Math.cos(phase * 2) * 0.025 * w;
    leadShX += stepBob;
    rearShX += stepBob;
  }
  }

  // Clamp hip abduction so legs never clip inward through each other
  if (mirror === 1) {
    leadHipZ = Math.min(0.02, Math.max(-0.34, leadHipZ));
    rearHipZ = Math.max(-0.02, Math.min(0.34, rearHipZ));
  } else {
    leadHipZ = Math.max(-0.02, Math.min(0.34, leadHipZ));
    rearHipZ = Math.min(0.02, Math.max(-0.34, rearHipZ));
  }

  if (state.isGuarding) {
    leadHipX -= 0.06;
    leadKneeX += 0.12;
    rearKneeX += 0.12;
    torsoRotX = 0.24 - state.guardShock * 0.12;
    headRotX = 0.22;
    leadShX = -1.42 + state.guardShock * 0.18;
    leadShY = 0.46 * mirror;
    leadShZ = 0.04 * mirror;
    leadElX = -1.86;
    leadRoll = 0.28 * mirror;

    rearShX = -1.44 + state.guardShock * 0.18;
    rearShY = -0.44 * mirror;
    rearShZ = -0.04 * mirror;
    rearElX = -1.88;
    rearRoll = -0.28 * mirror;
  }

  if (state.dodgeTimer > 0 && state.dodgeDuration > 0) {
    const p = 1 - state.dodgeTimer / state.dodgeDuration;
    const curve = Math.sin(p * Math.PI);
    torsoRotX += curve * 0.26;
    torsoRotZ += state.dodgeDirX * curve * 0.52;
    pelvisRotZ += state.dodgeDirX * curve * 0.14;
    headRotZ += state.dodgeDirX * curve * 0.28;
    leadHipX -= curve * 0.28;
    leadKneeX += curve * 0.52;
    rearHipX += curve * 0.12;
    rearKneeX += curve * 0.48;
  }

  if (state.attackType) {
    const p = THREE.MathUtils.clamp(state.attackProgress, 0, 1);
    const ext =
      p < 0.36
        ? Math.sin((p / 0.36) * (Math.PI / 2))
        : p < 0.52
          ? 1
          : Math.cos(((p - 0.52) / 0.48) * (Math.PI / 2));

    if (state.attackType === 'jab') {
      // Crisp straight lead jab aimed at opponent's head/chin with 90° corkscrew forearm pronation
      torsoRotY += ext * 0.36 * mirror;
      torsoRotX += ext * 0.1;
      leadShX = THREE.MathUtils.lerp(leadShX, -1.86, ext);
      leadShY = THREE.MathUtils.lerp(leadShY, -0.08 * mirror, ext);
      leadShZ = THREE.MathUtils.lerp(leadShZ, 0.2 * mirror, ext);
      leadElX = THREE.MathUtils.lerp(leadElX, -0.14, ext);
      leadRoll = THREE.MathUtils.lerp(leadRoll, -1.45 * mirror, ext);
      rearShX = -1.36;
      rearShY = -0.28 * mirror;
      rearElX = -1.94;
    } else if (state.attackType === 'hook') {
      // Textbook Lead Hook to the Head: coil -> horizontal L-frame arc sweeping across jaw/temple -> guard snap
      const coil =
        p < 0.24
          ? Math.sin((p / 0.24) * (Math.PI / 2))
          : Math.max(0, 1 - (p - 0.24) / 0.16);
      const whip =
        p < 0.2
          ? 0
          : p < 0.54
            ? Math.sin(((p - 0.2) / 0.34) * (Math.PI / 2))
            : Math.cos(((p - 0.54) / 0.46) * (Math.PI / 2));

      pelvisYOffset -= coil * 0.02;
      pelvisRotY += (whip * 0.34 - coil * 0.14) * mirror;
      torsoRotY += (whip * 0.68 - coil * 0.24) * mirror;
      torsoRotX += whip * 0.06;
      torsoRotZ += (coil * 0.12 - whip * 0.18) * mirror;
      headRotY -= whip * 0.34 * mirror;

      // Raise elbow out horizontally at head/chin level (shZ = -1.48 * mirror) and sweep across opponent's jaw
      const lift = Math.max(coil * 0.9, whip);
      const sweepY = -0.34 * coil + 0.78 * whip;
      leadShX = THREE.MathUtils.lerp(leadShX, -0.46, lift);
      leadShY = THREE.MathUtils.lerp(leadShY, sweepY * mirror, lift);
      leadShZ = THREE.MathUtils.lerp(leadShZ, -1.48 * mirror, lift);
      leadElX = THREE.MathUtils.lerp(leadElX, -1.52, lift);
      leadElZ = 0;
      leadRoll = THREE.MathUtils.lerp(leadRoll, 1.52 * mirror, lift);

      // Rear glove glued tight to temple/chin during lead hook
      rearShX = -1.38;
      rearShY = -0.34 * mirror;
      rearElX = -1.92;
    } else if (state.attackType === 'heavy') {
      // Heavy Rear Cross aimed cleanly at opponent's head with deep hip drive & corkscrew wrist rotation
      pelvisRotY -= ext * 0.46 * mirror;
      torsoRotY -= ext * 0.58 * mirror;
      torsoRotX += ext * 0.22;
      leadHipX -= ext * 0.08;
      leadKneeX += ext * 0.12;
      rearAnkleBias += ext * 0.25;
      rearShX = THREE.MathUtils.lerp(rearShX, -1.96, ext);
      rearShY = THREE.MathUtils.lerp(rearShY, 0.12 * mirror, ext);
      rearShZ = THREE.MathUtils.lerp(rearShZ, -0.22 * mirror, ext);
      rearElX = THREE.MathUtils.lerp(rearElX, -0.14, ext);
      rearRoll = THREE.MathUtils.lerp(rearRoll, 1.45 * mirror, ext);
      leadShX = -1.32;
      leadShY = 0.3 * mirror;
      leadElX = -1.88;
    } else if (state.attackType === 'uppercut') {
      // Realistic Boxing Uppercut: compact knee dip + rear shoulder coil -> explosive upward hip-drive scoop to chin
      const load = p < 0.28 ? Math.sin((p / 0.28) * (Math.PI / 2)) : Math.max(0, 1 - (p - 0.28) / 0.16);
      const drive =
        p < 0.24
          ? 0
          : p < 0.58
            ? Math.sin(((p - 0.24) / 0.34) * (Math.PI / 2))
            : Math.cos(((p - 0.58) / 0.42) * (Math.PI / 2));

      // Leg crouch load -> explosive upward drive
      leadHipX -= load * 0.18;
      leadKneeX += load * 0.38;
      rearHipX += load * 0.08 - drive * 0.08;
      rearKneeX += load * 0.42 - drive * 0.12;
      pelvisRotY += (load * 0.14 - drive * 0.42) * mirror;

      // Torso coils back toward rear hip, then drives forward-upward into opponent's chin
      torsoRotX = THREE.MathUtils.lerp(torsoRotX, 0.34, load);
      torsoRotX = THREE.MathUtils.lerp(torsoRotX, -0.02, drive);
      torsoRotY += (load * 0.32 - drive * 0.52) * mirror;
      torsoRotZ += (load * 0.16 - drive * 0.14) * mirror;
      headRotY += drive * 0.28 * mirror;

      // Arm drops tight to hip/rib pocket during load, then scoops forward/up into opponent's chin
      rearShX = THREE.MathUtils.lerp(rearShX, -0.38, load);
      rearShX = THREE.MathUtils.lerp(rearShX, -1.38, drive);
      rearShY = THREE.MathUtils.lerp(rearShY, -0.26 * mirror, load);
      rearShY = THREE.MathUtils.lerp(rearShY, 0.22 * mirror, drive);
      rearShZ = THREE.MathUtils.lerp(rearShZ, -0.14 * mirror, load);
      rearShZ = THREE.MathUtils.lerp(rearShZ, -0.18 * mirror, drive);

      // Elbow bent so fist scoops forward and upward right beneath opponent's chin
      rearElX = THREE.MathUtils.lerp(rearElX, -1.78, load);
      rearElX = THREE.MathUtils.lerp(rearElX, -1.18, drive);
      rearElZ = -0.1 * drive * mirror;
      // Supinate forearm so knuckles/palm face upward
      rearRoll = THREE.MathUtils.lerp(rearRoll, -0.75 * mirror, Math.max(load * 0.6, drive));

      // Lead glove tucked tightly protecting chin
      leadShX = -1.36;
      leadShY = 0.34 * mirror;
      leadElX = -1.94;
    }

    if (state.attackTarget === 'body') {
      const bp = Math.sin(p * Math.PI);
      torsoRotX += bp * 0.25;
      pelvisYOffset -= bp * 0.065;
      leadHipX -= bp * 0.12;
      leadKneeX += bp * 0.22;
      if (state.attackType === 'jab' || state.attackType === 'hook') {
        leadShX += bp * 0.42;
      } else {
        rearShX += bp * 0.44;
      }
    }
  }

  torsoRotX += state.torsoSpringX;
  torsoRotY += state.torsoSpringY;
  torsoRotZ += state.torsoSpringZ;
  headRotX += state.headSpringX;
  headRotZ += state.headSpringZ;

  if (state.hitStunTimer > 0) {
    const recoil = Math.min(1, state.hitStunTimer / 0.22);
    leadShX += recoil * 0.28;
    rearShX += recoil * 0.28;
  }

  // Ground-contact pelvis height solver: keeps planted foot's sole flush on ring canvas (y = 0)
  const leadDrop =
    0.075 +
    (0.42 * Math.cos(leadHipX) + 0.385 * Math.cos(leadHipX + leadKneeX)) * Math.cos(leadHipZ) +
    0.062;
  const rearDrop =
    0.075 +
    (0.42 * Math.cos(rearHipX) + 0.385 * Math.cos(rearHipX + rearKneeX)) * Math.cos(rearHipZ) +
    0.062;
  const pelvisY = Math.max(0.72, Math.max(leadDrop, rearDrop) + pelvisYOffset);

  rig.shadowMesh.scale.setScalar(1);
  const dampRate = state.attackType ? 34 : state.walkoutMode || state.celebrationMode ? 15 : 18;

  rig.pelvis.position.x = THREE.MathUtils.damp(rig.pelvis.position.x, pelvisXOffset, dampRate, d);
  rig.pelvis.position.y = THREE.MathUtils.damp(rig.pelvis.position.y, pelvisY, dampRate, d);
  rig.pelvis.rotation.x = THREE.MathUtils.damp(rig.pelvis.rotation.x, pelvisRotX, dampRate, d);
  rig.pelvis.rotation.y = THREE.MathUtils.damp(rig.pelvis.rotation.y, pelvisRotY, dampRate, d);
  rig.pelvis.rotation.z = THREE.MathUtils.damp(rig.pelvis.rotation.z, pelvisRotZ, dampRate, d);

  rig.torso.rotation.x = THREE.MathUtils.damp(rig.torso.rotation.x, torsoRotX, dampRate, d);
  rig.torso.rotation.y = THREE.MathUtils.damp(rig.torso.rotation.y, torsoRotY, dampRate, d);
  rig.torso.rotation.z = THREE.MathUtils.damp(rig.torso.rotation.z, torsoRotZ, dampRate, d);

  rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, headRotX, dampRate, d);
  rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, headRotY, dampRate, d);
  rig.head.rotation.z = THREE.MathUtils.damp(rig.head.rotation.z, headRotZ, dampRate, d);

  const leftIsLead = mirror === 1;
  const lShX = leftIsLead ? leadShX : rearShX;
  const lShY = leftIsLead ? leadShY : rearShY;
  const lShZ = leftIsLead ? leadShZ : rearShZ;
  const lElX = leftIsLead ? leadElX : rearElX;
  const lElY = leftIsLead ? leadElY : rearElY;
  const lElZ = leftIsLead ? leadElZ : rearElZ;
  const lRoll = leftIsLead ? leadRoll : rearRoll;

  const rShX = leftIsLead ? rearShX : leadShX;
  const rShY = leftIsLead ? rearShY : leadShY;
  const rShZ = leftIsLead ? rearShZ : leadShZ;
  const rElX = leftIsLead ? rearElX : leadElX;
  const rElY = leftIsLead ? rearElY : leadElY;
  const rElZ = leftIsLead ? rearElZ : leadElZ;
  const rRoll = leftIsLead ? rearRoll : leadRoll;

  rig.leftShoulder.rotation.x = THREE.MathUtils.damp(rig.leftShoulder.rotation.x, lShX, dampRate, d);
  rig.leftShoulder.rotation.y = THREE.MathUtils.damp(rig.leftShoulder.rotation.y, lShY, dampRate, d);
  rig.leftShoulder.rotation.z = THREE.MathUtils.damp(rig.leftShoulder.rotation.z, lShZ, dampRate, d);
  rig.leftElbow.rotation.x = THREE.MathUtils.damp(rig.leftElbow.rotation.x, lElX, dampRate, d);
  rig.leftElbow.rotation.y = THREE.MathUtils.damp(rig.leftElbow.rotation.y, lElY, dampRate, d);
  rig.leftElbow.rotation.z = THREE.MathUtils.damp(rig.leftElbow.rotation.z, lElZ, dampRate, d);
  rig.leftForearmRoll.rotation.y = THREE.MathUtils.damp(rig.leftForearmRoll.rotation.y, lRoll, dampRate, d);

  rig.rightShoulder.rotation.x = THREE.MathUtils.damp(rig.rightShoulder.rotation.x, rShX, dampRate, d);
  rig.rightShoulder.rotation.y = THREE.MathUtils.damp(rig.rightShoulder.rotation.y, rShY, dampRate, d);
  rig.rightShoulder.rotation.z = THREE.MathUtils.damp(rig.rightShoulder.rotation.z, rShZ, dampRate, d);
  rig.rightElbow.rotation.x = THREE.MathUtils.damp(rig.rightElbow.rotation.x, rElX, dampRate, d);
  rig.rightElbow.rotation.y = THREE.MathUtils.damp(rig.rightElbow.rotation.y, rElY, dampRate, d);
  rig.rightElbow.rotation.z = THREE.MathUtils.damp(rig.rightElbow.rotation.z, rElZ, dampRate, d);
  rig.rightForearmRoll.rotation.y = THREE.MathUtils.damp(rig.rightForearmRoll.rotation.y, rRoll, dampRate, d);

  const lHipX = leftIsLead ? leadHipX : rearHipX;
  const lHipZ = leftIsLead ? leadHipZ : rearHipZ;
  const lKneeX = leftIsLead ? leadKneeX : rearKneeX;
  const lAnkBias = leftIsLead ? leadAnkleBias : rearAnkleBias;

  const rHipX = leftIsLead ? rearHipX : leadHipX;
  const rHipZ = leftIsLead ? rearHipZ : leadHipZ;
  const rKneeX = leftIsLead ? rearKneeX : leadKneeX;
  const rAnkBias = leftIsLead ? rearAnkleBias : leadAnkleBias;

  // Ankle pitch counter-rotates shin angle so boot sole meets ring canvas naturally
  const lAnkX = THREE.MathUtils.clamp(-(lHipX + lKneeX) + lAnkBias, -0.55, 0.65);
  const rAnkX = THREE.MathUtils.clamp(-(rHipX + rKneeX) + rAnkBias, -0.55, 0.65);
  const lAnkZ = THREE.MathUtils.clamp(-lHipZ * 0.85 - pelvisRotZ * 0.5, -0.35, 0.35);
  const rAnkZ = THREE.MathUtils.clamp(-rHipZ * 0.85 - pelvisRotZ * 0.5, -0.35, 0.35);

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

  applyHairSpringToRig(rig, state, d, accelF, accelS);

  rig.root.updateMatrixWorld(true);
  rig.head.getWorldPosition(rig.headWorldPos);
  rig.headWorldPos.y += 0.1;
  rig.leftElbow.getWorldPosition(rig.leftGloveWorldPos);
  rig.rightElbow.getWorldPosition(rig.rightGloveWorldPos);
}
