import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  AiTendency,
  AttackTarget,
  AttackType,
  BoxerAppearance,
  BoxerStats,
  CameraMode,
  CombatHudSnapshot,
  FightPhase,
  FighterProfile,
  FightSummaryStats,
  GraphicsQuality,
  OpponentProfile,
  RoundScoreEntry,
} from '../types/game';
import {
  ArenaHandle,
  createBoxingArena,
  PLAYABLE_HALF_BOUND,
  ROPE_CONTACT_THRESHOLD,
  RopeContact,
} from './arena';
import { soundEngine } from './audio';
import { PLAYABLE_FIGHTERS } from '../data/fighters';
import { createTunnelArena, TunnelArenaHandle } from './tunnelArena';
import { createBoxerWaitingRoom, WaitingRoomHandle } from './waitingRoom';
import {
  BoxerAnimState,
  BoxerRig,
  createBoxerRig,
  createInitialRagdollState,
  disposeBoxerRig,
  resolveFighterMotionProfile,
  triggerHitPhysicsImpulse,
  triggerKnockdownRagdoll,
  updateBoxerPose,
} from './boxerMesh';
import {
  CoachAnimState,
  CoachRig,
  createCoachRig,
  disposeCoachRig,
  updateCoachPose,
} from './coachMesh';
import {
  createRefereeRig,
  disposeRefereeRig,
  RefereeAnimState,
  RefereeMode,
  RefereeRig,
  updateRefereePose,
} from './refereeMesh';

// Module-scope reusable math objects (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _lookGoal = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _cornerSpot = new THREE.Vector2();
const _dummy = new THREE.Object3D();
const _pColor = new THREE.Color();

interface FighterSim {
  isPlayer: boolean;
  name: string;
  stats: BoxerStats;
  stance: 'Orthodox' | 'Southpaw';
  rig: BoxerRig;
  anim: BoxerAnimState;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingAngle: number;

  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  guard: number;
  maxGuard: number;
  knockdowns: number;
  roundDamage: number;

  // Combat state machine
  attackType: AttackType | null;
  attackTarget: AttackTarget;
  attackTimer: number;
  attackDuration: number;
  attackWindup: number;
  attackActiveEnd: number;
  attackHasHit: boolean;
  bufferedAttack: AttackType | null;
  bufferedTarget: AttackTarget;
  bufferTimer: number;

  isGuarding: boolean;
  wasGuarding: boolean;
  guardJustRaisedTimer: number;
  guardBreakTimer: number;
  dodgeTimer: number;
  dodgeDuration: number;
  dodgeCooldown: number;
  dodgeDirX: number;
  dodgeDirZ: number;
  invulnTimer: number;
  hitStunTimer: number;
  counterWindowTimer: number;
  comboCount: number;
  comboResetTimer: number;
  sweatLevel: number;
  bruiseLevel: number;
  roundLanded: number;
  roundKnockdownsTaken: number;

  // AI fields
  aiTendency?: AiTendency;
  aiThinkTimer: number;
  aiMoveX: number;
  aiMoveZ: number;
  aiComboQueue: AttackType[];
  aiGuardHoldTimer: number;
}

interface CoachSim {
  rig: CoachRig;
  anim: CoachAnimState;
  pos: THREE.Vector3;
  facingAngle: number;
  corner: 'red' | 'blue';
  startPos: THREE.Vector3;
}

interface RefereeSim {
  rig: RefereeRig;
  anim: RefereeAnimState;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingAngle: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  colorHex: number;
}

interface ReplayFighterPose {
  posX: number;
  posZ: number;
  facingAngle: number;
  pelvisX: number;
  pelvisY: number;
  pelvisZ: number;
  pelvisRotX: number;
  pelvisRotY: number;
  pelvisRotZ: number;
  torsoRotX: number;
  torsoRotY: number;
  torsoRotZ: number;
  headRotX: number;
  headRotY: number;
  headRotZ: number;
  lShX: number;
  lShY: number;
  lShZ: number;
  lElX: number;
  lElY: number;
  lElZ: number;
  lRoll: number;
  rShX: number;
  rShY: number;
  rShZ: number;
  rElX: number;
  rElY: number;
  rElZ: number;
  rRoll: number;
  lHipX: number;
  lHipZ: number;
  lKneeX: number;
  lAnkX: number;
  lAnkZ: number;
  rHipX: number;
  rHipZ: number;
  rKneeX: number;
  rAnkX: number;
  rAnkZ: number;
  hairX: number;
  hairZ: number;
  hitFlash: number;
  shadowScale: number;
}

interface ReplayFrame {
  t: number;
  player: ReplayFighterPose;
  opp: ReplayFighterPose;
}

function createEmptyReplayPose(): ReplayFighterPose {
  return {
    posX: 0,
    posZ: 0,
    facingAngle: 0,
    pelvisX: 0,
    pelvisY: 0.94,
    pelvisZ: 0,
    pelvisRotX: 0,
    pelvisRotY: 0,
    pelvisRotZ: 0,
    torsoRotX: 0,
    torsoRotY: 0,
    torsoRotZ: 0,
    headRotX: 0,
    headRotY: 0,
    headRotZ: 0,
    lShX: 0,
    lShY: 0,
    lShZ: 0,
    lElX: 0,
    lElY: 0,
    lElZ: 0,
    lRoll: 0,
    rShX: 0,
    rShY: 0,
    rShZ: 0,
    rElX: 0,
    rElY: 0,
    rElZ: 0,
    rRoll: 0,
    lHipX: 0,
    lHipZ: 0,
    lKneeX: 0,
    lAnkX: 0,
    lAnkZ: 0,
    rHipX: 0,
    rHipZ: 0,
    rKneeX: 0,
    rAnkX: 0,
    rAnkZ: 0,
    hairX: 0,
    hairZ: 0,
    hitFlash: 0,
    shadowScale: 1,
  };
}

export interface FightConfig {
  playerProfile: FighterProfile;
  playerName: string;
  playerStats: BoxerStats;
  playerSharpness: number; // 0..100
  playerEnergy: number; // 0..100
  opponent: OpponentProfile;
  rounds: number;
  roundSeconds: number;
  hasCareerBelt?: boolean;
  announcerVoice?: boolean;
}

