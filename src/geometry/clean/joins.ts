import { PRIMITIVES, type JoinKind, type Piece, type PrimitiveType, type Vec3 } from '../types';

/*
 * Clean join placement. Every size is a multiple of MODULE in [0.5, 2] and every position sits on GRID,
 * except the turned piece of 'hinged' (its hinge edge is exact instead). Added pieces keep
 * longest : shortest <= 2.5; cutters are exempt, since only the hole they leave is seen.
 *
 * Slot semantics, per join (JOIN_SLOTS[join] slots, numbered from 0):
 *
 * | Join     | Slots | slot = ...                                  | Meaning                                                    |
 * |----------|-------|---------------------------------------------|------------------------------------------------------------|
 * | stack    | 25    | face + 5 * spot                             | face: +Y, +X, -X, +Z, -Z. spot: centre, third -u, third +u, |
 * |          |       |                                             | third -v, third +v (u, v = the face's axes in x, y, z order)|
 * | totem    | 2     | count - 2                                   | 2 or 3 round pieces on the top-face centre: cylinders,     |
 * |          |       |                                             | the top one may be a cone or sphere instead                |
 * | halfSunk | 6     | axis + 2 * spot                             | axis: along X, along Z. spot: centred, flush to the -side  |
 * |          |       |                                             | edge, flush to the +side edge                              |
 * | wing     | 24    | face + 4 * (plane + 2 * spot)               | face: +X, -X, +Z, -Z. plane: top, bottom. spot: centred,   |
 * |          |       |                                             | flush to the - edge, flush to the + edge                   |
 * | through  | 3     | axis                                        | X, Z, Y                                                    |
 * | mirror   | 6     | plane + 2 * spot                            | plane: across X (on +-X faces), across Z (on +-Z faces).   |
 * |          |       |                                             | spot: centred, flush top, flush bottom                     |
 * | hinged   | 12    | edge + 4 * angle                            | edge: top edge at +Z, -Z, +X, -X. angle: 30, 45, 60        |
 * | tilt45   | 5     | face                                        | a centred stack on +Y, +X, -X, +Z, -Z, turned 45 about the |
 * |          |       |                                             | normal                                                     |
 * | cut      | 14    | 0-2 hole, 3-7 bore, 8-11 notch, 12-13 groove| hole: centred through-hole along X, Y, Z. bore: half-depth |
 * |          |       |                                             | from +Y, +X, -X, +Z, -Z. notch: top corner at (+X+Z),      |
 * |          |       |                                             | (-X+Z), (-X-Z), (+X-Z). groove: half-round along X, along Z|
 * |          |       |                                             | across the top face                                        |
 *
 * Targets: stack and cut accept a box or a cylinder (cylinder: only its end caps / along its axis, centred);
 * every other join needs a box. A sphere is placed only on a +Y stack or as a totem cap, sunk 0.25 into the piece
 * below so the contact is an area, not a point. The slot never wraps: a slot >= JOIN_SLOTS gives null.
 * A target turned by anything but quarter turns gives null. So every join stays visible, a box child of a box
 * (centred stack, wing, mirror) is a module narrower than its face on at least one axis, and stacked totem
 * cylinders, and a cylinder stacked on a cylinder, step in by a module each.
 */

export const MODULE = 0.5;
export const GRID = 0.25;

export interface JoinContext {
  pieces: Piece[];
  target: number;
  allowed: PrimitiveType[];
  rand: () => number;
}

export interface Placed {
  join: JoinKind;
  pieces: Piece[];
}

export const JOIN_SLOTS: Record<JoinKind, number> = {
  stack: 25,
  totem: 2,
  halfSunk: 6,
  wing: 24,
  through: 3,
  mirror: 6,
  hinged: 12,
  tilt45: 5,
  cut: 14,
};

const MAX_RATIO = 2.5;
const MIN_SIZE = 0.5;
const MAX_SIZE = 2;
const SPHERE_SINK = 0.25;
const ROUND: PrimitiveType[] = ['cylinder', 'cone', 'sphere'];
const EPS = 1e-9;

const clean = (v: number) => Math.round(v * 1e6) / 1e6 + 0;

/** Multiples of MODULE in [min, max]. */
function moduleSizes(min: number, max: number): number[] {
  const out: number[] = [];
  for (let k = Math.ceil(min / MODULE - EPS); k * MODULE <= max + EPS; k++) out.push(k * MODULE);
  return out;
}

