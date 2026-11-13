import {
  AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Clock, Color, DirectionalLight, DoubleSide, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  NeutralToneMapping, Object3D, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, PointLight, RingGeometry, Scene, SpotLight, Sprite, SpriteMaterial, SRGBColorSpace,
  TextureLoader, Vector3, WebGLRenderer,
} from 'three';
import { assetUrl, loadGltf, modelPath } from './assets';
import { buildPerson, preloadKit, Person, SIT_HEIGHT, THIEF, watchmanLook } from './kit';
import { makeLevel, mulberry32, type Level, type Seat } from './level';
import { clearLine, distToRect, Nav, rayRect, type Point, type Solid } from './nav';

// The night itself: the room in 3D, the one sneaking through it, the watchmen and what they notice.

export interface Hud {
  night: number;
  got: number;
  total: number;
  quota: number;
  score: number;
  /** How close the most suspicious watchman is to raising the alarm, 0–1. */
  meter: number;
  chased: boolean;
  canSit: boolean;
  sitting: boolean;
  hidden: boolean;
  unlocked: boolean;
}

export interface NightResult {
  night: number;
  got: number;
  total: number;
  score: number;
  gained: number;
  unseen: boolean;
  stars: number;
}

export interface GameEvents {
  hud(h: Hud): void;
  cleared(r: NightResult): void;
  caught(r: NightResult): void;
}

const TAU = Math.PI * 2;
const PLAYER_RADIUS = 0.28;
const WALK = 1.5;
const RUN = 3.5;
const NOISE_RADIUS = 5;
const TAKE_RADIUS = 1.15;
const FOV = (70 * Math.PI) / 180;
const CONE_STEPS = 28;
const CONE_LOOK: Record<string, [number, number]> = { calm: [0xfff2b0, 0.17], wary: [0xffb347, 0.26], alarm: [0xff5040, 0.32] };

type GuardState = 'patrol' | 'pause' | 'curious' | 'search' | 'chase';

interface Guard {
  person: Person;
  pos: Point;
  heading: number;
  state: GuardState;
  path: Point[];
  meter: number;
  timer: number;
  /** Where they turn back to while looking about. */
  lookFrom: number;
  lastSeen: Point;
  lost: number;
  repath: number;
  sees: boolean;
  cone: Mesh<BufferGeometry, MeshBasicMaterial>;
  lamp: SpotLight;
  mark: Sprite;
}

interface LootItem {
  x: number;
  z: number;
  group: Group;
  spark: Sprite;
  baseY: number;
  taken: number | null;
}

function textSprite(text: string, color: string): SpriteMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  g.font = '900 110px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 14;
  g.strokeStyle = '#1b1530';
  g.strokeText(text, 64, 70);
  g.fillStyle = color;
  g.fillText(text, 64, 70);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return new SpriteMaterial({ map, depthTest: false, transparent: true });
}

export class Game {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(45, 1, 0.5, 80);
  private readonly clock = new Clock();
  private readonly moon: DirectionalLight;
  private readonly glow = new PointLight(0xffd9a0, 5, 6.5, 1.6);
  private readonly focus = new Vector3();
  private readonly marks = { '?': textSprite('?', '#ffcf6b'), '!': textSprite('!', '#ff5a4a') };
  private readonly sparkMap = new TextureLoader().load(assetUrl('custom/ui/sparkle.png'));
  private readonly rings: { mesh: Mesh<RingGeometry, MeshBasicMaterial>; age: number; reach: number }[] = [];

  private room = new Group();
  private level: Level | null = null;
  private nav: Nav | null = null;
  private tall: Solid[] = [];
  private reach: Point[] = [];
  private player: Person | null = null;
  private pos: Point = [0, 0];
  private guards: Guard[] = [];
  private loot: LootItem[] = [];
  private door: Object3D | null = null;
  private doorLight: PointLight | null = null;
  private doorGlow: Mesh | null = null;

  private mode: 'idle' | 'demo' | 'play' | 'out' | 'caught' = 'idle';
  private endTimer = 0;
  private time = 0;
  private score = 0;
  private scoreAtStart = 0;
  private got = 0;
  private everChased = false;
  private seat: Seat | null = null;
  private stoodAt: Point = [0, 0];
  private hidden = false;
  private stepTimer = 0;
  private running = false;
  private generation = 0;

