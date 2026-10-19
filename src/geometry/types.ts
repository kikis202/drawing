export type PrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'pyramid';
export const PRIMITIVES: PrimitiveType[] = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid'];

export type Vec3 = [number, number, number];

export interface Piece {
  type: PrimitiveType;
  size: Vec3;
  /** Degrees, applied X then Y then Z. */
  rotation: Vec3;
  position: Vec3;
  op: 'add' | 'cut';
}

/** pieces[0].op is always 'add'. */
export interface FormSpec {
  version: 1;
  seed: number;
  pieces: Piece[];
}

export interface GenerateSettings {
  allowed: PrimitiveType[];
  pieces: number;
}

/** Centred, bounding radius exactly 1. */
export interface FormMesh {
  positions: Float32Array;
  indices: Uint32Array;
  volume: number;
}