function pick<T>(rand: () => number, values: T[]): T {
  return values[Math.min(values.length - 1, Math.floor(rand() * values.length))];
}

/** A multiple of 0.5 in [min, max], clamped to [0.5, 2]. */
export function moduleSize(rand: () => number, min = 0.5, max = 2): number {
  const sizes = moduleSizes(Math.max(min, MIN_SIZE), Math.min(max, MAX_SIZE));
  if (sizes.length === 0) throw new RangeError(`no multiple of ${MODULE} in [${min}, ${max}]`);
  return pick(rand, sizes);
}

/** Module sizes within [lo[i], hi[i]] and [0.5, 2], longest : shortest <= 2.5 across all of them. */
function pickDims(rand: () => number, lo: number[], hi: number[]): number[] | null {
  const out: number[] = [];
  for (let i = 0; i < lo.length; i++) {
    const rest = [...lo.keys()].slice(i + 1);
    const picked = out.length ? out : [Infinity];
    const lower = Math.max(
      MIN_SIZE,
      lo[i],
      out.length ? Math.max(...out) / MAX_RATIO : 0,
      ...rest.map((j) => lo[j] / MAX_RATIO),
    );
    const upper = Math.min(MAX_SIZE, hi[i], MAX_RATIO * Math.min(...picked), ...rest.map((j) => MAX_RATIO * hi[j]));
    const sizes = moduleSizes(lower, upper);
    if (sizes.length === 0) return null;
    out.push(pick(rand, sizes));
  }
  return out;
}

const DEG = Math.PI / 180;

/** `v` turned as manifold's rotate does: X, then Y, then Z, about global axes. */
function rotateVec(v: Vec3, rotation: Vec3): Vec3 {
  const [rx, ry, rz] = rotation.map((d) => d * DEG);
  let [x, y, z] = v;
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [x, y, z];
}

interface Shape {
  kind: 'box' | 'cylinder' | 'other';
  centre: Vec3;
  /** World axis-aligned size. */
  ext: Vec3;
  min: Vec3;
  max: Vec3;
  /** World axis of a cylinder. */
  axis: number;
}

/** World extent of a target turned by multiples of 90 degrees. */
function shapeOf(piece: Piece): Shape {
  const ext: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const unit: Vec3 = [0, 0, 0];
    unit[i] = 1;
    const d = rotateVec(unit, piece.rotation);
    for (let k = 0; k < 3; k++) ext[k] += Math.abs(d[k]) * piece.size[i];
  }
  const e = ext.map(clean) as Vec3;
  const centre = piece.position;
  const up = rotateVec([0, 1, 0], piece.rotation).map(Math.abs);
  const kind = piece.type === 'cube' ? 'box' : piece.type === 'cylinder' ? 'cylinder' : 'other';
  return {
    kind,
    centre,
    ext: e,
    min: centre.map((c, k) => c - e[k] / 2) as Vec3,
    max: centre.map((c, k) => c + e[k] / 2) as Vec3,
    axis: up.indexOf(Math.max(...up)),
  };
}

/** Local size and rotation so a piece of world size `ws` has its local +Y along `sign` * world `axis`. */
function orient(axis: number, sign: 1 | -1, ws: Vec3, spin = 0): { size: Vec3; rotation: Vec3 } {
  if (axis === 1) return { size: ws, rotation: sign > 0 ? [0, spin, 0] : [180, spin, 0] };
  if (axis === 0) return { size: [ws[1], ws[0], ws[2]], rotation: [0, spin, sign > 0 ? -90 : 90] };
  return { size: [ws[0], ws[2], ws[1]], rotation: [sign > 0 ? 90 : -90, 0, spin] };
}

function piece(
  type: PrimitiveType,
  axis: number,
  sign: 1 | -1,
  ws: Vec3,
  position: Vec3,
  op: 'add' | 'cut' = 'add',
  spin = 0,
): Piece {
  const { size, rotation } = orient(axis, sign, ws, spin);
  return { type, size, rotation, position: position.map(clean) as Vec3, op };
}

const others = (axis: number) => [0, 1, 2].filter((k) => k !== axis);
const snapGrid = (v: number) => Math.round(v / GRID) * GRID;

