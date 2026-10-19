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

export type FormStyle = 'clean' | 'freeform';

export type JoinKind = 'stack' | 'totem' | 'halfSunk' | 'wing' | 'through' | 'mirror' | 'hinged' | 'tilt45' | 'cut';
export const JOINS: JoinKind[] = ['stack', 'totem', 'halfSunk', 'wing', 'through', 'mirror', 'hinged', 'tilt45', 'cut'];

export interface RecipeStep {
  join: JoinKind | 'base';
  type: PrimitiveType;
  /** Index of the piece this one attaches to; -1 for the base. */
  target: number;
  slot: number;
}

/** pieces[0].op is always 'add'. `recipe` and `variation` are set by the Clean generator. */
export interface FormSpec {
  version: 2;
  seed: number;
  style: FormStyle;
  pieces: Piece[];
  recipe?: RecipeStep[];
  variation?: number;
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
  /** Bounding box in normalised space. */
  bounds: { min: Vec3; max: Vec3 };
  /** xyz pairs: one segment per non-sphere piece (cutters included), along the piece's local Y after
   *  rotation, through its position, length = size[1] x 1.3, in normalised space. */
  axes: Float32Array;
  /** Dihedral angle above which edges are creased: smoothing stops and a line is drawn. */
  creaseDeg: number;
}