export class BoxingSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private arena: ArenaHandle;
  private waitingRoom: WaitingRoomHandle;
  private tunnelArena: TunnelArenaHandle;
  private keyLight!: THREE.DirectionalLight;
  private overheadSpot!: THREE.SpotLight;
  private faceOffRedLight!: THREE.PointLight;
  private faceOffBlueLight!: THREE.PointLight;
  private faceOffParallaxX = 0;
  private faceOffParallaxY = 0;
  private graphicsQuality: GraphicsQuality = 'high';
  private activeParticleLimit = 56;
  private isSoftwareGl: boolean;
  private maxAnisotropy = 4;
  private envRT: THREE.WebGLRenderTarget;
  private ropeContactPool: RopeContact[] = [
    { x: 0, z: 0, minY: 0.2, maxY: 1.68, radius: 0.42, vx: 0, vz: 0 },
    { x: 0, z: 0, minY: 0.2, maxY: 1.68, radius: 0.42, vx: 0, vz: 0 },
  ];
  private activeRopeContacts: RopeContact[] = [];

  private playerSim: FighterSim | null = null;
  private oppSim: FighterSim | null = null;
  private playerCoachSim: CoachSim | null = null;
  private oppCoachSim: CoachSim | null = null;
  private refereeSim: RefereeSim | null = null;

  private walkoutClock = 0;
  private readonly walkoutDuration = 6.2;
  private celebrationClock = 0;
  private readonly celebrationDuration = 4.8;

  private mode: 'attract' | 'waitingroom' | 'showcase' | 'faceoff' | 'creator' | 'fight' = 'attract';
  private faceOffLeftId: string | null = null;
  private faceOffRightId: string | null = null;
  private waitingIdleClock = 0;
  private waitingSpecialActive = false;
  private waitingSpecialTimer = 0;
  private waitingSpecialKind = 0;
  private readonly WAITING_SPECIAL_INTERVAL = 20;
  private readonly WAITING_SPECIAL_DURATION = 3.8;
  private waitingRotateClock = 0;
  private waitingRosterIndex = 0;
  private readonly WAITING_ROTATE_INTERVAL = 24;
  private onWaitingFighterChange?: (fighter: FighterProfile) => void;
  private waitingConfirmActive = false;
  private waitingConfirmTimer = 0;
  private readonly WAITING_CONFIRM_DURATION = 0.72;
  private waitingConfirmCallback: (() => void) | null = null;
  private paused = false;
  private phase: FightPhase = 'intro';
  private round = 1;
  private maxRounds = 3;
  private roundDuration = 75;
  private roundTimer = 75;
  private phaseTimer = 0;
  private refereeCountdown = 0;
  private lastCountdownAnnounced = 0;

  // Knockdown tracking
  private knockdownTarget: 'player' | 'opponent' | null = null;
  private knockdownCount = 0;
  private knockdownTickTimer = 0;
  private knockdownRecoveryCount = 8;
  private playerGetupBoost = 0;
  private knockdownLeadInTimer = 0;

  // Slow-motion Knockdown Highlight Replay
  private readonly MAX_REPLAY_FRAMES = 160;
  private replayBuffer: ReplayFrame[] = [];
  private replayOrdered: ReplayFrame[] = [];
  private replayWriteIdx = 0;
  private replayFilledCount = 0;
  private replayOrderedCount = 0;
  private fightSimClock = 0;
  private highlightPunch: AttackType | null = null;
  private highlightAttacker: 'player' | 'opponent' | null = null;
  private highlightIsCounter = false;
  private highlightImpactTime = 0;
  private highlightStartTime = 0;
  private highlightEndTime = 0;
  private highlightCursor = 0;
  private highlightImpactFxFired = false;
  private highlightOrbitSide = 1;
  private highlightAxisX = 1;
  private highlightAxisZ = 0;
  private savedPostFallPlayer: ReplayFighterPose = createEmptyReplayPose();
  private savedPostFallOpp: ReplayFighterPose = createEmptyReplayPose();

  // Juice & FX
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private crowdExcitement = 0;
  private calloutText: string | null = null;
  private calloutTone: 'gold' | 'red' | 'cyan' | 'white' = 'white';
  private calloutTimer = 0;

  // Camera state (UFC 5 dynamic broadcast / closeup / shoulder)
  private camPos = new THREE.Vector3(0, 2.3, 4.6);
  private camLook = new THREE.Vector3(0, 1.1, 0);
  private prevPerp = new THREE.Vector3(0, 0, 1);
  private showcaseAngle = 0.35;
  private cameraMode: CameraMode = 'broadcast';
  private announcerVoice = true;

  // Advanced Combat, Clinch, Corner Rest & Scorecard
  private bodyShotsMode: AttackTarget = 'head';
  private clinchTimer = 0;
  private clinchCooldown = 0;
  private roundScores: RoundScoreEntry[] = [];
  private cornerAdvice: string | null = null;
  private cornerFocusUsed = false;

  // Particle pool (InstancedMesh)
  private particles: Particle[] = [];
  private particleMesh: THREE.InstancedMesh;
  private readonly MAX_PARTICLES = 56;

  // Input state (continuous held vs edge actions)
  private analogX = 0;
  private analogY = 0;
  private keysHeld: Record<string, boolean> = {};
  private virtualGuardHeld = false;

  // Summary stats
  private summary: FightSummaryStats = {
    landed: 0,
    thrown: 0,
    counters: 0,
    blocks: 0,
    dodges: 0,
    oppLanded: 0,
    oppThrown: 0,
    bodyShotsLanded: 0,
    parries: 0,
  };
  private winner: 'player' | 'opponent' | null = null;
  private winMethod: 'KO' | 'TKO' | 'UD' | null = null;

  // Loop & callbacks
  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameId = 0;
  private hudEmitAccum = 0;
  private disposed = false;
  private onHudUpdate: (snapshot: CombatHudSnapshot) => void;
  private onContextLost?: () => void;

  // Listeners for cleanup
  private resizeHandler: () => void;
  private blurHandler: () => void;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(
    container: HTMLElement,
    initialShowcasePlayer: FighterProfile,
    initialShowcaseOpp: OpponentProfile,
    onHudUpdate: (snapshot: CombatHudSnapshot) => void,
    onContextLost?: () => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLost = onContextLost;

    // 1. Software WebGL probe
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // WebGL context loss listeners
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.onContextLost?.();
    });

    // 3. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090b12);
    this.scene.fog = new THREE.FogExp2(0x090b12, 0.025);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 80);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // 4. Mandatory RoomEnvironment IBL
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    // 5. Studio 3-Point Arena Lighting (<= 3 shadow casters)
    const hemi = new THREE.HemisphereLight(0x9ec5ff, 0x1e140d, 0.68);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.15);
    keyLight.position.set(3.5, 8.2, 4.2);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -5.2;
    keyLight.shadow.camera.right = 5.2;
    keyLight.shadow.camera.top = 5.2;
    keyLight.shadow.camera.bottom = -5.2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.keyLight = keyLight;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.05);
    rimLight.position.set(-4.8, 5.2, -4.6);
    this.scene.add(rimLight);

    const overheadSpot = new THREE.SpotLight(0xffe9c2, 18, 18, Math.PI / 4, 0.55, 1.5);
    overheadSpot.position.set(0, 6.4, 0);
    overheadSpot.target.position.set(0, 0.8, 0);
    this.overheadSpot = overheadSpot;
    this.scene.add(overheadSpot);
    this.scene.add(overheadSpot.target);

    this.faceOffRedLight = new THREE.PointLight(0xff4d4d, 6.5, 6.5, 1.6);
    this.faceOffRedLight.position.set(-2.05, 2.15, -0.25);
    this.faceOffRedLight.visible = false;
    this.scene.add(this.faceOffRedLight);

    this.faceOffBlueLight = new THREE.PointLight(0x38bdf8, 6.5, 6.5, 1.6);
    this.faceOffBlueLight.position.set(2.05, 2.15, -0.25);
    this.faceOffBlueLight.visible = false;
    this.scene.add(this.faceOffBlueLight);

    // 6. Arena, Boxer Waiting Room & Pooled Particles
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.maxAnisotropy = maxAniso;
    this.arena = createBoxingArena(maxAniso, this.isSoftwareGl);
    this.scene.add(this.arena.group);
    this.waitingRoom = createBoxerWaitingRoom(maxAniso, this.isSoftwareGl);
    this.waitingRoom.group.visible = false;
    this.scene.add(this.waitingRoom.group);
    this.tunnelArena = createTunnelArena(maxAniso, this.isSoftwareGl);
    this.tunnelArena.group.visible = false;
    this.scene.add(this.tunnelArena.group);

    const partGeo = new THREE.SphereGeometry(0.032, 6, 6);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(partGeo, partMat, this.MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        size: 1,
        colorHex: 0xffffff,
      });
      _dummy.position.set(0, -10, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _pColor.setHex(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
    this.particleMesh.computeBoundingSphere();
    this.scene.add(this.particleMesh);

    // Pre-allocate replay ring buffer (zero GC in render loop)
    for (let i = 0; i < this.MAX_REPLAY_FRAMES; i++) {
      const frame: ReplayFrame = {
        t: 0,
        player: createEmptyReplayPose(),
        opp: createEmptyReplayPose(),
      };
      this.replayBuffer.push(frame);
      this.replayOrdered.push(frame);
    }

    // 7. Initial Cinematic Attract Fight for Start Screen
    this.setupAttractFight(initialShowcasePlayer, initialShowcaseOpp);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 8. Window / Keyboard Listeners
    this.resizeHandler = () => {
      if (this.disposed) return;
      const cw = Math.max(1, this.container.clientWidth);
      const ch = Math.max(1, this.container.clientHeight);
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(cw, ch);
      this.setGraphicsQuality(this.graphicsQuality);
    };
    window.addEventListener('resize', this.resizeHandler);

    this.blurHandler = () => {
      this.keysHeld = {};
      this.virtualGuardHeld = false;
      this.analogX = 0;
      this.analogY = 0;
    };
    window.addEventListener('blur', this.blurHandler);

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      this.keysHeld[e.code] = true;
      if (this.mode !== 'fight' || this.paused) return;

      if (this.phase === 'walkout') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.skipWalkout();
        }
        return;
      }

      if (this.phase === 'celebration') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.skipCelebration();
        }
        return;
      }

      if (this.phase === 'highlight') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          this.skipHighlight();
        }
        return;
      }

      if (e.code === 'KeyJ') {
        this.triggerAttack('jab');
      } else if (e.code === 'KeyU') {
        this.triggerAttack('hook');
      } else if (e.code === 'KeyK' || e.code === 'KeyI') {
        this.triggerAttack('heavy');
      } else if (e.code === 'KeyL' || e.code === 'KeyO') {
        this.triggerAttack('uppercut');
      } else if (e.code === 'KeyB') {
        this.toggleBodyShotsMode();
      } else if (e.code === 'KeyR') {
        this.triggerClinch();
      } else if (e.code === 'KeyV') {
        this.cycleCameraMode();
      } else if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        this.triggerDodge();
      }
    };
    window.addEventListener('keydown', this.keyDownHandler);

    this.keyUpHandler = (e: KeyboardEvent) => {
      this.keysHeld[e.code] = false;
    };
    window.addEventListener('keyup', this.keyUpHandler);

    this.clock.start();
    this.tick();
  }

  private clearFighters() {
    if (this.playerSim) {
      this.scene.remove(this.playerSim.rig.root);
      disposeBoxerRig(this.playerSim.rig);
      this.playerSim = null;
    }
    if (this.oppSim) {
      this.scene.remove(this.oppSim.rig.root);
      disposeBoxerRig(this.oppSim.rig);
      this.oppSim = null;
    }
    if (this.playerCoachSim) {
      this.scene.remove(this.playerCoachSim.rig.root);
      disposeCoachRig(this.playerCoachSim.rig);
      this.playerCoachSim = null;
    }
    if (this.oppCoachSim) {
      this.scene.remove(this.oppCoachSim.rig.root);
      disposeCoachRig(this.oppCoachSim.rig);
      this.oppCoachSim = null;
    }
    if (this.refereeSim) {
      this.scene.remove(this.refereeSim.rig.root);
      disposeRefereeRig(this.refereeSim.rig);
      this.refereeSim = null;
    }
    this.faceOffLeftId = null;
    this.faceOffRightId = null;
  }

  private buildFighterSim(
    isPlayer: boolean,
    name: string,
    profile: FighterProfile,
    stats: BoxerStats,
    posX: number,
    posZ: number,
    facingAngle: number,
    hpFactor = 1,
    staminaFactor = 1,
    aiTendency?: AiTendency,
    hasBelt = false,
  ): FighterSim {
    const rig = createBoxerRig(
      profile.appearance,
      this.isSoftwareGl,
      this.maxAnisotropy,
      hasBelt,
    );
    rig.root.position.set(posX, 0, posZ);
    rig.root.rotation.y = facingAngle;
    this.scene.add(rig.root);

    const maxHp = Math.round((90 + stats.chin * 0.95) * hpFactor);
    const maxStamina = Math.round((85 + stats.stamina * 0.85) * staminaFactor);
    const maxGuard = Math.round(70 + stats.defense * 0.9);

    const motionProfile = resolveFighterMotionProfile(profile.id, profile.styleLabel);

    return {
      isPlayer,
      name,
      stats,
      stance: profile.stance,
      rig,
      anim: {
        stance: profile.stance,
        time: isPlayer ? 0 : 1.7,
        moveSpeed: 0,
        moveForward: 0,
        moveStrafe: 0,
        prevMoveForward: 0,
        prevMoveStrafe: 0,
        gaitPhase: isPlayer ? 0 : 1.4,
        gaitWeight: 0,
        smoothForward: 0,
        smoothStrafe: 0,
        isGuarding: false,
        dodgeTimer: 0,
        dodgeDuration: 0.42,
        dodgeDirX: 0,
        dodgeDirZ: 0,
        attackType: null,
        attackProgress: 0,
        hitStunTimer: 0,
        hitFlash: 0,
        knockdownProgress: 0,
        headSpringX: 0,
        headSpringZ: 0,
        headSpringVelX: 0,
        headSpringVelZ: 0,
        torsoSpringX: 0,
        torsoSpringY: 0,
        torsoSpringZ: 0,
        torsoSpringVelX: 0,
        torsoSpringVelY: 0,
        torsoSpringVelZ: 0,
        hairSpringX: 0,
        hairSpringZ: 0,
        hairVelX: 0,
        hairVelZ: 0,
        guardShock: 0,
        motionProfile,
        walkoutMode: false,
        walkoutProgress: 0,
        walkoutStairWeight: 0,
        walkoutRopeDuck: 0,
        celebrationMode: false,
        celebrationProgress: 0,
        loserCornerMode: false,
        ragdoll: createInitialRagdollState(),
      },
      pos: new THREE.Vector3(posX, 0, posZ),
      vel: new THREE.Vector3(),
      facingAngle,
      hp: maxHp,
      maxHp,
      stamina: maxStamina,
      maxStamina,
      guard: maxGuard,
      maxGuard,
      knockdowns: 0,
      roundDamage: 0,
      attackType: null,
      attackTarget: 'head',
      attackTimer: 0,
      attackDuration: 0.35,
      attackWindup: 0.11,
      attackActiveEnd: 0.21,
      attackHasHit: false,
      bufferedAttack: null,
      bufferedTarget: 'head',
      bufferTimer: 0,
      isGuarding: false,
      wasGuarding: false,
      guardJustRaisedTimer: 0,
      guardBreakTimer: 0,
      dodgeTimer: 0,
      dodgeDuration: 0.42,
      dodgeCooldown: 0,
      dodgeDirX: 0,
      dodgeDirZ: 0,
      invulnTimer: 0,
      hitStunTimer: 0,
      counterWindowTimer: 0,
      comboCount: 0,
      comboResetTimer: 0,
      sweatLevel: 0,
      bruiseLevel: 0,
      roundLanded: 0,
      roundKnockdownsTaken: 0,
      aiTendency,
      aiThinkTimer: 0.35,
      aiMoveX: 0,
      aiMoveZ: 0,
      aiComboQueue: [],
      aiGuardHoldTimer: 0,
    };
  }

  private buildCoachSim(
    fighterId: string,
    corner: 'red' | 'blue',
    styleLabel: string,
    posX: number,
    posY: number,
    posZ: number,
    facingAngle: number,
  ): CoachSim {
    const rig = createCoachRig(fighterId, corner, this.isSoftwareGl, this.maxAnisotropy);
    rig.root.position.set(posX, posY, posZ);
    rig.root.rotation.y = facingAngle;
    this.scene.add(rig.root);

    const motion = resolveFighterMotionProfile(fighterId, styleLabel);
    return {
      rig,
      anim: {
        time: corner === 'red' ? 0 : 1.2,
        mode: 'apron_support',
        moveSpeed: 0,
        gaitPhase: corner === 'red' ? 0.8 : 0.2,
        stairWeight: 0,
        ropeDuck: 0,
        boxerSideSign: -1,
        celebrationStyle: motion.celebrationStyle,
        celebrationProgress: 0,
        walkoutProgress: 0,
        cadenceScale: motion.cadenceScale,
        handBias: motion.handBias,
      },
      pos: new THREE.Vector3(posX, posY, posZ),
      facingAngle,
      corner,
      startPos: new THREE.Vector3(posX, posY, posZ),
    };
  }

  private buildRefereeSim(posX: number, posZ: number, facingAngle: number): RefereeSim {
    const rig = createRefereeRig(this.isSoftwareGl, this.maxAnisotropy);
    rig.root.position.set(posX, 0, posZ);
    rig.root.rotation.y = facingAngle;
    this.scene.add(rig.root);

    return {
      rig,
      anim: {
        time: 0,
        mode: 'stand_corner',
        velX: 0,
        velZ: 0,
        facingAngle,
        smoothForward: 0,
        smoothStrafe: 0,
        gaitPhase: 0,
        gaitWeight: 0,
        countdownValue: 0,
        countBeat: 0,
        knockdownCount: 0,
        headLookYaw: 0,
      },
      pos: new THREE.Vector3(posX, 0, posZ),
      vel: new THREE.Vector3(),
      facingAngle,
    };
  }

  private setEnvironmentRoom(stage: 'arena' | 'waitingroom' | 'tunnel') {
    this.arena.group.visible = stage === 'arena';
    this.waitingRoom.group.visible = stage === 'waitingroom';
    this.tunnelArena.group.visible = stage === 'tunnel';
    this.faceOffRedLight.visible = stage === 'tunnel';
    this.faceOffBlueLight.visible = stage === 'tunnel';
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = stage === 'tunnel' ? 0.042 : 0.025;
    }
    if (stage === 'waitingroom') {
      this.keyLight.position.set(2.2, 4.2, 3.4);
      this.overheadSpot.position.set(0.95, 4.0, 0.75);
      this.overheadSpot.target.position.set(0.92, 0.9, 0.45);
    } else if (stage === 'tunnel') {
      this.keyLight.position.set(0.8, 4.6, 3.8);
      this.overheadSpot.position.set(0, 4.1, 1.3);
      this.overheadSpot.target.position.set(0, 1.0, 0.85);
    } else {
      this.keyLight.position.set(3.5, 8.2, 4.2);
      this.overheadSpot.position.set(0, 6.4, 0);
      this.overheadSpot.target.position.set(0, 0.8, 0);
    }
  }

  public setupAttractFight(player: FighterProfile, opponent: OpponentProfile) {
    this.mode = 'attract';
    this.setEnvironmentRoom('arena');
    this.paused = false;
    this.camera.fov = 38;
    this.camera.updateProjectionMatrix();
    this.clearFighters();
    this.playerSim = this.buildFighterSim(
      true,
      player.name,
      player,
      player.baseStats,
      -0.95,
      0.05,
      Math.PI / 2,
      1,
      1,
      {
        aggression: 0.78,
        guardRate: 0.48,
        dodgeRate: 0.45,
        comboRate: 0.68,
        heavyBias: 0.42,
      },
    );
    this.oppSim = this.buildFighterSim(
      false,
      opponent.name,
      opponent,
      opponent.baseStats,
      0.95,
      -0.05,
      -Math.PI / 2,
      1,
      1,
      {
        aggression: 0.76,
        guardRate: 0.5,
        dodgeRate: 0.42,
        comboRate: 0.64,
        heavyBias: 0.42,
      },
    );
    this.camPos.set(2.2, 1.52, 2.65);
    this.camLook.set(0, 1.1, 0);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  public setOnWaitingFighterChange(cb?: (fighter: FighterProfile) => void) {
    this.onWaitingFighterChange = cb;
  }

  public triggerWaitingRoomConfirmPunch(onComplete: () => void) {
    if (this.mode !== 'waitingroom' || !this.playerSim) {
      onComplete();
      return;
    }
    if (this.waitingConfirmActive) return;

    this.waitingConfirmActive = true;
    this.waitingConfirmTimer = 0;
    this.waitingConfirmCallback = onComplete;
    this.waitingSpecialActive = false;
    this.waitingSpecialTimer = 0;
    this.playerSim.anim.waitingSpecialProgress = 0;
    this.playerSim.anim.waitingConfirmProgress = 0;
    soundEngine.playWhoosh('heavy');
  }

  public setupWaitingRoom(fighter: FighterProfile) {
    const entering = this.mode !== 'waitingroom';
    this.mode = 'waitingroom';
    this.setEnvironmentRoom('waitingroom');
    this.paused = false;
    this.camera.fov = 38;
    this.camera.updateProjectionMatrix();
    this.clearFighters();

    this.playerSim = this.buildFighterSim(
      true,
      fighter.name,
      fighter,
      fighter.baseStats,
      0.92,
      0.45,
      -0.26,
    );
    this.playerSim.anim.waitingRoomMode = true;
    this.playerSim.anim.waitingSpecialKind = this.waitingSpecialKind;
    this.playerSim.anim.waitingSpecialProgress = 0;
    this.playerSim.anim.waitingConfirmProgress = 0;

    const rosterIdx = PLAYABLE_FIGHTERS.findIndex((f) => f.id === fighter.id);
    if (rosterIdx >= 0) {
      this.waitingRosterIndex = rosterIdx;
    }

    if (entering) {
      this.waitingIdleClock = 0;
      this.waitingSpecialActive = false;
      this.waitingSpecialTimer = 0;
      this.waitingRotateClock = 0;
      this.waitingConfirmActive = false;
      this.waitingConfirmTimer = 0;
      this.waitingConfirmCallback = null;
      this.camPos.set(-0.26, 1.32, 3.68);
      this.camLook.set(0.06, 1.06, 0.25);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    }
  }

  public setupShowcase(player: FighterProfile, opponent: OpponentProfile) {
    this.mode = 'showcase';
    this.setEnvironmentRoom('arena');
    this.paused = false;
    this.camera.fov = 42;
    this.camera.updateProjectionMatrix();
    this.clearFighters();
    this.playerSim = this.buildFighterSim(
      true,
      player.name,
      player,
      player.baseStats,
      -0.95,
      0.1,
      Math.PI / 2,
    );
    this.oppSim = this.buildFighterSim(
      false,
      opponent.name,
      opponent,
      opponent.baseStats,
      0.95,
      -0.1,
      -Math.PI / 2,
    );
    this.prevPerp.set(0, 0, 1);
  }

  public setFaceOffParallax(nx: number, ny: number) {
    this.faceOffParallaxX = THREE.MathUtils.clamp(nx, -1, 1);
    this.faceOffParallaxY = THREE.MathUtils.clamp(ny, -1, 1);
  }

  public setupFaceOffShowcase(leftFighter: FighterProfile, rightFighter: FighterProfile) {
    const entering = this.mode !== 'faceoff';
    this.mode = 'faceoff';
    this.setEnvironmentRoom('tunnel');
    this.tunnelArena.updateFighters(leftFighter, rightFighter);

    this.paused = false;
    this.camera.fov = 36;
    this.camera.updateProjectionMatrix();

    if (entering) {
      this.clearFighters();
    } else if (this.refereeSim) {
      this.scene.remove(this.refereeSim.rig.root);
      disposeRefereeRig(this.refereeSim.rig);
      this.refereeSim = null;
    }

    const rebuildLeft = entering || !this.playerSim || this.faceOffLeftId !== leftFighter.id;
    const rebuildRight = entering || !this.oppSim || this.faceOffRightId !== rightFighter.id;

    if (rebuildLeft) {
      if (this.playerSim) {
        this.scene.remove(this.playerSim.rig.root);
        disposeBoxerRig(this.playerSim.rig);
        this.playerSim = null;
      }
      this.playerSim = this.buildFighterSim(
        true,
        leftFighter.name,
        leftFighter,
        leftFighter.baseStats,
        -0.88,
        0.46,
        0.22,
      );
      this.playerSim.anim.faceOffMode = true;
      this.playerSim.anim.faceOffSwitchProgress = 0;
      this.faceOffLeftId = leftFighter.id;
    }

    if (rebuildRight) {
      if (this.oppSim) {
        this.scene.remove(this.oppSim.rig.root);
        disposeBoxerRig(this.oppSim.rig);
        this.oppSim = null;
      }
      this.oppSim = this.buildFighterSim(
        false,
        rightFighter.name,
        rightFighter,
        rightFighter.baseStats,
        0.88,
        0.46,
        -0.22,
      );
      this.oppSim.anim.faceOffMode = true;
      this.oppSim.anim.faceOffSwitchProgress = 0;
      this.faceOffRightId = rightFighter.id;
    }

    if (entering) {
      this.faceOffParallaxX = 0;
      this.faceOffParallaxY = 0;
      this.camPos.set(0, 1.34, 3.92);
      this.camLook.set(0, 1.06, 0.2);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    }
  }

  public setupCreatorShowcase(appearance: BoxerAppearance, stance: 'Orthodox' | 'Southpaw') {
    const entering = this.mode !== 'creator';
    this.mode = 'creator';
    this.setEnvironmentRoom('arena');
    this.paused = false;
    this.camera.fov = 38;
    this.camera.updateProjectionMatrix();
    this.clearFighters();
    const previewProfile: FighterProfile = {
      id: 'creator_preview',
      name: 'Custom Boxer',
      nickname: '',
      origin: '',
      styleLabel: 'Prospect',
      stance,
      heightDisplay: '6\'1"',
      weightDisplay: '205 lbs',
      reachDisplay: '75"',
      bio: '',
      baseStats: { power: 55, speed: 55, defense: 55, footwork: 55, stamina: 55, chin: 55 },
      appearance,
    };
    this.playerSim = this.buildFighterSim(
      true,
      'Custom Boxer',
      previewProfile,
      previewProfile.baseStats,
      0.95,
      0.18,
      -0.34,
    );
    this.playerSim.anim.waitingRoomMode = true;
    if (entering) {
      const dist = 3.25;
      const halfW =
        dist * Math.tan(THREE.MathUtils.degToRad(38 * 0.5)) * (this.camera.aspect || 1.6);
      const lookX = 0.95 - halfW * 0.44;
      this.camPos.set(lookX - 0.12, 1.18, 0.18 + dist);
      this.camLook.set(lookX, 0.98, 0.18);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    }
  }

  public setGraphicsQuality(quality: GraphicsQuality) {
    this.graphicsQuality = quality;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.keyLight.castShadow = false;
      this.overheadSpot.visible = false;
      this.arena.crowdMesh.count = Math.min(this.arena.crowdCount, 68);
      this.activeParticleLimit = 22;
      this.renderer.toneMappingExposure = 1.08;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(dpr, 1.35));
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.keyLight.castShadow = !this.isSoftwareGl;
      this.overheadSpot.visible = true;
      this.arena.crowdMesh.count = Math.min(this.arena.crowdCount, 140);
      this.activeParticleLimit = 38;
      this.renderer.toneMappingExposure = 1.12;
    } else {
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(dpr, 2));
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.keyLight.castShadow = !this.isSoftwareGl;
      this.overheadSpot.visible = true;
      this.arena.crowdMesh.count = this.arena.crowdCount;
      this.activeParticleLimit = this.MAX_PARTICLES;
      this.renderer.toneMappingExposure = 1.15;
    }
    this.renderer.shadowMap.needsUpdate = true;
  }

  public startFight(config: FightConfig) {
    this.mode = 'fight';
    this.setEnvironmentRoom('arena');
    this.paused = false;
    this.camera.fov = 42;
    this.camera.updateProjectionMatrix();
    this.clearFighters();

    // Energy / sharpness modifiers from Career camp prep
    const energyPenalty =
      config.playerEnergy < 35 ? 0.85 : config.playerEnergy < 60 ? 0.94 : 1.0;
    const sharpnessBonus = 1 + (config.playerSharpness - 50) * 0.0012;

    this.playerSim = this.buildFighterSim(
      true,
      config.playerName,
      config.playerProfile,
      config.playerStats,
      -0.36,
      -12.5,
      0,
      1.0,
      energyPenalty * sharpnessBonus,
      undefined,
      Boolean(config.hasCareerBelt),
    );
    this.playerSim.pos.set(-0.36, -1.02, -12.5);
    this.playerSim.rig.root.position.copy(this.playerSim.pos);
    this.playerSim.anim.walkoutMode = true;
    this.playerSim.anim.walkoutProgress = 0;

    this.oppSim = this.buildFighterSim(
      false,
      config.opponent.name,
      config.opponent,
      config.opponent.baseStats,
      1.15,
      0,
      -Math.PI / 2,
      1.0,
      1.0,
      config.opponent.aiTendency,
      false,
    );

    this.playerCoachSim = this.buildCoachSim(
      config.playerProfile.id,
      'red',
      config.playerProfile.styleLabel,
      0.42,
      -1.02,
      -12.75,
      0,
    );
    this.playerCoachSim.anim.mode = 'walk_with_boxer';
    this.playerCoachSim.anim.boxerSideSign = -1;

    this.oppCoachSim = this.buildCoachSim(
      config.opponent.id,
      'blue',
      config.opponent.styleLabel,
      2.2,
      0,
      3.94,
      Math.PI - 0.45,
    );
    this.oppCoachSim.anim.mode = 'apron_support';

    this.refereeSim = this.buildRefereeSim(0, -2.15, 0);
    this.arena.setCornerStoolsVisible(false);

    this.announcerVoice = config.announcerVoice ?? true;
    this.bodyShotsMode = 'head';
    this.clinchTimer = 0;
    this.clinchCooldown = 0;
    this.roundScores = [];
    this.cornerAdvice = null;
    this.cornerFocusUsed = false;

    this.round = 1;
    this.maxRounds = config.rounds;
    this.roundDuration = config.roundSeconds;
    this.roundTimer = config.roundSeconds;
    this.phase = 'walkout';
    this.walkoutClock = 0;
    this.celebrationClock = 0;
    this.phaseTimer = 1.25;
    this.refereeCountdown = 0;
    this.lastCountdownAnnounced = 0;
    this.knockdownTarget = null;
    this.knockdownCount = 0;
    this.knockdownLeadInTimer = 0;
    this.replayWriteIdx = 0;
    this.replayFilledCount = 0;
    this.replayOrderedCount = 0;
    this.fightSimClock = 0;
    this.highlightPunch = null;
    this.highlightAttacker = null;
    this.highlightIsCounter = false;
    this.winner = null;
    this.winMethod = null;
    this.calloutText = `${config.playerName.toUpperCase()} WALKOUT`;
    this.calloutTone = 'gold';
    this.calloutTimer = 2.6;
    this.prevPerp.set(0, 0, 1);
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.crowdExcitement = 0.65;
    this.summary = {
      landed: 0,
      thrown: 0,
      counters: 0,
      blocks: 0,
      dodges: 0,
      oppLanded: 0,
      oppThrown: 0,
      bodyShotsLanded: 0,
      parries: 0,
    };

    // Anchor walkout tracking camera directly in front of the entrance tunnel
    this.camPos.set(0.35, 0.72, -8.8);
    this.camLook.set(0, 0.15, -12.4);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    soundEngine.setBattlePaused(false);
    soundEngine.playCrowdReaction('hype');
    soundEngine.announceText(
      `Main event. ${config.playerName} versus ${config.opponent.name}!`,
      this.announcerVoice,
    );
    this.emitHud();
  }

  public skipWalkout() {
    if (this.mode !== 'fight' || this.phase !== 'walkout' || !this.playerSim || !this.oppSim) return;

    this.playerSim.pos.set(-1.15, 0, 0);
    this.playerSim.facingAngle = Math.PI / 2;
    this.playerSim.rig.root.position.copy(this.playerSim.pos);
    this.playerSim.rig.root.rotation.y = this.playerSim.facingAngle;
    this.playerSim.anim.walkoutMode = false;
    this.playerSim.anim.walkoutProgress = 1;
    this.playerSim.anim.walkoutStairWeight = 0;
    this.playerSim.anim.walkoutRopeDuck = 0;
    this.playerSim.anim.moveSpeed = 0;

    if (this.playerCoachSim) {
      this.playerCoachSim.pos.set(-2.2, 0, -3.94);
      this.playerCoachSim.facingAngle = 0.55;
      this.playerCoachSim.rig.root.position.copy(this.playerCoachSim.pos);
      this.playerCoachSim.rig.root.rotation.y = this.playerCoachSim.facingAngle;
      this.playerCoachSim.anim.mode = 'apron_support';
      this.playerCoachSim.anim.moveSpeed = 0;
      this.playerCoachSim.anim.stairWeight = 0;
      this.playerCoachSim.anim.ropeDuck = 0;
    }

    this.prevPerp.set(0, 0, 1);
    this.camPos.set(-0.35, 2.15, 4.15);
    this.camLook.set(0, 1.12, 0);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.phase = 'intro';
    this.phaseTimer = 3.0;
    this.refereeCountdown = 3;
    this.lastCountdownAnnounced = 3;
    if (this.refereeSim) {
      this.refereeSim.anim.countdownValue = 3;
      this.refereeSim.anim.countBeat = 1.0;
    }
    this.setCallout(`ROUND ${this.round}`, 'gold', 1.15);
    soundEngine.playCountdownTick(3);
    soundEngine.playCrowdReaction('cheer');
    this.emitHud();
  }

  public skipCelebration() {
    if (this.mode !== 'fight' || this.phase !== 'celebration') return;
    this.phase = 'finished';
    this.emitHud();
  }

  public skipHighlight() {
    if (this.phase === 'highlight') {
      this.finishHighlightReplay();
    }
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    soundEngine.setBattlePaused(paused);
  }

  public setAnalogInput(x: number, y: number) {
    this.analogX = THREE.MathUtils.clamp(x, -1, 1);
    this.analogY = THREE.MathUtils.clamp(y, -1, 1);
  }

  public setGuarding(active: boolean) {
    this.virtualGuardHeld = active;
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }

  public cycleCameraMode(): CameraMode {
    const order: CameraMode[] = ['broadcast', 'closeup', 'shoulder'];
    const idx = order.indexOf(this.cameraMode);
    this.cameraMode = order[(idx + 1) % order.length];
    if (this.mode === 'fight') {
      const label =
        this.cameraMode === 'broadcast'
          ? 'CAM: BROADCAST'
          : this.cameraMode === 'closeup'
            ? 'CAM: CLOSE-UP'
            : 'CAM: OVER SHOULDER';
      this.setCallout(label, 'white', 0.8);
    }
    return this.cameraMode;
  }

  public setAnnouncerVoice(enabled: boolean) {
    this.announcerVoice = enabled;
  }

  public setBodyShotsMode(target: AttackTarget) {
    this.bodyShotsMode = target;
    this.emitHud();
  }

  public toggleBodyShotsMode() {
    this.bodyShotsMode = this.bodyShotsMode === 'head' ? 'body' : 'head';
    if (this.mode === 'fight' && this.phase === 'fighting') {
      this.setCallout(
        this.bodyShotsMode === 'body' ? 'TARGET: BODY' : 'TARGET: HEAD',
        this.bodyShotsMode === 'body' ? 'gold' : 'white',
        0.65,
      );
    }
    this.emitHud();
  }

  public triggerClinch() {
    if (
      this.mode !== 'fight' ||
      this.paused ||
      this.phase !== 'fighting' ||
      !this.playerSim ||
      !this.oppSim
    ) {
      return;
    }
    if (this.clinchTimer > 0 || this.clinchCooldown > 0 || this.knockdownLeadInTimer > 0) return;
    if (this.playerSim.pos.distanceTo(this.oppSim.pos) > 1.55) {
      this.setCallout('STEP CLOSER TO CLINCH', 'white', 0.65);
      return;
    }

    this.clinchTimer = 1.65;
    this.playerSim.attackType = null;
    this.playerSim.isGuarding = false;
    this.playerSim.dodgeTimer = 0;
    this.oppSim.attackType = null;
    this.oppSim.isGuarding = false;
    this.oppSim.dodgeTimer = 0;
    this.setCallout('CLINCH! HOLD ON', 'cyan', 1.2);
    this.emitHud();
  }

  public applyCornerFocus(focus: 'stamina' | 'guard' | 'damage') {
    if (
      this.mode !== 'fight' ||
      this.phase !== 'between_rounds' ||
      this.cornerFocusUsed ||
      !this.playerSim
    ) {
      return;
    }
    this.cornerFocusUsed = true;
    if (focus === 'stamina') {
      this.playerSim.stamina = this.playerSim.maxStamina;
      this.playerSim.hp = Math.min(
        this.playerSim.maxHp,
        this.playerSim.hp + this.playerSim.maxHp * 0.08,
      );
      this.setCallout('CORNER: FRESH LEGS', 'cyan', 1.2);
    } else if (focus === 'guard') {
      this.playerSim.guard = this.playerSim.maxGuard;
      this.playerSim.hp = Math.min(
        this.playerSim.maxHp,
        this.playerSim.hp + this.playerSim.maxHp * 0.1,
      );
      this.setCallout('CORNER: TIGHT GUARD', 'gold', 1.2);
    } else {
      this.playerSim.hp = Math.min(
        this.playerSim.maxHp,
        this.playerSim.hp + this.playerSim.maxHp * 0.18,
      );
      this.playerSim.bruiseLevel = Math.max(0, this.playerSim.bruiseLevel * 0.6);
      this.setCallout('CUTMAN: SWELLING DOWN', 'gold', 1.2);
    }
    soundEngine.playUiClick();
    this.emitHud();
  }

  public skipBetweenRounds() {
    if (this.mode !== 'fight' || this.phase !== 'between_rounds') return;
    this.phaseTimer = Math.min(this.phaseTimer, 0.01);
  }

  public triggerAttack(type: AttackType, targetOverride?: AttackTarget) {
    if (this.mode !== 'fight' || this.paused || !this.playerSim) return;
    if (this.phase === 'knockdown' && this.knockdownTarget === 'player') {
      this.playerGetupBoost += 0.25;
      return;
    }
    if (this.phase !== 'fighting' || this.clinchTimer > 0) return;

    const p = this.playerSim;
    if (p.hitStunTimer > 0 || p.guardBreakTimer > 0) return;

    const target = targetOverride ?? this.bodyShotsMode;

    if (p.attackType || p.dodgeTimer > 0.14) {
      // Buffer next combo punch
      p.bufferedAttack = type;
      p.bufferedTarget = target;
      p.bufferTimer = 0.22;
      return;
    }

    this.startAttack(p, type, target);
  }

  public triggerDodge() {
    if (this.mode !== 'fight' || this.paused || !this.playerSim || !this.oppSim) return;
    if (this.phase === 'knockdown' && this.knockdownTarget === 'player') {
      this.playerGetupBoost += 0.35;
      return;
    }
    if (this.phase !== 'fighting') return;

    const p = this.playerSim;
    if (p.dodgeTimer > 0 || p.dodgeCooldown > 0 || p.hitStunTimer > 0 || p.guardBreakTimer > 0) {
      return;
    }
    if (p.stamina < 8) return;

    // Cancel late attack recovery into dodge for crisp responsiveness
    if (p.attackType && p.attackTimer < p.attackActiveEnd) return;
    p.attackType = null;

    p.stamina = Math.max(0, p.stamina - 10);
    const footFactor = 1 + (p.stats.footwork - 50) * 0.004;
    p.dodgeDuration = 0.4;
    p.dodgeTimer = p.dodgeDuration;
    p.dodgeCooldown = 0.18;
    p.invulnTimer = 0.27 * footFactor;

    // Determine dodge direction relative to screen / analog
    const { ix, iy } = this.getMergedMoveInput();
    if (Math.hypot(ix, iy) > 0.2) {
      p.dodgeDirX = ix;
      p.dodgeDirZ = iy;
    } else {
      // Default lateral head slip / backstep
      p.dodgeDirX = -0.75;
      p.dodgeDirZ = Math.random() > 0.5 ? 0.7 : -0.7;
    }
    const len = Math.hypot(p.dodgeDirX, p.dodgeDirZ) || 1;
    p.dodgeDirX /= len;
    p.dodgeDirZ /= len;

    soundEngine.playWhoosh('dodge');
  }

  private getMergedMoveInput(): { ix: number; iy: number } {
    let kx = 0;
    let ky = 0;
    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) kx -= 1;
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) kx += 1;
    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) ky += 1;
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) ky -= 1;

    let ix = this.analogX + kx;
    let iy = this.analogY + ky;
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }
    return { ix, iy };
  }

  private startAttack(f: FighterSim, type: AttackType, target: AttackTarget = 'head') {
    const cost = type === 'jab' ? 7 : type === 'hook' ? 13 : type === 'heavy' ? 15 : 18;
    if (f.stamina < Math.min(5, cost * 0.5)) return;
    f.stamina = Math.max(0, f.stamina - cost);

    const speedMod = 1 - (f.stats.speed - 50) * 0.0038;
    const clampedMod = THREE.MathUtils.clamp(speedMod, 0.76, 1.18);

    f.attackType = type;
    f.attackTarget = target;
    f.anim.attackTarget = target;
    f.attackTimer = 0;
    f.attackHasHit = false;
    f.isGuarding = false;

    if (type === 'jab') {
      f.attackWindup = 0.095 * clampedMod;
      f.attackActiveEnd = 0.195 * clampedMod;
      f.attackDuration = 0.31 * clampedMod;
      if (this.mode === 'fight') soundEngine.playWhoosh('light');
    } else if (type === 'hook') {
      f.attackWindup = 0.145 * clampedMod;
      f.attackActiveEnd = 0.275 * clampedMod;
      f.attackDuration = 0.45 * clampedMod;
      if (this.mode === 'fight') soundEngine.playWhoosh('heavy');
    } else if (type === 'heavy') {
      f.attackWindup = 0.21 * clampedMod;
      f.attackActiveEnd = 0.33 * clampedMod;
      f.attackDuration = 0.54 * clampedMod;
      if (this.mode === 'fight') soundEngine.playWhoosh('heavy');
    } else {
      f.attackWindup = 0.22 * clampedMod;
      f.attackActiveEnd = 0.35 * clampedMod;
      f.attackDuration = 0.57 * clampedMod;
      if (this.mode === 'fight') soundEngine.playWhoosh('heavy');
    }

    if (this.mode === 'fight') {
      if (f.isPlayer) this.summary.thrown += 1;
      else this.summary.oppThrown += 1;
    }
  }

  private spawnImpactParticles(pos: THREE.Vector3, count: number, colorHex: number, speedScale = 1) {
    let spawned = 0;
    const maxAllowed = Math.min(count, this.activeParticleLimit);
    for (let i = 0; i < this.activeParticleLimit && spawned < maxAllowed; i++) {
      const pt = this.particles[i];
      if (!pt.active) {
        pt.active = true;
        pt.x = pos.x + (Math.random() - 0.5) * 0.12;
        pt.y = pos.y + (Math.random() - 0.5) * 0.12;
        pt.z = pos.z + (Math.random() - 0.5) * 0.12;
        const theta = Math.random() * Math.PI * 2;
        const up = 0.6 + Math.random() * 2.1;
        const spd = (1.6 + Math.random() * 2.4) * speedScale;
        pt.vx = Math.cos(theta) * spd;
        pt.vy = up * speedScale;
        pt.vz = Math.sin(theta) * spd;
        pt.maxLife = 0.28 + Math.random() * 0.24;
        pt.life = pt.maxLife;
        pt.size = 0.75 + Math.random() * 0.7;
        pt.colorHex = colorHex;
        spawned++;
      }
    }
  }

  private setCallout(text: string, tone: 'gold' | 'red' | 'cyan' | 'white', duration = 0.95) {
    this.calloutText = text;
    this.calloutTone = tone;
    this.calloutTimer = duration;
  }

  private resolveHit(
    attacker: FighterSim,
    defender: FighterSim,
    type: AttackType,
    target: AttackTarget = 'head',
  ) {
    const dist = attacker.pos.distanceTo(defender.pos);
    const maxRange =
      type === 'jab' ? 1.5 : type === 'hook' ? 1.48 : type === 'heavy' ? 1.58 : 1.44;
    if (dist > maxRange) return;

    // Check facing alignment (hooks catch lateral movement slightly wider)
    _v1.subVectors(defender.pos, attacker.pos).setY(0).normalize();
    const atkForwardX = Math.sin(attacker.facingAngle);
    const atkForwardZ = Math.cos(attacker.facingAngle);
    const dot = _v1.x * atkForwardX + _v1.z * atkForwardZ;
    if (dot < (type === 'hook' ? 0.24 : 0.35)) return;

    // Check Dodge Evasion!
    if (defender.invulnTimer > 0) {
      defender.counterWindowTimer = 0.8;
      if (defender.isPlayer) {
        this.summary.dodges += 1;
        this.setCallout('SLIP! COUNTER READY', 'cyan', 0.85);
      } else {
        this.setCallout('EVADED!', 'white', 0.65);
      }
      return;
    }

    // Timed Guard Parry (raising guard right as punch arrives)!
    if (defender.isGuarding && defender.guardJustRaisedTimer > 0 && defender.guard > 0) {
      defender.guardJustRaisedTimer = 0;
      defender.guard = Math.max(0, defender.guard - 3);
      defender.counterWindowTimer = 0.9;
      attacker.hitStunTimer = 0.26;
      defender.anim.guardShock = 0.65;
      triggerHitPhysicsImpulse(attacker.anim, 0.42, -0.35, false);
      if (this.mode === 'fight') {
        soundEngine.playParry();
        this.arena.triggerCameraFlash(2);
      }
      this.hitstopTimer = 0.06;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.045);
      this.spawnImpactParticles(defender.rig.headWorldPos, 11, 0x38bdf8, 1.05);
      if (this.mode === 'fight') {
        if (defender.isPlayer) {
          this.summary.parries += 1;
          this.setCallout('PARRY! COUNTER OPEN', 'cyan', 0.95);
        } else {
          this.setCallout('PARRIED!', 'white', 0.75);
        }
      }
      return;
    }

    const isCounter = attacker.counterWindowTimer > 0;
    if (isCounter) {
      attacker.counterWindowTimer = 0;
    }

    const powerScale = 0.8 + attacker.stats.power * 0.0085;
    let baseDmg =
      type === 'jab' ? 6.5 : type === 'hook' ? 13.5 : type === 'heavy' ? 15.5 : 19.5;
    baseDmg *= powerScale;
    if (isCounter) baseDmg *= 1.45;
    if (target === 'body') baseDmg *= 0.88;

    // Check Guard Mitigation!
    if (defender.isGuarding && defender.guard > 0) {
      const defMitigation = THREE.MathUtils.clamp(0.72 + defender.stats.defense * 0.0016, 0.72, 0.88);
      // Body shots sneak beneath high head guard; uppercuts pierce guard upward
      const guardPierce =
        target === 'body'
          ? 0.64
          : type === 'uppercut'
            ? 0.62
            : type === 'hook'
              ? 0.86
              : 1.0;
      const effectiveMitigation = defMitigation * guardPierce;

      const chipDmg = baseDmg * (1 - effectiveMitigation);
      const guardDmg =
        (type === 'jab' ? 9 : type === 'hook' ? 21 : type === 'heavy' ? 24 : 30) * powerScale;

      defender.hp = Math.max(0, defender.hp - chipDmg);
      defender.guard = Math.max(0, defender.guard - guardDmg);
      if (target === 'body') {
        defender.stamina = Math.max(0, defender.stamina - 4.5);
      }
      attacker.roundDamage += chipDmg;

      if (this.mode === 'fight') {
        if (target === 'body') soundEngine.playBodyThud(false);
        else soundEngine.playBlock();
      }
      defender.anim.guardShock = 1.0;
      triggerHitPhysicsImpulse(defender.anim, 0.32, type === 'hook' ? -0.55 : 0, false);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.035);
      _v2.copy(defender.rig.headWorldPos);
      if (target === 'body') _v2.y -= 0.38;
      this.spawnImpactParticles(_v2, 7, 0x7dd3fc, 0.75);

      if (this.mode === 'fight' && defender.isPlayer) this.summary.blocks += 1;

      // Slight pushback
      defender.pos.addScaledVector(_v1, 0.14);

      if (defender.guard <= 0) {
        defender.isGuarding = false;
        defender.guardBreakTimer = 0.85;
        defender.hitStunTimer = 0.55;
        triggerHitPhysicsImpulse(defender.anim, 1.15, 0.4, false);
        this.hitstopTimer = 0.055;
        this.crowdExcitement = Math.min(1, this.crowdExcitement + 0.35);
        if (this.mode === 'fight') {
          this.setCallout('GUARD BROKEN!', 'gold', 1.05);
          soundEngine.playCrowdReaction('ooh');
        }
      }
      return;
    }

    // Clean Hit!
    defender.hp =
      this.mode === 'attract'
        ? Math.max(defender.maxHp * 0.4, defender.hp - baseDmg)
        : Math.max(0, defender.hp - baseDmg);
    attacker.roundDamage += baseDmg;
    attacker.roundLanded += 1;
    attacker.comboCount += 1;
    attacker.comboResetTimer = 1.65;

    if (target === 'body') {
      const bodyStamDrain =
        (type === 'jab' ? 11 : type === 'hook' ? 20 : type === 'heavy' ? 22 : 24) * powerScale;
      defender.stamina = Math.max(0, defender.stamina - bodyStamDrain);
    } else {
      defender.bruiseLevel = Math.min(1, defender.bruiseLevel + baseDmg * 0.011);
    }

    if (this.mode === 'fight') {
      if (attacker.isPlayer) {
        this.summary.landed += 1;
        if (target === 'body') this.summary.bodyShotsLanded += 1;
        if (isCounter) this.summary.counters += 1;
      } else {
        this.summary.oppLanded += 1;
      }
    }

    // Cancel defender's attack windup on clean hit!
    if (defender.attackType && defender.attackTimer < defender.attackWindup) {
      defender.attackType = null;
    }

    defender.hitStunTimer =
      type === 'jab' ? 0.16 : type === 'hook' ? 0.27 : type === 'heavy' ? 0.3 : 0.36;
    defender.anim.hitFlash = 1.0;
    defender.pos.addScaledVector(_v1, type === 'jab' ? 0.12 : 0.26);
    defender.vel.addScaledVector(_v1, type === 'jab' ? 1.4 : type === 'uppercut' ? 3.2 : 2.7);

    const sideSign = type === 'jab' ? -0.65 : type === 'hook' ? -1.45 : 1.0;
    const impulseStrength =
      (type === 'jab' ? 0.65 : type === 'hook' ? 1.28 : type === 'heavy' ? 1.25 : 1.45) *
      (isCounter ? 1.25 : 1.0) *
      (target === 'body' ? 0.72 : 1.0);
    triggerHitPhysicsImpulse(
      defender.anim,
      impulseStrength,
      sideSign * (defender.stance === 'Southpaw' ? -1 : 1),
      type === 'uppercut' && target === 'head',
    );

    if (this.mode === 'fight') {
      if (target === 'body') soundEngine.playBodyThud(type !== 'jab');
      else soundEngine.playHit(type, isCounter);
    }

    _v2.copy(defender.rig.headWorldPos);
    if (target === 'body') _v2.y -= 0.42;

    // Sweat droplet mist splash on clean impacts!
    this.spawnImpactParticles(_v2, type === 'jab' ? 4 : 8, 0xe2e8f0, 1.05);

    // Hitstop + Camera Shake + Crowd Excitement + Flashes + Sparks
    if (type === 'jab' && !isCounter) {
      this.hitstopTimer = 0.024;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.045);
      this.spawnImpactParticles(_v2, 7, 0xfef08a, 0.85);
      this.crowdExcitement = Math.min(1, this.crowdExcitement + 0.16);
      if (this.mode === 'fight' && attacker.comboCount >= 3) {
        soundEngine.playCrowdReaction('cheer');
      }
    } else if (type === 'hook' && !isCounter) {
      this.hitstopTimer = 0.048;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.095);
      this.spawnImpactParticles(_v2, 12, 0x34d399, 1.15);
      this.crowdExcitement = Math.min(1, this.crowdExcitement + 0.34);
      if (this.mode === 'fight') {
        this.arena.triggerCameraFlash(1);
        soundEngine.playCrowdReaction(attacker.comboCount >= 2 ? 'cheer' : 'ooh');
        if (attacker.isPlayer && attacker.comboCount >= 2) {
          this.setCallout(
            target === 'body'
              ? 'RIP TO THE BODY!'
              : attacker.comboCount >= 3
                ? `${attacker.comboCount} HIT COMBO!`
                : 'CHECK HOOK!',
            'gold',
            0.9,
          );
        }
      }
    } else if (type === 'heavy' || isCounter) {
      this.hitstopTimer = 0.055;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.11);
      this.spawnImpactParticles(_v2, 14, isCounter ? 0x38bdf8 : 0xfbbf24, 1.2);
      this.crowdExcitement = Math.min(1, this.crowdExcitement + 0.4);
      if (this.mode === 'fight') {
        this.arena.triggerCameraFlash(isCounter ? 3 : 2);
        soundEngine.playCrowdReaction(isCounter ? 'roar' : 'ooh');
        if (isCounter) {
          this.setCallout(
            attacker.isPlayer ? 'COUNTER STRIKE!' : 'COUNTERED!',
            attacker.isPlayer ? 'cyan' : 'red',
            0.95,
          );
        } else if (attacker.isPlayer && target === 'body') {
          this.setCallout('HEAVY BODY SHOT!', 'gold', 0.9);
        } else if (attacker.isPlayer && attacker.comboCount >= 3) {
          this.setCallout(`${attacker.comboCount} HIT COMBO!`, 'gold', 0.9);
        }
      }
    } else if (type === 'uppercut') {
      this.hitstopTimer = 0.072;
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.145);
      this.spawnImpactParticles(_v2, 16, 0xf97316, 1.35);
      this.crowdExcitement = Math.min(1, this.crowdExcitement + 0.48);
      if (this.mode === 'fight') {
        this.arena.triggerCameraFlash(3);
        soundEngine.playCrowdReaction('roar');
        if (attacker.isPlayer) {
          this.setCallout(
            target === 'body' ? 'LIVER SHOT!' : 'CRUSHING UPPERCUT!',
            'gold',
            0.95,
          );
        }
      }
    }

    // Check Knockdown!
    if (this.mode === 'fight' && defender.hp <= 0) {
      this.triggerKnockdown(attacker, defender, type, isCounter);
    }
  }

  private captureFighterPose(sim: FighterSim, out: ReplayFighterPose) {
    const r = sim.rig;
    out.posX = sim.pos.x;
    out.posZ = sim.pos.z;
    out.facingAngle = sim.facingAngle;
    out.pelvisX = r.pelvis.position.x;
    out.pelvisY = r.pelvis.position.y;
    out.pelvisZ = r.pelvis.position.z;
    out.pelvisRotX = r.pelvis.rotation.x;
    out.pelvisRotY = r.pelvis.rotation.y;
    out.pelvisRotZ = r.pelvis.rotation.z;
    out.torsoRotX = r.torso.rotation.x;
    out.torsoRotY = r.torso.rotation.y;
    out.torsoRotZ = r.torso.rotation.z;
    out.headRotX = r.head.rotation.x;
    out.headRotY = r.head.rotation.y;
    out.headRotZ = r.head.rotation.z;
    out.lShX = r.leftShoulder.rotation.x;
    out.lShY = r.leftShoulder.rotation.y;
    out.lShZ = r.leftShoulder.rotation.z;
    out.lElX = r.leftElbow.rotation.x;
    out.lElY = r.leftElbow.rotation.y;
    out.lElZ = r.leftElbow.rotation.z;
    out.lRoll = r.leftForearmRoll.rotation.y;
    out.rShX = r.rightShoulder.rotation.x;
    out.rShY = r.rightShoulder.rotation.y;
    out.rShZ = r.rightShoulder.rotation.z;
    out.rElX = r.rightElbow.rotation.x;
    out.rElY = r.rightElbow.rotation.y;
    out.rElZ = r.rightElbow.rotation.z;
    out.rRoll = r.rightForearmRoll.rotation.y;
    out.lHipX = r.leftHip.rotation.x;
    out.lHipZ = r.leftHip.rotation.z;
    out.lKneeX = r.leftKnee.rotation.x;
    out.lAnkX = r.leftAnkle.rotation.x;
    out.lAnkZ = r.leftAnkle.rotation.z;
    out.rHipX = r.rightHip.rotation.x;
    out.rHipZ = r.rightHip.rotation.z;
    out.rKneeX = r.rightKnee.rotation.x;
    out.rAnkX = r.rightAnkle.rotation.x;
    out.rAnkZ = r.rightAnkle.rotation.z;
    out.hairX = sim.anim.hairSpringX;
    out.hairZ = sim.anim.hairSpringZ;
    out.hitFlash = sim.anim.hitFlash;
    out.shadowScale = r.shadowMesh.scale.x;
  }

  private applyInterpolatedPose(
    sim: FighterSim,
    a: ReplayFighterPose,
    b: ReplayFighterPose,
    alpha: number,
  ) {
    const r = sim.rig;
    const x = THREE.MathUtils.lerp(a.posX, b.posX, alpha);
    const z = THREE.MathUtils.lerp(a.posZ, b.posZ, alpha);
    let diff = b.facingAngle - a.facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const yaw = a.facingAngle + diff * alpha;

    r.root.position.set(x, 0, z);
    r.root.rotation.y = yaw;

    r.pelvis.position.set(
      THREE.MathUtils.lerp(a.pelvisX, b.pelvisX, alpha),
      THREE.MathUtils.lerp(a.pelvisY, b.pelvisY, alpha),
      THREE.MathUtils.lerp(a.pelvisZ, b.pelvisZ, alpha),
    );
    r.pelvis.rotation.set(
      THREE.MathUtils.lerp(a.pelvisRotX, b.pelvisRotX, alpha),
      THREE.MathUtils.lerp(a.pelvisRotY, b.pelvisRotY, alpha),
      THREE.MathUtils.lerp(a.pelvisRotZ, b.pelvisRotZ, alpha),
    );
    r.torso.rotation.set(
      THREE.MathUtils.lerp(a.torsoRotX, b.torsoRotX, alpha),
      THREE.MathUtils.lerp(a.torsoRotY, b.torsoRotY, alpha),
      THREE.MathUtils.lerp(a.torsoRotZ, b.torsoRotZ, alpha),
    );
    r.head.rotation.set(
      THREE.MathUtils.lerp(a.headRotX, b.headRotX, alpha),
      THREE.MathUtils.lerp(a.headRotY, b.headRotY, alpha),
      THREE.MathUtils.lerp(a.headRotZ, b.headRotZ, alpha),
    );
    r.leftShoulder.rotation.set(
      THREE.MathUtils.lerp(a.lShX, b.lShX, alpha),
      THREE.MathUtils.lerp(a.lShY, b.lShY, alpha),
      THREE.MathUtils.lerp(a.lShZ, b.lShZ, alpha),
    );
    r.leftElbow.rotation.set(
      THREE.MathUtils.lerp(a.lElX, b.lElX, alpha),
      THREE.MathUtils.lerp(a.lElY, b.lElY, alpha),
      THREE.MathUtils.lerp(a.lElZ, b.lElZ, alpha),
    );
    r.leftForearmRoll.rotation.y = THREE.MathUtils.lerp(a.lRoll, b.lRoll, alpha);

    r.rightShoulder.rotation.set(
      THREE.MathUtils.lerp(a.rShX, b.rShX, alpha),
      THREE.MathUtils.lerp(a.rShY, b.rShY, alpha),
      THREE.MathUtils.lerp(a.rShZ, b.rShZ, alpha),
    );
    r.rightElbow.rotation.set(
      THREE.MathUtils.lerp(a.rElX, b.rElX, alpha),
      THREE.MathUtils.lerp(a.rElY, b.rElY, alpha),
      THREE.MathUtils.lerp(a.rElZ, b.rElZ, alpha),
    );
    r.rightForearmRoll.rotation.y = THREE.MathUtils.lerp(a.rRoll, b.rRoll, alpha);

    const hx = THREE.MathUtils.lerp(a.hairX, b.hairX, alpha);
    const hz = THREE.MathUtils.lerp(a.hairZ, b.hairZ, alpha);
    r.hairPivot.rotation.x = hx * 0.35;
    r.hairPivot.rotation.z = hz * 0.35;
    for (let i = 0; i < r.hairStrands.length; i++) {
      const s = r.hairStrands[i];
      s.pivot.rotation.x = s.baseRotX + hx * s.flexScale;
      s.pivot.rotation.z = s.baseRotZ + hz * s.flexScale;
    }

    r.leftHip.rotation.set(
      THREE.MathUtils.lerp(a.lHipX, b.lHipX, alpha),
      0,
      THREE.MathUtils.lerp(a.lHipZ, b.lHipZ, alpha),
    );
    r.leftKnee.rotation.set(THREE.MathUtils.lerp(a.lKneeX, b.lKneeX, alpha), 0, 0);
    r.leftAnkle.rotation.set(
      THREE.MathUtils.lerp(a.lAnkX, b.lAnkX, alpha),
      0,
      THREE.MathUtils.lerp(a.lAnkZ, b.lAnkZ, alpha),
    );
    r.rightHip.rotation.set(
      THREE.MathUtils.lerp(a.rHipX, b.rHipX, alpha),
      0,
      THREE.MathUtils.lerp(a.rHipZ, b.rHipZ, alpha),
    );
    r.rightKnee.rotation.set(THREE.MathUtils.lerp(a.rKneeX, b.rKneeX, alpha), 0, 0);
    r.rightAnkle.rotation.set(
      THREE.MathUtils.lerp(a.rAnkX, b.rAnkX, alpha),
      0,
      THREE.MathUtils.lerp(a.rAnkZ, b.rAnkZ, alpha),
    );

    const flash = THREE.MathUtils.lerp(a.hitFlash, b.hitFlash, alpha);
    r.skinMat.emissive.setRGB(flash * 0.55, flash * 0.08, flash * 0.06);
    r.torsoMat.emissive.setRGB(flash * 0.55, flash * 0.08, flash * 0.06);
    r.headMat.emissive.setRGB(flash * 0.55, flash * 0.08, flash * 0.06);

    r.shadowMesh.scale.setScalar(THREE.MathUtils.lerp(a.shadowScale, b.shadowScale, alpha));
    r.root.updateMatrixWorld(true);
    r.head.getWorldPosition(r.headWorldPos);
    r.headWorldPos.y += 0.08;
  }

  private recordReplayFrame() {
    if (!this.playerSim || !this.oppSim) return;
    const slot = this.replayBuffer[this.replayWriteIdx];
    slot.t = this.fightSimClock;
    this.captureFighterPose(this.playerSim, slot.player);
    this.captureFighterPose(this.oppSim, slot.opp);
    this.replayWriteIdx = (this.replayWriteIdx + 1) % this.MAX_REPLAY_FRAMES;
    if (this.replayFilledCount < this.MAX_REPLAY_FRAMES) {
      this.replayFilledCount += 1;
    }
  }

  private triggerKnockdown(
    attacker: FighterSim,
    defender: FighterSim,
    punchType: AttackType,
    isCounter: boolean,
  ) {
    defender.knockdowns += 1;
    defender.roundKnockdownsTaken += 1;
    defender.attackType = null;
    defender.isGuarding = false;
    defender.dodgeTimer = 0;
    this.arena.triggerCameraFlash(4);
    triggerKnockdownRagdoll(
      defender.anim,
      (Math.random() - 0.5) * 0.45,
      -0.85,
      1.0 + Math.min(0.4, defender.knockdowns * 0.12),
    );

    this.knockdownTarget = defender.isPlayer ? 'player' : 'opponent';
    this.knockdownCount = 0;
    this.knockdownTickTimer = 0.65;
    this.playerGetupBoost = 0;

    // 3rd knockdown in a bout = automatic TKO!
    const chinFactor = defender.stats.chin / 100;
    if (defender.knockdowns >= 3) {
      this.knockdownRecoveryCount = 99; // Will KO at 10
    } else if (defender.knockdowns === 2) {
      this.knockdownRecoveryCount = Math.random() < 0.45 + chinFactor * 0.38 ? 8 : 99;
    } else {
      this.knockdownRecoveryCount = Math.random() < 0.72 + chinFactor * 0.25 ? 6 : 8;
    }

    // Store highlight metadata & let initial ragdoll fall record for 0.55s before cutting to slow-mo replay
    this.highlightPunch = punchType;
    this.highlightAttacker = attacker.isPlayer ? 'player' : 'opponent';
    this.highlightIsCounter = isCounter;
    this.highlightImpactTime = this.fightSimClock;
    this.knockdownLeadInTimer = 0.55;

    _v1.subVectors(defender.pos, attacker.pos).setY(0);
    if (_v1.lengthSq() > 0.0001) {
      _v1.normalize();
      this.highlightAxisX = _v1.x;
      this.highlightAxisZ = _v1.z;
    } else {
      this.highlightAxisX = Math.sin(attacker.facingAngle);
      this.highlightAxisZ = Math.cos(attacker.facingAngle);
    }

    // Record the exact impact frame immediately
    this.recordReplayFrame();

    this.hitstopTimer = 0.085;
    this.shakeIntensity = 0.22;
    this.crowdExcitement = 1.0;
    soundEngine.playKnockdown();
    this.setCallout('DOWN GOES THE FIGHTER!', 'red', 1.4);
  }

  private beginHighlightReplay() {
    if (!this.playerSim || !this.oppSim || this.replayFilledCount < 2) {
      if (this.playerSim) {
        this.playerSim.attackType = null;
        this.playerSim.anim.attackType = null;
      }
      if (this.oppSim) {
        this.oppSim.attackType = null;
        this.oppSim.anim.attackType = null;
      }
      this.phase = 'knockdown';
      return;
    }

    // Save exact post-fall pose so we can resume seamlessly into the 10-count after highlight
    this.captureFighterPose(this.playerSim, this.savedPostFallPlayer);
    this.captureFighterPose(this.oppSim, this.savedPostFallOpp);

    // Populate chronological frame view (zero allocations)
    const startRingIdx =
      this.replayFilledCount < this.MAX_REPLAY_FRAMES ? 0 : this.replayWriteIdx;
    this.replayOrderedCount = this.replayFilledCount;
    for (let i = 0; i < this.replayOrderedCount; i++) {
      const idx = (startRingIdx + i) % this.MAX_REPLAY_FRAMES;
      this.replayOrdered[i] = this.replayBuffer[idx];
    }

    const earliestT = this.replayOrdered[0].t;
    const latestT = this.replayOrdered[this.replayOrderedCount - 1].t;
    this.highlightStartTime = Math.max(earliestT, this.highlightImpactTime - 0.62);
    this.highlightEndTime = latestT;
    this.highlightCursor = this.highlightStartTime;
    this.highlightImpactFxFired = false;

    // Choose dramatic side facing the broadcast hemisphere so punch & face are visible
    _perp.set(-this.highlightAxisZ, 0, this.highlightAxisX);
    this.highlightOrbitSide = _perp.dot(this.prevPerp) >= 0 ? 1 : -1;

    this.phase = 'highlight';
    this.calloutText = null;
    this.calloutTimer = 0;

    // Tight cinema telephoto lens + immediate cut to low-angle highlight start
    this.camera.fov = 33;
    this.camera.updateProjectionMatrix();
    this.sampleAndApplyHighlightCamera(0, true);
    this.emitHud();
  }

  private finishHighlightReplay() {
    if (this.phase !== 'highlight' || !this.playerSim || !this.oppSim) return;

    this.applyInterpolatedPose(
      this.playerSim,
      this.savedPostFallPlayer,
      this.savedPostFallPlayer,
      1,
    );
    this.applyInterpolatedPose(
      this.oppSim,
      this.savedPostFallOpp,
      this.savedPostFallOpp,
      1,
    );

    this.camera.fov = 42;
    this.camera.updateProjectionMatrix();

    // Re-anchor broadcast camera smoothly outside the fighters
    _mid.addVectors(this.playerSim.pos, this.oppSim.pos).multiplyScalar(0.5);
    this.camPos
      .copy(_mid)
      .addScaledVector(this.prevPerp, 4.1);
    this.camPos.y = 2.22;
    this.camLook.set(_mid.x, 1.0, _mid.z);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.phase = 'knockdown';
    this.playerSim.attackType = null;
    this.playerSim.anim.attackType = null;
    this.oppSim.attackType = null;
    this.oppSim.anim.attackType = null;
    this.knockdownCount = 0;
    this.knockdownTickTimer = 0.55;
    this.playerGetupBoost = 0;
    this.highlightPunch = null;
    this.highlightAttacker = null;
    this.emitHud();
  }

  private sampleAndApplyHighlightCamera(progress: number, snap = false) {
    if (!this.playerSim || !this.oppSim) return;
    const defender = this.knockdownTarget === 'player' ? this.playerSim : this.oppSim;
    const attacker = this.knockdownTarget === 'player' ? this.oppSim : this.playerSim;

    // Focus slightly toward the knocked-down fighter's head/chest impact zone
    _lookGoal.set(
      THREE.MathUtils.lerp(attacker.rig.root.position.x, defender.rig.root.position.x, 0.65),
      THREE.MathUtils.lerp(1.26, 0.72, Math.max(0, (progress - 0.55) / 0.45)),
      THREE.MathUtils.lerp(attacker.rig.root.position.z, defender.rig.root.position.z, 0.65),
    );

    // Sweep azimuth from front-side of impact (-0.38 rad) across to dramatic follow-through (+0.58 rad)
    const baseAngle = Math.atan2(
      -this.highlightAxisZ * this.highlightOrbitSide,
      this.highlightAxisX * this.highlightOrbitSide,
    );
    const sweepAngle = baseAngle + THREE.MathUtils.lerp(-0.38, 0.62, progress) * this.highlightOrbitSide;
    const dist = THREE.MathUtils.lerp(1.95, 2.55, progress);
    const camY = THREE.MathUtils.lerp(1.02, 1.56, progress);

    _camGoal.set(
      _lookGoal.x + Math.cos(sweepAngle) * dist,
      Math.max(0.5, camY),
      _lookGoal.z + Math.sin(sweepAngle) * dist,
    );

    if (snap) {
      this.camPos.copy(_camGoal);
      this.camLook.copy(_lookGoal);
    } else {
      this.camPos.lerp(_camGoal, 0.25);
      this.camLook.lerp(_lookGoal, 0.3);
    }

    this.camera.position.copy(this.camPos);
    if (this.shakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.7;
    }
    this.camera.lookAt(this.camLook);
  }

  private updateFighterCombat(f: FighterSim, other: FighterSim, dt: number) {
    f.anim.time += dt;
    f.anim.hitFlash = Math.max(0, f.anim.hitFlash - dt * 6.5);
    f.hitStunTimer = Math.max(0, f.hitStunTimer - dt);
    f.guardBreakTimer = Math.max(0, f.guardBreakTimer - dt);
    f.dodgeCooldown = Math.max(0, f.dodgeCooldown - dt);
    f.invulnTimer = Math.max(0, f.invulnTimer - dt);
    f.counterWindowTimer = Math.max(0, f.counterWindowTimer - dt);

    f.guardJustRaisedTimer = Math.max(0, f.guardJustRaisedTimer - dt);
    f.sweatLevel = Math.min(
      1,
      f.sweatLevel + dt * (f.attackType ? 0.022 : 0.008),
    );
    f.anim.sweatLevel = f.sweatLevel;
    f.anim.bruiseLevel = f.bruiseLevel;
    f.anim.clinchMode = false;
    f.anim.cornerRestMode = false;

    if (f.comboResetTimer > 0) {
      f.comboResetTimer -= dt;
      if (f.comboResetTimer <= 0) f.comboCount = 0;
    }

    // Stamina & Guard regeneration
    const stamRegenBase = 11 + f.stats.stamina * 0.14;
    if (!f.attackType && f.dodgeTimer <= 0) {
      const guardMult = f.isGuarding ? 0.38 : 1.0;
      f.stamina = Math.min(f.maxStamina, f.stamina + stamRegenBase * guardMult * dt);
    }
    if (!f.isGuarding && f.guardBreakTimer <= 0) {
      f.guard = Math.min(f.maxGuard, f.guard + (14 + f.stats.defense * 0.14) * dt);
    }

    // Face opponent smoothly
    _v1.subVectors(other.pos, f.pos);
    const targetYaw = Math.atan2(_v1.x, _v1.z);
    let diff = targetYaw - f.facingAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    f.facingAngle += diff * Math.min(1, dt * 12);

    // Handle active Dodge
    if (f.dodgeTimer > 0) {
      f.dodgeTimer = Math.max(0, f.dodgeTimer - dt);
      const dodgeSpeed = 4.6 + f.stats.footwork * 0.025;
      this.applyScreenRelativeMove(f, f.dodgeDirX, f.dodgeDirZ, dodgeSpeed, dt, 24);
    } else if (f.attackType) {
      // Handle active Attack
      f.attackTimer += dt;
      const p = f.attackTimer / f.attackDuration;
      f.vel.x = THREE.MathUtils.damp(f.vel.x, 0, 14, dt);
      f.vel.z = THREE.MathUtils.damp(f.vel.z, 0, 14, dt);

      // Subtle forward step into punch during windup/strike
      if (f.attackTimer < f.attackActiveEnd) {
        const lunge = f.attackType === 'jab' ? 1.15 : 1.55;
        f.pos.x += Math.sin(f.facingAngle) * lunge * dt;
        f.pos.z += Math.cos(f.facingAngle) * lunge * dt;
      }

      if (!f.attackHasHit && f.attackTimer >= f.attackWindup && f.attackTimer <= f.attackActiveEnd) {
        f.attackHasHit = true;
        this.resolveHit(f, other, f.attackType, f.attackTarget);
      }

      if (p >= 1) {
        f.attackType = null;
        f.attackTimer = 0;
        if (f.bufferedAttack && f.bufferTimer > 0) {
          const next = f.bufferedAttack;
          const nextTarget = f.bufferedTarget;
          f.bufferedAttack = null;
          this.startAttack(f, next, nextTarget);
        }
      }
    } else if (f.hitStunTimer <= 0 && f.guardBreakTimer <= 0) {
      // Normal Movement & Guard
      if (f.isPlayer && this.mode === 'fight') {
        const guardKey = this.keysHeld['KeyH'] || this.keysHeld['KeyC'];
        f.isGuarding = this.virtualGuardHeld || Boolean(guardKey);

        const { ix, iy } = this.getMergedMoveInput();
        const baseMoveSpeed = (2.35 + f.stats.footwork * 0.016) * (f.isGuarding ? 0.56 : 1.0);
        this.applyScreenRelativeMove(f, ix, iy, baseMoveSpeed, dt, 14);
      } else {
        this.updateAi(f, other, dt);
      }
    } else {
      f.isGuarding = false;
      f.vel.x = THREE.MathUtils.damp(f.vel.x, 0, 12, dt);
      f.vel.z = THREE.MathUtils.damp(f.vel.z, 0, 12, dt);
    }

    if (f.isGuarding && !f.wasGuarding) {
      f.guardJustRaisedTimer = 0.24;
    }
    f.wasGuarding = f.isGuarding;

    if (f.bufferTimer > 0) {
      f.bufferTimer = Math.max(0, f.bufferTimer - dt);
      if (f.bufferTimer === 0) f.bufferedAttack = null;
    }

    // Elastic rubber ring-rope spring resistance & canvas boundary clamp
    this.applyRingRopeElasticity(f, dt);

    // Sync anim state
    f.anim.isGuarding = f.isGuarding;
    f.anim.dodgeTimer = f.dodgeTimer;
    f.anim.dodgeDuration = f.dodgeDuration;
    f.anim.dodgeDirX = f.dodgeDirX;
    f.anim.dodgeDirZ = f.dodgeDirZ;
    f.anim.attackType = f.attackType;
    f.anim.attackTarget = f.attackTarget;
    f.anim.attackProgress = f.attackType ? f.attackTimer / f.attackDuration : 0;
    f.anim.hitStunTimer = f.hitStunTimer;
    f.anim.moveSpeed = f.vel.length();

    // Forward/strafe projection for lean & directional footwork animation
    const fx = Math.sin(f.facingAngle);
    const fz = Math.cos(f.facingAngle);
    f.anim.moveForward = THREE.MathUtils.clamp((f.vel.x * fx + f.vel.z * fz) / 2.4, -1, 1);
    f.anim.moveStrafe = THREE.MathUtils.clamp((f.vel.x * fz - f.vel.z * fx) / 2.4, -1, 1);

    f.rig.root.position.copy(f.pos);
    f.rig.root.rotation.y = f.facingAngle;
    updateBoxerPose(f.rig, f.anim, dt);
  }

  private applyRingRopeElasticity(f: FighterSim, dt: number) {
    // When fighter enters the rope contact zone (> ROPE_CONTACT_THRESHOLD), apply springy rebound
    const ropeK = 36;
    if (Math.abs(f.pos.x) > ROPE_CONTACT_THRESHOLD) {
      const sign = Math.sign(f.pos.x);
      const pen = Math.abs(f.pos.x) - ROPE_CONTACT_THRESHOLD;
      f.vel.x -= sign * pen * ropeK * dt;
      // Gentle rubber rebound when hitting ropes with outward momentum
      if (f.vel.x * sign > 0.35 && f.pos.x * sign > ROPE_CONTACT_THRESHOLD + 0.14) {
        f.vel.x *= -0.45;
      }
    }
    if (Math.abs(f.pos.z) > ROPE_CONTACT_THRESHOLD) {
      const sign = Math.sign(f.pos.z);
      const pen = Math.abs(f.pos.z) - ROPE_CONTACT_THRESHOLD;
      f.vel.z -= sign * pen * ropeK * dt;
      if (f.vel.z * sign > 0.35 && f.pos.z * sign > ROPE_CONTACT_THRESHOLD + 0.14) {
        f.vel.z *= -0.45;
      }
    }
    f.pos.x = THREE.MathUtils.clamp(f.pos.x, -PLAYABLE_HALF_BOUND, PLAYABLE_HALF_BOUND);
    f.pos.z = THREE.MathUtils.clamp(f.pos.z, -PLAYABLE_HALF_BOUND, PLAYABLE_HALF_BOUND);
  }

  private updateArenaRopes(dt: number) {
    if (!this.arena.group.visible) return;
    let count = 0;
    this.activeRopeContacts.length = 0;
    const fillContact = (sim: FighterSim | null) => {
      if (!sim || count >= this.ropeContactPool.length) return;
      const rx = sim.rig.root.position.x;
      const ry = sim.rig.root.position.y;
      const rz = sim.rig.root.position.z;
      // Only engage ring rope physics when actually near or inside the ring perimeter at canvas height
      if (Math.abs(rx) > 4.05 || Math.abs(rz) > 4.05 || ry < -0.25) return;

      const c = this.ropeContactPool[count++];
      const isDown = sim.anim.knockdownProgress > 0.25 || sim.anim.ragdoll.active;
      c.x = rx;
      c.z = rz;
      c.minY = isDown ? 0.16 : 0.28;
      c.maxY = isDown ? 0.96 : 1.68;
      c.radius = isDown ? 0.48 : 0.42;
      c.vx = sim.vel.x;
      c.vz = sim.vel.z;
      this.activeRopeContacts.push(c);
    };
    fillContact(this.playerSim);
    fillContact(this.oppSim);
    this.arena.updateRopes(dt, this.activeRopeContacts);
  }

  private applyScreenRelativeMove(
    f: FighterSim,
    screenX: number,
    screenY: number,
    speed: number,
    dt: number,
    accelRate = 14,
  ) {
    // Camera forward projected onto XZ plane
    _v2.subVectors(this.camLook, this.camPos).setY(0).normalize();
    // Screen right vector: forward x up
    _moveDir.set(-_v2.z, 0, _v2.x);

    const targetVx = (_moveDir.x * screenX + _v2.x * screenY) * speed;
    const targetVz = (_moveDir.z * screenX + _v2.z * screenY) * speed;
    f.vel.x = THREE.MathUtils.damp(f.vel.x, targetVx, accelRate, dt);
    f.vel.z = THREE.MathUtils.damp(f.vel.z, targetVz, accelRate, dt);
    f.pos.x += f.vel.x * dt;
    f.pos.z += f.vel.z * dt;
  }

  private updateAi(ai: FighterSim, player: FighterSim, dt: number) {
    const t = ai.aiTendency ?? {
      aggression: 0.6,
      guardRate: 0.45,
      dodgeRate: 0.25,
      comboRate: 0.45,
      heavyBias: 0.35,
    };

    const dist = ai.pos.distanceTo(player.pos);

    if (ai.aiGuardHoldTimer > 0) {
      ai.aiGuardHoldTimer -= dt;
      ai.isGuarding = ai.guard > 15;
    } else {
      ai.isGuarding = false;
    }

    // React if player winds up an attack in range
    if (player.attackType && player.attackTimer < player.attackWindup * 0.9 && dist < 1.8 && ai.aiThinkTimer < 0.14) {
      const roll = Math.random();
      if (roll < t.dodgeRate * 0.55 && ai.dodgeCooldown <= 0 && ai.stamina >= 14) {
        ai.dodgeDuration = 0.4;
        ai.dodgeTimer = ai.dodgeDuration;
        ai.dodgeCooldown = 0.65;
        ai.invulnTimer = 0.25;
        ai.dodgeDirX = Math.random() > 0.5 ? 0.8 : -0.8;
        ai.dodgeDirZ = -0.5;
        ai.stamina -= 10;
        if (this.mode === 'fight') soundEngine.playWhoosh('dodge');
        return;
      } else if (roll < t.dodgeRate * 0.55 + t.guardRate && ai.guard > 18) {
        ai.aiGuardHoldTimer = 0.38;
        ai.isGuarding = true;
      }
    }

    ai.aiThinkTimer -= dt;
    if (ai.aiThinkTimer <= 0) {
      ai.aiThinkTimer = 0.24 + Math.random() * 0.22;

      // Continue queued combo if in range
      if (ai.aiComboQueue.length > 0 && dist < 1.56 && ai.stamina > 12) {
        const nextAtk = ai.aiComboQueue.shift()!;
        const bodyChance = player.isGuarding ? 0.34 : 0.16;
        this.startAttack(ai, nextAtk, Math.random() < bodyChance ? 'body' : 'head');
        return;
      }

      // Movement decision with committed lateral circling (prevents jerky left-right jitter)
      const idealDist = ai.stamina < 24 ? 2.2 : 1.36;
      const keepSide = Math.abs(ai.aiMoveX) > 0.2 && Math.random() < 0.72;
      const circleSign = keepSide
        ? Math.sign(ai.aiMoveX)
        : Math.random() > 0.5
          ? 1
          : -1;

      if (dist > idealDist + 0.25) {
        ai.aiMoveZ = 1; // Advance toward player
        ai.aiMoveX = circleSign * 0.28;
      } else if (dist < idealDist - 0.25) {
        ai.aiMoveZ = -0.85; // Back up slightly
        ai.aiMoveX = circleSign * 0.6;
      } else {
        // Circle smoothly in pocket
        ai.aiMoveZ = ai.stamina < 28 ? -0.4 : 0.15;
        ai.aiMoveX = circleSign * 0.62;
      }

      // Attack decision when in range
      if (dist <= 1.54 && ai.stamina >= 18 && !ai.isGuarding) {
        if (Math.random() < t.aggression) {
          const r = Math.random();
          const first: AttackType =
            r < t.heavyBias * 0.48
              ? 'heavy'
              : r < t.heavyBias * 0.48 + 0.24
                ? 'hook'
                : r < t.heavyBias * 0.48 + 0.4
                  ? 'uppercut'
                  : 'jab';

          if (Math.random() < t.comboRate) {
            const rf = Math.random();
            const follow: AttackType =
              rf < t.heavyBias * 0.65
                ? 'heavy'
                : rf < 0.55
                  ? 'hook'
                  : rf < 0.8
                    ? 'uppercut'
                    : 'jab';
            ai.aiComboQueue.push(follow);
          }
          const bodyChance = player.isGuarding ? 0.32 : 0.16;
          this.startAttack(ai, first, Math.random() < bodyChance ? 'body' : 'head');
          return;
        } else if (Math.random() < t.guardRate * 0.5 && ai.guard > 20) {
          ai.aiGuardHoldTimer = 0.45;
          ai.isGuarding = true;
        }
      }
    }

    // Move smoothly relative to player-ai vector (aiMoveZ = forward toward player, aiMoveX = circle)
    _v1.subVectors(player.pos, ai.pos).setY(0).normalize();
    _v2.set(-_v1.z, 0, _v1.x);
    const speed = (2.05 + ai.stats.footwork * 0.015) * (ai.isGuarding ? 0.5 : 1.0);
    const targetVx = (_v1.x * ai.aiMoveZ + _v2.x * ai.aiMoveX) * speed;
    const targetVz = (_v1.z * ai.aiMoveZ + _v2.z * ai.aiMoveX) * speed;
    ai.vel.x = THREE.MathUtils.damp(ai.vel.x, targetVx, 11, dt);
    ai.vel.z = THREE.MathUtils.damp(ai.vel.z, targetVz, 11, dt);
    ai.pos.x += ai.vel.x * dt;
    ai.pos.z += ai.vel.z * dt;
  }

  private resolveFighterSeparation() {
    if (!this.playerSim || !this.oppSim) return;
    _v1.subVectors(this.oppSim.pos, this.playerSim.pos).setY(0);
    const dist = _v1.length();
    const minDist = 0.86;
    if (dist < minDist) {
      if (dist < 0.001) _v1.set(1, 0, 0);
      else _v1.divideScalar(dist);
      const overlap = (minDist - dist) * 0.5;
      this.playerSim.pos.addScaledVector(_v1, -overlap);
      this.oppSim.pos.addScaledVector(_v1, overlap);
      this.playerSim.pos.x = THREE.MathUtils.clamp(this.playerSim.pos.x, -PLAYABLE_HALF_BOUND, PLAYABLE_HALF_BOUND);
      this.playerSim.pos.z = THREE.MathUtils.clamp(this.playerSim.pos.z, -PLAYABLE_HALF_BOUND, PLAYABLE_HALF_BOUND);
      this.oppSim.pos.x = THREE.MathUtils.clamp(this.oppSim.pos.x, -PLAYABLE_HALF_BOUND, PLAYABLE_HALF_BOUND);
      this.oppSim.pos.z = THREE.MathUtils.clamp(this.oppSim.pos.z, -PLAYABLE_HALF_BOUND, PLAYABLE_HALF_BOUND);
    }
  }

  private updateCameraUfc5(dt: number) {
    if (this.mode === 'fight' && this.phase === 'highlight') {
      return;
    }
    if (this.mode === 'attract' && this.playerSim && this.oppSim) {
      _mid.addVectors(this.playerSim.pos, this.oppSim.pos).multiplyScalar(0.5);
      const orbitAngle = 0.55 + this.elapsed * 0.22;
      const dist = 3.2 + Math.sin(this.elapsed * 0.36) * 0.42;
      const height = 1.46 + Math.sin(this.elapsed * 0.28) * 0.26;
      _camGoal.set(
        _mid.x + Math.sin(orbitAngle) * dist,
        height,
        _mid.z + Math.cos(orbitAngle) * dist,
      );
      _lookGoal.set(_mid.x, 1.12, _mid.z);
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 3.8, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 3.8, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 3.8, dt);
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 6, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 6, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 6, dt);
      this.camera.position.copy(this.camPos);
      if (this.shakeIntensity > 0.001) {
        this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.8;
        this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 14, dt);
      }
      this.camera.lookAt(this.camLook);
      return;
    }
    if (this.mode === 'waitingroom') {
      if (this.waitingConfirmActive) {
        const cp = THREE.MathUtils.clamp(
          this.waitingConfirmTimer / this.WAITING_CONFIRM_DURATION,
          0,
          1,
        );
        const zoomEase = Math.sin(Math.min(1, cp * 1.25) * (Math.PI / 2));
        _camGoal.set(
          THREE.MathUtils.lerp(-0.26, 0.56, zoomEase),
          THREE.MathUtils.lerp(1.32, 1.38, zoomEase),
          THREE.MathUtils.lerp(3.68, 1.82, zoomEase),
        );
        _lookGoal.set(
          THREE.MathUtils.lerp(0.06, 0.88, zoomEase),
          THREE.MathUtils.lerp(1.06, 1.26, zoomEase),
          THREE.MathUtils.lerp(0.25, 0.45, zoomEase),
        );
        this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 11, dt);
        this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 11, dt);
        this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 11, dt);
        this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 11, dt);
        this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 11, dt);
        this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 11, dt);
        this.camera.position.copy(this.camPos);
        if (this.shakeIntensity > 0.001) {
          this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
          this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.8;
          this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 14, dt);
        }
        this.camera.lookAt(this.camLook);
        return;
      }

      _camGoal.set(
        -0.26 + Math.sin(this.elapsed * 0.35) * 0.035,
        1.32 + Math.cos(this.elapsed * 0.28) * 0.015,
        3.68,
      );
      _lookGoal.set(0.06, 1.06, 0.25);
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 4, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 4, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 4, dt);
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 4, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 4, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 4, dt);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }
    if (this.mode === 'showcase') {
      this.showcaseAngle += dt * 0.22;
      const r = 4.45;
      _camGoal.set(Math.sin(this.showcaseAngle) * r, 2.15, Math.cos(this.showcaseAngle) * r);
      _lookGoal.set(0, 1.05, 0);
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 4, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 4, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 4, dt);
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 4, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 4, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 4, dt);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }
    if (this.mode === 'faceoff') {
      _camGoal.set(
        Math.sin(this.elapsed * 0.45) * 0.05 + this.faceOffParallaxX * 0.42,
        1.34 - this.faceOffParallaxY * 0.12,
        3.92 - Math.abs(this.faceOffParallaxX) * 0.08,
      );
      _lookGoal.set(
        this.faceOffParallaxX * 0.12,
        1.06 - this.faceOffParallaxY * 0.05,
        0.2,
      );
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 5.5, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 5.5, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 5.5, dt);
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 5.5, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 5.5, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 5.5, dt);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }
    if (this.mode === 'creator') {
      const dist = 3.25;
      const halfW =
        dist * Math.tan(THREE.MathUtils.degToRad(38 * 0.5)) * (this.camera.aspect || 1.6);
      const lookX = 0.95 - halfW * 0.44;
      _camGoal.set(
        lookX - 0.12 + Math.sin(this.elapsed * 0.55) * 0.05,
        1.18,
        0.18 + dist,
      );
      _lookGoal.set(lookX, 0.98, 0.18);
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 6, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 6, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 6, dt);
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 6, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 6, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 6, dt);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }

    if (!this.playerSim || !this.oppSim) return;

    if (this.mode === 'fight' && this.phase === 'walkout') {
      const wp = THREE.MathUtils.clamp(this.walkoutClock / this.walkoutDuration, 0, 1);
      const px = this.playerSim.pos.x;
      const py = this.playerSim.pos.y;
      const pz = this.playerSim.pos.z;
      const cx = this.playerCoachSim ? this.playerCoachSim.pos.x : px + 0.6;
      const midX = THREE.MathUtils.lerp(px, cx, 0.28);

      if (wp < 0.56) {
        // Low front-3/4 hero tracking shot backing down the walkout runway ahead of boxer & coach
        _camGoal.set(
          midX + 0.72 + Math.sin(wp * Math.PI * 2) * 0.25,
          py + 1.48,
          pz + 3.15,
        );
        _lookGoal.set(midX, py + 1.15, pz);
      } else if (wp < 0.87) {
        // Sweeping side-3/4 shot climbing the stairs and parting the ring ropes
        const tClimb = THREE.MathUtils.clamp((wp - 0.56) / 0.31, 0, 1);
        _camGoal.set(
          THREE.MathUtils.lerp(midX + 0.72, -2.35, tClimb),
          THREE.MathUtils.lerp(py + 1.48, 1.72, tClimb),
          THREE.MathUtils.lerp(pz + 3.15, -1.25, tClimb),
        );
        _lookGoal.set(px * 0.5, py + 1.1, pz + 0.2);
      } else {
        // Gliding smoothly into broadcast ring framing
        const tSettle = THREE.MathUtils.clamp((wp - 0.87) / 0.13, 0, 1);
        _camGoal.set(
          THREE.MathUtils.lerp(-2.35, -0.45, tSettle),
          THREE.MathUtils.lerp(1.72, 2.15, tSettle),
          THREE.MathUtils.lerp(-1.25, 4.15, tSettle),
        );
        _lookGoal.set(
          THREE.MathUtils.lerp(px * 0.5, 0, tSettle),
          1.12,
          THREE.MathUtils.lerp(pz + 0.2, 0, tSettle),
        );
      }

      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 5.2, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 5.2, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 5.2, dt);
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 6.5, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 6.5, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 6.5, dt);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }

    if (
      this.mode === 'fight' &&
      (this.phase === 'celebration' || this.phase === 'finished') &&
      this.winner
    ) {
      const wSim = this.winner === 'player' ? this.playerSim : this.oppSim;
      const wCoach = this.winner === 'player' ? this.playerCoachSim : this.oppCoachSim;
      const cp = THREE.MathUtils.clamp(this.celebrationClock / this.celebrationDuration, 0, 1);
      const focusX = wCoach
        ? THREE.MathUtils.lerp(wSim.pos.x, wCoach.pos.x, 0.28)
        : wSim.pos.x;
      const focusZ = wCoach
        ? THREE.MathUtils.lerp(wSim.pos.z, wCoach.pos.z, 0.28)
        : wSim.pos.z;

      const orbitAzimuth = wSim.facingAngle + THREE.MathUtils.lerp(-0.42, 0.52, cp);
      const dist = THREE.MathUtils.lerp(2.75, 3.05, cp);
      const camH = 1.44 + Math.sin(cp * Math.PI) * 0.22;

      _camGoal.set(
        focusX + Math.sin(orbitAzimuth) * dist,
        camH,
        focusZ + Math.cos(orbitAzimuth) * dist,
      );
      _lookGoal.set(focusX, 1.18, focusZ);

      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 4.8, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 4.8, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 4.8, dt);
      this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 6.0, dt);
      this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 6.0, dt);
      this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 6.0, dt);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }

    _mid.addVectors(this.playerSim.pos, this.oppSim.pos).multiplyScalar(0.5);
    _axis.subVectors(this.oppSim.pos, this.playerSim.pos).setY(0);
    const sep = _axis.length();
    if (sep > 0.01) _axis.divideScalar(sep);
    else _axis.set(1, 0, 0);

    // UFC 5 Broadcast side-on perpendicular normal (keep consistent hemisphere so it never flips)
    _perp.set(-_axis.z, 0, _axis.x);
    if (_perp.dot(this.prevPerp) < 0) {
      _perp.negate();
    }
    this.prevPerp.lerp(_perp, Math.min(1, dt * 4)).normalize();

    // Camera framing modes ('broadcast' | 'closeup' | 'shoulder')
    if (this.mode === 'fight' && this.cameraMode === 'shoulder' && this.phase === 'fighting') {
      _camGoal
        .copy(this.playerSim.pos)
        .addScaledVector(_axis, -1.52)
        .addScaledVector(this.prevPerp, 0.58);
      _camGoal.y = 1.62;
      _lookGoal.set(this.oppSim.pos.x, 1.24, this.oppSim.pos.z);
    } else {
      const isClose = this.mode === 'fight' && this.cameraMode === 'closeup';
      const camDist = isClose
        ? THREE.MathUtils.clamp(2.5 + sep * 0.34, 2.68, 3.85)
        : THREE.MathUtils.clamp(3.35 + sep * 0.42, 3.65, 5.25);
      const camHeight = isClose
        ? THREE.MathUtils.clamp(1.56 + sep * 0.1, 1.62, 2.08)
        : THREE.MathUtils.clamp(2.02 + sep * 0.14, 2.08, 2.65);

      _camGoal
        .copy(_mid)
        .addScaledVector(this.prevPerp, camDist)
        .addScaledVector(_axis, isClose ? -0.32 : -0.45);
      _camGoal.y = camHeight;

      _lookGoal.set(_mid.x, isClose ? 1.18 : 1.12, _mid.z);
    }

    this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camGoal.x, 6.5, dt);
    this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camGoal.y, 6.5, dt);
    this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camGoal.z, 6.5, dt);

    this.camLook.x = THREE.MathUtils.damp(this.camLook.x, _lookGoal.x, 9, dt);
    this.camLook.y = THREE.MathUtils.damp(this.camLook.y, _lookGoal.y, 9, dt);
    this.camLook.z = THREE.MathUtils.damp(this.camLook.z, _lookGoal.z, 9, dt);

    this.camera.position.copy(this.camPos);

    // Decaying camera shake
    if (this.shakeIntensity > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.8;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 14, dt);
    }

    this.camera.lookAt(this.camLook);
  }

  private updateParticles(dt: number) {
    let anyChanged = false;
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const pt = this.particles[i];
      if (!pt.active) continue;
      anyChanged = true;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        _dummy.position.set(0, -10, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      pt.vy -= 9.8 * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += pt.vz * dt;
      if (pt.y < 0.02) {
        pt.y = 0.02;
        pt.vy *= -0.3;
      }
      const s = pt.size * (pt.life / pt.maxLife);
      _dummy.position.set(pt.x, pt.y, pt.z);
      _dummy.scale.setScalar(Math.max(0.05, s));
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _pColor.setHex(pt.colorHex));
    }
    if (anyChanged) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) {
        this.particleMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  private beginCelebration() {
    if (!this.playerSim || !this.oppSim || !this.winner) return;
    this.phase = 'celebration';
    this.celebrationClock = 0;
    this.crowdExcitement = 1.0;

    const winnerSim = this.winner === 'player' ? this.playerSim : this.oppSim;
    const loserSim = this.winner === 'player' ? this.oppSim : this.playerSim;
    const winnerCoach = this.winner === 'player' ? this.playerCoachSim : this.oppCoachSim;
    const loserCoach = this.winner === 'player' ? this.oppCoachSim : this.playerCoachSim;

    winnerSim.attackType = null;
    winnerSim.isGuarding = false;
    winnerSim.dodgeTimer = 0;
    winnerSim.hitStunTimer = 0;
    winnerSim.vel.set(0, 0, 0);
    winnerSim.anim.attackType = null;
    winnerSim.anim.isGuarding = false;
    winnerSim.anim.dodgeTimer = 0;
    winnerSim.anim.hitFlash = 0;
    winnerSim.anim.moveSpeed = 0;
    winnerSim.anim.moveForward = 0;
    winnerSim.anim.moveStrafe = 0;
    winnerSim.anim.neutralWalkMode = false;
    winnerSim.anim.knockdownProgress = 0;
    winnerSim.anim.ragdoll.active = false;
    winnerSim.anim.celebrationMode = true;
    winnerSim.anim.celebrationProgress = 0;

    loserSim.attackType = null;
    loserSim.isGuarding = false;
    loserSim.dodgeTimer = 0;
    loserSim.vel.set(0, 0, 0);
    loserSim.anim.attackType = null;
    loserSim.anim.isGuarding = false;
    loserSim.anim.neutralWalkMode = false;
    if (this.winMethod === 'UD') {
      loserSim.anim.loserCornerMode = true;
    }

    if (winnerCoach) {
      winnerCoach.startPos.copy(winnerCoach.pos);
      winnerCoach.anim.mode = 'walk_with_boxer';
      winnerCoach.anim.celebrationStyle =
        winnerSim.anim.motionProfile?.celebrationStyle ?? 'double_fist_jump';
      winnerCoach.anim.celebrationProgress = 0;
    }
    if (loserCoach) {
      loserCoach.anim.mode = 'console_corner';
    }

    const methodText =
      this.winMethod === 'KO'
        ? 'KO VICTORY!'
        : this.winMethod === 'TKO'
          ? 'TKO VICTORY!'
          : 'DECISION VICTORY!';
    this.setCallout(
      this.winner === 'player' ? methodText : `${winnerSim.name.toUpperCase()} WINS`,
      this.winner === 'player' ? 'gold' : 'red',
      4.5,
    );
    soundEngine.playCrowdReaction('victory');
    const methodSpeech =
      this.winMethod === 'KO'
        ? 'knockout'
        : this.winMethod === 'TKO'
          ? 'technical knockout'
          : 'unanimous decision';
    soundEngine.announceText(
      `And the winner by ${methodSpeech}, ${winnerSim.name}!`,
      this.announcerVoice,
    );
    this.emitHud();
  }

  private scoreCurrentRound() {
    if (!this.playerSim || !this.oppSim) return;
    const pKd = this.oppSim.roundKnockdownsTaken; // KDs scored BY player
    const oKd = this.playerSim.roundKnockdownsTaken; // KDs scored BY opp
    const rawDiff =
      this.playerSim.roundDamage -
      this.oppSim.roundDamage +
      (this.playerSim.roundLanded - this.oppSim.roundLanded) * 1.15 +
      (pKd - oKd) * 20;

    const judgeBiases = [-1.4, 0, 1.4];
    const judges: [number, number][] = judgeBiases.map((bias) => {
      const m = rawDiff + bias;
      if (Math.abs(m) < 1.5 && pKd === oKd) {
        return [10, 10];
      }
      if (m >= 0) {
        const oppPts = Math.max(7, 9 - Math.max(0, pKd - oKd));
        return [10, oppPts];
      }
      const pPts = Math.max(7, 9 - Math.max(0, oKd - pKd));
      return [pPts, 10];
    });

    this.roundScores.push({
      round: this.round,
      judges,
      playerLanded: this.playerSim.roundLanded,
      oppLanded: this.oppSim.roundLanded,
      playerKnockdowns: pKd,
      oppKnockdowns: oKd,
    });

    this.playerSim.roundDamage = 0;
    this.playerSim.roundLanded = 0;
    this.playerSim.roundKnockdownsTaken = 0;
    this.oppSim.roundDamage = 0;
    this.oppSim.roundLanded = 0;
    this.oppSim.roundKnockdownsTaken = 0;
  }

  private getCornerSpotForFighter(
    fighter: FighterSim,
    avoid?: FighterSim | null,
    out: THREE.Vector2 = _cornerSpot,
  ): THREE.Vector2 {
    const homeX = fighter.isPlayer ? -2.05 : 2.05;
    const homeZ = fighter.isPlayer ? -1.95 : 1.95;
    if (!avoid) {
      return out.set(homeX, homeZ);
    }

    const homeDist = Math.hypot(homeX - avoid.pos.x, homeZ - avoid.pos.z);
    if (homeDist >= 1.7) {
      return out.set(homeX, homeZ);
    }

    const candidates: readonly [number, number][] = [
      [homeX, homeZ],
      [-2.05, 1.95],
      [2.05, -1.95],
      [-homeX, -homeZ],
    ];
    let bestX = homeX;
    let bestZ = homeZ;
    let bestDist = -1;
    for (const [cx, cz] of candidates) {
      const d = Math.hypot(cx - avoid.pos.x, cz - avoid.pos.z);
      if (d > bestDist) {
        bestDist = d;
        bestX = cx;
        bestZ = cz;
      }
    }
    return out.set(bestX, bestZ);
  }

  private steerFighterToCorner(
    fighter: FighterSim,
    avoid: FighterSim,
    dt: number,
    maxSpeed = 2.15,
  ) {
    const corner = this.getCornerSpotForFighter(fighter, avoid);
    const toCornerX = corner.x - fighter.pos.x;
    const toCornerZ = corner.y - fighter.pos.z;
    const distToCorner = Math.hypot(toCornerX, toCornerZ);

    fighter.attackType = null;
    fighter.isGuarding = false;
    fighter.dodgeTimer = 0;
    fighter.anim.attackType = null;
    fighter.anim.isGuarding = false;
    fighter.anim.dodgeTimer = 0;
    fighter.anim.neutralWalkMode = true;
    fighter.anim.time += dt;

    let desiredVx = 0;
    let desiredVz = 0;

    if (distToCorner > 0.14) {
      let dirX = toCornerX / distToCorner;
      let dirZ = toCornerZ / distToCorner;

      // Steer smoothly around the downed boxer so victor never walks over them
      const awayX = fighter.pos.x - avoid.pos.x;
      const awayZ = fighter.pos.z - avoid.pos.z;
      const avoidDist = Math.hypot(awayX, awayZ);
      if (avoidDist < 1.15 && avoidDist > 0.001) {
        const nx = awayX / avoidDist;
        const nz = awayZ / avoidDist;
        const intoDowned = -(dirX * nx + dirZ * nz);
        if (intoDowned > 0) {
          const pushWeight = (1.15 - avoidDist) * 1.45;
          dirX += nx * pushWeight;
          dirZ += nz * pushWeight;
          const len = Math.hypot(dirX, dirZ) || 1;
          dirX /= len;
          dirZ /= len;
        }
      }

      const speed = Math.min(maxSpeed, Math.max(0.75, distToCorner * 2.2));
      desiredVx = dirX * speed;
      desiredVz = dirZ * speed;
    }

    fighter.vel.x = THREE.MathUtils.damp(fighter.vel.x, desiredVx, 8.5, dt);
    fighter.vel.z = THREE.MathUtils.damp(fighter.vel.z, desiredVz, 8.5, dt);
    fighter.pos.x = THREE.MathUtils.clamp(
      fighter.pos.x + fighter.vel.x * dt,
      -PLAYABLE_HALF_BOUND,
      PLAYABLE_HALF_BOUND,
    );
    fighter.pos.z = THREE.MathUtils.clamp(
      fighter.pos.z + fighter.vel.z * dt,
      -PLAYABLE_HALF_BOUND,
      PLAYABLE_HALF_BOUND,
    );

    const speedNow = fighter.vel.length();
    let targetYaw = fighter.facingAngle;
    if (distToCorner > 0.22 && speedNow > 0.25) {
      targetYaw = Math.atan2(fighter.vel.x, fighter.vel.z);
    } else {
      targetYaw = Math.atan2(avoid.pos.x - fighter.pos.x, avoid.pos.z - fighter.pos.z);
    }
    let yDiff = targetYaw - fighter.facingAngle;
    while (yDiff > Math.PI) yDiff -= Math.PI * 2;
    while (yDiff < -Math.PI) yDiff += Math.PI * 2;
    fighter.facingAngle += yDiff * Math.min(1, dt * 7.5);

    const fx = Math.sin(fighter.facingAngle);
    const fz = Math.cos(fighter.facingAngle);
    fighter.anim.moveSpeed = speedNow;
    fighter.anim.moveForward = THREE.MathUtils.clamp((fighter.vel.x * fx + fighter.vel.z * fz) / 2.2, -1, 1);
    fighter.anim.moveStrafe = THREE.MathUtils.clamp((fighter.vel.x * fz - fighter.vel.z * fx) / 2.2, -1, 1);

    fighter.rig.root.position.copy(fighter.pos);
    fighter.rig.root.rotation.y = fighter.facingAngle;
    updateBoxerPose(fighter.rig, fighter.anim, dt);
  }

  private updateApronCoaches(dt: number) {
    if (this.playerCoachSim) {
      this.playerCoachSim.anim.time += dt;
      this.playerCoachSim.anim.mode = 'apron_support';
      updateCoachPose(this.playerCoachSim.rig, this.playerCoachSim.anim, dt);
    }
    if (this.oppCoachSim) {
      this.oppCoachSim.anim.time += dt;
      this.oppCoachSim.anim.mode = 'apron_support';
      updateCoachPose(this.oppCoachSim.rig, this.oppCoachSim.anim, dt);
    }
  }

  private updateReferee(
    dt: number,
    mode: RefereeMode,
    goalX: number,
    goalZ: number,
    lookX: number,
    lookZ: number,
    maxSpeed = 2.0,
    keepFighterClearance = true,
  ) {
    const ref = this.refereeSim;
    if (!ref) return;

    let targetX = THREE.MathUtils.clamp(goalX, -2.55, 2.55);
    let targetZ = THREE.MathUtils.clamp(goalZ, -2.55, 2.55);

    // Keep comfortable personal space from both boxers so referee never overlaps fighters
    if (keepFighterClearance && this.playerSim && this.oppSim) {
      const fighters = [this.playerSim, this.oppSim];
      for (const f of fighters) {
        const dx = targetX - f.pos.x;
        const dz = targetZ - f.pos.z;
        const dist = Math.hypot(dx, dz);
        const minClear = 1.24;
        if (dist < minClear) {
          const nx = dist > 0.001 ? dx / dist : 0;
          const nz = dist > 0.001 ? dz / dist : -1;
          targetX = f.pos.x + nx * minClear;
          targetZ = f.pos.z + nz * minClear;
        }
      }
      targetX = THREE.MathUtils.clamp(targetX, -2.55, 2.55);
      targetZ = THREE.MathUtils.clamp(targetZ, -2.55, 2.55);
    }

    const dx = targetX - ref.pos.x;
    const dz = targetZ - ref.pos.z;
    const distToGoal = Math.hypot(dx, dz);

    let desiredVx = 0;
    let desiredVz = 0;
    if (distToGoal > 0.06) {
      const speed = Math.min(maxSpeed, distToGoal * 2.6);
      desiredVx = (dx / distToGoal) * speed;
      desiredVz = (dz / distToGoal) * speed;
    }

    ref.vel.x = THREE.MathUtils.damp(ref.vel.x, desiredVx, 8.5, dt);
    ref.vel.z = THREE.MathUtils.damp(ref.vel.z, desiredVz, 8.5, dt);
    ref.pos.x = THREE.MathUtils.clamp(ref.pos.x + ref.vel.x * dt, -2.6, 2.6);
    ref.pos.z = THREE.MathUtils.clamp(ref.pos.z + ref.vel.z * dt, -2.6, 2.6);

    // Immediate hard push-out if a boxer lunges close to the referee
    if (keepFighterClearance && this.playerSim && this.oppSim) {
      const fighters = [this.playerSim, this.oppSim];
      for (const f of fighters) {
        const fx = ref.pos.x - f.pos.x;
        const fz = ref.pos.z - f.pos.z;
        const fDist = Math.hypot(fx, fz);
        if (fDist < 1.04) {
          const nx = fDist > 0.001 ? fx / fDist : 0;
          const nz = fDist > 0.001 ? fz / fDist : -1;
          ref.pos.x = THREE.MathUtils.clamp(f.pos.x + nx * 1.04, -2.6, 2.6);
          ref.pos.z = THREE.MathUtils.clamp(f.pos.z + nz * 1.04, -2.6, 2.6);
        }
      }
    }

    const lookDx = lookX - ref.pos.x;
    const lookDz = lookZ - ref.pos.z;
    if (Math.hypot(lookDx, lookDz) > 0.05) {
      const targetYaw = Math.atan2(lookDx, lookDz);
      let diff = targetYaw - ref.facingAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ref.facingAngle += diff * Math.min(1, dt * 7.5);
    }

    ref.rig.root.position.copy(ref.pos);
    ref.rig.root.rotation.y = ref.facingAngle;

    ref.anim.time += dt;
    ref.anim.mode = mode;
    ref.anim.velX = ref.vel.x;
    ref.anim.velZ = ref.vel.z;
    ref.anim.facingAngle = ref.facingAngle;
    ref.anim.headLookYaw = mode === 'officiate' ? Math.sin(this.elapsed * 1.45) * 0.16 : 0;
    updateRefereePose(ref.rig, ref.anim, dt);
  }

  private updateFightStateMachine(dt: number) {
    if (!this.playerSim || !this.oppSim) return;

    if (this.calloutTimer > 0) {
      this.calloutTimer = Math.max(0, this.calloutTimer - dt);
      if (this.calloutTimer === 0) this.calloutText = null;
    }

    if (this.phase === 'walkout') {
      this.walkoutClock += dt;
      const wp = THREE.MathUtils.clamp(this.walkoutClock / this.walkoutDuration, 0, 1);

      let bx = -0.36;
      let by = -1.02;
      let bz = -12.5;
      let bYaw = 0.02;
      let stairW = 0;
      let ropeDuck = 0;
      let bSpeed = 1.65;

      if (wp < 0.56) {
        const u = wp / 0.56;
        bz = THREE.MathUtils.lerp(-12.5, -5.0, u);
        bx = THREE.MathUtils.lerp(-0.36, -0.26, u);
        by = -1.02;
        bYaw = 0.02;
      } else if (wp < 0.72) {
        const u = (wp - 0.56) / 0.16;
        bz = THREE.MathUtils.lerp(-5.0, -4.06, u);
        bx = THREE.MathUtils.lerp(-0.26, -0.28, u);
        by = THREE.MathUtils.lerp(-1.02, 0, Math.sin(u * (Math.PI / 2)));
        stairW = Math.sin(u * Math.PI);
        bSpeed = 1.32;
      } else if (wp < 0.85) {
        const u = (wp - 0.72) / 0.13;
        bz = THREE.MathUtils.lerp(-4.06, -3.28, u);
        bx = THREE.MathUtils.lerp(-0.28, -0.44, u);
        by = 0;
        bYaw = THREE.MathUtils.lerp(0.02, 0.28, u);
        ropeDuck = Math.sin(u * Math.PI);
        bSpeed = 1.25;
      } else {
        const u = (wp - 0.85) / 0.15;
        const smoothU = u * u * (3 - 2 * u);
        bz = THREE.MathUtils.lerp(-3.28, 0, smoothU);
        bx = THREE.MathUtils.lerp(-0.44, -1.15, smoothU);
        by = 0;
        bYaw = THREE.MathUtils.lerp(0.28, Math.PI / 2, smoothU);
        bSpeed = (1 - smoothU) * 1.45;
      }

      this.playerSim.vel.set(0, 0, bSpeed);
      this.playerSim.pos.set(bx, by, bz);
      this.playerSim.facingAngle = bYaw;
      this.playerSim.rig.root.position.copy(this.playerSim.pos);
      this.playerSim.rig.root.rotation.y = bYaw;

      this.playerSim.anim.time += dt;
      this.playerSim.anim.walkoutMode = true;
      this.playerSim.anim.walkoutProgress = wp;
      this.playerSim.anim.walkoutStairWeight = stairW;
      this.playerSim.anim.walkoutRopeDuck = ropeDuck;
      this.playerSim.anim.moveSpeed = bSpeed;
      updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);

      // Red corner coach walks side-by-side up stairs, then takes Red apron corner
      if (this.playerCoachSim) {
        let cx = 0.42;
        let cy = -1.02;
        let cz = -12.75;
        let cYaw = 0;
        let cStair = 0;
        let cSpeed = 1.62;
        let cMode: 'walk_with_boxer' | 'apron_support' = 'walk_with_boxer';

        if (wp < 0.56) {
          const u = wp / 0.56;
          cz = THREE.MathUtils.lerp(-12.75, -5.15, u);
          cx = THREE.MathUtils.lerp(0.42, 0.44, u);
          cy = -1.02;
          cYaw = -0.04;
        } else if (wp < 0.72) {
          const u = (wp - 0.56) / 0.16;
          cz = THREE.MathUtils.lerp(-5.15, -4.02, u);
          cx = THREE.MathUtils.lerp(0.44, 0.34, u);
          cy = THREE.MathUtils.lerp(-1.02, 0, Math.sin(u * (Math.PI / 2)));
          cStair = Math.sin(u * Math.PI);
          cYaw = -0.18;
          cSpeed = 1.3;
        } else if (wp < 0.94) {
          const u = (wp - 0.72) / 0.22;
          cz = -3.94;
          cx = THREE.MathUtils.lerp(0.34, -2.2, u);
          cy = 0;
          cYaw = THREE.MathUtils.lerp(-Math.PI / 2, 0.55, u * u);
          cSpeed = 1.38;
        } else {
          cx = -2.2;
          cy = 0;
          cz = -3.94;
          cYaw = 0.55;
          cSpeed = 0;
          cMode = 'apron_support';
        }

        this.playerCoachSim.pos.set(cx, cy, cz);
        this.playerCoachSim.facingAngle = cYaw;
        this.playerCoachSim.rig.root.position.copy(this.playerCoachSim.pos);
        this.playerCoachSim.rig.root.rotation.y = cYaw;
        this.playerCoachSim.anim.time += dt;
        this.playerCoachSim.anim.mode = cMode;
        this.playerCoachSim.anim.moveSpeed = cSpeed;
        this.playerCoachSim.anim.stairWeight = cStair;
        this.playerCoachSim.anim.ropeDuck = 0;
        this.playerCoachSim.anim.walkoutProgress = wp;
        this.playerCoachSim.anim.boxerSideSign = -1;
        updateCoachPose(this.playerCoachSim.rig, this.playerCoachSim.anim, dt);
      }

      // Opponent & Blue coach warm up attentively in Blue Corner
      this.oppSim.anim.time += dt;
      this.oppSim.anim.isGuarding = false;
      updateBoxerPose(this.oppSim.rig, this.oppSim.anim, dt);
      if (this.oppCoachSim) {
        this.oppCoachSim.anim.time += dt;
        this.oppCoachSim.anim.mode = 'apron_support';
        updateCoachPose(this.oppCoachSim.rig, this.oppCoachSim.anim, dt);
      }

      this.updateReferee(dt, 'stand_corner', 0, -2.15, 0, -1.0, 1.4, false);

      if (wp >= 1) {
        this.skipWalkout();
      }
      return;
    }

    if (this.phase === 'intro') {
      this.phaseTimer = Math.max(0, this.phaseTimer - dt);
      const countNow = Math.max(0, Math.ceil(this.phaseTimer));
      if (countNow >= 1 && countNow < this.lastCountdownAnnounced) {
        this.lastCountdownAnnounced = countNow;
        this.refereeCountdown = countNow;
        if (this.refereeSim) {
          this.refereeSim.anim.countBeat = 1.0;
        }
        soundEngine.playCountdownTick(countNow);
        this.emitHud();
      }

      if (this.refereeSim) {
        this.refereeSim.anim.countdownValue = this.refereeCountdown;
      }
      this.updateReferee(dt, 'countdown', 0, -0.78, 0, 0.25, 1.9, false);

      this.playerSim.anim.time += dt;
      this.oppSim.anim.time += dt;
      updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
      updateBoxerPose(this.oppSim.rig, this.oppSim.anim, dt);
      this.updateApronCoaches(dt);

      if (this.phaseTimer <= 0) {
        this.refereeCountdown = 0;
        this.lastCountdownAnnounced = 0;
        this.phase = 'fighting';
        if (this.refereeSim) {
          this.refereeSim.anim.countdownValue = 0;
          this.refereeSim.anim.countBeat = 1.0;
        }
        soundEngine.playBell(1);
        soundEngine.playCrowdReaction('cheer');
        soundEngine.announceText(`Round ${this.round}. Fight!`, this.announcerVoice);
        this.setCallout('FIGHT!', 'white', 0.85);
        this.emitHud();
      }
      return;
    }

    if (this.phase === 'fighting') {
      if (this.knockdownLeadInTimer > 0) {
        this.knockdownLeadInTimer = Math.max(0, this.knockdownLeadInTimer - dt);
        const downed = this.knockdownTarget === 'player' ? this.playerSim : this.oppSim;
        const victor = this.knockdownTarget === 'player' ? this.oppSim : this.playerSim;

        downed.anim.time += dt;
        downed.anim.hitFlash = Math.max(0, downed.anim.hitFlash - dt * 5.0);
        updateBoxerPose(downed.rig, downed.anim, dt);

        victor.anim.isGuarding = false;
        victor.anim.attackType = null;
        victor.anim.neutralWalkMode = false;
        victor.vel.x = THREE.MathUtils.damp(victor.vel.x, 0, 10, dt);
        victor.vel.z = THREE.MathUtils.damp(victor.vel.z, 0, 10, dt);
        victor.anim.moveSpeed = victor.vel.length();
        victor.anim.time += dt;
        updateBoxerPose(victor.rig, victor.anim, dt);

        this.updateReferee(
          dt,
          'officiate',
          downed.pos.x - this.prevPerp.x * 1.5,
          downed.pos.z - this.prevPerp.z * 1.5,
          downed.pos.x,
          downed.pos.z,
          2.2,
          true,
        );

        this.fightSimClock += dt;
        this.recordReplayFrame();

        if (this.knockdownLeadInTimer <= 0) {
          this.beginHighlightReplay();
        }
        return;
      }

      this.clinchCooldown = Math.max(0, this.clinchCooldown - dt);
      if (this.clinchTimer > 0) {
        this.clinchTimer = Math.max(0, this.clinchTimer - dt);
        this.roundTimer = Math.max(0, this.roundTimer - dt);
        this.fightSimClock += dt;

        // Pull both boxers into tight embrace & regenerate stamina
        _mid.addVectors(this.playerSim.pos, this.oppSim.pos).multiplyScalar(0.5);
        _axis.subVectors(this.oppSim.pos, this.playerSim.pos).setY(0);
        if (_axis.lengthSq() < 0.001) _axis.set(1, 0, 0);
        else _axis.normalize();

        this.playerSim.pos.copy(_mid).addScaledVector(_axis, -0.41);
        this.oppSim.pos.copy(_mid).addScaledVector(_axis, 0.41);
        this.playerSim.facingAngle = Math.atan2(_axis.x, _axis.z);
        this.oppSim.facingAngle = Math.atan2(-_axis.x, -_axis.z);
        this.playerSim.rig.root.position.copy(this.playerSim.pos);
        this.playerSim.rig.root.rotation.y = this.playerSim.facingAngle;
        this.oppSim.rig.root.position.copy(this.oppSim.pos);
        this.oppSim.rig.root.rotation.y = this.oppSim.facingAngle;

        this.playerSim.stamina = Math.min(this.playerSim.maxStamina, this.playerSim.stamina + 20 * dt);
        this.oppSim.stamina = Math.min(this.oppSim.maxStamina, this.oppSim.stamina + 16 * dt);
        this.playerSim.anim.time += dt;
        this.oppSim.anim.time += dt;
        this.playerSim.anim.clinchMode = true;
        this.oppSim.anim.clinchMode = true;
        updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
        updateBoxerPose(this.oppSim.rig, this.oppSim.anim, dt);
        this.updateApronCoaches(dt);

        this.updateReferee(
          dt,
          'officiate',
          _mid.x - this.prevPerp.x * 1.12,
          _mid.z - this.prevPerp.z * 1.12,
          _mid.x,
          _mid.z,
          2.2,
          false,
        );

        if (this.clinchTimer <= 0) {
          this.playerSim.anim.clinchMode = false;
          this.oppSim.anim.clinchMode = false;
          this.playerSim.pos.addScaledVector(_axis, -0.38);
          this.oppSim.pos.addScaledVector(_axis, 0.38);
          this.applyRingRopeElasticity(this.playerSim, dt);
          this.applyRingRopeElasticity(this.oppSim, dt);
          this.clinchCooldown = 3.2;
          soundEngine.playClinchBreak();
          soundEngine.announceText('Break!', this.announcerVoice);
          this.setCallout('REF: BREAK!', 'gold', 0.95);
        }
        return;
      }

      this.roundTimer = Math.max(0, this.roundTimer - dt);
      this.fightSimClock += dt;

      this.updateFighterCombat(this.playerSim, this.oppSim, dt);
      this.updateFighterCombat(this.oppSim, this.playerSim, dt);
      this.resolveFighterSeparation();
      this.updateApronCoaches(dt);

      // Referee circles actively on the far side of the boxers (never blocks broadcast camera)
      const midX = (this.playerSim.pos.x + this.oppSim.pos.x) * 0.5;
      const midZ = (this.playerSim.pos.z + this.oppSim.pos.z) * 0.5;
      const swayX = -this.prevPerp.z * Math.sin(this.elapsed * 0.7) * 0.34;
      const swayZ = this.prevPerp.x * Math.sin(this.elapsed * 0.7) * 0.34;
      this.updateReferee(
        dt,
        'officiate',
        midX - this.prevPerp.x * 1.72 + swayX,
        midZ - this.prevPerp.z * 1.72 + swayZ,
        midX,
        midZ,
        2.05,
        true,
      );

      this.recordReplayFrame();

      if (this.roundTimer <= 0 && this.phase === 'fighting' && this.knockdownLeadInTimer <= 0) {
        soundEngine.playBell(2);
        this.scoreCurrentRound();
        if (this.round >= this.maxRounds) {
          let pTotal = 0;
          let oTotal = 0;
          for (const rs of this.roundScores) {
            for (const [pj, oj] of rs.judges) {
              pTotal += pj;
              oTotal += oj;
            }
          }
          if (pTotal === oTotal) {
            const pScore = this.playerSim.hp / this.playerSim.maxHp;
            const oScore = this.oppSim.hp / this.oppSim.maxHp;
            this.winner = pScore >= oScore ? 'player' : 'opponent';
          } else {
            this.winner = pTotal > oTotal ? 'player' : 'opponent';
          }
          this.winMethod = 'UD';
          this.beginCelebration();
        } else {
          this.phase = 'between_rounds';
          this.phaseTimer = 5.5;
          this.cornerFocusUsed = false;
          this.arena.setCornerStoolsVisible(true);
          this.cornerAdvice =
            this.playerSim.stamina < 45
              ? 'Coach: "Control the pace, work the body and recover your wind!"'
              : this.oppSim.guard > 60
                ? 'Coach: "Mix body hooks [B] to drop his high guard, then come upstairs!"'
                : 'Coach: "Snap the jab, time your parry right on impact and counter!"';
          this.crowdExcitement = Math.max(this.crowdExcitement, 0.55);
          soundEngine.playCrowdReaction('cheer');
          this.setCallout(`END OF ROUND ${this.round}`, 'white', 2.4);
          this.emitHud();
        }
      }
      return;
    }

    if (this.phase === 'highlight') {
      const distFromImpact = this.highlightCursor - this.highlightImpactTime;
      const slowScale =
        distFromImpact >= -0.06 && distFromImpact <= 0.14
          ? 0.16
          : distFromImpact < -0.06
            ? 0.42
            : 0.34;

      this.highlightCursor += dt * slowScale;
      const span = Math.max(0.05, this.highlightEndTime - this.highlightStartTime);
      const progress = THREE.MathUtils.clamp(
        (this.highlightCursor - this.highlightStartTime) / span,
        0,
        1,
      );

      // Find surrounding keyframes in replayOrdered
      let idxA = 0;
      let idxB = 0;
      for (let i = 0; i < this.replayOrderedCount - 1; i++) {
        if (this.replayOrdered[i + 1].t >= this.highlightCursor) {
          idxA = i;
          idxB = i + 1;
          break;
        }
        idxA = i;
        idxB = i + 1;
      }
      const frameA = this.replayOrdered[idxA];
      const frameB = this.replayOrdered[idxB];
      const segDt = Math.max(0.0001, frameB.t - frameA.t);
      const alpha = THREE.MathUtils.clamp((this.highlightCursor - frameA.t) / segDt, 0, 1);

      this.applyInterpolatedPose(this.playerSim, frameA.player, frameB.player, alpha);
      this.applyInterpolatedPose(this.oppSim, frameA.opp, frameB.opp, alpha);
      this.updateReferee(dt * 0.35, 'stand_corner', 0, -2.45, 0, 0, 1.5, false);

      if (!this.highlightImpactFxFired && this.highlightCursor >= this.highlightImpactTime) {
        this.highlightImpactFxFired = true;
        const defender = this.knockdownTarget === 'player' ? this.playerSim : this.oppSim;
        this.shakeIntensity = 0.08;
        this.spawnImpactParticles(
          defender.rig.headWorldPos,
          20,
          this.highlightIsCounter ? 0x38bdf8 : 0xfbbf24,
          0.6,
        );
      }

      if (this.shakeIntensity > 0.001) {
        this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 12, dt);
      }
      this.sampleAndApplyHighlightCamera(progress, false);

      if (this.highlightCursor >= this.highlightEndTime) {
        this.finishHighlightReplay();
      }
      return;
    }

    if (this.phase === 'knockdown') {
      const downed = this.knockdownTarget === 'player' ? this.playerSim : this.oppSim;
      const victor = this.knockdownTarget === 'player' ? this.oppSim : this.playerSim;

      // Animate fall to canvas
      downed.anim.knockdownProgress = THREE.MathUtils.damp(downed.anim.knockdownProgress, 1, 7, dt);
      updateBoxerPose(downed.rig, downed.anim, dt);

      // Standing boxer walks cleanly back to their corner while the referee performs the 10-count
      this.steerFighterToCorner(victor, downed, dt, 2.2);
      this.updateApronCoaches(dt);

      if (this.refereeSim) {
        this.refereeSim.anim.knockdownCount = this.knockdownCount;
      }
      this.updateReferee(
        dt,
        'knockdown_count',
        downed.pos.x - this.prevPerp.x * 1.42,
        downed.pos.z - this.prevPerp.z * 1.42,
        downed.pos.x,
        downed.pos.z,
        2.3,
        true,
      );

      const speedBoost = this.knockdownTarget === 'player' ? Math.min(0.35, this.playerGetupBoost * 0.15) : 0;
      this.knockdownTickTimer -= dt * (1 + speedBoost);
      if (this.knockdownTickTimer <= 0) {
        this.knockdownCount += 1;
        this.knockdownTickTimer = 0.85;
        if (this.refereeSim) {
          this.refereeSim.anim.knockdownCount = this.knockdownCount;
          this.refereeSim.anim.countBeat = 1.0;
        }

        if (this.knockdownCount >= this.knockdownRecoveryCount && this.knockdownRecoveryCount < 10) {
          // Fighter beats the count!
          downed.hp = Math.round(downed.maxHp * 0.34);
          downed.stamina = Math.round(downed.maxStamina * 0.55);
          downed.guard = downed.maxGuard;
          downed.anim.knockdownProgress = 0;
          downed.anim.ragdoll.active = false;
          downed.anim.neutralWalkMode = false;
          downed.vel.set(0, 0, 0);

          victor.anim.neutralWalkMode = false;
          victor.vel.set(0, 0, 0);
          victor.anim.moveSpeed = 0;
          victor.anim.moveForward = 0;
          victor.anim.moveStrafe = 0;

          this.phase = 'fighting';
          this.knockdownTarget = null;
          this.crowdExcitement = Math.max(this.crowdExcitement, 0.85);
          soundEngine.playCrowdReaction('cheer');
          this.setCallout('BEATS THE COUNT!', 'cyan', 1.1);
          return;
        }

        if (this.knockdownCount >= 10) {
          this.winner = downed.isPlayer ? 'opponent' : 'player';
          this.winMethod = downed.knockdowns >= 3 ? 'TKO' : 'KO';
          soundEngine.playBell(3);
          this.beginCelebration();
        }
      }
      return;
    }

    if (this.phase === 'between_rounds') {
      this.phaseTimer = Math.max(0, this.phaseTimer - dt);

      // Steer boxers neatly to their corner stools for recovery
      const pDx = -2.55 - this.playerSim.pos.x;
      const pDz = -2.55 - this.playerSim.pos.z;
      const pDist = Math.hypot(pDx, pDz);
      if (pDist > 0.14) {
        const s = Math.min(2.2, pDist * 2.5);
        this.playerSim.pos.x += (pDx / pDist) * s * dt;
        this.playerSim.pos.z += (pDz / pDist) * s * dt;
        this.playerSim.anim.neutralWalkMode = true;
        this.playerSim.anim.cornerRestMode = false;
        this.playerSim.anim.moveSpeed = s;
      } else {
        this.playerSim.anim.neutralWalkMode = false;
        this.playerSim.anim.cornerRestMode = true;
        this.playerSim.anim.moveSpeed = 0;
        this.playerSim.facingAngle = Math.PI / 4;
      }
      this.playerSim.rig.root.position.copy(this.playerSim.pos);
      this.playerSim.rig.root.rotation.y = this.playerSim.facingAngle;

      const oDx = 2.55 - this.oppSim.pos.x;
      const oDz = 2.55 - this.oppSim.pos.z;
      const oDist = Math.hypot(oDx, oDz);
      if (oDist > 0.14) {
        const s = Math.min(2.2, oDist * 2.5);
        this.oppSim.pos.x += (oDx / oDist) * s * dt;
        this.oppSim.pos.z += (oDz / oDist) * s * dt;
        this.oppSim.anim.neutralWalkMode = true;
        this.oppSim.anim.cornerRestMode = false;
        this.oppSim.anim.moveSpeed = s;
      } else {
        this.oppSim.anim.neutralWalkMode = false;
        this.oppSim.anim.cornerRestMode = true;
        this.oppSim.anim.moveSpeed = 0;
        this.oppSim.facingAngle = (-Math.PI * 3) / 4;
      }
      this.oppSim.rig.root.position.copy(this.oppSim.pos);
      this.oppSim.rig.root.rotation.y = this.oppSim.facingAngle;

      this.playerSim.anim.time += dt;
      this.oppSim.anim.time += dt;
      updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
      updateBoxerPose(this.oppSim.rig, this.oppSim.anim, dt);
      this.updateApronCoaches(dt);
      this.updateReferee(dt, 'stand_corner', 0, -2.0, 0, 0, 1.75, true);

      if (this.phaseTimer <= 0) {
        this.arena.setCornerStoolsVisible(false);
        this.round += 1;
        this.roundTimer = this.roundDuration;
        // Corner recovery between rounds
        this.playerSim.hp = Math.min(this.playerSim.maxHp, this.playerSim.hp + this.playerSim.maxHp * 0.14);
        this.playerSim.stamina = this.playerSim.maxStamina;
        this.playerSim.guard = this.playerSim.maxGuard;
        this.playerSim.pos.set(-1.15, 0, 0);
        this.playerSim.facingAngle = Math.PI / 2;
        this.playerSim.vel.set(0, 0, 0);
        this.playerSim.anim.neutralWalkMode = false;
        this.playerSim.anim.cornerRestMode = false;
        this.playerSim.rig.root.position.copy(this.playerSim.pos);
        this.playerSim.rig.root.rotation.y = this.playerSim.facingAngle;

        this.oppSim.hp = Math.min(this.oppSim.maxHp, this.oppSim.hp + this.oppSim.maxHp * 0.14);
        this.oppSim.stamina = this.oppSim.maxStamina;
        this.oppSim.guard = this.oppSim.maxGuard;
        this.oppSim.pos.set(1.15, 0, 0);
        this.oppSim.facingAngle = -Math.PI / 2;
        this.oppSim.vel.set(0, 0, 0);
        this.oppSim.anim.neutralWalkMode = false;
        this.oppSim.anim.cornerRestMode = false;
        this.oppSim.rig.root.position.copy(this.oppSim.pos);
        this.oppSim.rig.root.rotation.y = this.oppSim.facingAngle;

        this.replayWriteIdx = 0;
        this.replayFilledCount = 0;
        this.replayOrderedCount = 0;
        this.fightSimClock = 0;

        this.phase = 'intro';
        this.phaseTimer = 3.0;
        this.refereeCountdown = 3;
        this.lastCountdownAnnounced = 3;
        if (this.refereeSim) {
          this.refereeSim.anim.countdownValue = 3;
          this.refereeSim.anim.countBeat = 1.0;
        }
        soundEngine.playCountdownTick(3);
        soundEngine.playCrowdReaction('cheer');
        this.setCallout(`ROUND ${this.round}`, 'gold', 1.15);
        this.emitHud();
      }
      return;
    }

    if (this.phase === 'celebration' && this.winner) {
      this.celebrationClock += dt;
      const cp = THREE.MathUtils.clamp(this.celebrationClock / this.celebrationDuration, 0, 1);

      const winnerSim = this.winner === 'player' ? this.playerSim : this.oppSim;
      const loserSim = this.winner === 'player' ? this.oppSim : this.playerSim;
      const winnerCoach = this.winner === 'player' ? this.playerCoachSim : this.oppCoachSim;
      const loserCoach = this.winner === 'player' ? this.oppCoachSim : this.playerCoachSim;

      // On KO/TKO, ensure the winning boxer settles cleanly in their corner away from the KO'd opponent
      if ((this.winMethod === 'KO' || this.winMethod === 'TKO') && cp < 0.2) {
        const corner = this.getCornerSpotForFighter(winnerSim, loserSim);
        const cxDiff = corner.x - winnerSim.pos.x;
        const czDiff = corner.y - winnerSim.pos.z;
        const cDist = Math.hypot(cxDiff, czDiff);
        if (cDist > 0.12) {
          const step = Math.min(cDist, 2.3 * dt);
          winnerSim.pos.x += (cxDiff / cDist) * step;
          winnerSim.pos.z += (czDiff / cDist) * step;
        }
      }

      // Turn winning boxer slightly toward the broadcast camera so celebration + coach look natural together
      const targetFace = winnerSim.isPlayer ? 0.35 : -0.35;
      let fDiff = targetFace - winnerSim.facingAngle;
      while (fDiff > Math.PI) fDiff -= Math.PI * 2;
      while (fDiff < -Math.PI) fDiff += Math.PI * 2;
      winnerSim.facingAngle += fDiff * Math.min(1, dt * 4.5);
      winnerSim.rig.root.position.copy(winnerSim.pos);
      winnerSim.rig.root.rotation.y = winnerSim.facingAngle;

      winnerSim.anim.time += dt;
      winnerSim.anim.celebrationMode = true;
      winnerSim.anim.celebrationProgress = cp;
      updateBoxerPose(winnerSim.rig, winnerSim.anim, dt);

      // Winning coach hurries onto canvas right alongside the champion and celebrates together!
      if (winnerCoach) {
        const style = winnerSim.anim.motionProfile?.celebrationStyle ?? 'double_fist_jump';
        const sideOffset = winnerSim.isPlayer ? -0.72 : 0.72;
        const zOffset = style === 'coach_arm_raise' ? -0.14 : -0.36;
        const goalX = THREE.MathUtils.clamp(winnerSim.pos.x + sideOffset, -3.1, 3.1);
        const goalZ = THREE.MathUtils.clamp(winnerSim.pos.z + zOffset, -3.1, 3.1);
        const enterT = THREE.MathUtils.clamp(cp / 0.22, 0, 1);
        const smoothEnter = enterT * enterT * (3 - 2 * enterT);

        if (enterT < 1) {
          winnerCoach.pos.set(
            THREE.MathUtils.lerp(winnerCoach.startPos.x, goalX, smoothEnter),
            0,
            THREE.MathUtils.lerp(winnerCoach.startPos.z, goalZ, smoothEnter),
          );
          const dx = goalX - winnerCoach.startPos.x;
          const dz = goalZ - winnerCoach.startPos.z;
          const runYaw = Math.atan2(dx, dz);
          winnerCoach.facingAngle = runYaw;
          winnerCoach.anim.mode = 'walk_with_boxer';
          winnerCoach.anim.moveSpeed = 2.15;
          winnerCoach.anim.ropeDuck = Math.sin(enterT * Math.PI) * 0.72;
        } else {
          winnerCoach.pos.set(goalX, 0, goalZ);
          const coachFace = winnerSim.isPlayer ? 0.48 : -0.48;
          let cDiff = coachFace - winnerCoach.facingAngle;
          while (cDiff > Math.PI) cDiff -= Math.PI * 2;
          while (cDiff < -Math.PI) cDiff += Math.PI * 2;
          winnerCoach.facingAngle += cDiff * Math.min(1, dt * 6);
          winnerCoach.anim.mode = 'celebrate_with_boxer';
          winnerCoach.anim.moveSpeed = 0;
          winnerCoach.anim.ropeDuck = 0;
          winnerCoach.anim.celebrationStyle = style;
          winnerCoach.anim.celebrationProgress = THREE.MathUtils.clamp((cp - 0.22) / 0.78, 0, 1);
        }

        // Compute which side of the coach the boxer is standing on
        const rightX = Math.cos(winnerCoach.facingAngle);
        const rightZ = -Math.sin(winnerCoach.facingAngle);
        const relDot =
          (winnerSim.pos.x - winnerCoach.pos.x) * rightX +
          (winnerSim.pos.z - winnerCoach.pos.z) * rightZ;
        winnerCoach.anim.boxerSideSign = relDot >= 0 ? 1 : -1;

        winnerCoach.rig.root.position.copy(winnerCoach.pos);
        winnerCoach.rig.root.rotation.y = winnerCoach.facingAngle;
        winnerCoach.anim.time += dt;
        updateCoachPose(winnerCoach.rig, winnerCoach.anim, dt);
      }

      // Loser & losing coach
      loserSim.anim.time += dt * 0.7;
      updateBoxerPose(loserSim.rig, loserSim.anim, dt);
      if (loserCoach) {
        loserCoach.anim.time += dt;
        loserCoach.anim.mode = 'console_corner';
        updateCoachPose(loserCoach.rig, loserCoach.anim, dt);
      }

      const refStopMode: RefereeMode =
        (this.winMethod === 'KO' || this.winMethod === 'TKO') && cp < 0.25
          ? 'wave_off'
          : 'stand_corner';
      this.updateReferee(
        dt,
        refStopMode,
        winnerSim.isPlayer ? 0.35 : -0.35,
        -2.25,
        winnerSim.pos.x,
        winnerSim.pos.z,
        1.8,
        true,
      );

      if (cp >= 1) {
        this.phase = 'finished';
        this.emitHud();
      }
      return;
    }

    if (this.phase === 'finished') {
      // Hold final celebration pose gently behind modal
      this.playerSim.anim.time += dt * 0.6;
      this.oppSim.anim.time += dt * 0.6;
      updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
      updateBoxerPose(this.oppSim.rig, this.oppSim.anim, dt);
      if (this.playerCoachSim) {
        this.playerCoachSim.anim.time += dt * 0.6;
        updateCoachPose(this.playerCoachSim.rig, this.playerCoachSim.anim, dt);
      }
      if (this.oppCoachSim) {
        this.oppCoachSim.anim.time += dt * 0.6;
        updateCoachPose(this.oppCoachSim.rig, this.oppCoachSim.anim, dt);
      }
      if (this.refereeSim) {
        this.refereeSim.anim.time += dt * 0.6;
        this.refereeSim.anim.mode = 'stand_corner';
        updateRefereePose(this.refereeSim.rig, this.refereeSim.anim, dt * 0.6);
      }
    }
  }

  private emitHud() {
    if (!this.playerSim || !this.oppSim) return;
    const highlightProgress =
      this.phase === 'highlight'
        ? THREE.MathUtils.clamp(
            (this.highlightCursor - this.highlightStartTime) /
              Math.max(0.05, this.highlightEndTime - this.highlightStartTime),
            0,
            1,
          )
        : 0;
    const phaseProgress =
      this.phase === 'walkout'
        ? THREE.MathUtils.clamp(this.walkoutClock / this.walkoutDuration, 0, 1)
        : this.phase === 'celebration'
          ? THREE.MathUtils.clamp(this.celebrationClock / this.celebrationDuration, 0, 1)
          : highlightProgress;

    this.onHudUpdate({
      playerHp: Math.ceil(this.playerSim.hp),
      playerMaxHp: this.playerSim.maxHp,
      playerStamina: Math.round(this.playerSim.stamina),
      playerMaxStamina: this.playerSim.maxStamina,
      playerGuard: Math.round(this.playerSim.guard),
      playerMaxGuard: this.playerSim.maxGuard,
      playerKnockdowns: this.playerSim.knockdowns,
      oppHp: Math.ceil(this.oppSim.hp),
      oppMaxHp: this.oppSim.maxHp,
      oppStamina: Math.round(this.oppSim.stamina),
      oppMaxStamina: this.oppSim.maxStamina,
      oppGuard: Math.round(this.oppSim.guard),
      oppMaxGuard: this.oppSim.maxGuard,
      oppKnockdowns: this.oppSim.knockdowns,
      round: this.round,
      maxRounds: this.maxRounds,
      roundTimer: this.roundTimer,
      phase: this.phase,
      phaseProgress,
      knockdownTarget: this.knockdownTarget,
      knockdownCount: this.knockdownCount,
      refereeCountdown: this.refereeCountdown,
      calloutText: this.calloutText,
      calloutTone: this.calloutTone,
      playerCombo: this.playerSim.comboCount,
      isCounterWindow: this.playerSim.counterWindowTimer > 0,
      isPlayerGuarding: this.playerSim.isGuarding,
      isClinching: this.clinchTimer > 0,
      bodyShotsMode: this.bodyShotsMode,
      roundScores: this.roundScores,
      cornerAdvice: this.cornerAdvice,
      cornerFocusUsed: this.cornerFocusUsed,
      betweenRoundsTimer: this.phase === 'between_rounds' ? this.phaseTimer : 0,
      highlightPunch: this.highlightPunch,
      highlightAttacker: this.highlightAttacker,
      highlightIsCounter: this.highlightIsCounter,
      highlightProgress,
      winner: this.winner,
      winMethod: this.winMethod,
      statsSummary: { ...this.summary },
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const isHighlight = this.mode === 'fight' && this.phase === 'highlight';
    this.elapsed += isHighlight ? dt * 0.25 : dt;

    if (!this.paused) {
      this.crowdExcitement = THREE.MathUtils.damp(this.crowdExcitement, 0.05, 1.4, dt);
      this.arena.updateCrowd(this.elapsed, this.crowdExcitement, dt);

      if (this.mode === 'attract') {
        if (this.playerSim && this.oppSim) {
          if (this.hitstopTimer > 0) {
            this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
          } else {
            this.updateFighterCombat(this.playerSim, this.oppSim, dt);
            this.updateFighterCombat(this.oppSim, this.playerSim, dt);
            this.resolveFighterSeparation();
            this.playerSim.hp = Math.min(this.playerSim.maxHp, this.playerSim.hp + 12 * dt);
            this.oppSim.hp = Math.min(this.oppSim.maxHp, this.oppSim.hp + 12 * dt);
          }
          this.updateParticles(dt);
        }
      } else if (this.mode === 'waitingroom') {
        this.waitingRoom.update(this.elapsed);
        if (this.playerSim) {
          this.playerSim.anim.time += dt;
          this.playerSim.anim.waitingRoomMode = true;

          if (this.waitingConfirmActive) {
            const prevProgress = this.waitingConfirmTimer / this.WAITING_CONFIRM_DURATION;
            this.waitingConfirmTimer += dt;
            const progress = this.waitingConfirmTimer / this.WAITING_CONFIRM_DURATION;
            if (prevProgress < 0.44 && progress >= 0.44) {
              this.shakeIntensity = 0.045;
              soundEngine.playHit('heavy', false);
            }
            if (progress >= 1) {
              this.waitingConfirmActive = false;
              this.waitingConfirmTimer = 0;
              this.playerSim.anim.waitingConfirmProgress = 0;
              const cb = this.waitingConfirmCallback;
              this.waitingConfirmCallback = null;
              updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
              cb?.();
            } else {
              this.playerSim.anim.waitingConfirmProgress = progress;
              updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
            }
          } else {
            this.playerSim.anim.waitingConfirmProgress = 0;

            if (!this.waitingSpecialActive) {
              this.waitingIdleClock += dt;
              if (this.waitingIdleClock >= this.WAITING_SPECIAL_INTERVAL) {
                this.waitingIdleClock = 0;
                this.waitingSpecialActive = true;
                this.waitingSpecialTimer = 0;
                this.playerSim.anim.waitingSpecialKind = this.waitingSpecialKind;
              }
            } else {
              this.waitingSpecialTimer += dt;
              const progress = this.waitingSpecialTimer / this.WAITING_SPECIAL_DURATION;
              if (progress >= 1) {
                this.waitingSpecialActive = false;
                this.waitingSpecialTimer = 0;
                this.waitingSpecialKind = (this.waitingSpecialKind + 1) % 3;
                this.playerSim.anim.waitingSpecialProgress = 0;
              } else {
                this.playerSim.anim.waitingSpecialProgress = progress;
              }
            }

            if (!this.waitingSpecialActive) {
              this.waitingRotateClock += dt;
              if (
                this.waitingRotateClock >= this.WAITING_ROTATE_INTERVAL &&
                PLAYABLE_FIGHTERS.length > 1
              ) {
                this.waitingRotateClock = 0;
                this.waitingRosterIndex =
                  (this.waitingRosterIndex + 1) % PLAYABLE_FIGHTERS.length;
                const nextFighter = PLAYABLE_FIGHTERS[this.waitingRosterIndex];
                this.setupWaitingRoom(nextFighter);
                this.onWaitingFighterChange?.(nextFighter);
              }
            }

            updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
          }
        }
      } else if (this.mode === 'showcase') {
        if (this.playerSim && this.oppSim) {
          this.playerSim.anim.time += dt;
          this.oppSim.anim.time += dt;
          // Subtle shadow-boxing weave on title showcase
          this.playerSim.anim.isGuarding = Math.sin(this.elapsed * 0.9) > 0.45;
          updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
          updateBoxerPose(this.oppSim.rig, this.oppSim.anim, dt);
        }
      } else if (this.mode === 'faceoff') {
        this.tunnelArena.update(this.elapsed);
        if (this.playerSim) {
          this.playerSim.anim.time += dt;
          this.playerSim.anim.faceOffMode = true;
          const p = Math.min(1, (this.playerSim.anim.faceOffSwitchProgress ?? 1) + dt / 1.18);
          this.playerSim.anim.faceOffSwitchProgress = p;
          const stepT = Math.min(1, p / 0.42);
          const stepEase = 1 - Math.pow(1 - stepT, 3);
          this.playerSim.rig.root.position.set(-0.88, 0, THREE.MathUtils.lerp(0.46, 0.86, stepEase));
          this.playerSim.rig.root.rotation.y = 0.22;
          updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
        }
        if (this.oppSim) {
          this.oppSim.anim.time += dt;
          this.oppSim.anim.faceOffMode = true;
          const p = Math.min(1, (this.oppSim.anim.faceOffSwitchProgress ?? 1) + dt / 1.18);
          this.oppSim.anim.faceOffSwitchProgress = p;
          const stepT = Math.min(1, p / 0.42);
          const stepEase = 1 - Math.pow(1 - stepT, 3);
          this.oppSim.rig.root.position.set(0.88, 0, THREE.MathUtils.lerp(0.46, 0.86, stepEase));
          this.oppSim.rig.root.rotation.y = -0.22;
          updateBoxerPose(this.oppSim.rig, this.oppSim.anim, dt);
        }
      } else if (this.mode === 'creator') {
        if (this.playerSim) {
          this.playerSim.anim.time += dt;
          this.playerSim.anim.waitingRoomMode = true;
          this.playerSim.rig.root.rotation.y = -0.34 + Math.sin(this.elapsed * 0.55) * 0.34;
          updateBoxerPose(this.playerSim.rig, this.playerSim.anim, dt);
        }
      } else {
        if (this.hitstopTimer > 0) {
          this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
        } else {
          this.updateFightStateMachine(dt);
        }
        this.updateParticles(isHighlight ? dt * 0.28 : dt);

        const phaseExcitement =
          this.phase === 'celebration'
            ? 0.95
            : this.phase === 'highlight' || this.phase === 'knockdown'
              ? 0.88
              : this.phase === 'walkout' || this.phase === 'intro'
                ? 0.58
                : this.phase === 'between_rounds'
                  ? 0.42
                  : this.phase === 'finished'
                    ? 0.3
                    : Math.max(0.24, this.crowdExcitement);
        soundEngine.updateCrowdAmbience(phaseExcitement);

        this.hudEmitAccum += dt;
        if (this.hudEmitAccum >= 0.05) {
          this.hudEmitAccum = 0;
          this.emitHud();
        }
      }

      this.updateArenaRopes(isHighlight ? dt * 0.25 : dt);
      this.updateCameraUfc5(dt);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('blur', this.blurHandler);
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);

    this.clearFighters();
    this.arena.dispose();
    this.waitingRoom.dispose();
    this.tunnelArena.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