function allowedOf(ctx: JoinContext, types: PrimitiveType[]): PrimitiveType[] {
  return PRIMITIVES.filter((t) => types.includes(t) && ctx.allowed.includes(t));
}

/** World size for a piece along `axis`: cross section (tied for every type but a plain box) and length. */
function crossAndLength(
  rand: () => number,
  type: PrimitiveType,
  axis: number,
  crossHi: [number, number],
  lengthHi: number,
): Vec3 | null {
  const [u, v] = others(axis);
  const ws: Vec3 = [0, 0, 0];
  if (type === 'cube') {
    const lo = [0, 0, 0];
    const hi = [0, 0, 0];
    hi[u] = crossHi[0];
    hi[v] = crossHi[1];
    hi[axis] = lengthHi;
    const d = pickDims(rand, lo, hi);
    return d ? (d as Vec3) : null;
  }
  if (type === 'sphere') {
    const d = moduleSizes(MIN_SIZE, Math.min(MAX_SIZE, ...crossHi, lengthHi));
    if (d.length === 0) return null;
    const s = pick(rand, d);
    return [s, s, s];
  }
  const d = pickDims(rand, [0, 0], [Math.min(...crossHi), lengthHi]);
  if (!d) return null;
  ws[u] = ws[v] = d[0];
  ws[axis] = d[1];
  return ws;
}

/** A box along `axis` whose footprint is a module narrower than `crossHi` on at least one face axis, so it
 *  never just extends the face it sits on into one plain cuboid. */
function narrowerBox(rand: () => number, axis: number, crossHi: [number, number], lengthHi: number): Vec3 | null {
  const first = pick(rand, [0, 1]);
  for (const k of [first, 1 - first]) {
    const hi: [number, number] = [...crossHi];
    hi[k] -= MODULE;
    const ws = crossAndLength(rand, 'cube', axis, hi, lengthHi);
    if (ws) return ws;
  }
  return null;
}

const STACK_FACES: [number, 1 | -1][] = [
  [1, 1],
  [0, 1],
  [0, -1],
  [2, 1],
  [2, -1],
];

function stack(ctx: JoinContext, t: Shape, slot: number, spin: number): Piece | null {
  const [axis, sign] = STACK_FACES[slot % 5];
  const spot = Math.floor(slot / 5);
  const types = spin
    ? allowedOf(ctx, ['cube', 'pyramid'])
    : allowedOf(ctx, axis === 1 && sign > 0 ? PRIMITIVES : PRIMITIVES.filter((p) => p !== 'sphere'));
  if (types.length === 0) return null;
  const [u, v] = others(axis);
  const offset: Vec3 = [0, 0, 0];
  if (spot > 0) {
    const k = spot <= 2 ? u : v;
    const off = snapGrid(t.ext[k] / 6);
    if (off === 0) return null;
    offset[k] = spot % 2 === 1 ? -off : off;
  }
  if (t.kind === 'cylinder' && (axis !== t.axis || spot > 0)) return null;
  if (t.kind === 'other') return null;

  const type = pick(ctx.rand, types);
  const square = type === 'cube' || type === 'pyramid';
  let crossHi: [number, number] = [t.ext[u] - 2 * Math.abs(offset[u]), t.ext[v] - 2 * Math.abs(offset[v])];
  // a square footprint on a disc, or one turned 45 degrees, must fit by its diagonal
  if (square && (t.kind === 'cylinder' || spin)) {
    const s = Math.min(...crossHi) / Math.SQRT2;
    crossHi = [s, s];
  }
  // a cylinder of the same diameter would just lengthen the target
  if (type === 'cylinder' && t.kind === 'cylinder') crossHi = [crossHi[0] - MODULE, crossHi[1] - MODULE];
  const fullFace = type === 'cube' && !spin && t.kind === 'box' && spot === 0;
  const ws = fullFace
    ? narrowerBox(ctx.rand, axis, crossHi, MAX_SIZE)
    : crossAndLength(ctx.rand, spin ? 'pyramid' : type, axis, crossHi, MAX_SIZE);
  if (!ws) return null;
  const face = sign > 0 ? t.max[axis] : t.min[axis];
  const half = type === 'sphere' ? ws[axis] / 2 - SPHERE_SINK : ws[axis] / 2;
  const position = t.centre.map((c, k) => c + offset[k]) as Vec3;
  position[axis] = face + sign * half;
  return piece(type, axis, sign, ws, position, 'add', spin);
}

