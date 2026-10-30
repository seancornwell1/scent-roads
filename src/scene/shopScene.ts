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
import { WALL_PANEL_WIDTH, isWalkable, type BackRoomLayout, type Fixture, type Point, type RoomId, type RoomLayout, type ShopLayout } from '../game/shop';
import { loadGltf } from './assets';
import type { Character, CharacterKit } from './characters';
import { Crowd, type CrowdEntry, type Label } from './crowd';

// The shop and its back room, seen from a fixed isometric camera. Both rooms live in one
// scene, each in its own group; only the room you're in is shown, and a short fade covers
// the move between them. Models come from assets/ (see CREDITS.md); anything without a
// model yet is a plain labelled box (see ASSETS_NEEDED.md).

const PLACEHOLDER_COLOR = 0xd3c2b1;
const UPGRADE_SPOT_COLOR = 0xdcc5a6;
const TAP_SLOP_PX = 10;
/** Isometric viewing direction: the camera sits this far from its focus point. */
const CAMERA_OFFSET = new Vector3(10, 10, 10);
/** When the walking player leaves this share of the view around its middle, the camera follows. */
const FOLLOW_MARGIN = 0.4;
/** Idle animations run at a gentle frame rate to save battery; movement runs at full rate. */
const IDLE_FPS = 24;
/** How long the screen takes to fade out (and back in) when moving between rooms. */
const FADE_MS = 280;

export interface ShopSceneEvents {
  /** The player reached an interactive fixture they tapped. */
  arrive(fixture: Fixture): void;
  /** A customer was tapped (by visit id). */
  customer(id: string): void;
  /** The player started (true) or stopped (false) walking. */
  walking(on: boolean): void;
  /** A customer came in through the front door. */
  customerEntered(): void;
}