  /** Where the stick or keys point: x right, y up the screen, length 0–1. */
  private readonly stick = { x: 0, y: 0 };
  private readonly keys = new Set<string>();

  constructor(
    private readonly container: HTMLElement,
    private readonly events: GameEvents,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.scene.background = new Color(0x141126);

    this.scene.add(new HemisphereLight(0x7f90d8, 0x3a2c48, 1.5));
    this.moon = new DirectionalLight(0x9db2ff, 1.3);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.bias = -0.0005;
    this.moon.shadow.normalBias = 0.03;
    this.scene.add(this.moon, this.moon.target, this.glow, this.room);

    for (let k = 0; k < 6; k++) {
      const mesh = new Mesh(new RingGeometry(0.92, 1, 48), new MeshBasicMaterial({ color: 0xcfd8ff, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.05;
      mesh.visible = false;
      this.scene.add(mesh);
      this.rings.push({ mesh, age: 1, reach: 1 });
    }

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyE') this.toggleSit();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setStick(x: number, y: number): void {
    this.stick.x = x;
    this.stick.y = y;
  }

  get totalScore(): number {
    return this.score;
  }

  /** Lays out a night and puts everyone in it. With `live` false it only plays in the background. */
  async start(night: number, seed: number, live: boolean, score = 0): Promise<void> {
    const generation = ++this.generation;
    this.mode = 'idle';
    const level = makeLevel(night, seed);
    const rng = mulberry32(seed ^ 0x9e3779b9);
    const room = new Group();
    await preloadKit();
    await this.build(level, room);
    const nav = new Nav(level.width, level.depth, level.solids);
    const reach = nav.reach(level.spawn);

    const player = await buildPerson(THIEF);
    const guards: Guard[] = [];
    const starts: Point[] = [];
    for (let k = 0; k < level.guards; k++) {
      // Start far from the way in, and from each other.
      let best = reach[0];
      let bestScore = -Infinity;
      for (let t = 0; t < 60; t++) {
        const c = reach[Math.floor(rng() * reach.length)];
        const s = Math.min(Math.hypot(c[0] - level.spawn[0], c[1] - level.spawn[1]), ...starts.map((p) => 1.5 * Math.hypot(c[0] - p[0], c[1] - p[1])));
        if (s > bestScore) [best, bestScore] = [c, s];
      }
      starts.push(best);
      const person = await buildPerson(watchmanLook(rng));
      const cone = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide }));
      cone.geometry.setAttribute('position', new BufferAttribute(new Float32Array((CONE_STEPS + 2) * 3), 3));
      cone.geometry.setIndex(Array.from({ length: CONE_STEPS }, (_, i) => [0, i + 1, i + 2]).flat());
      cone.frustumCulled = false;
      cone.renderOrder = 2;
      const lamp = new SpotLight(0xfff0c8, 60, 9, FOV / 2, 0.5, 1.4);
      const mark = new Sprite(this.marks['?']);
      mark.scale.setScalar(0.7);
      mark.position.y = 1.55;
      mark.visible = false;
      person.root.add(mark);
      room.add(person.root, cone, lamp, lamp.target);
      guards.push({ person, pos: best, heading: rng() * TAU, state: 'pause', path: [], meter: 0, timer: rng() * 1.5, lookFrom: 0, lastSeen: best, lost: 0, repath: 0, sees: false, cone, lamp, mark });
    }
    if (generation !== this.generation) return; // a newer night was asked for meanwhile

    // Swap the old night for the new one.
    this.player?.dispose();
    for (const g of this.guards) {
      g.person.dispose();
      g.cone.geometry.dispose();
      g.cone.material.dispose();
    }
    this.scene.remove(this.room);
    this.room = room;
    this.scene.add(room);
    room.add(player.root);
    this.level = level;
    this.nav = nav;
    this.reach = reach;
    this.tall = level.solids.filter((s) => s.tall);
    this.player = player;
    this.guards = guards;
    this.pos = [...level.spawn];
    player.root.position.set(this.pos[0], 0, this.pos[1]);
    player.root.rotation.y = Math.PI;
    this.score = this.scoreAtStart = score;
    this.got = 0;
    this.everChased = false;
    this.seat = null;
    this.hidden = false;
    this.running = false;
    this.focus.set(this.pos[0], 0, this.pos[1]);
    this.moon.position.set(-7, 14, 6);
    this.moon.target.position.set(0, 0, 0);
    const half = Math.max(level.width, level.depth) / 2 + 3;
    Object.assign(this.moon.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 40 });
    this.moon.shadow.camera.updateProjectionMatrix();
    this.mode = live ? 'play' : 'demo';
    this.clock.getDelta();
  }

  private async build(level: Level, room: Group): Promise<void> {
    const { width: W, depth: D } = level;
    const jobs: Promise<void>[] = [];
    const add = (model: string, x: number, y: number, z: number, turn: number, into: Object3D = room): Promise<void> => {
      const job = loadGltf(modelPath(model)).then((gltf) => {
        const o = gltf.scene.clone(true);
        o.position.set(x, y, z);
        o.rotation.y = turn;
        o.traverse((m) => {
          m.castShadow = true;
          m.receiveShadow = true;
        });
        into.add(o);
      });
      jobs.push(job);
      return job;
    };
    for (let x = -W / 2 + 1; x < W / 2; x += 2) {
      for (let z = -D / 2 + 1; z < D / 2; z += 2) add('floor-parquet', x, 0, z, 0);
      add('floor-kerb', x, 0, D / 2, 0);
    }
    const wall = (kind: string) => `wall-${kind}`;
    level.walls.north.forEach((kind, i) => add(wall(kind), -W / 2 + 1 + 2 * i, 0, -D / 2 - 0.1, 0));
    level.walls.west.forEach((kind, i) => add(wall(kind), -W / 2 - 0.1, 0, -D / 2 + 1 + 2 * i, Math.PI / 2));
    level.walls.east.forEach((kind, i) => add(wall(kind), W / 2 + 0.1, 0, -D / 2 + 1 + 2 * i, -Math.PI / 2));
    add('wall-corner', -W / 2 - 0.1, 0, -D / 2 - 0.1, 0);
    add('wall-corner', W / 2 + 0.1, 0, -D / 2 - 0.1, 0);
    // A dark floor beyond the room's open side, so it doesn't float.
    const under = new Mesh(new PlaneGeometry(W + 30, D + 30), new MeshBasicMaterial({ color: 0x100d1f }));
    under.rotation.x = -Math.PI / 2;
    under.position.y = -0.3;
    room.add(under);

    for (const p of level.props) {
      add(p.model, p.x, p.y, p.z, (p.rot * Math.PI) / 2 + (p.spin ?? 0));
      if (p.lamp) {
        const light = new PointLight(0xffc98a, 7, 6, 1.5);
        light.position.set(p.x, 1.35, p.z);
        room.add(light);
      }
    }

    // The way out: a door that opens once enough has been taken.
    const hinge = new Group();
    hinge.position.set(level.doorX - 0.54, 0, -D / 2 - 0.1);
    add('door-arched', 0.54, 0, 0, 0, hinge);
    room.add(hinge);
    this.door = hinge;
    add('wall-clock', level.doorX, 2.45, -D / 2 + 0.05, 0);
    for (const side of [-1, 1]) add('wall-sconce', level.doorX + side * 0.92, 1.75, -D / 2 + 0.05, 0);
    const doorGlow = new Mesh(new PlaneGeometry(1.2, 2.2), new MeshBasicMaterial({ color: 0xffe2a8 }));
    doorGlow.position.set(level.doorX, 1.1, -D / 2 - 0.32);
    doorGlow.visible = false;
    room.add(doorGlow);
    this.doorGlow = doorGlow;
    const doorLight = new PointLight(0xffd9a0, 0, 7, 1.4);
    doorLight.position.set(level.doorX, 1.6, -D / 2 + 0.7);
    room.add(doorLight);
    this.doorLight = doorLight;

    this.loot = level.loot.map((l) => {
      const group = new Group();
      const baseY = l.y + 0.06;
      group.position.set(l.x, baseY, l.z);
      group.scale.setScalar(2.4);
      add(l.model, 0, 0, 0, 0, group);
      const spark = new Sprite(new SpriteMaterial({ map: this.sparkMap, transparent: true, depthWrite: false, blending: AdditiveBlending, color: 0xfff3c4 }));
      spark.position.set(l.x, baseY + 0.62, l.z);
      room.add(group, spark);
      return { x: l.x, z: l.z, group, spark, baseY, taken: null };
    });
    await Promise.all(jobs);
  }

  private resize(): void {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.mode !== 'idle') this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  // ---- The one sneaking -------------------------------------------------------------------

  private input(): { x: number; z: number; run: boolean } {
    let x = this.stick.x;
    let z = -this.stick.y;
    let run = Math.hypot(x, z) > 0.72;
    const k = this.keys;
    const kx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const kz = (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0);
    if (kx || kz) {
      x = kx;
      z = kz;
      run = !(k.has('ShiftLeft') || k.has('ShiftRight'));
    }
    const m = Math.hypot(x, z);
    return m < 0.15 ? { x: 0, z: 0, run: false } : { x: x / m, z: z / m, run };
  }

  private blocked(x: number, z: number): boolean {
    const { width: W, depth: D } = this.level!;
    if (Math.abs(x) > W / 2 - PLAYER_RADIUS || z < -D / 2 + PLAYER_RADIUS + 0.1 || z > D / 2 - PLAYER_RADIUS) return true;
    return this.level!.solids.some((s) => distToRect(x, z, s) < PLAYER_RADIUS);
  }

  private nearSeat(): Seat | null {
    let best: Seat | null = null;
    let bestD = 0.6;
    for (const s of this.level!.seats) {
      const d = distToRect(this.pos[0], this.pos[1], s.rect);
      if (d < bestD) [best, bestD] = [s, d];
    }
    return best;
  }

  toggleSit(): void {
    if (this.mode !== 'play' || !this.player) return;
    const root = this.player.root;
    if (this.seat) {
      this.seat = null;
      this.hidden = false;
      this.pos = [...this.stoodAt];
      root.position.set(this.pos[0], 0, this.pos[1]);
      this.player.play('idle');
      return;
    }
    const seat = this.nearSeat();
    if (!seat) return;
    this.seat = seat;
    this.stoodAt = [...this.pos];
    this.pos = [seat.x, seat.z];
    root.position.set(seat.x, seat.height - SIT_HEIGHT, seat.z);
    root.rotation.y = (seat.rot * Math.PI) / 2;
    this.player.play('sit');
    // Sitting down only fools those who weren't watching.
    this.hidden = !this.guards.some((g) => g.sees || g.state === 'chase');
    this.running = false;
  }

  private movePlayer(dt: number): void {
    const player = this.player!;
    if (this.seat) {
      if (!this.hidden && !this.guards.some((g) => g.sees || g.state === 'chase')) this.hidden = true;
      const i = this.input();
      if (i.x || i.z) this.toggleSit();
      return;
    }
    const i = this.input();
    if (!i.x && !i.z) {
      player.play('idle');
      this.running = false;
      return;
    }
    const speed = i.run ? RUN : WALK;
    const nx = this.pos[0] + i.x * speed * dt;
    const nz = this.pos[1] + i.z * speed * dt;
    if (!this.blocked(nx, nz)) this.pos = [nx, nz];
    else if (!this.blocked(nx, this.pos[1])) this.pos[0] = nx;
    else if (!this.blocked(this.pos[0], nz)) this.pos[1] = nz;
    player.root.position.set(this.pos[0], 0, this.pos[1]);
    player.face(Math.atan2(i.x, i.z), dt * 14);
    player.play(i.run ? 'run' : 'walk', i.run ? 1.1 : 1.25);
    this.running = i.run;
    if (i.run) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.3;
        this.noise(this.pos, NOISE_RADIUS);
      }
    } else this.stepTimer = 0;
  }

  /** A sound: a ring on the floor, and any watchman in earshot comes to look. */
  private noise(at: Point, radius: number): void {
    const ring = this.rings.find((r) => r.age >= 1);
    if (ring) {
      ring.age = 0;
      ring.reach = radius;
      ring.mesh.position.set(at[0], 0.05, at[1]);
      ring.mesh.visible = true;
    }
    for (const g of this.guards) {
      if (g.state === 'chase' || Math.hypot(g.pos[0] - at[0], g.pos[1] - at[1]) > radius) continue;
      g.meter = Math.max(g.meter, 0.35);
      this.investigate(g, at);
    }
  }

  // ---- The watchmen -----------------------------------------------------------------------

  private range(): number {
    return Math.min(7.5, 5.25 + 0.25 * this.level!.night);
  }

  private canSee(g: Guard): boolean {
    if (this.mode !== 'play' || (this.seat && this.hidden)) return false;
    const dx = this.pos[0] - g.pos[0];
    const dz = this.pos[1] - g.pos[1];
    const d = Math.hypot(dx, dz);
    if (d > this.range()) return false;
    if (d > 0.9) {
      const off = Math.atan2(dx, dz) - g.heading;
      if (Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) > FOV / 2) return false;
    }
    return clearLine(g.pos, this.pos, this.tall);
  }

  private go(g: Guard, to: Point): boolean {
    const path = this.nav!.path(g.pos, to);
    if (!path) return false;
    g.path = path.slice(1);
    return true;
  }

  private investigate(g: Guard, at: Point): void {
    g.state = 'curious';
    g.timer = 0.5; // a moment's pause before walking over
    g.lastSeen = [...at];
    this.go(g, at);
  }

  private wander(g: Guard): void {
    for (let t = 0; t < 12; t++) {
      const c = this.reach[Math.floor(Math.random() * this.reach.length)];
      if (Math.hypot(c[0] - g.pos[0], c[1] - g.pos[1]) < 4 && t < 11) continue;
      if (this.go(g, c)) break;
    }
    g.state = 'patrol';
  }

  /** Walks along the path; true once there. */
  private follow(g: Guard, speed: number, dt: number): boolean {
    let left = speed * dt;
    while (left > 0 && g.path.length) {
      const [tx, tz] = g.path[0];
      const dx = tx - g.pos[0];
      const dz = tz - g.pos[1];
      const d = Math.hypot(dx, dz);
      if (d <= left) {
        g.pos = [tx, tz];
        g.path.shift();
        left -= d;
      } else {
        g.pos = [g.pos[0] + (dx / d) * left, g.pos[1] + (dz / d) * left];
        this.turn(g, Math.atan2(dx, dz), dt * (g.state === 'chase' ? 10 : 5));
        left = 0;
      }
    }
    return g.path.length === 0;
  }

  private turn(g: Guard, heading: number, step: number): void {
    const d = Math.atan2(Math.sin(heading - g.heading), Math.cos(heading - g.heading));
    g.heading += Math.max(-step, Math.min(step, d));
  }

  private updateGuard(g: Guard, dt: number): void {
    const dist = Math.hypot(this.pos[0] - g.pos[0], this.pos[1] - g.pos[1]);
    g.sees = this.canSee(g);
    if (g.sees) {
      const wary = g.state === 'curious' || g.state === 'search' ? 1.5 : 1;
      g.meter = Math.min(1, g.meter + dt * (0.5 + 1.7 * (1 - dist / this.range())) * (this.running ? 1.4 : 1) * wary);
      g.lastSeen = [...this.pos];
    } else if (g.state !== 'chase') g.meter = Math.max(0, g.meter - dt * 0.28);

    if (g.state !== 'chase' && g.meter >= 1) {
      g.state = 'chase';
      g.lost = 0;
      g.repath = 0;
      this.everChased = true;
    } else if (g.sees && g.meter > 0.3 && (g.state === 'patrol' || g.state === 'pause')) {
      this.investigate(g, this.pos);
    }

    let moving = false;
    switch (g.state) {
      case 'patrol':
        moving = true;
        if (this.follow(g, 1.15, dt)) {
          g.state = 'pause';
          g.timer = 1 + Math.random() * 1.8;
          g.lookFrom = g.heading;
        }
        break;
      case 'pause':
      case 'search': {
        g.timer -= dt;
        const sweep = g.state === 'search' ? 1.25 : 0.7;
        this.turn(g, g.lookFrom + Math.sin(g.timer * (g.state === 'search' ? 2.4 : 1.6)) * sweep, dt * 3);
        if (g.timer <= 0) this.wander(g);
        break;
      }
      case 'curious':
        if (g.timer > 0) {
          g.timer -= dt;
          this.turn(g, Math.atan2(g.lastSeen[0] - g.pos[0], g.lastSeen[1] - g.pos[1]), dt * 6);
          break;
        }
        moving = true;
        if (this.follow(g, 1.75, dt)) {
          g.state = 'search';
          g.timer = 2.6;
          g.lookFrom = g.heading;
        }
        break;
      case 'chase': {
        g.lost = g.sees ? 0 : g.lost + dt;
        g.repath -= dt;
        if (g.repath <= 0) {
          g.repath = 0.25;
          this.go(g, g.lastSeen);
        }
        moving = true;
        const there = this.follow(g, 2.95, dt);
        if (g.sees && dist < 0.75 && this.mode === 'play') this.end('caught', g);
        else if (g.lost > 2.5 || (there && !g.sees && g.lost > 0.4)) {
          g.state = 'search';
          g.timer = 3.6;
          g.lookFrom = g.heading;
          g.meter = 0.6;
        }
        break;
      }
    }

    const root = g.person.root;
    root.position.set(g.pos[0], 0, g.pos[1]);
    root.rotation.y = g.heading;
    if (this.mode !== 'caught') g.person.play(moving ? (g.state === 'chase' ? 'run' : 'walk') : 'idle', g.state === 'chase' ? 0.95 : g.state === 'curious' ? 1.3 : 1);

    const mood = g.state === 'chase' ? 'alarm' : g.state === 'curious' || g.state === 'search' || g.meter > 0.3 ? 'wary' : 'calm';
    g.mark.visible = mood !== 'calm';
    g.mark.material = this.marks[mood === 'alarm' ? '!' : '?'];
    this.drawCone(g, mood);
  }

  /** The patch of floor a watchman can see: a fan of rays, cut short by tall furniture and the walls. */
  private drawCone(g: Guard, mood: string): void {
    const { width: W, depth: D } = this.level!;
    const range = this.range();
    const at = g.cone.geometry.getAttribute('position') as BufferAttribute;
    at.setXYZ(0, g.pos[0], 0.04, g.pos[1]);
    for (let i = 0; i <= CONE_STEPS; i++) {
      const a = g.heading - FOV / 2 + (FOV * i) / CONE_STEPS;
      const dx = Math.sin(a);
      const dz = Math.cos(a);
      let t = range;
      if (dx > 0) t = Math.min(t, (W / 2 - g.pos[0]) / dx);
      if (dx < 0) t = Math.min(t, (-W / 2 - g.pos[0]) / dx);
      if (dz > 0) t = Math.min(t, (D / 2 - g.pos[1]) / dz);
      if (dz < 0) t = Math.min(t, (-D / 2 - g.pos[1]) / dz);
      for (const s of this.tall) t = Math.min(t, rayRect(g.pos[0], g.pos[1], dx, dz, s));
      at.setXYZ(i + 1, g.pos[0] + dx * t, 0.04, g.pos[1] + dz * t);
    }
    at.needsUpdate = true;
    const [color, opacity] = CONE_LOOK[mood];
    g.cone.material.color.setHex(color);
    g.cone.material.opacity = opacity;
    g.lamp.color.setHex(mood === 'alarm' ? 0xff9a80 : 0xfff0c8);
    g.lamp.position.set(g.pos[0], 1.05, g.pos[1]);
    g.lamp.target.position.set(g.pos[0] + Math.sin(g.heading) * 4, 0.2, g.pos[1] + Math.cos(g.heading) * 4);
    g.lamp.distance = range + 2.5;
  }

  // ---- The night ---------------------------------------------------------------------------

  private result(): NightResult {
    const level = this.level!;
    const all = this.got === level.loot.length;
    const unseen = !this.everChased;
    return { night: level.night, got: this.got, total: level.loot.length, score: this.score, gained: this.score - this.scoreAtStart, unseen, stars: 1 + (all ? 1 : 0) + (unseen ? 1 : 0) };
  }

  private end(how: 'out' | 'caught', by?: Guard): void {
    const level = this.level!;
    this.mode = how;
    this.endTimer = how === 'out' ? 1.2 : 1.1;
    this.running = false;
    if (how === 'out') {
      if (this.got === level.loot.length) this.score += 150 * level.night;
      if (!this.everChased) this.score += 250 * level.night;
      this.player!.once('jump');
      this.player!.face(0);
    } else {
      this.player!.play('idle');
      if (by) {
        this.player!.face(Math.atan2(by.pos[0] - this.pos[0], by.pos[1] - this.pos[1]));
        by.person.once('wave');
      }
    }
  }

  private update(dt: number): void {
    const level = this.level!;
    this.time += dt;
    if (this.mode === 'play') this.movePlayer(dt);
    for (const g of this.guards) {
      if (this.mode === 'caught' || this.mode === 'out') {
        g.sees = false;
        if (this.mode === 'out') this.updateGuard(g, dt);
      } else this.updateGuard(g, dt);
      g.person.mixer.update(dt);
    }
    this.player?.mixer.update(dt);

    // Take what's in reach.
    const unlocked = this.got >= level.quota;
    for (const l of this.loot) {
      if (l.taken === null) {
        l.group.rotation.y = this.time * 1.2;
        l.group.position.y = l.baseY + 0.04 + Math.sin(this.time * 2.2 + l.x) * 0.03;
        l.spark.scale.setScalar(0.34 + Math.sin(this.time * 4 + l.z) * 0.08);
        l.spark.material.rotation = this.time * 0.8;
        if (this.mode === 'play' && !this.seat && Math.hypot(l.x - this.pos[0], l.z - this.pos[1]) <= TAKE_RADIUS) {
          l.taken = 0;
          this.got++;
          this.score += 100 * level.night;
        }
      } else if (l.taken < 1) {
        l.taken = Math.min(1, l.taken + dt * 2.6);
        l.group.position.y = l.baseY + l.taken * 0.9;
        l.group.rotation.y += dt * 14;
        l.group.scale.setScalar(2.4 * (1 - l.taken));
        l.spark.scale.setScalar(0.4 + l.taken * 0.9);
        l.spark.material.opacity = 1 - l.taken;
        l.spark.position.y = l.group.position.y + 0.5;
        if (l.taken >= 1) l.group.visible = l.spark.visible = false;
      }
    }

    // The way out.
    if (this.door && this.doorLight && this.doorGlow) {
      const open = unlocked && this.mode !== 'demo' ? 1 : 0;
      this.door.rotation.y += (open * 1.9 - this.door.rotation.y) * Math.min(1, dt * 4);
      this.doorGlow.visible = open === 1;
      this.doorLight.intensity = open ? 9 + Math.sin(this.time * 3) * 2 : 0;
      if (this.mode === 'play' && unlocked && !this.seat && Math.hypot(level.doorX - this.pos[0], -level.depth / 2 + 0.45 - this.pos[1]) < 0.75) this.end('out');
    }

    for (const r of this.rings) {
      if (r.age >= 1) continue;
      r.age = Math.min(1, r.age + dt * 1.8);
      r.mesh.scale.setScalar(0.3 + r.age * r.reach);
      r.mesh.material.opacity = 0.3 * (1 - r.age);
      if (r.age >= 1) r.mesh.visible = false;
    }

    if (this.mode === 'out' || this.mode === 'caught') {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        const how = this.mode;
        this.mode = 'idle';
        if (how === 'out') this.events.cleared(this.result());
        else this.events.caught(this.result());
      }
    }

    // The camera looks down from the south and keeps the sneak in view.
    const demo = this.mode === 'demo';
    const tx = demo ? Math.sin(this.time * 0.12) * 1.5 : this.pos[0];
    const tz = demo ? 0 : Math.max(-level.depth / 2 + 3.2, this.pos[1] - 1.3);
    const ease = Math.min(1, dt * 5);
    this.focus.x += (tx - this.focus.x) * ease;
    this.focus.z += (tz - this.focus.z) * ease;
    const vHalf = (this.camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * this.camera.aspect);
    const across = demo ? level.width + 1 : 9.5;
    const dist = Math.min(26, Math.max(across / 2 / Math.tan(hHalf), 9 / 2 / Math.tan(vHalf)));
    const tilt = (56 * Math.PI) / 180;
    this.camera.position.set(this.focus.x, Math.sin(tilt) * dist, this.focus.z + Math.cos(tilt) * dist);
    this.camera.lookAt(this.focus);
    this.glow.position.set(this.pos[0], 1.5, this.pos[1]);
    this.glow.intensity = demo ? 0 : this.seat && this.hidden ? 1.5 : 5;

    if (this.mode === 'play') {
      this.events.hud({
        night: level.night,
        got: this.got,
        total: level.loot.length,
        quota: level.quota,
        score: this.score,
        meter: Math.max(0, ...this.guards.map((g) => (g.state === 'chase' ? 1 : g.meter))),
        chased: this.guards.some((g) => g.state === 'chase'),
        canSit: !!this.seat || !!this.nearSeat(),
        sitting: !!this.seat,
        hidden: this.hidden,
        unlocked,
      });
    }
  }
}