const SIDE_FACES: [number, 1 | -1][] = [
  [0, 1],
  [0, -1],
  [2, 1],
  [2, -1],
];

function wing(ctx: JoinContext, t: Shape, slot: number): Piece | null {
  if (t.kind !== 'box' || !ctx.allowed.includes('cube')) return null;
  const [axis, sign] = SIDE_FACES[slot % 4];
  const plane = Math.floor(slot / 4) % 2;
  const spot = Math.floor(slot / 8);
  const across = axis === 0 ? 2 : 0;
  const [u, v] = others(axis);
  // lower than the target or narrower across it, so the L / T step shows
  const ws = narrowerBox(ctx.rand, axis, [t.ext[u], t.ext[v]], MAX_SIZE);
  if (!ws) return null;
  const position = [...t.centre] as Vec3;
  position[axis] = (sign > 0 ? t.max[axis] : t.min[axis]) + (sign * ws[axis]) / 2;
  position[1] = plane === 0 ? t.max[1] - ws[1] / 2 : t.min[1] + ws[1] / 2;
  if (spot === 1) position[across] = t.min[across] + ws[across] / 2;
  if (spot === 2) position[across] = t.max[across] - ws[across] / 2;
  return piece('cube', axis, sign, ws, position);
}

function halfSunk(ctx: JoinContext, t: Shape, slot: number): Piece | null {
  if (t.kind !== 'box' || !ctx.allowed.includes('cylinder')) return null;
  const axis = slot % 2 === 0 ? 0 : 2;
  const across = axis === 0 ? 2 : 0;
  const spot = Math.floor(slot / 2);
  // the buried half must stay inside the box: diameter within the top face and twice the height
  const ws = crossAndLength(ctx.rand, 'cylinder', axis, [Math.min(t.ext[across], 2 * t.ext[1]), 2 * t.ext[1]], t.ext[axis]);
  if (!ws) return null;
  const position = [...t.centre] as Vec3;
  position[1] = t.max[1];
  if (spot === 1) position[across] = t.min[across] + ws[across] / 2;
  if (spot === 2) position[across] = t.max[across] - ws[across] / 2;
  return piece('cylinder', axis, 1, ws, position);
}

function totem(ctx: JoinContext, t: Shape, slot: number): Piece[] | null {
  if (t.kind !== 'box') return null;
  const round = allowedOf(ctx, ROUND);
  const out: Piece[] = [];
  let width = Math.min(t.ext[0], t.ext[2]);
  let top = t.max[1];
  for (let i = 0; i < slot + 2; i++) {
    // each cylinder above the first is a module narrower than the one below, so the steps show; a cone or
    // sphere cap may be as wide as the one below
    const narrower = i > 0 ? width - MODULE : width;
    // nothing stands on a cone's apex, and a sphere is a cap only (sunk on both sides it would vanish)
    const types = (i < slot + 1 ? round.filter((r) => r === 'cylinder') : round).filter(
      (r) => r !== 'cylinder' || narrower >= MIN_SIZE - EPS,
    );
    if (types.length === 0) return null;
    const type = pick(ctx.rand, types);
    const limit = type === 'cylinder' ? narrower : width;
    const ws = crossAndLength(ctx.rand, type, 1, [limit, limit], MAX_SIZE);
    if (!ws) return null;
    const bottom = type === 'sphere' ? top - SPHERE_SINK : top;
    out.push(piece(type, 1, 1, ws, [t.centre[0], bottom + ws[1] / 2, t.centre[2]]));
    top = bottom + ws[1];
    width = ws[0];
  }
  return out;
}

