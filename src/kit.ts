import { AnimationMixer, Color, LoopOnce, Object3D, Skeleton, SkinnedMesh, type AnimationAction, type AnimationClip, type Bone, type Material, type MeshStandardMaterial } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadGltf } from './assets';

// People, built from the chibi kit in assets/custom/chibi: one skeleton, a skinned mesh per
// part, colours set on the kit's named materials.

export interface Look {
  fit?: 'chubby' | 'slim';
  /** Part ids (file names in parts/). */
  parts: string[];
  /** Colours by material name (skin, hair, eyes) or by a part's slot (top, bottom, shoes, hat, face, handL). */
  colors: Record<string, string>;
}

const BASE = 'custom/chibi/';
/** How high the sitting clip holds the thighs above the figure's origin. */
export const SIT_HEIGHT = 0.14;

export async function preloadKit(): Promise<void> {
  await Promise.all([loadGltf(BASE + 'skeleton.glb'), loadGltf(BASE + 'animations.glb')]);
}

export async function buildPerson(look: Look): Promise<Person> {
  const [skeleton, animations, ...parts] = await Promise.all([loadGltf(BASE + 'skeleton.glb'), loadGltf(BASE + 'animations.glb'), ...look.parts.map((p) => loadGltf(`${BASE}parts/${p}.glb`))]);
  const root = cloneSkinned(skeleton.scene);
  const rig = root.getObjectByName('rig') ?? root;
  const bones = new Map<string, Bone>();
  root.traverse((o) => {
    if ((o as Bone).isBone) bones.set(o.name, o as Bone);
  });
  parts.forEach((gltf, i) => {
    const slot = look.parts[i].split('_')[0];
    const meshes: SkinnedMesh[] = [];
    cloneSkinned(gltf.scene).traverse((o) => {
      if ((o as SkinnedMesh).isSkinnedMesh) meshes.push(o as SkinnedMesh);
    });
    for (const mesh of meshes) {
      mesh.bind(new Skeleton(mesh.skeleton.bones.map((b) => bones.get(b.name) ?? b), mesh.skeleton.boneInverses), mesh.bindMatrix);
      const tint = (m: Material) => {
        const copy = m.clone() as MeshStandardMaterial;
        const hex = look.colors[copy.name] ?? (copy.name === 'primary' ? look.colors[slot] : undefined);
        if (hex && copy.color) copy.color = new Color(hex);
        return copy;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(tint) : tint(mesh.material);
      if (look.fit && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        const index = mesh.morphTargetDictionary[look.fit];
        if (index !== undefined) mesh.morphTargetInfluences[index] = 1;
      }
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      rig.add(mesh);
    }
  });
  return new Person(root, animations.animations);
}

export class Person {
  readonly mixer: AnimationMixer;
  private readonly actions = new Map<string, AnimationAction>();
  private current: AnimationAction | null = null;

  constructor(
    readonly root: Object3D,
    clips: AnimationClip[],
  ) {
    this.mixer = new AnimationMixer(root);
    for (const clip of clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.play('idle');
  }

  /** Cross-fades to a looping clip. */
  play(name: string, speed = 1): void {
    const next = this.actions.get(name);
    if (!next) return;
    next.timeScale = speed;
    if (next === this.current) return;
    next.reset().play();
    if (this.current) next.crossFadeFrom(this.current, 0.18, false);
    this.current = next;
  }

  /** Plays a clip once and holds its last pose. */
  once(name: string): void {
    const action = this.actions.get(name);
    if (!action || action === this.current) return;
    action.reset().setLoop(LoopOnce, 1).play();
    action.clampWhenFinished = true;
    if (this.current) action.crossFadeFrom(this.current, 0.15, false);
    this.current = action;
  }

  /** Turns towards a heading (radians; 0 faces south), at most `step` this frame. */
  face(heading: number, step = Infinity): void {
    let d = heading - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += Math.max(-step, Math.min(step, d));
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    this.root.traverse((o) => {
      const mesh = o as SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose();
    });
  }
}

const SKIN = ['#FBE3D2', '#F8DAC6', '#F0C6A8', '#DFA883', '#C98A62', '#A96E4C', '#8A5A44', '#643F30'];
const HAIR = ['#2E2230', '#4A3228', '#6B4431', '#8A5A3C', '#B5524E', '#C9773F', '#C9A45C', '#D9D3CC', '#8E8A98'];
const CLOTH = ['#E3C27A', '#C9605A', '#B5443C', '#8A6AA6', '#4F6FA8', '#7FA8C9', '#8FC0B0', '#4F8A5E', '#C9A66B', '#8A5636'];

/** The one doing the taking: dark clothes, a beret and a satchel for the bottles. */
export const THIEF: Look = {
  parts: ['body', 'head_bright', 'hair_bob', 'hat_beret', 'top_sweater', 'bottom_trousers', 'shoes_loafers', 'handL_satchel'],
  colors: { skin: '#F0C6A8', hair: '#2E2230', eyes: '#4A6A8A', hat: '#3A2E38', top: '#4A4858', bottom: '#3A2E38', shoes: '#6A3A40', handL: '#9A6238' },
};

/** A night watchman: a long coat, and whatever else they put on this evening. */
export function watchmanLook(rng: () => number): Look {
  const pick = <T>(list: T[]): T => list[Math.floor(rng() * list.length)];
  const parts = ['body', pick(['head_soft', 'head_calm', 'head_calm']), pick(['hair_short', 'hair_spiky', 'hair_bun', 'hair_long', 'hair_short']), pick(['top_coat', 'top_coat', 'top_blazer']), pick(['bottom_trousers', 'bottom_trousers', 'bottom_skirt']), 'shoes_boots'];
  const face = pick(['face_moustache', 'face_beard', 'face_round', 'face_square', '']);
  if (face) parts.push(face);
  return {
    fit: pick(['chubby', 'chubby', 'slim', undefined]),
    parts,
    colors: { skin: pick(SKIN), hair: pick(HAIR), eyes: '#3A2A20', top: pick(CLOTH), bottom: '#4A4858', shoes: '#3A2E38', face: '#3A2E38' },
  };
}
