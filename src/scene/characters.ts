import {
  AnimationMixer,
  Color,
  LoopOnce,
  Object3D,
  Skeleton,
  SkinnedMesh,
  type AnimationAction,
  type AnimationClip,
  type Bone,
  type Material,
  type MeshStandardMaterial,
} from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { partsFor, type CharacterConfig, type KitStyle } from '../game/character';
import { loadGltf, loadJson } from './assets';

// Builds characters from the Grab3D Character Mixer kit: one shared skeleton, a skinned
// mesh per part, colours applied to the kit's named material slots.

interface KitManifest {
  styles: KitStyle[];
}

/** Material names in the kit that take a colour from the character's config. */
const GLOBAL_COLOR_SLOTS = ['skin', 'hair', 'eyes'];

export class CharacterKit {
  private constructor(
    readonly style: KitStyle,
    private readonly base: string,
    private readonly clips: AnimationClip[],
  ) {}

  static async load(manifestPath: string, styleId: string): Promise<CharacterKit> {
    const manifest = await loadJson<KitManifest>(manifestPath);
    const style = manifest.styles.find((s) => s.id === styleId);
    if (!style) throw new Error(`Character style "${styleId}" not in ${manifestPath}`);
    const base = manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1);
    const animations = await loadGltf(base + style.animations.file);
    return new CharacterKit(style, base, animations.animations);
  }

  async build(config: CharacterConfig): Promise<Character> {
    const skeletonGltf = await loadGltf(this.base + this.style.skeleton);
    const root = cloneSkinned(skeletonGltf.scene);
    const rig = root.getObjectByName('rig') ?? root;
    const bones = new Map<string, Bone>();
    root.traverse((o) => {
      if ((o as Bone).isBone) bones.set(o.name, o as Bone);
    });

    const morph = this.style.fits.find((f) => f.id === config.fit)?.morph ?? null;
    const parts = partsFor(config, this.style);
    const gltfs = await Promise.all(parts.map((p) => loadGltf(this.base + p.file)));

    gltfs.forEach((gltf, i) => {
      const slot = parts[i].slot;
      const meshes: SkinnedMesh[] = [];
      cloneSkinned(gltf.scene).traverse((o) => {
        if ((o as SkinnedMesh).isSkinnedMesh) meshes.push(o as SkinnedMesh);
      });
      for (const mesh of meshes) {
        // Re-bind the part to the shared skeleton by bone name.
        const partBones = mesh.skeleton.bones.map((b) => bones.get(b.name) ?? b);
        mesh.bind(new Skeleton(partBones, mesh.skeleton.boneInverses), mesh.bindMatrix);
        mesh.material = recolor(mesh.material, slot, config);
        if (morph && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          const index = mesh.morphTargetDictionary[morph];
          if (index !== undefined) mesh.morphTargetInfluences[index] = 1;
        }
        mesh.frustumCulled = false;
        rig.add(mesh);
      }
    });
    return new Character(root, this.clips);
  }
}

function recolor(material: Material | Material[], slot: string, config: CharacterConfig): Material | Material[] {
  const apply = (m: Material) => {
    const copy = m.clone() as MeshStandardMaterial;
    const hex = GLOBAL_COLOR_SLOTS.includes(copy.name) ? config.colors[copy.name] : copy.name === 'primary' ? config.colors[slot] : undefined;
    if (hex && copy.color) copy.color = new Color(hex);
    return copy;
  };
  return Array.isArray(material) ? material.map(apply) : apply(material);
}

export class Character {
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

  /** Cross-fades to a looping clip (idle, walk, run). */
  play(name: string): void {
    const next = this.actions.get(name);
    if (!next || next === this.current) return;
    next.reset().play();
    if (this.current) next.crossFadeFrom(this.current, 0.2, false);
    this.current = next;
  }

  /** Plays a clip once (e.g. wave), then returns to idle. */
  playOnce(name: string): void {
    const action = this.actions.get(name);
    if (!action) return;
    action.reset().setLoop(LoopOnce, 1).play();
    action.clampWhenFinished = false;
    if (this.current) action.crossFadeFrom(this.current, 0.2, false);
    const back = this.current?.getClip().name ?? 'idle';
    this.current = action;
    const onFinish = (e: { action: AnimationAction }) => {
      if (e.action !== action) return;
      this.mixer.removeEventListener('finished', onFinish);
      this.current = null;
      this.play(back);
    };
    this.mixer.addEventListener('finished', onFinish);
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