export class ShopScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  private readonly raycaster = new Raycaster();
  /** The room you're in, and each room's group of models. */
  private room: RoomId = 'shop';
  private readonly groups: Record<RoomId, Group> = { shop: new Group(), back: new Group() };
  /** Tappable fixtures (and crates), each with the room it's in. */
  private readonly hitBoxes = new Map<Object3D, Fixture>();
  private readonly playerRoot = new Group();
  private player: Character | null = null;
  private readonly crowd: Crowd;
  private crates: Object3D[] = [];
  private readonly spotMarkers = new Map<string, { patch: Object3D; label: Label }>();
  private placed: Object3D[] = [];
  private placedKey = '';
  /** Labels over things, each with the room it belongs to (null: whichever room you're in). */
  private readonly labels: { el: HTMLElement; target: Object3D; height: number; room: RoomId | null }[] = [];
  private rackBottles: Object3D[] = [];
  private rackKey = '';
  private rackLabel: HTMLElement | null = null;
  private readonly fade: HTMLElement;
  private travelling = false;
  private readonly labelLayer: HTMLElement;

  private path: Point[] = [];
  private pendingFixture: Fixture | null = null;
  private lastFrame = 0;
  private frameRequested = false;
  private idleTimer = 0;
  private readonly focus = new Vector3();
  private zoom: number;
  private savedView: { focus: Vector3; zoom: number; position: Vector3 } | null = null;
  /** Screen pixels at the top covered by the HUD: the room is framed below them. */
  private topInset = 0;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private gesture: { moved: boolean; grab: Vector3 | null; pinchDist: number; pinchZoom: number } | null = null;
  private interactive = true;
  /** The on-screen joystick: where it's pushed (screen units, -1..1, up is +y), while held. */
  private stick: { x: number; y: number } | null = null;
  private readonly stickBase: HTMLElement;
  private readonly stickKnob: HTMLElement;
  /** Whether the view has been centred on the player since the screen first had a size. */
  private centred = false;

  constructor(
    private readonly container: HTMLElement,
    private readonly rooms: { shop: ShopLayout; back: BackRoomLayout },
    private readonly events: ShopSceneEvents,
    browseSeconds: [number, number],
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = NeutralToneMapping;
    container.appendChild(this.renderer.domElement);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'scene-labels';
    container.appendChild(this.labelLayer);
    // A plain fade to the page colour while moving between rooms.
    this.fade = document.createElement('div');
    this.fade.className = 'scene-fade';
    container.appendChild(this.fade);
    // The joystick, bottom right: a plain placeholder until its art arrives (ASSETS_NEEDED.md).
    this.stickBase = document.createElement('div');
    this.stickBase.className = 'joystick';
    this.stickKnob = document.createElement('div');
    this.stickKnob.className = 'joystick-knob';
    this.stickKnob.textContent = 'Move';
    this.stickBase.appendChild(this.stickKnob);
    container.appendChild(this.stickBase);
    this.stickBase.addEventListener('pointerdown', (e) => this.onStick(e, true));
    this.stickBase.addEventListener('pointermove', (e) => this.onStick(e, false));
    this.stickBase.addEventListener('pointerup', () => this.releaseStick());
    this.stickBase.addEventListener('pointercancel', () => this.releaseStick());

    // Soft studio-style lighting for the kit's PBR materials (lighting only, nothing drawn).
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    this.scene.add(new HemisphereLight(0xfff4e6, 0xe8d2b4, 0.8));
    const sun = new DirectionalLight(0xfff1dc, 1.6);
    sun.position.set(6, 12, 8);
    this.scene.add(sun);

    for (const id of ['shop', 'back'] as RoomId[]) {
      this.groups[id].visible = id === this.room;
      this.scene.add(this.groups[id]);
      this.buildRoom(id);
    }
    for (const zone of rooms.shop.zones) {
      if (zone.kind !== 'upgrade') continue; // customer areas are invisible: people just stand there
      const [x, z, w, d] = zone.rect;
      const patch = new Mesh(new PlaneGeometry(w, d), new MeshLambertMaterial({ color: UPGRADE_SPOT_COLOR }));
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(x, 0.01, z);
      this.groups.shop.add(patch);
      const label = this.addLabel(zone.label, patch, 0.05, 'scene-label--zone', 'shop');
      this.spotMarkers.set(zone.id, { patch, label });
    }

    this.crowd = new Crowd(
      {
        scene: this.groups.shop,
        layout: rooms.shop,
        addLabel: (text, target, height, modifier) => this.addLabel(text, target, height, modifier, 'shop'),
        removeLabel: (label) => this.removeLabel(label),
        requestFrame: () => this.requestFrame(),
        entered: () => this.events.customerEntered(),
      },
      browseSeconds,
    );

    this.playerRoot.position.set(rooms.shop.spawn[0], 0, rooms.shop.spawn[1]);
    this.scene.add(this.playerRoot);
    this.addLabel('You', this.playerRoot, 1.2, 'scene-label--player', null);

    this.zoom = rooms.shop.camera.defaultZoom;
    this.focus.set(rooms.shop.camera.focus[0], 0, rooms.shop.camera.focus[1]);
    this.placeCamera();

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointercancel', (e) => this.endPointer(e));
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  /** The layout of the room you're in. */
  private get layout(): RoomLayout {
    return this.rooms[this.room];
  }

  /** Which room you're in. */
  get currentRoom(): RoomId {
    return this.room;
  }

  /** Builds a room's floor, walls, fixtures and decor into its group. */
  private buildRoom(id: RoomId): void {
    const layout = this.rooms[id];
    const group = this.groups[id];
    const { width, depth } = layout.room;
    const floor = new Mesh(new PlaneGeometry(width, depth), new MeshLambertMaterial({ color: new Color(layout.floorColor) }));
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);
    if (layout.floorTile) {
      // The plain plane stays underneath the tiles, out of their way.
      floor.position.y = -layout.floorTile.height - 0.01;
      this.addFloorTiles(layout, group);
    }
    this.addWalls(layout, group);
    for (const fixture of layout.fixtures) this.addFixture(fixture, id);
    for (const d of layout.decor) void this.addModel(d.model, d.position, d.rotation, d.y, group);
  }

  /**
   * Moves to the other room: the screen fades out, you arrive by the door you came through
   * (its fixture leads back to the room you left), and the view settles on you.
   */
  async travel(to: RoomId): Promise<void> {
    if (to === this.room || this.travelling) return;
    this.travelling = true;
    const from = this.room;
    this.releaseStick();
    this.path = [];
    this.pendingFixture = null;
    this.fade.classList.add('on');
    await new Promise((r) => window.setTimeout(r, FADE_MS));
    this.room = to;
    for (const id of ['shop', 'back'] as RoomId[]) this.groups[id].visible = id === to;
    const door = this.layout.fixtures.find((f) => f.interact?.action === from);
    const [x, z] = door?.interact?.standAt ?? this.layout.spawn;
    this.playerRoot.position.set(x, 0, z);
    this.player?.play('idle');
    this.zoom = this.layout.camera.defaultZoom;
    this.focus.set(x, 0, z);
    this.resize();
    this.centreOnPlayer();
    this.fade.classList.remove('on');
    this.travelling = false;
    this.requestFrame();
  }

  /** When false (a panel is open), taps and idle animation pause; the scene stays drawn. */
  set enabled(value: boolean) {
    this.interactive = value;
    this.stickBase.hidden = !value;
    if (!value) this.releaseStick();
    if (value) this.requestFrame();
  }

  /** Pushing the joystick walks the player that way, sliding along anything in the way. */
  private onStick(e: PointerEvent, down: boolean): void {
    if (!this.interactive) return;
    if (down) {
      this.stickBase.setPointerCapture(e.pointerId);
      this.path = []; // the stick takes over from any walk to a fixture
      this.pendingFixture = null;
    } else if (!this.stick) return;
    const r = this.stickBase.getBoundingClientRect();
    const radius = r.width / 2;
    let x = (e.clientX - (r.left + radius)) / radius;
    let y = -(e.clientY - (r.top + radius)) / radius;
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const was = this.stick;
    this.stick = { x, y };
    this.stickKnob.style.transform = `translate(${x * radius * 0.6}px, ${-y * radius * 0.6}px)`;
    if (!was) {
      this.player?.play('walk');
      this.events.walking(true);
    }
    this.requestFrame();
  }

  private releaseStick(): void {
    if (!this.stick) return;
    this.stick = null;
    this.stickKnob.style.transform = '';
    this.player?.play('idle');
    this.events.walking(false);
    this.requestFrame();
  }

  /** Moves the player by the joystick: screen directions turned into floor directions. */
  private steer(dt: number): void {
    const { x, y } = this.stick!;
    const amount = Math.hypot(x, y);
    if (amount < 0.15) return; // a dead zone in the middle
    const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).setY(0).normalize();
    const up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1).setY(0).normalize();
    const dir = right.multiplyScalar(x).add(up.multiplyScalar(y)).normalize();
    const travel = this.layout.walkSpeed * Math.min(1, amount) * dt;
    const p = this.playerRoot.position;
    this.playerRoot.rotation.y = Math.atan2(dir.x, dir.z);
    const nx = p.x + dir.x * travel;
    const nz = p.z + dir.z * travel;
    // Slide along walls and furniture: try the whole step, then each axis alone.
    if (isWalkable(this.layout, [nx, nz])) p.set(nx, 0, nz);
    else if (isWalkable(this.layout, [nx, p.z])) p.x = nx;
    else if (isWalkable(this.layout, [p.x, nz])) p.z = nz;
  }

  private async addModel(path: string, [x, z]: Point, rotation: number, y: number, parent: Object3D): Promise<Object3D> {
    const gltf = await loadGltf(path);
    const model = gltf.scene.clone(true);
    model.position.set(x, y, z);
    model.rotation.y = (rotation * Math.PI) / 180;
    parent.add(model);
    this.requestFrame();
    return model;
  }

  /** Repeats the floor tile model across the room, sunk so its top is level with y = 0. */
  private addFloorTiles(layout: RoomLayout, group: Object3D): void {
    const { model, size, height } = layout.floorTile!;
    const { width, depth } = layout.room;
    for (let x = -width / 2 + size / 2; x < width / 2; x += size) {
      for (let z = -depth / 2 + size / 2; z < depth / 2; z += size) void this.addModel(model, [x, z], 0, -height, group);
    }
  }

  private addWalls(layout: RoomLayout, group: Object3D): void {
    const { width, depth } = layout.room;
    const { panels, back, left } = layout.walls;
    const half = WALL_PANEL_WIDTH / 2;
    back.forEach((kind, i) => {
      void this.addModel(panels[kind], [-width / 2 + half + i * WALL_PANEL_WIDTH, -depth / 2 - 0.1], 0, 0, group);
    });
    left.forEach((kind, i) => {
      void this.addModel(panels[kind], [-width / 2 - 0.1, -depth / 2 + half + i * WALL_PANEL_WIDTH], 90, 0, group);
    });
  }

  private addFixture(fixture: Fixture, room: RoomId): void {
    const group = this.groups[room];
    const [w, h, d] = fixture.size;
    const y = fixture.y ?? 0;
    // An invisible box over the footprint makes taps easy and reliable.
    const hitBox = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial({ visible: false }));
    hitBox.position.set(fixture.position[0], y + h / 2, fixture.position[1]);
    hitBox.userData.room = room;
    group.add(hitBox);
    if (fixture.interact) this.hitBoxes.set(hitBox, fixture);

    if (fixture.model) {
      void this.addModel(fixture.model, fixture.position, fixture.rotation, y, group);
    } else {
      const box = new Mesh(new BoxGeometry(w, h, d), new MeshStandardMaterial({ color: PLACEHOLDER_COLOR }));
      box.position.copy(hitBox.position);
      group.add(box);
    }
    if (fixture.label || !fixture.model) {
      const label = this.addLabel(fixture.label ?? fixture.id, hitBox, h / 2 + 0.2, fixture.interact ? 'scene-label--action' : '', room);
      if (room === 'back' && fixture.id === this.rooms.back.rack.fixture) this.rackLabel = label.el;
    }
  }

  private addLabel(text: string, target: Object3D, height: number, modifier: string, room: RoomId | null): Label {
    const el = document.createElement('div');
    el.className = `scene-label ${modifier}`;
    el.textContent = text;
    this.labelLayer.appendChild(el);
    this.labels.push({ el, target, height, room });
    return { el };
  }

  private removeLabel(label: Label): void {
    label.el.remove();
    const i = this.labels.findIndex((l) => l.el === label.el);
    if (i >= 0) this.labels.splice(i, 1);
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

  /**
   * Shows bought furniture where it's been placed. Floor pieces hide their spot's marker and
   * become obstacles to walk around; surface pieces sit on table and counter tops.
   */
  async setFurniture(pieces: { spot: string; model: string; position: Point; y: number; size: [number, number]; floor: boolean }[]): Promise<void> {
    const key = JSON.stringify(pieces);
    if (key === this.placedKey) return;
    this.placedKey = key;
    for (const o of this.placed) o.removeFromParent();
    this.placed = [];
    const occupied = new Set(pieces.map((p) => p.spot));
    for (const [id, marker] of this.spotMarkers) {
      marker.patch.visible = !occupied.has(id);
      marker.label.el.hidden = occupied.has(id);
    }
    this.rooms.shop.obstacles = pieces.filter((p) => p.floor).map((p) => ({ position: p.position, size: p.size }));
    const models = await Promise.all(pieces.map((p) => loadGltf(p.model)));
    if (key !== this.placedKey) return; // changed again while loading
    pieces.forEach((p, i) => {
      const model = models[i].scene.clone(true);
      model.position.set(p.position[0], p.y, p.position[1]);
      model.rotation.y = Math.PI / 4; // angled towards the room
      this.groups.shop.add(model);
      this.placed.push(model);
    });
    this.requestFrame();
  }

  /** Shows arrived crates by the back room's outside door; tapping one opens them. */
  async setCrates(count: number): Promise<void> {
    for (const c of this.crates) {
      c.removeFromParent();
      this.hitBoxes.delete(c.userData.hitBox as Object3D);
      (c.userData.hitBox as Object3D).removeFromParent();
    }
    this.crates = [];
    const back = this.rooms.back;
    const door = back.fixtures.find((f) => f.interact?.action === 'outside');
    const tapped: Fixture | null = door?.interact ? { ...door, id: 'crates', interact: { action: 'crates', standAt: door.interact.standAt } } : null;
    const { model, spots, stackHeights } = back.crates;
    const shown = Math.min(count, spots.length);
    if (shown === 0) return this.requestFrame();
    const gltf = await loadGltf(model);
    for (let i = 0; i < shown; i++) {
      const crate = gltf.scene.clone(true);
      const [x, z] = spots[i];
      crate.position.set(x, stackHeights[i] ?? 0, z);
      crate.rotation.y = (i * 0.37) % 0.5; // a little untidy, like a real delivery
      const hitBox = new Mesh(new BoxGeometry(0.66, 0.6, 0.66), new MeshBasicMaterial({ visible: false }));
      hitBox.position.set(x, (stackHeights[i] ?? 0) + 0.3, z);
      crate.userData.hitBox = hitBox;
      hitBox.userData.room = 'back';
      this.groups.back.add(crate, hitBox);
      if (tapped) this.hitBoxes.set(hitBox, tapped);
      this.crates.push(crate);
    }
    this.requestFrame();
  }

  /**
   * Shows what's on hand on the back room's rack: one bottle per material, in order, as many
   * as its shelves hold. The rack's label counts them all.
   */
  async setRack(materials: string[]): Promise<void> {
    const key = materials.join(',');
    if (key === this.rackKey) return;
    this.rackKey = key;
    const { rack, fixtures } = this.rooms.back;
    const shelf = fixtures.find((f) => f.id === rack.fixture)!;
    if (this.rackLabel) this.rackLabel.textContent = `Supplies · ${materials.length} on hand`;
    const gltf = await loadGltf(rack.bottle);
    if (key !== this.rackKey) return; // changed again while loading
    for (const b of this.rackBottles) b.removeFromParent();
    this.rackBottles = [];
    const shown = Math.min(materials.length, rack.levels.length * rack.perLevel);
    for (let i = 0; i < shown; i++) {
      const level = Math.floor(i / rack.perLevel);
      const slot = i % rack.perLevel;
      const bottle = gltf.scene.clone(true);
      bottle.position.set(shelf.position[0] + (slot - (rack.perLevel - 1) / 2) * rack.spacing, rack.levels[level], shelf.position[1] + rack.forward);
      bottle.rotation.y = (i * 0.9) % (Math.PI * 2); // not all facing the same way
      this.groups.back.add(bottle);
      this.rackBottles.push(bottle);
    }
    this.requestFrame();
  }

  /** Brings the customers in the shop in line with the game state. */
  syncCustomers(kit: CharacterKit, entries: CrowdEntry[]): Promise<void> {
    return this.crowd.sync(kit, entries);
  }

  waveCustomer(id: string): void {
    this.crowd.wave(id);
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

  /** Frames the room below the HUD, which covers `px` screen pixels at the top. */
  setTopInset(px: number): void {
    if (Math.abs(px - this.topInset) < 1) return;
    const first = this.topInset === 0;
    this.topInset = px;
    this.resize();
    if (first) this.centreOnPlayer(); // the HUD's first measure: centre below it
  }

  /** Zoom 1 fits the whole room in the screen below the HUD; the camera keeps its isometric angle. */
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
    const below = Math.max(h - this.topInset, h * 0.4); // the part of the screen the HUD leaves free
    let halfW = (view.max.x - view.min.x) / 2 + margin;
    let halfH = (view.max.y - view.min.y) / 2 + margin;
    const aspect = w / below;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    // Centre the room in that free part: the frustum reaches up behind the HUD.
    const unitsPerPx = (2 * halfH) / below;
    const viewCentre = (view.max.y + view.min.y) / 2;
    Object.assign(this.camera, { left: -halfW, right: halfW, top: viewCentre + halfH + (h - below) * unitsPerPx, bottom: viewCentre - halfH, near: -50, far: 100 });
    this.placeCamera();
    if (!this.centred) {
      this.centred = true;
      this.centreOnPlayer();
    }
  }

  /** Moves the view so the player stands in the middle of the part of the screen below the HUD. */
  centreOnPlayer(): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const p = this.playerRoot.position.clone().project(this.camera);
    const at = this.floorPointAt(rect.left + ((p.x + 1) / 2) * rect.width, rect.top + ((1 - p.y) / 2) * rect.height);
    const mid = this.floorPointAt(rect.left + rect.width / 2, rect.top + (this.topInset + rect.height) / 2);
    if (!at || !mid) return;
    this.focus.add(at.sub(mid));
    this.placeCamera();
  }

  private placeCamera(): void {
    const { width, depth } = this.layout.room;
    // At zoom 1 the whole room is in view and the camera stays put; zoomed in, it can pan
    // only as far as keeps the room on screen.
    const reach = Math.max(0, 1 - 1 / this.zoom);
    this.focus.x = Math.min(Math.max(this.focus.x, (-width / 2) * reach), (width / 2) * reach);
    this.focus.z = Math.min(Math.max(this.focus.z, (-depth / 2) * reach), (depth / 2) * reach);
    this.labelLayer.classList.toggle('scene-labels--far', this.zoom < 1.8);
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

    // A name label counts as its customer or fixture: with the whole room in view, people
    // are small and their labels are the easier thing to tap.
    const label = this.labels.find((l) => {
      if (l.room && l.room !== this.room) return false;
      const r = l.el.getBoundingClientRect();
      return r.width > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    // Otherwise whatever is nearest the camera under the finger wins: a customer or an interactive fixture.
    const here = [...this.hitBoxes.keys()].filter((o) => o.userData.room === this.room);
    const hit = label ? { object: label.target } : this.raycaster.intersectObjects([...(this.room === 'shop' ? this.crowd.hitBoxes() : []), ...here])[0];
    const customerId = hit ? this.crowd.idOf(hit.object) : null;
    if (customerId) {
      this.events.customer(customerId);
      return;
    }
    const fixture = hit && this.hitBoxes.get(hit.object);
    if (fixture?.interact) this.walkTo(fixture.interact.standAt, fixture);
    // Tapping the floor does nothing: the joystick moves you.
  }

  private walkTo(target: Point, fixture: Fixture | null): void {
    const from: Point = [this.playerRoot.position.x, this.playerRoot.position.z];
    const path = findPath(this.layout, from, target);
    if (!path) return;
    this.path = path;
    this.pendingFixture = fixture;
    this.player?.play('walk');
    this.events.walking(true);
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

    if (this.stick) this.steer(dt);
    else if (this.path.length > 0) this.step(dt);
    this.player?.mixer.update(dt);
    const crowdMoving = this.crowd.update(dt);
    if (this.path.length > 0 || this.stick) this.follow(dt);

    this.renderer.render(this.scene, this.camera);
    this.placeLabels();

    if (this.path.length > 0 || this.stick || (crowdMoving && this.interactive)) this.requestFrame();
    else if ((this.interactive || this.savedView) && (this.player || this.crowd.size > 0)) {
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
      this.events.walking(false);
      if (this.pendingFixture) {
        const arrived = this.pendingFixture;
        this.pendingFixture = null;
        // Face the fixture, then act.
        this.playerRoot.rotation.y = Math.atan2(arrived.position[0] - p.x, arrived.position[1] - p.z);
        this.events.arrive(arrived);
      }
    }
  }

  /** Eases the camera towards the walking player when they leave the middle of the view. */
  private follow(dt: number): void {
    if (this.zoom <= 1.05) return; // the whole room is in view
    const rect = this.renderer.domElement.getBoundingClientRect();
    const p = this.playerRoot.position.clone().project(this.camera);
    const sx = ((p.x + 1) / 2) * rect.width;
    const sy = ((1 - p.y) / 2) * rect.height;
    // The middle of the part of the screen below the HUD, and how far the player may stray from it.
    const midY = (this.topInset + rect.height) / 2;
    const slackX = rect.width * FOLLOW_MARGIN * 0.5;
    const slackY = (rect.height - this.topInset) * FOLLOW_MARGIN * 0.5;
    if (Math.abs(sx - rect.width / 2) < slackX && Math.abs(sy - midY) < slackY) return;
    const at = this.floorPointAt(rect.left + sx, rect.top + sy);
    const mid = this.floorPointAt(rect.left + rect.width / 2, rect.top + midY);
    if (!at || !mid) return;
    this.focus.addScaledVector(at.sub(mid), Math.min(dt * 3, 1));
    this.placeCamera();
  }

  private placeLabels(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const v = new Vector3();
    const top = this.topInset;
    // Where each label's anchor is on screen. Upgrade spots only matter where you can see
    // them: off screen, their labels would crowd the edges, so they hide. (All class changes
    // come before any measuring, so the page lays out once per frame, not once per label.)
    const anchors = this.labels.map(({ el, target, height }, i) => {
      target.getWorldPosition(v);
      v.y += height;
      v.project(this.camera);
      const hide = (this.labels[i].room !== null && this.labels[i].room !== this.room) || (el.classList.contains('scene-label--zone') && (Math.abs(v.x) > 1 || Math.abs(v.y) > 1));
      if (el.classList.contains('scene-label--hidden') !== hide) el.classList.toggle('scene-label--hidden', hide);
      return { x: v.x, y: v.y };
    });
    // Where each label wants to sit (bottom centre), kept whole and out from under the HUD.
    const spots = this.labels.map(({ el }, i) => {
      const a = anchors[i];
      const width = el.offsetWidth;
      const tall = el.offsetHeight;
      const x = Math.min(Math.max(((a.x + 1) / 2) * w, width / 2 + 4), w - width / 2 - 4);
      const y = Math.min(Math.max(((1 - a.y) / 2) * h, top + tall + 2), h - 4);
      return { el, x, y, width, tall, shown: width > 0 };
    });
    // Labels nearer the bottom of the screen are in front; ones behind them that would
    // overlap are lifted just above, so none is covered.
    const placed: { left: number; right: number; top: number; bottom: number }[] = [];
    for (const s of spots.filter((x) => x.shown).sort((a, b) => b.y - a.y)) {
      let y = s.y;
      for (let guard = 0; guard < 12; guard++) {
        const hit = placed.find((r) => s.x - s.width / 2 < r.right && s.x + s.width / 2 > r.left && y - s.tall < r.bottom && y > r.top);
        if (!hit) break;
        y = hit.top - 1;
      }
      y = Math.max(y, top + s.tall + 2);
      s.y = y;
      placed.push({ left: s.x - s.width / 2, right: s.x + s.width / 2, top: y - s.tall, bottom: y });
    }
    for (const s of spots) s.el.style.transform = `translate(-50%, -100%) translate(${s.x}px, ${s.y}px)`;
  }

}
