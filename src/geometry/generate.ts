import type { Manifold, ManifoldToplevel } from './manifold';
import { mulberry32 } from './prng';
import { pieceManifold } from './primitives';
import type { FormSpec, GenerateSettings, Piece, Vec3 } from './types';

const CANDIDATES_PER_PIECE = 12;
const MAX_RETRIES = 5;
const CUT_PROBABILITY = 0.25;
const JITTER = 0.15;
const MIN_ADD_GROWTH = 0.15;
const MIN_CUT_FRACTION = 0.03;
const MAX_CUT_FRACTION = 0.5;

function randomSize(rand: () => number): Vec3 {
  return [0, 1, 2].map(() => 0.45 + rand() * 1.15) as Vec3;
}

function randomRotation(rand: () => number): Vec3 {
  return [0, 1, 2].map(() => (rand() < 0.5 ? 0 : 15 * (1 + Math.floor(rand() * 6)))) as Vec3;
}

/** Uniform point on a randomly chosen face of the box, the face weighted by its area. */
function randomSurfacePoint(rand: () => number, min: number[], max: number[]): Vec3 {
  const extent = [0, 1, 2].map((k) => max[k] - min[k]);
  const areas = [extent[1] * extent[2], extent[0] * extent[2], extent[0] * extent[1]];
  const total = 2 * (areas[0] + areas[1] + areas[2]);
  let pick = rand() * total;
  let axis = 0;
  while (axis < 2 && pick >= 2 * areas[axis]) {
    pick -= 2 * areas[axis];
    axis++;
  }
  const high = pick >= areas[axis];
  const point = [0, 1, 2].map((k) => min[k] + rand() * extent[k]);
  point[axis] = high ? max[axis] : min[axis];
  return point as Vec3;
}

/** True when the manifold is one connected component. */
function isSingleComponent(m: Manifold): boolean {
  const parts = m.decompose();
  const count = parts.length;
  parts.forEach((p) => p.delete());
  return count === 1;
}

function attempt(wasm: ManifoldToplevel, seed: number, settings: GenerateSettings): Piece[] {
  const rand = mulberry32(seed);
  const pickType = () => settings.allowed[Math.floor(rand() * settings.allowed.length)];
  const pieces: Piece[] = [];

  const first: Piece = { type: pickType(), size: randomSize(rand), rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' };
  pieces.push(first);
  let current = pieceManifold(wasm, first);

  try {
    for (let i = 1; i < settings.pieces; i++) {
      const op = rand() < CUT_PROBABILITY ? 'cut' : 'add';
      const { min, max } = current.boundingBox();
      const previousVolume = current.volume();

      for (let tries = 0; tries < CANDIDATES_PER_PIECE; tries++) {
        const surface = randomSurfacePoint(rand, min, max);
        const piece: Piece = {
          type: pickType(),
          size: randomSize(rand),
          rotation: randomRotation(rand),
          position: surface.map((v) => v + (rand() * 2 - 1) * JITTER) as Vec3,
          op,
        };

        const pm = pieceManifold(wasm, piece);
        let next: Manifold | undefined;
        try {
          next = op === 'cut' ? current.subtract(pm) : current.add(pm);
          const volume = next.volume();
          const ok =
            op === 'add'
              ? volume >= previousVolume + MIN_ADD_GROWTH * pm.volume()
              : previousVolume - volume >= MIN_CUT_FRACTION * previousVolume &&
                previousVolume - volume <= MAX_CUT_FRACTION * previousVolume;
          if (!ok || !isSingleComponent(next)) {
            next.delete();
            continue;
          }
        } catch (error) {
          next?.delete();
          throw error;
        } finally {
          pm.delete();
        }
        current.delete();
        current = next;
        pieces.push(piece);
        break;
      }
    }
  } finally {
    current.delete();
  }
  return pieces;
}

/** Deterministic compound form: the same seed and settings always give the same spec. */
export function generateForm(wasm: ManifoldToplevel, seed: number, settings: GenerateSettings): FormSpec {
  const wanted = Math.max(1, settings.pieces - 2);
  let best: Piece[] = [];
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    const pieces = attempt(wasm, (seed + retry) >>> 0, settings);
    if (pieces.length > best.length) best = pieces;
    if (pieces.length >= wanted) break;
  }
  return { version: 2, style: 'freeform', seed, pieces: best };
}
