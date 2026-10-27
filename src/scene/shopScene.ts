import {
  Box3,
  BoxGeometry,
  Color,
  Group,
  HemisphereLight,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { CharacterConfig } from '../game/character';
import { findPath } from '../game/pathfinding';
import { WALL_PANEL_WIDTH, type Fixture, type Point, type ShopLayout } from '../game/shop';
import { loadGltf } from './assets';
import type { Character, CharacterKit } from './characters';

// The shop, seen from a fixed isometric camera. Models come from assets/ (see CREDITS.md);
// anything without a model yet is a plain labelled box (see ASSETS_NEEDED.md).

const PLACEHOLDER_COLOR = 0xd3c2b1;
const UPGRADE_SPOT_COLOR = 0xdcc5a6;
const TAP_SLOP_PX = 10;
/** Isometric viewing direction: the camera sits this far from its focus point. */
const CAMERA_OFFSET = new Vector3(10, 10, 10);
/** When the walking player leaves this part of the screen (in -1..1 units), the camera follows. */
const FOLLOW_MARGIN = 0.5;
/** Idle animations run at a gentle frame rate to save battery; movement runs at full rate. */
const IDLE_FPS = 24;
const CUSTOMER_TAP_SIZE: [number, number, number] = [0.6, 1.3, 0.6];

export interface ShopSceneEvents {
  /** The player reached an interactive fixture they tapped. */
  arrive(fixture: Fixture): void;
  /** A customer was tapped. */
  customer(index: number): void;
}

interface Customer {
  character: Character;
  hitBox: Mesh;
}

export class ShopScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  private readonly raycaster = new Raycaster();
  private readonly floor: Mesh;
  private readonly hitBoxes = new Map<Object3D, Fixture>();
  private readonly playerRoot = new Group();
  private player: Character | null = null;
  private customers: Customer[] = [];
  private readonly labels: { el: HTMLElement; target: Object3D; height: number }[] = [];
  private readonly labelLayer: HTMLElement;

  private path: Point[] = [];
  private pendingFixture: Fixture | null = null;
  private lastFrame = 0;
  private frameRequested = false;
  private idleTimer = 0;
  private readonly focus = new Vector3();
  private zoom: number;
  private savedView: { focus: Vector3; zoom: number; position: Vector3 } | null = null;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private gesture: { moved: boolean; grab: Vector3 | null; pinchDist: number; pinchZoom: number } | null = null;
  private interactive = true;

  constructor(
    private readonly container: HTMLElement,
    private readonly layout: ShopLayout,
    private readonly events: ShopSceneEvents,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = NeutralToneMapping;
    container.appendChild(this.renderer.domElement);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'scene-labels';
    container.appendChild(this.labelLayer);

    // Soft studio-style lighting for the kit's PBR materials (lighting only, nothing drawn).
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    this.scene.add(new HemisphereLight(0xfff4e6, 0xe8d2b4, 0.8));
    const sun = new DirectionalLight(0xfff1dc, 1.6);
    sun.position.set(6, 12, 8);
    this.scene.add(sun);

    const { width, depth } = layout.room;
    this.floor = new Mesh(new PlaneGeometry(width, depth), new MeshLambertMaterial({ color: new Color(layout.floorColor) }));
    this.floor.rotation.x = -Math.PI / 2;
    this.scene.add(this.floor);

    this.addWalls();
    for (const zone of layout.zones) {
      if (zone.kind !== 'upgrade') continue; // customer areas are invisible: people just stand there
      const [x, z, w, d] = zone.rect;
      const patch = new Mesh(new PlaneGeometry(w, d), new MeshLambertMaterial({ color: UPGRADE_SPOT_COLOR }));
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.01, z);
      this.scene.add(patch);
      this.addLabel(zone.label, patch, 0.05, 'scene-label--zone');
    }
    for (const fixture of layout.fixtures) this.addFixture(fixture);
    for (const d of layout.decor) {
      void this.addModel(d.model, d.position, d.rotation, d.y);
    }

    this.playerRoot.position.set(layout.spawn[0], 0, layout.spawn[1]);
    this.scene.add(this.playerRoot);
    this.addLabel('You', this.playerRoot, 1.2, 'scene-label--player');

    this.zoom = layout.camera.defaultZoom;
    this.focus.set(layout.camera.focus[0], 0, layout.camera.focus[1]);
    this.placeCamera();

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointercancel', (e) => this.endPointer(e));
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  /** When false (a panel is open), taps and idle animation pause; the scene stays drawn. */
  set enabled(value: boolean) {
    this.interactive = value;
    if (value) this.requestFrame();
  }

  private async addModel(path: string, [x, z]: Point, rotation: number, y = 0): Promise<Object3D> {
    const gltf = await loadGltf(path);
    const model = gltf.scene.clone(true);
    model.position.set(x, y, z);
    model.rotation.y = (rotation * Math.PI) / 180;
    this.scene.add(model);
    this.requestFrame();
    return model;
  }

  private addWalls(): void {
    const { width, depth } = this.layout.room;
    const { panels, back, left } = this.layout.walls;
    const half = WALL_PANEL_WIDTH / 2;
    back.forEach((kind, i) => {
      void this.addModel(panels[kind], [-width / 2 + half + i * WALL_PANEL_WIDTH, -depth / 2 - 0.1], 0);
    });
    left.forEach((kind, i) => {
      void this.addModel(panels[kind], [-width / 2 - 0.1, -depth / 2 + half + i * WALL_PANEL_WIDTH], 90);
    });
  }

  private addFixture(fixture: Fixture): void {
    const [w, h, d] = fixture.size;
    // An invisible box over the footprint makes taps easy and reliable.
    const hitBox = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial({ visible: false }));
    hitBox.position.set(fixture.position[0], h / 2, fixture.position[1]);
    this.scene.add(hitBox);
    if (fixture.interact) this.hitBoxes.set(hitBox, fixture);

    if (fixture.model) {
      void this.addModel(fixture.model, fixture.position, fixture.rotation);
    } else {
      const box = new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({ color: PLACEHOLDER_COLOR }));
      box.position.copy(hitBox.position);
      this.scene.add(box);
    }
    if (fixture.label || !fixture.model) {
      this.addLabel(fixture.label ?? fixture.id, hitBox, h / 2 + 0.2, fixture.interact ? 'scene-label--action' : '');
    }
  }

  private addLabel(text: string, target: Object3D, height: number, modifier: string): void {
    const el = document.createElement('div');
    el.className = `scene-label ${modifier}`;
    el.textContent = text;
    this.labelLayer.appendChild(el);
    this.labels.push({ el, target, height });
  }

  /** Replaces the player's look, keeping where they stand. */
  async setPlayer(kit: CharacterKit, config: CharacterConfig): Promise<void> {
    const next = await kit.build(config);
    this.player?.dispose();
    this.player = next;
    this.playerRoot.add(next.root);
    if (this.path.length > 0) next.play('walk');
    this.requestFrame();
  }

  /** Places customers at random spots in the layout's customer zones. */
  async setCustomers(kit: CharacterKit, looks: CharacterConfig[], random: () => number): Promise<void> {
    for (const c of this.customers) {
      c.character.dispose();
      c.hitBox.removeFromParent();
    }
    this.customers = [];
    const zones = this.layout.zones.filter((z) => z.kind === 'customers');
    const characters = await Promise.all(looks.map((look) => kit.build(look)));
    characters.forEach((character, i) => {
      const [x, z, w, d] = zones[i % zones.length].rect;
      const px = x + (random() - 0.5) * w;
      const pz = z + (random() - 0.5) * d;
      character.root.position.set(px, 0, pz);
      // Face roughly towards the room's centre line, with some variety.
      character.root.rotation.y = Math.atan2(-px, 0.5) + (random() - 0.5) * 1.2;
      this.scene.add(character.root);
      const hitBox = new Mesh(new BoxGeometry(...CUSTOMER_TAP_SIZE), new MeshBasicMaterial({ visible: false }));
      hitBox.position.set(px, CUSTOMER_TAP_SIZE[1] / 2, pz);
      this.scene.add(hitBox);
      this.customers.push({ character, hitBox });
    });
    this.requestFrame();
  }

  waveCustomer(index: number): void {
    this.customers[index]?.character.playOnce('wave');
    this.requestFrame();
  }

  /** Zooms in on the player (for the character creator) or back to the previous view. */
  focusOnPlayer(on: boolean): void {
    if (on && !this.savedView) {
      this.savedView = { focus: this.focus.clone(), zoom: this.zoom, position: this.playerRoot.position.clone() };
      // Dress on open floor (the spawn point), where no furniture hides the player from this angle.
      this.path = [];
      this.playerRoot.position.set(this.layout.spawn[0], 0, this.layout.spawn[1]);
      this.playerRoot.rotation.y = Math.PI / 4; // face the camera
      this.player?.play('idle');
      this.focus.copy(this.playerRoot.position).add(new Vector3(0.9, 0, 0.9)); // player sits in the top half
      this.zoom = this.layout.camera.maxZoom * 1.2;
    } else if (!on && this.savedView) {
      this.focus.copy(this.savedView.focus);
      this.zoom = this.savedView.zoom;
      this.playerRoot.position.copy(this.savedView.position);
      this.savedView = null;
    }
    this.placeCamera();
  }

  /** Zoom 1 fits the whole room across the screen; the camera keeps its isometric angle. */
  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);

    const { width, depth, wallHeight } = this.layout.room;
    const box = new Box3(new Vector3(-width / 2, 0, -depth / 2), new Vector3(width / 2, wallHeight, depth / 2));
    const probe = new OrthographicCamera();
    probe.position.copy(CAMERA_OFFSET);
    probe.lookAt(0, 0, 0);
    probe.updateMatrixWorld();
    const view = box.applyMatrix4(probe.matrixWorldInverse);
    const margin = 0.6;
    let halfW = (view.max.x - view.min.x) / 2 + margin;
    let halfH = (view.max.y - view.min.y) / 2 + margin;
    const aspect = w / h;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    Object.assign(this.camera, { left: -halfW, right: halfW, top: halfH, bottom: -halfH, near: -50, far: 100 });
    this.placeCamera();
  }

  private placeCamera(): void {
    const { width, depth } = this.layout.room;
    this.focus.x = Math.min(Math.max(this.focus.x, -width / 2), width / 2);
    this.focus.z = Math.min(Math.max(this.focus.z, -depth / 2), depth / 2);
    this.camera.zoom = this.zoom;
    this.camera.position.copy(this.focus).add(CAMERA_OFFSET);
    this.camera.lookAt(this.focus);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.requestFrame();
  }

  private ndc(clientX: number, clientY: number): Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  }

  private floorPointAt(clientX: number, clientY: number): Vector3 | null {
    this.raycaster.setFromCamera(this.ndc(clientX, clientY), this.camera);
    // Intersect the infinite floor plane (y = 0), so panning works past the room's edge too.
    const { origin, direction } = this.raycaster.ray;
    if (Math.abs(direction.y) < 1e-6) return null;
    return origin.clone().addScaledVector(direction, -origin.y / direction.y);
  }

  private onPointerDown(e: PointerEvent): void {
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.gesture = { moved: false, grab: this.floorPointAt(e.clientX, e.clientY), pinchDist: 0, pinchZoom: this.zoom };
    } else if (this.pointers.size === 2 && this.gesture) {
      const [a, b] = [...this.pointers.values()];
      this.gesture.moved = true;
      this.gesture.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.gesture.pinchZoom = this.zoom;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const start = this.pointers.get(e.pointerId);
    const g = this.gesture;
    if (!start || !g || !this.interactive) return;
    if (this.pointers.size >= 2) {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const { minZoom, maxZoom } = this.layout.camera;
      if (g.pinchDist > 0) this.zoom = Math.min(Math.max((g.pinchZoom * dist) / g.pinchDist, minZoom), maxZoom);
      this.placeCamera();
      return;
    }
    if (!g.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP_SLOP_PX) return;
    g.moved = true;
    // Drag the floor: keep the point first touched under the finger.
    const here = this.floorPointAt(e.clientX, e.clientY);
    if (g.grab && here) {
      this.focus.add(g.grab.clone().sub(here));
      this.placeCamera();
      g.grab = this.floorPointAt(e.clientX, e.clientY);
    }
  }

  private endPointer(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) this.gesture = null;
  }

  private onPointerUp(e: PointerEvent): void {
    const wasTap = this.pointers.size === 1 && this.gesture !== null && !this.gesture.moved;
    this.endPointer(e);
    if (!this.interactive || !wasTap) return;
    this.raycaster.setFromCamera(this.ndc(e.clientX, e.clientY), this.camera);

    // Whatever is nearest the camera under the finger wins: a customer or an interactive fixture.
    const customerBoxes = this.customers.map((c) => c.hitBox);
    const hit = this.raycaster.intersectObjects([...customerBoxes, ...this.hitBoxes.keys()])[0];
    const customerIndex = hit ? customerBoxes.indexOf(hit.object as Mesh) : -1;
    if (customerIndex >= 0) {
      this.events.customer(customerIndex);
      return;
    }
    const fixture = hit && this.hitBoxes.get(hit.object);
    if (fixture?.interact) {
      this.walkTo(fixture.interact.standAt, fixture);
      return;
    }
    const floor = this.floorPointAt(e.clientX, e.clientY);
    if (floor) this.walkTo([floor.x, floor.z], null);
  }

  private walkTo(target: Point, fixture: Fixture | null): void {
    const from: Point = [this.playerRoot.position.x, this.playerRoot.position.z];
    const path = findPath(this.layout, from, target);
    if (!path) return;
    this.path = path;
    this.pendingFixture = fixture;
    this.player?.play('walk');
    this.requestFrame();
  }

  private requestFrame(): void {
    if (this.frameRequested) return;
    window.clearTimeout(this.idleTimer);
    this.frameRequested = true;
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Full frame rate while something moves; a gentle rate for idle animation; nothing while a panel is open. */
  private frame(time: number): void {
    this.frameRequested = false;
    const dt = this.lastFrame ? Math.min((time - this.lastFrame) / 1000, 0.1) : 1 / 60;
    this.lastFrame = time;

    if (this.path.length > 0) this.step(dt);
    this.player?.mixer.update(dt);
    for (const c of this.customers) c.character.mixer.update(dt);
    if (this.path.length > 0) this.follow(dt);

    this.renderer.render(this.scene, this.camera);
    this.placeLabels();

    if (this.path.length > 0) this.requestFrame();
    else if ((this.interactive || this.savedView) && (this.player || this.customers.length > 0)) {
      this.idleTimer = window.setTimeout(() => this.requestFrame(), 1000 / IDLE_FPS);
    } else this.lastFrame = 0;
  }

  private step(dt: number): void {
    const p = this.playerRoot.position;
    let travel = this.layout.walkSpeed * dt;
    while (travel > 0 && this.path.length > 0) {
      const [tx, tz] = this.path[0];
      const dx = tx - p.x;
      const dz = tz - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.001) this.playerRoot.rotation.y = Math.atan2(dx, dz);
      if (dist <= travel) {
        p.x = tx;
        p.z = tz;
        this.path.shift();
        travel -= dist;
      } else {
        p.x += (dx / dist) * travel;
        p.z += (dz / dist) * travel;
        travel = 0;
      }
    }
    if (this.path.length === 0) {
      this.player?.play('idle');
      if (this.pendingFixture) {
        const arrived = this.pendingFixture;
        this.pendingFixture = null;
        // Face the fixture, then act.
        this.playerRoot.rotation.y = Math.atan2(arrived.position[0] - p.x, arrived.position[1] - p.z);
        this.events.arrive(arrived);
      }
    }
  }

  /** Eases the camera towards the walking player when they near the screen's edge. */
  private follow(dt: number): void {
    const p = this.playerRoot.position.clone().project(this.camera);
    if (Math.abs(p.x) < FOLLOW_MARGIN && Math.abs(p.y) < FOLLOW_MARGIN) return;
    const t = Math.min(dt * 3, 1);
    this.focus.x += (this.playerRoot.position.x - this.focus.x) * t;
    this.focus.z += (this.playerRoot.position.z - this.focus.z) * t;
    this.placeCamera();
  }

  private placeLabels(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const v = new Vector3();
    for (const { el, target, height } of this.labels) {
      target.getWorldPosition(v);
      v.y += height;
      v.project(this.camera);
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
  }
}