function through(ctx: JoinContext, t: Shape, slot: number): Piece | null {
  if (t.kind !== 'box') return null;
  const types = allowedOf(ctx, ['cube', 'cylinder']);
  if (types.length === 0) return null;
  const axis = [0, 2, 1][slot];
  const [u, v] = others(axis);
  const lengths = moduleSizes(t.ext[axis] + MODULE, MAX_SIZE);
  if (lengths.length === 0) return null;
  const type = pick(ctx.rand, types);
  const length = pick(ctx.rand, lengths);
  const lo: Vec3 = [0, 0, 0];
  const hi: Vec3 = [0, 0, 0];
  lo[axis] = hi[axis] = length;
  let ws: Vec3 | null = null;
  if (type === 'cylinder') {
    // tangent on all four sides would just fill the box's cross-section
    const d = t.ext[u] === t.ext[v] ? t.ext[u] - MODULE : Math.min(t.ext[u], t.ext[v]);
    const dims = pickDims(ctx.rand, [0, length], [d, length]);
    if (dims) {
      ws = [dims[0], dims[0], dims[0]];
      ws[axis] = length;
    }
  } else {
    // a box at least one module narrower than the target on one cross axis
    const first = pick(ctx.rand, [u, v]);
    for (const k of [first, first === u ? v : u]) {
      hi[u] = t.ext[u];
      hi[v] = t.ext[v];
      hi[k] -= MODULE;
      ws = pickDims(ctx.rand, lo, hi) as Vec3 | null;
      if (ws) break;
    }
  }
  if (!ws) return null;
  return piece(type, axis, 1, ws, [...t.centre] as Vec3);
}

function mirror(ctx: JoinContext, t: Shape, slot: number): Piece[] | null {
  if (t.kind !== 'box') return null;
  const types = allowedOf(ctx, PRIMITIVES.filter((p) => p !== 'sphere'));
  if (types.length === 0) return null;
  const axis = slot % 2 === 0 ? 0 : 2;
  const spot = Math.floor(slot / 2);
  const type = pick(ctx.rand, types);
  const crossHi: [number, number] = axis === 0 ? [t.ext[1], t.ext[2]] : [t.ext[0], t.ext[1]];
  const ws =
    type === 'cube'
      ? narrowerBox(ctx.rand, axis, crossHi, MAX_SIZE)
      : crossAndLength(ctx.rand, type, axis, crossHi, MAX_SIZE);
  if (!ws) return null;
  const position = [...t.centre] as Vec3;
  if (spot === 1) position[1] = t.max[1] - ws[1] / 2;
  if (spot === 2) position[1] = t.min[1] + ws[1] / 2;
  const a = [...position] as Vec3;
  const b = [...position] as Vec3;
  a[axis] = t.max[axis] + ws[axis] / 2;
  b[axis] = t.min[axis] - ws[axis] / 2;
  return [piece(type, axis, 1, ws, a), piece(type, axis, -1, ws, b)];
}

const HINGE_ANGLES = [30, 45, 60];

/** The lid turns about its own top hinge edge, laid on the target's top edge, so its back corner dips into the box. */
function hinged(ctx: JoinContext, t: Shape, slot: number): Piece | null {
  if (t.kind !== 'box' || !ctx.allowed.includes('cube')) return null;
  const edge = slot % 4;
  const angle = HINGE_ANGLES[Math.floor(slot / 4)];
  const axis = edge < 2 ? 2 : 0; // the axis the lid opens away along
  const along = axis === 2 ? 0 : 2;
  const sign = edge % 2 === 0 ? 1 : -1;
  const hi: Vec3 = [0, MODULE, 0];
  hi[along] = t.ext[along];
  hi[axis] = t.ext[axis];
  const ws = pickDims(ctx.rand, [0, MODULE, 0], hi) as Vec3 | null;
  if (!ws) return null;
  const hinge = [...t.centre] as Vec3;
  hinge[1] = t.max[1];
  hinge[axis] = sign > 0 ? t.max[axis] : t.min[axis];
  const rel: Vec3 = [0, -ws[1] / 2, 0];
  rel[axis] = (-sign * ws[axis]) / 2;
  // lift the free edge: about X for a hinge on a Z edge, about Z for one on an X edge
  const rotation: Vec3 = axis === 2 ? [sign * angle, 0, 0] : [0, 0, -sign * angle];
  const r = rotateVec(rel, rotation);
  return { type: 'cube', size: ws, rotation, position: hinge.map((h, k) => h + r[k]) as Vec3, op: 'add' };
}

/** Removed fraction must be in [0.1, 0.5]. */
const fits = (fraction: number) => fraction >= 0.1 - EPS && fraction <= 0.5 + EPS;

