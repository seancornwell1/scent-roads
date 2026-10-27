import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Loads asset files from assets/ (served from the site root, under the Pages base path).
// Each file is fetched once; callers clone what they need.

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}

export function loadGltf(path: string): Promise<GLTF> {
  let promise = cache.get(path);
  if (!promise) {
    promise = loader.loadAsync(assetUrl(path));
    cache.set(path, promise);
  }
  return promise;
}

export async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(assetUrl(path));
  if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
  return (await response.json()) as T;
}
