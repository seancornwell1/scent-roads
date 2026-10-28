import { BoxGeometry, Mesh, MeshBasicMaterial, type Object3D, type Scene } from 'three';
import type { CharacterConfig } from '../game/character';
import { findPath } from '../game/pathfinding';
import type { Point, ShopLayout } from '../game/shop';
import type { Character, CharacterKit } from './characters';

// Customers moving through the shop: in at the front door, browse for a while,
// queue at the counter and wait, then walk out when their visit is done.

export interface CrowdEntry {
  id: string;
  look: CharacterConfig;
  label: string;
  /** Customers already in the shop when the app opens appear straight at the counter. */
  instant: boolean;
}

export interface Label {
  el: HTMLElement;
}

export interface CrowdHost {
  scene: Scene;
  layout: ShopLayout;
  addLabel(text: string, target: Object3D, height: number, modifier: string): Label;
  removeLabel(label: Label): void;
  requestFrame(): void;
  /** Someone walked in through the front door. */
  entered(): void;
}

type Phase = 'entering' | 'browsing' | 'queueing' | 'waiting' | 'leaving';

interface Member {
  id: string;
  character: Character;
  hitBox: Mesh;
  label: Label;
  path: Point[];
  phase: Phase;
  /** Seconds left browsing. */
  timer: number;
  queueSpot: Point;
}

const TAP_SIZE: [number, number, number] = [0.6, 1.3, 0.6];
const FACING_COUNTER = Math.PI; // customers face the back of the shop, where the counter is

export class Crowd {
  private readonly members = new Map<string, Member>();
  private readonly building = new Set<string>();

  constructor(
    private readonly host: CrowdHost,
    private readonly browseSeconds: [number, number],
  ) {}

  /** Makes the crowd match `entries`: new people come in, missing ones walk out. */
  async sync(kit: CharacterKit, entries: CrowdEntry[]): Promise<void> {
    const wanted = new Set(entries.map((e) => e.id));
    for (const m of this.members.values()) if (!wanted.has(m.id) && m.phase !== 'leaving') this.leave(m);

    const queue = this.host.layout.customers.queue;
    await Promise.all(
      entries.map(async (entry, index) => {
        const spot = queue[Math.min(index, queue.length - 1)];
        const existing = this.members.get(entry.id);
        if (existing) {
          existing.label.el.textContent = entry.label;
          if (existing.phase === 'leaving') {
            // Called back before reaching the door (e.g. their review came due): turn around.
            existing.label.el.hidden = false;
            existing.queueSpot = spot;
            this.walk(existing, spot, 'queueing');
            return;
          }
          if (spot[0] !== existing.queueSpot[0] || spot[1] !== existing.queueSpot[1]) {
            existing.queueSpot = spot;
            if (existing.phase === 'waiting' || existing.phase === 'queueing') this.walk(existing, spot, 'queueing');
          }
          return;
        }
        if (this.building.has(entry.id)) return;
        this.building.add(entry.id);
        const character = await kit.build(entry.look);
        this.building.delete(entry.id);
        this.add(entry, character, spot);
      }),
    );
    this.host.requestFrame();
  }

  private add(entry: CrowdEntry, character: Character, spot: Point): void {
    const { scene, layout } = this.host;
    const hitBox = new Mesh(new BoxGeometry(...TAP_SIZE), new MeshBasicMaterial({ visible: false }));
    hitBox.position.y = TAP_SIZE[1] / 2;
    character.root.add(hitBox);
    scene.add(character.root);
    const label = this.host.addLabel(entry.label, character.root, 1.25, 'scene-label--customer');
    const member: Member = { id: entry.id, character, hitBox, label, path: [], phase: 'waiting', timer: 0, queueSpot: spot };
    this.members.set(entry.id, member);

    if (entry.instant) {
      character.root.position.set(spot[0], 0, spot[1]);
      character.root.rotation.y = FACING_COUNTER;
      return;
    }
    const [ex, ez] = layout.customers.entrance;
    character.root.position.set(ex, 0, ez);
    this.host.entered();
    this.walk(member, this.browseSpot(), 'entering');
  }

  private browseSpot(): Point {
    const zones = this.host.layout.zones.filter((z) => z.kind === 'customers');
    const [x, z, w, d] = zones[Math.floor(Math.random() * zones.length)].rect;
    return [x + (Math.random() - 0.5) * w, z + (Math.random() - 0.5) * d];
  }

  private walk(m: Member, to: Point, phase: Phase): void {
    const from: Point = [m.character.root.position.x, m.character.root.position.z];
    m.path = findPath(this.host.layout, from, to) ?? [to];
    m.phase = phase;
    m.character.play('walk');
  }

  private leave(m: Member): void {
    this.walk(m, this.host.layout.customers.entrance, 'leaving');
    m.label.el.textContent = '';
    m.label.el.hidden = true;
  }

  /** Advances everyone by `dt` seconds. Returns true while anyone is moving. */
  update(dt: number): boolean {
    let moving = false;
    const speed = this.host.layout.customers.walkSpeed;
    for (const m of [...this.members.values()]) {
      m.character.mixer.update(dt);
      if (m.phase === 'browsing') {
        moving = true; // keep frames coming so the browse timer runs
        m.timer -= dt;
        if (m.timer <= 0) this.walk(m, m.queueSpot, 'queueing');
        continue;
      }
      if (m.path.length === 0) continue;
      moving = true;
      const p = m.character.root.position;
      let travel = speed * dt;
      while (travel > 0 && m.path.length > 0) {
        const [tx, tz] = m.path[0];
        const dx = tx - p.x;
        const dz = tz - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001) m.character.root.rotation.y = Math.atan2(dx, dz);
        if (dist <= travel) {
          p.x = tx;
          p.z = tz;
          m.path.shift();
          travel -= dist;
        } else {
          p.x += (dx / dist) * travel;
          p.z += (dz / dist) * travel;
          travel = 0;
        }
      }
      if (m.path.length === 0) this.arrive(m);
    }
    return moving;
  }

  private arrive(m: Member): void {
    m.character.play('idle');
    if (m.phase === 'entering') {
      m.phase = 'browsing';
      const [min, max] = this.browseSeconds;
      m.timer = min + Math.random() * (max - min);
    } else if (m.phase === 'queueing') {
      m.phase = 'waiting';
      m.character.root.rotation.y = FACING_COUNTER;
    } else if (m.phase === 'leaving') {
      this.host.removeLabel(m.label);
      m.character.dispose();
      this.members.delete(m.id);
    }
  }

  hitBoxes(): Mesh[] {
    return [...this.members.values()].filter((m) => m.phase !== 'leaving').map((m) => m.hitBox);
  }

  idOf(hitBox: Object3D): string | null {
    for (const m of this.members.values()) if (m.hitBox === hitBox) return m.id;
    return null;
  }

  wave(id: string): void {
    this.members.get(id)?.character.playOnce('wave');
    this.host.requestFrame();
  }

  get size(): number {
    return this.members.size;
  }
}
