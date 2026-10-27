import {
  AmbientLight,
  Box3,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { findPath } from '../game/pathfinding';
import type { Fixture, Point, ShopLayout } from '../game/shop';

// The shop, seen from a fixed isometric camera. Until the approved model packs are
// downloaded, every object is a plain box with a text label (see ASSETS_NEEDED.md).

const PLACEHOLDER = { floor: 0xe6d8c8, wall: 0xf2e9df, fixture: 0xd3c2b1, player: 0xb69a86 };
const PLAYER_SIZE: [number, number, number] = [0.5, 1.6, 0.5];
const TAP_SLOP_PX = 10;

export interface ShopSceneEvents {
  /** The player reached an interactive fixture they tapped. */
  arrive(fixture: Fixture): void;
}

export class ShopScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera();
  private readonly raycaster = new Raycaster();
  private readonly floor: Mesh;
  private readonly fixtureMeshes = new Map<Mesh, Fixture>();
  private readonly player: Mesh;
  private readonly labels: { el: HTMLElement; target: Object3D; height: number }[] = [];
  private readonly labelLayer: HTMLElement;

  private path: Point[] = [];
  private pendingFixture: Fixture | null = null;
  private lastFrame = 0;
  private frameRequested = false;
  private pointerDown: { x: number; y: number } | null = null;
  enabled = true;

  constructor(
    private readonly container: HTMLElement,
    private readonly layout: ShopLayout,
    private readonly events: ShopSceneEvents,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    this.labelLayer = document.createElement('div');
    this.labelLayer.className = 'scene-labels';
    container.appendChild(this.labelLayer);

    this.scene.add(new AmbientLight(0xffffff, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(4, 10, 6);
    this.scene.add(sun);

    const { width, depth, wallHeight } = layout.room;
    this.floor = new Mesh(new PlaneGeometry(width, depth), new MeshLambertMaterial({ color: PLACEHOLDER.floor }));
    this.floor.rotation.x = -Math.PI / 2;
    this.scene.add(this.floor);
    // Only the two back walls: the camera looks in from the open front corner.
    this.addBox([width, wallHeight, 0.1], [0, -depth / 2 - 0.05], PLACEHOLDER.wall);
    this.addBox([0.1, wallHeight, depth], [-width / 2 - 0.05, 0], PLACEHOLDER.wall);

    for (const fixture of layout.fixtures) {
      const mesh = this.addBox(fixture.size, fixture.position, PLACEHOLDER.fixture);
      this.fixtureMeshes.set(mesh, fixture);
      this.addLabel(fixture.label, mesh, fixture.size[1] / 2 + 0.2, fixture.interact ? 'scene-label--action' : '');
    }

    this.player = this.addBox(PLAYER_SIZE, layout.spawn, PLACEHOLDER.player);
    this.addLabel('You', this.player, PLAYER_SIZE[1] / 2 + 0.2, 'scene-label--player');

    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => (this.pointerDown = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  private addBox(size: [number, number, number], [x, z]: Point, color: number): Mesh {
    const mesh = new Mesh(new BoxGeometry(...size), new MeshLambertMaterial({ color }));
    mesh.position.set(x, size[1] / 2, z);
    this.scene.add(mesh);
    return mesh;
  }

  private addLabel(text: string, target: Object3D, height: number, modifier: string): void {
    const el = document.createElement('div');
    el.className = `scene-label ${modifier}`;
    el.textContent = text;
    this.labelLayer.appendChild(el);
    this.labels.push({ el, target, height });
  }

  /** Fits the whole room in view, whatever the screen's shape. */
  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);

    const { width, depth, wallHeight } = this.layout.room;
    const box = new Box3(new Vector3(-width / 2, 0, -depth / 2), new Vector3(width / 2, wallHeight, depth / 2));
    this.camera.updateMatrixWorld();
    const view = box.clone().applyMatrix4(this.camera.matrixWorldInverse);
    const margin = 0.6;
    let halfW = (view.max.x - view.min.x) / 2 + margin;
    let halfH = (view.max.y - view.min.y) / 2 + margin;
    const aspect = w / h;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    const cx = (view.max.x + view.min.x) / 2;
    const cy = (view.max.y + view.min.y) / 2;
    Object.assign(this.camera, { left: cx - halfW, right: cx + halfW, top: cy + halfH, bottom: cy - halfH, near: -50, far: 100 });
    this.camera.updateProjectionMatrix();
    this.requestFrame();
  }

  private onPointerUp(e: PointerEvent): void {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!this.enabled || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP_PX) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);

    const fixtureHit = this.raycaster.intersectObjects([...this.fixtureMeshes.keys()])[0];
    const fixture = fixtureHit && this.fixtureMeshes.get(fixtureHit.object as Mesh);
    if (fixture?.interact) {
      this.walkTo(fixture.interact.standAt, fixture);
      return;
    }
    const floorHit = this.raycaster.intersectObject(this.floor)[0];
    if (floorHit) this.walkTo([floorHit.point.x, floorHit.point.z], null);
  }

  private walkTo(target: Point, fixture: Fixture | null): void {
    const from: Point = [this.player.position.x, this.player.position.z];
    const path = findPath(this.layout, from, target);
    if (!path) return;
    this.path = path;
    this.pendingFixture = fixture;
    this.requestFrame();
  }

  private requestFrame(): void {
    if (this.frameRequested) return;
    this.frameRequested = true;
    requestAnimationFrame((t) => this.frame(t));
  }

  /** Renders on demand: frames only run while something moves. */
  private frame(time: number): void {
    this.frameRequested = false;
    const dt = this.lastFrame ? Math.min((time - this.lastFrame) / 1000, 0.1) : 0;
    this.lastFrame = time;

    if (this.path.length > 0) {
      let travel = this.layout.walkSpeed * dt;
      while (travel > 0 && this.path.length > 0) {
        const [tx, tz] = this.path[0];
        const dx = tx - this.player.position.x;
        const dz = tz - this.player.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001) this.player.rotation.y = Math.atan2(dx, dz);
        if (dist <= travel) {
          this.player.position.x = tx;
          this.player.position.z = tz;
          this.path.shift();
          travel -= dist;
        } else {
          this.player.position.x += (dx / dist) * travel;
          this.player.position.z += (dz / dist) * travel;
          travel = 0;
        }
      }
      if (this.path.length === 0 && this.pendingFixture) {
        const arrived = this.pendingFixture;
        this.pendingFixture = null;
        this.events.arrive(arrived);
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
    if (this.path.length > 0) this.requestFrame();
    else this.lastFrame = 0;
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