function cut(ctx: JoinContext, t: Shape, slot: number): Piece | null {
  if (t.kind === 'other') return null;
  const cyl = t.kind === 'cylinder';
  const rand = ctx.rand;
  if (slot < 8) {
    const hole = slot < 3;
    const [axis, sign] = hole ? ([[0, 1], [1, 1], [2, 1]] as [number, 1 | -1][])[slot] : STACK_FACES[slot - 3];
    if (cyl && axis !== t.axis) return null;
    const [u, v] = others(axis);
    const e = t.ext[axis];
    const depth = hole ? e : e / 2;
    // overshoot the open face(s) so no cutter face is coplanar with the target
    const length = hole ? e + MODULE : Math.ceil((depth + GRID) / MODULE - EPS) * MODULE;
    if (length > MAX_SIZE + EPS) return null;
    const area = cyl ? (Math.PI * t.ext[u] ** 2) / 4 : t.ext[u] * t.ext[v];
    const ds = moduleSizes(MIN_SIZE, Math.min(t.ext[u], t.ext[v]) - MODULE).filter((d) =>
      fits(((Math.PI * d * d) / 4 / area) * (depth / e)),
    );
    if (ds.length === 0) return null;
    const d = pick(rand, ds);
    const ws: Vec3 = [d, d, d];
    ws[axis] = length;
    const position = [...t.centre] as Vec3;
    if (!hole) position[axis] = (sign > 0 ? t.max[axis] : t.min[axis]) - sign * depth + (sign * length) / 2;
    return piece('cylinder', axis, sign, ws, position, 'cut');
  }
  if (cyl) return null;
  if (slot < 12) {
    const corner = slot - 8;
    const signs: Vec3 = [corner === 0 || corner === 3 ? 1 : -1, 1, corner < 2 ? 1 : -1];
    const ws: Vec3 = [0, 0, 0];
    const position: Vec3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const ns = moduleSizes(0.5 * t.ext[k], 0.75 * t.ext[k]);
      if (ns.length === 0) return null;
      const n = pick(rand, ns);
      const outer = signs[k] > 0 ? t.max[k] : t.min[k];
      ws[k] = n + MODULE;
      position[k] = outer - (signs[k] * n) / 2 + (signs[k] * MODULE) / 2;
    }
    return piece('cube', 1, 1, ws, position, 'cut');
  }
  const axis = slot === 12 ? 0 : 2;
  const across = axis === 0 ? 2 : 0;
  const length = t.ext[axis] + MODULE;
  if (length > MAX_SIZE + EPS) return null;
  const ds = moduleSizes(MIN_SIZE, Math.min(t.ext[across] - MODULE, 2 * t.ext[1] - MODULE)).filter((d) =>
    fits((Math.PI * d * d) / (8 * t.ext[across] * t.ext[1])),
  );
  if (ds.length === 0) return null;
  const d = pick(rand, ds);
  const ws: Vec3 = [d, d, d];
  ws[axis] = length;
  const position = [...t.centre] as Vec3;
  position[1] = t.max[1];
  return piece('cylinder', axis, 1, ws, position, 'cut');
}

/** The new piece(s) for one join at one slot on ctx.pieces[ctx.target], or null when it can't apply. */
export function placeJoin(join: JoinKind, slot: number, ctx: JoinContext): Placed | null {
  const target = ctx.pieces[ctx.target];
  if (!target || target.op !== 'add' || slot < 0 || slot >= JOIN_SLOTS[join] || !Number.isInteger(slot)) return null;
  // world extents below assume quarter turns; a hinged lid or 45 degree piece can't be a target
  if (target.rotation.some((r) => Math.abs(r / 90 - Math.round(r / 90)) > EPS)) return null;
  const t = shapeOf(target);
  let pieces: Piece[] | null = null;
  const one = (p: Piece | null) => (p ? [p] : null);
  switch (join) {
    case 'stack':
      pieces = one(stack(ctx, t, slot, 0));
      break;
    case 'tilt45':
      pieces = one(stack(ctx, t, slot, 45));
      break;
    case 'wing':
      pieces = one(wing(ctx, t, slot));
      break;
    case 'halfSunk':
      pieces = one(halfSunk(ctx, t, slot));
      break;
    case 'totem':
      pieces = totem(ctx, t, slot);
      break;
    case 'through':
      pieces = one(through(ctx, t, slot));
      break;
    case 'mirror':
      pieces = mirror(ctx, t, slot);
      break;
    case 'hinged':
      pieces = one(hinged(ctx, t, slot));
      break;
    case 'cut':
      pieces = one(cut(ctx, t, slot));
      break;
  }
  return pieces ? { join, pieces } : null;
}
