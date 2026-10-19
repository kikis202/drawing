import type { Manifold, ManifoldToplevel } from '../manifold';
import { buildManifold } from '../build-form';
import { mulberry32 } from '../prng';
import { pieceManifold } from '../primitives';
import { PRIMITIVES, type FormSpec, type JoinKind, type Piece, type PrimitiveType, type RecipeStep, type Vec3 } from '../types';
import { JOIN_SLOTS, moduleSize, placeJoin } from './joins';

/*
 * Clean forms: a recipe (piece types, joins, targets, slots) drawn from mulberry32(seed), sized by a second
 * stream per variation number. A form is built as: the base piece, at Level 6 the one tilted piece, the level's
 * regular joins up to the piece count, then at most one cut, always last so nothing attaches to a cut
 * target. Each step keeps the form one piece, grows it by >= 8% (cuts: remove 10-50% of the target) and keeps
 * the overall extent within 2 : 1. A new piece may touch other pieces but not overlap any piece but its target,
 * and a cutter (which overshoots its target's faces) may not carve any other piece.
 */

export type Level = 1 | 2 | 3 | 4 | 5 | 6;

export interface CleanSettings {
  level: Level;
  allowed: PrimitiveType[];
  joins: JoinKind[];
}

export interface LevelRule {
  name: string;
  pieces: [number, number];
  joins: JoinKind[];
  /** Exactly one of these is used when any is enabled. */
  extra?: JoinKind[];
  boxesOnly?: boolean;
  noSphere?: boolean;
}

const L3_JOINS: JoinKind[] = ['stack', 'totem', 'halfSunk', 'wing'];
const L4_JOINS: JoinKind[] = [...L3_JOINS, 'through', 'mirror'];

export const LEVELS: Record<Level, LevelRule> = {
  1: { name: 'One shape, varied proportions', pieces: [1, 1], joins: [], noSphere: true },
  2: { name: 'Boxes only, joined flush', pieces: [2, 2], joins: ['stack', 'wing'], boxesOnly: true, noSphere: true },
  3: { name: 'Mixed shapes, stacked and joined', pieces: [2, 4], joins: L3_JOINS },
  4: { name: 'Adds mirror pairs and totems', pieces: [3, 5], joins: L4_JOINS },
  5: { name: 'Adds one clean cut', pieces: [3, 5], joins: [...L4_JOINS, 'cut'], extra: ['cut'] },
  6: {
    name: 'Adds one tilted or hinged piece',
    pieces: [3, 6],
    joins: [...L4_JOINS, 'cut', 'hinged', 'tilt45'],
    extra: ['hinged', 'tilt45'],
  },
};

const SKIPPED: Partial<Record<Level, string>> = {
  5: 'no cut: Clean cut is off',
  6: 'no tilted piece: Hinged lid and 45° piece are off',
};

const STEP_TRIES = 12;
const FORM_TRIES = 6;
const VARIATION_TRIES = 12;
/** Base pieces one variation number tries, each with a search of at most SEARCH_BUDGET draws. */
const VARIATION_BASES = 8;
const SEARCH_BUDGET = 60;
/** A base is given up once one step has used all its draws on it this many times. */
const BASE_MISSES = 2;
/** Work one varyCleanForm call may spend over all its variation numbers and bases, so it stays quick: one unit
 *  per draw plus OP_COST per mesh operation. A count, not a clock, so the result stays deterministic. */
const VARY_BUDGET = 12000;
const OP_COST = 3;
/** Relative cost of making and combining a piece's mesh, by how many facets it has. */
const MESH_COST: Record<PrimitiveType, number> = { cube: 1, pyramid: 1, cylinder: 2, cone: 2, sphere: 6 };
const meshCost = (pieces: Piece[]) => pieces.reduce((c, p) => c + MESH_COST[p.type], 0);
/** A mesh intersection test costs about this many other mesh operations. */
const MESH_TEST_OPS = 10;
/** Most tied attempts completed leniently when no variation passes. */
const FALLBACK_CANDIDATES = 3;
const MIN_GROWTH = 1.08;
const MAX_EXTENT_RATIO = 2;
const MIN_CUT = 0.1;
const MAX_CUT = 0.5;
/** Overlap volume below this is a touching face, not an overlap. */
const OVERLAP_EPS = 1e-6;
const EPS = 1e-9;
/** Distances below this are touching, not overlapping. */
const LINEAR_EPS = 1e-6;
/** At Level 3 a totem is base + 2 round pieces (slot 0); from Level 4 up to 3 (slot 1). */
const LEVEL3_TOTEM_SLOT = 0;
const OPTIONAL_CUT = 0.5;
/** Smallest base dimension under a tilted piece: the lid takes a top edge, so the top needs room left for stacks
 *  and half-sunk pieces, which all stand on top faces. */
const TILT_BASE_MIN = 1.5;
const TILTED: JoinKind[] = ['hinged', 'tilt45'];
const ROUND: PrimitiveType[] = ['cylinder', 'cone', 'sphere'];

function pick<T>(rand: () => number, values: T[]): T {
  return values[Math.min(values.length - 1, Math.floor(rand() * values.length))];
}

const proportions = (seed: number, variation: number) => mulberry32(seed ^ Math.imul(variation + 1, 0x9e3779b1));

const quarterTurned = (p: Piece) => p.rotation.every((r) => Math.abs(r / 90 - Math.round(r / 90)) < EPS);

/** True when the manifold is one connected component. */
function isSingleComponent(m: Manifold): boolean {
  const parts = m.decompose();
  const count = parts.length;
  parts.forEach((p) => p.delete());
  return count === 1;
}

/** True when the pieces build as one component along the renderer's path (`buildManifold`). Building a form
 *  step by step can disagree on tangent contacts, so every returned form is checked this way. */
function rendersAsOne(wasm: ManifoldToplevel, pieces: Piece[]): boolean {
  const m = buildManifold(wasm, pieces);
  try {
    return isSingleComponent(m);
  } finally {
    m.delete();
  }
}

/** The overall bounds of `ms` are within 2 : 1. */
function withinExtent(ms: Manifold[]): boolean {
  const boxes = ms.map((m) => m.boundingBox());
  const ext = [0, 1, 2].map(
    (k) => Math.max(...boxes.map((b) => b.max[k])) - Math.min(...boxes.map((b) => b.min[k])),
  );
  return Math.max(...ext) <= MAX_EXTENT_RATIO * Math.min(...ext) + EPS;
}

function sharedVolume(a: Manifold, b: Manifold): number {
  const both = a.intersect(b);
  try {
    return both.volume();
  } finally {
    both.delete();
  }
}

/** A piece's world bounds, and what it is for the quick overlap test: a box, or a cylinder along `axis`. */
interface Solid {
  kind: 'box' | 'cylinder' | 'other';
  min: Vec3;
  max: Vec3;
  axis: number;
}

/** World axis of a quarter-turned piece's local +Y (rotations X, then Y, then Z, as manifold applies them). */
function upAxis(rotation: Vec3): number {
  const [rx, ry, rz] = rotation.map((d) => (d * Math.PI) / 180);
  let [x, y, z] = [0, Math.cos(rx), Math.sin(rx)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  const a = [x, y, z].map(Math.abs);
  return a.indexOf(Math.max(...a));
}

function solidOf(piece: Piece, m: Manifold): Solid {
  const { min, max } = m.boundingBox();
  const turned = quarterTurned(piece);
  const kind = turned && piece.type === 'cube' ? 'box' : turned && piece.type === 'cylinder' ? 'cylinder' : 'other';
  return { kind, min: [...min] as Vec3, max: [...max] as Vec3, axis: kind === 'cylinder' ? upAxis(piece.rotation) : 1 };
}

/** Per-axis overlap of two bounds (negative when apart). */
const boundsOverlap = (a: Solid, b: Solid) =>
  [0, 1, 2].map((k) => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]));

/** Whether two pieces share volume, from their bounds: exact for box-box, and for box-cylinder and parallel
 *  cylinders up to the facets (a cylinder counts as a true circle, so a piece within a facet's depth of it
 *  counts as overlapping). Null when only the mesh can tell. */
function quickOverlap(a: Solid, b: Solid): boolean | null {
  if (boundsOverlap(a, b).some((d) => d <= LINEAR_EPS)) return false;
  if (a.kind === 'box' && b.kind === 'box') return true;
  const centre = (s: Solid, k: number) => (s.min[k] + s.max[k]) / 2;
  const radius = (s: Solid) => (s.max[(s.axis + 1) % 3] - s.min[(s.axis + 1) % 3]) / 2;
  if (a.kind === 'cylinder' && b.kind === 'cylinder' && a.axis === b.axis) {
    const d = Math.hypot(...[0, 1, 2].filter((k) => k !== a.axis).map((k) => centre(a, k) - centre(b, k)));
    return d < radius(a) + radius(b) - LINEAR_EPS;
  }
  const cyl = a.kind === 'cylinder' && b.kind === 'box' ? a : b.kind === 'cylinder' && a.kind === 'box' ? b : null;
  if (!cyl) return null;
  const box = cyl === a ? b : a;
  let d2 = 0;
  for (const k of [0, 1, 2]) {
    if (k === cyl.axis) continue;
    const c = centre(cyl, k);
    const d = Math.max(box.min[k] - c, 0, c - box.max[k]);
    d2 += d * d;
  }
  return Math.sqrt(d2) < radius(cyl) - LINEAR_EPS;
}

/** Piece types the level lets a join add. */
function addTypes(settings: CleanSettings): PrimitiveType[] {
  const rule = LEVELS[settings.level];
  // Level 2 with Box off falls back to Level 3 rules for types
  if (rule.boxesOnly && settings.allowed.includes('cube')) return ['cube'];
  return PRIMITIVES.filter((t) => settings.allowed.includes(t) && !(rule.noSphere && t === 'sphere'));
}

/** A box when allowed, else the first allowed shape that isn't a sphere (a box if there is none). */
function baseType(allowed: PrimitiveType[]): PrimitiveType {
  if (allowed.includes('cube')) return 'cube';
  return PRIMITIVES.find((t) => t !== 'sphere' && allowed.includes(t)) ?? 'cube';
}

function baseSize(rand: () => number, type: PrimitiveType, min: number): Vec3 {
  for (let t = 0; t < STEP_TRIES; t++) {
    const s = [0, 1, 2].map(() => moduleSize(rand, min, 2)) as Vec3;
    if (type === 'cylinder' || type === 'cone') s[2] = s[0];
    if (Math.max(...s) <= MAX_EXTENT_RATIO * Math.min(...s)) return s;
  }
  return [1, 1, 1];
}

const basePiece = (type: PrimitiveType, size: Vec3): Piece => ({
  type,
  size,
  rotation: [0, 0, 0],
  position: [0, 0, 0],
  op: 'add',
});

/** Types `join` can add at `slot`, from `types`. A cutter's type follows from its slot, whatever is allowed. */
function typesFor(join: JoinKind, slot: number, types: PrimitiveType[]): PrimitiveType[] {
  const only = (ts: PrimitiveType[]) => types.filter((t) => ts.includes(t));
  switch (join) {
    case 'stack':
      // every stack slot is on the top face, where a sphere may sit
      return types;
    case 'tilt45':
      return only(['cube', 'pyramid']);
    case 'wing':
    case 'hinged':
      return only(['cube']);
    case 'halfSunk':
      return only(['cylinder']);
    case 'totem':
      return types.includes('cylinder') ? only(ROUND) : [];
    case 'through':
      return only(['cube', 'cylinder']);
    case 'mirror':
      return types.filter((t) => t !== 'sphere');
    case 'cut':
      return [slot >= 8 && slot < 12 ? 'cube' : 'cylinder'];
  }
}

const added = (join: JoinKind, slot: number) => (join === 'cut' ? 0 : join === 'mirror' ? 2 : join === 'totem' ? slot + 2 : 1);

/** The new pieces for a recipe step, or null when it can't apply or makes another type than the recipe's. */
function place(step: RecipeStep & { join: JoinKind }, pieces: Piece[], rand: () => number): Piece[] | null {
  const allowed: PrimitiveType[] = step.join === 'totem' ? ['cylinder', step.type] : [step.type];
  const placed = placeJoin(step.join, step.slot, { pieces, target: step.target, allowed, rand });
  if (!placed) return null;
  const ps = placed.pieces;
  return ps[step.join === 'totem' ? ps.length - 1 : 0].type === step.type ? ps : null;
}

/** A form under construction. Owns its manifolds until `delete()`. */
class Build {
  pieces: Piece[] = [];
  recipe: RecipeStep[] = [];
  /** One manifold per piece (cutters included), for overlap and cut checks. */
  private parts: Manifold[] = [];
  private form: Manifold | undefined;
  /** Mesh operations (pieces made, booleans, and pieces rebuilt for the renderer check) done so far: the costly part. */
  ops = 0;
  /** The form before each committed step, and that step's piece count, for `undo()`. */
  private history: { form: Manifold; pieces: number }[] = [];
  private wasm: ManifoldToplevel;

  constructor(wasm: ManifoldToplevel) {
    this.wasm = wasm;
  }

  get count(): number {
    return this.pieces.filter((p) => p.op === 'add').length;
  }

  setBase(piece: Piece): void {
    this.form = pieceManifold(this.wasm, piece);
    this.parts.push(pieceManifold(this.wasm, piece));
    this.pieces.push(piece);
    this.recipe.push({ join: 'base', type: piece.type, target: -1, slot: 0 });
  }

  /** Keeps `placed` when it passes the rules; when not `strict`, when it just keeps the form one piece. */
  tryCommit(step: RecipeStep, placed: Piece[], strict: boolean): boolean {
    const form = this.form!;
    const made: Manifold[] = [];
    let next: Manifold | undefined;
    let keep = false;
    try {
      for (const p of placed) made.push(pieceManifold(this.wasm, p));
      this.ops += meshCost(placed);
      const cut = placed[0].op === 'cut';
      if (strict && !cut) {
        // cheap bounds first: the union can't grow by more than the new pieces' volume or past their bounds
        const before = form.volume();
        if (before + made.reduce((v, m) => v + m.volume(), 0) < MIN_GROWTH * before) return false;
        if (!withinExtent([form, ...made])) return false;
      }
      if (strict && (cut ? !this.cutFits(step.target, made[0], placed[0]) : this.overlapsOthers(step.target, made, placed))) {
        return false;
      }
      this.ops++;
      next = cut ? form.subtract(made[0]) : this.wasm.Manifold.union([form, ...made]);
      if (strict && ((!cut && next.volume() < MIN_GROWTH * form.volume()) || !withinExtent([next]))) return false;
      this.ops++;
      if (!isSingleComponent(next)) return false;
      // a round piece can touch along a tangent line, where the renderer's path (buildManifold) may disagree with
      // the step-by-step union, so check that path now rather than only on the finished form
      if (placed.some((p) => p.type !== 'cube')) {
        // each piece is made again and unioned
        this.ops += 2 * (meshCost(this.pieces) + meshCost(placed));
        if (!rendersAsOne(this.wasm, [...this.pieces, ...placed])) return false;
      }
      keep = true;
    } finally {
      if (!keep) {
        next?.delete();
        made.forEach((m) => m.delete());
      }
    }
    this.history.push({ form, pieces: placed.length });
    this.form = next;
    this.parts.push(...made);
    this.pieces.push(...placed);
    this.recipe.push(step);
    return true;
  }

  /** True when any of `made` overlaps a piece other than `target` by more than a touching face. */
  private overlapsOthers(target: number, made: Manifold[], placed: Piece[]): boolean {
    for (const [i, m] of made.entries()) {
      for (let j = 0; j < this.parts.length; j++) {
        if (j === target || this.pieces[j].op !== 'add') continue;
        const quick = quickOverlap(solidOf(placed[i], m), solidOf(this.pieces[j], this.parts[j]));
        if (quick === null) this.ops += MESH_TEST_OPS;
        if (quick === null ? sharedVolume(m, this.parts[j]) > OVERLAP_EPS : quick) return true;
      }
    }
    return false;
  }

  /** Carves no other piece and removes 10-50% of the target. */
  private cutFits(target: number, cutter: Manifold, piece: Piece): boolean {
    if (this.overlapsOthers(target, [cutter], [piece])) return false;
    const t = this.parts[target];
    const a = solidOf(this.pieces[target], t);
    const b = solidOf(piece, cutter);
    // a box notch in a box is exact from the bounds; anything round is measured on the mesh
    const exact = a.kind === 'box' && b.kind === 'box';
    if (!exact) this.ops += MESH_TEST_OPS;
    const shared = exact ? boundsOverlap(a, b).reduce((v, d) => v * d, 1) : sharedVolume(t, cutter);
    const removed = shared / t.volume();
    return removed >= MIN_CUT - EPS && removed <= MAX_CUT + EPS;
  }

  /** Takes back the last committed step. */
  undo(): void {
    const last = this.history.pop()!;
    this.form!.delete();
    this.form = last.form;
    this.parts.splice(-last.pieces).forEach((m) => m.delete());
    this.pieces.splice(-last.pieces);
    this.recipe.pop();
  }

  delete(): void {
    this.form?.delete();
    this.parts.forEach((m) => m.delete());
    this.history.forEach((h) => h.form.delete());
    this.form = undefined;
    this.parts = [];
    this.history = [];
  }
}

interface Attempt {
  pieces: Piece[];
  recipe: RecipeStep[];
  complete: boolean;
  score: number;
}

interface Plan {
  level: Level;
  types: PrimitiveType[];
}

/** Indices of pieces `join` may attach to. */
function targetsFor(join: JoinKind, build: Build): number[] {
  const out: number[] = [];
  build.pieces.forEach((p, i) => {
    if (p.op !== 'add' || !quarterTurned(p)) return;
    if (join === 'totem') {
      // a totem stands on the box base, once
      if (i === 0 && p.type === 'cube' && !build.recipe.some((s) => s.join === 'totem')) out.push(i);
      return;
    }
    const roundOk = join === 'stack' || join === 'tilt45' || join === 'cut';
    if (p.type === 'cube' || (roundOk && p.type === 'cylinder')) out.push(i);
  });
  return out;
}

function slotsFor(join: JoinKind, plan: Plan, remaining: number): number[] {
  const slots: number[] = [];
  for (let s = 0; s < JOIN_SLOTS[join]; s++) {
    if (join === 'totem' && plan.level === 3 && s > LEVEL3_TOTEM_SLOT) continue;
    if (added(join, s) > remaining || typesFor(join, s, plan.types).length === 0) continue;
    slots.push(s);
  }
  return slots;
}

/** One recipe step drawn from `rand`, or 'none' when no join in `joins` can apply at all. */
function sampleStep(
  rand: () => number,
  joins: JoinKind[],
  build: Build,
  plan: Plan,
  remaining: number,
): (RecipeStep & { join: JoinKind }) | 'none' {
  const options = joins.filter((j) => targetsFor(j, build).length > 0 && slotsFor(j, plan, remaining).length > 0);
  if (options.length === 0) return 'none';
  const join = pick(rand, options);
  const target = pick(rand, targetsFor(join, build));
  const slot = pick(rand, slotsFor(join, plan, remaining));
  return { join, type: pick(rand, typesFor(join, slot, plan.types)), target, slot };
}

/** Places one step from `joins`, up to STEP_TRIES draws. */
function oneStep(
  build: Build,
  rand: () => number,
  sizes: () => number,
  joins: JoinKind[],
  plan: Plan,
  remaining: number,
): 'ok' | 'none' | 'fail' {
  for (let t = 0; t < STEP_TRIES; t++) {
    const step = sampleStep(rand, joins, build, plan, remaining);
    if (step === 'none') return 'none';
    const placed = place(step, build.pieces, sizes);
    if (placed && build.tryCommit(step, placed, true)) return 'ok';
  }
  return 'fail';
}

function attempt(wasm: ManifoldToplevel, seed: number, settings: CleanSettings): Attempt {
  const rand = mulberry32(seed);
  const sizes = proportions(seed, 0);
  const rule = LEVELS[settings.level];
  const plan: Plan = { level: settings.level, types: addTypes(settings) };
  const joins = rule.joins.filter((j) => settings.joins.includes(j));
  const extras = joins.filter((j) => rule.extra?.includes(j));
  const regular = joins.filter((j) => !extras.includes(j) && j !== 'cut');
  const type = baseType(settings.allowed);
  // when a totem can stand on the base, leave room for its smallest form
  const totemFits = regular.includes('totem') && type === 'cube' && slotsFor('totem', plan, Infinity).length > 0;
  const [lo, hi] = rule.pieces;
  const least = totemFits ? Math.min(hi, Math.max(lo, 1 + added('totem', 0))) : lo;
  const wanted = least + Math.floor(rand() * (hi - least + 1));
  const tilt = settings.level === 6 && extras.length > 0;
  const cutNeeded = settings.level === 5 && extras.length > 0;
  const cutMaybe = settings.level === 6 && joins.includes('cut') && rand() < OPTIONAL_CUT;

  let build = new Build(wasm);
  try {
    // the tilted piece goes first, while the base's faces are free; later pieces keep clear of it. Its fit
    // depends most on the base's proportions, so a failed lid draws a new base. An extra join that the shapes
    // rule out ('none') can't be helped by another seed, so only 'fail' retries.
    let extrasOk = true;
    for (let t = 0; t < STEP_TRIES; t++) {
      if (t > 0) {
        build.delete();
        build = new Build(wasm);
      }
      build.setBase(basePiece(type, baseSize(sizes, type, settings.level === 1 ? 0.5 : tilt ? TILT_BASE_MIN : 1)));
      extrasOk = !tilt || oneStep(build, rand, sizes, extras, plan, 1) !== 'fail';
      if (extrasOk) break;
    }
    let failed = false;
    while (build.count < wanted) {
      const result = oneStep(build, rand, sizes, regular, plan, wanted - build.count);
      if (result === 'fail') failed = true;
      if (result !== 'ok') break;
    }
    if (cutNeeded) extrasOk = oneStep(build, rand, sizes, ['cut'], plan, 0) !== 'fail' && extrasOk;
    else if (cutMaybe) oneStep(build, rand, sizes, ['cut'], plan, 0);
    return {
      pieces: build.pieces,
      recipe: build.recipe,
      complete: !failed && extrasOk,
      score: (extrasOk ? 100 : 0) + build.count,
    };
  } finally {
    build.delete();
  }
}

/** The first attempt's base piece on its own. */
function firstBase(wasm: ManifoldToplevel, seed: number, settings: CleanSettings): { pieces: Piece[]; recipe: RecipeStep[] } {
  const build = new Build(wasm);
  try {
    const type = baseType(settings.allowed);
    build.setBase(basePiece(type, baseSize(proportions(seed, 0), type, settings.level === 1 ? 0.5 : 1)));
    return { pieces: build.pieces, recipe: build.recipe };
  } finally {
    build.delete();
  }
}

/** Deterministic Clean form: the same seed and settings always give the same spec. Never throws on non-empty `allowed`. */
export function generateCleanForm(wasm: ManifoldToplevel, seed: number, settings: CleanSettings): FormSpec {
  let best: Attempt | undefined;
  for (let n = 0; n < FORM_TRIES; n++) {
    const a = attempt(wasm, (seed + n) >>> 0, settings);
    if (!rendersAsOne(wasm, a.pieces)) continue;
    if (!best || a.score > best.score) best = a;
    if (a.complete) {
      best = a;
      break;
    }
  }
  // no attempt built as one piece: its base alone always does
  best ??= { ...firstBase(wasm, seed, settings), complete: false, score: 0 };
  return { version: 2, seed, style: 'clean', pieces: best.pieces, recipe: best.recipe, variation: 0 };
}

/** A proportion stream for `variation` that counts its draws, so a build can resume where it left off. */
function sizeStream(seed: number, variation: number, skip = 0): { next: () => number; used: () => number } {
  const rand = proportions(seed, variation);
  for (let i = 0; i < skip; i++) rand();
  let used = skip;
  return {
    next: () => {
      used++;
      return rand();
    },
    used: () => used,
  };
}

type JoinStep = RecipeStep & { join: JoinKind };

const joinSteps = (recipe: RecipeStep[]) => recipe.filter((s): s is JoinStep => s.join !== 'base');

/** Pieces a recipe step adds to `pieces`, cutters included. */
const stepPieces = (step: JoinStep) => Math.max(1, added(step.join, step.slot));

interface Search {
  passed: boolean;
  /** The passing form, or the deepest prefix built under the strict rules. */
  pieces: Piece[];
  /** Recipe steps (base included) in `pieces`. */
  prefix: number;
  /** Stream draws used when `pieces` was reached. */
  used: number;
}

/** The recipe built with proportions for `variation`. Up to VARIATION_BASES base pieces, since the base's
 *  proportions decide most of what fits; on each, depth first, each step with STEP_TRIES draws per visit, backing
 *  up to the step before when one can't be placed, until SEARCH_BUDGET draws are spent. Every draw also spends
 *  its cost from `total`. A finished form must also build as one piece along the renderer's path. */
function search(
  wasm: ManifoldToplevel,
  recipe: RecipeStep[],
  seed: number,
  variation: number,
  total: { left: number },
): Search {
  const sizes = sizeStream(seed, variation);
  const steps = joinSteps(recipe);
  const type = recipe[0].type;
  const baseMin = recipe.length === 1 ? 0.5 : steps.some((s) => TILTED.includes(s.join)) ? TILT_BASE_MIN : 1;
  let budget = 0;
  let misses: number[] = [];
  let deepest: Search = { passed: false, pieces: [], prefix: 0, used: 0 };
  const descend = (build: Build, i: number): boolean => {
    if (i === steps.length) {
      total.left -= 2 * OP_COST * meshCost(build.pieces);
      if (!rendersAsOne(wasm, build.pieces)) return false;
    }
    if (i + 1 > deepest.prefix) deepest = { passed: false, pieces: [...build.pieces], prefix: i + 1, used: sizes.used() };
    if (i === steps.length) return true;
    let t = 0;
    for (; t < STEP_TRIES && budget > 0 && total.left > 0; t++) {
      budget--;
      const ops = build.ops;
      const placed = place(steps[i], build.pieces, sizes.next);
      const ok = !!placed && build.tryCommit(steps[i], placed, true);
      total.left -= 1 + OP_COST * (build.ops - ops);
      if (!ok) continue;
      if (descend(build, i + 1)) return true;
      build.undo();
    }
    // a step that has used up all its draws BASE_MISSES times on this base is a sign the base doesn't suit it
    if (t === STEP_TRIES && (misses[i] = (misses[i] ?? 0) + 1) >= BASE_MISSES) budget = 0;
    return false;
  };
  for (let t = 0; t < VARIATION_BASES && total.left > 0; t++) {
    budget = SEARCH_BUDGET;
    misses = [];
    total.left--;
    const build = new Build(wasm);
    try {
      build.setBase(basePiece(type, baseSize(sizes.next, type, baseMin)));
      if (descend(build, 0)) return { ...deepest, passed: true };
    } finally {
      build.delete();
    }
  }
  return deepest;
}

/** `found`'s strict prefix, then the rest of the recipe keeping a step that breaks the rules if it leaves one
 *  piece. `violations` counts such steps and any step that couldn't be placed (where the form stops). */
function completeLeniently(
  wasm: ManifoldToplevel,
  recipe: RecipeStep[],
  found: Search,
  seed: number,
  variation: number,
): { pieces: Piece[]; violations: number } {
  const steps = joinSteps(recipe);
  const sizes = sizeStream(seed, variation, found.used);
  const build = new Build(wasm);
  try {
    build.setBase(found.pieces[0]);
    let n = 1;
    for (const step of steps.slice(0, found.prefix - 1)) {
      build.tryCommit(step, found.pieces.slice(n, n + stepPieces(step)), false);
      n += stepPieces(step);
    }
    let violations = 0;
    for (const [i, step] of steps.slice(found.prefix - 1).entries()) {
      let ok = false;
      for (const rules of [true, false]) {
        for (let t = 0; t < STEP_TRIES && !ok; t++) {
          const placed = place(step, build.pieces, sizes.next);
          ok = !!placed && build.tryCommit(step, placed, rules);
        }
        if (ok) break;
        violations++;
      }
      // this step and every one after it are missing
      if (!ok) return { pieces: build.pieces, violations: violations - 1 + steps.length - (found.prefix - 1) - i };
    }
    return { pieces: build.pieces, violations };
  } finally {
    build.delete();
  }
}

/** The same recipe with the next variation number whose proportions pass the rules and differ from `spec`'s,
 *  within VARY_BUDGET draws. If none passes, the best attempt: furthest strict prefix, then fewest broken steps,
 *  then lowest variation; `spec` itself if no attempt builds as one piece. */
export function varyCleanForm(wasm: ManifoldToplevel, spec: FormSpec): FormSpec {
  const recipe = spec.recipe;
  if (spec.style !== 'clean' || !recipe?.length) return spec;
  const from = spec.variation ?? 0;
  const current = JSON.stringify(spec.pieces);
  const tried: { variation: number; found: Search }[] = [];
  const total = { left: VARY_BUDGET };
  for (let i = 1; i <= VARIATION_TRIES && total.left > 0; i++) {
    const variation = from + i;
    const found = search(wasm, recipe, spec.seed, variation, total);
    if (found.passed && JSON.stringify(found.pieces) !== current) return { ...spec, pieces: found.pieces, recipe, variation };
    tried.push({ variation, found });
  }
  // a variation that only repeats the current form still keeps every rule
  const same = tried.find((t) => t.found.passed);
  if (same) return { ...spec, pieces: same.found.pieces, recipe, variation: same.variation };
  const top = Math.max(...tried.map((t) => t.found.prefix));
  let best: { variation: number; pieces: Piece[]; violations: number } | undefined;
  for (const t of tried.filter((c) => c.found.prefix === top).slice(0, FALLBACK_CANDIDATES)) {
    const done = completeLeniently(wasm, recipe, t.found, spec.seed, t.variation);
    if (!rendersAsOne(wasm, done.pieces)) continue;
    if (!best || done.violations < best.violations) best = { variation: t.variation, ...done };
  }
  return best ? { ...spec, pieces: best.pieces, recipe, variation: best.variation } : spec;
}

/** What the level skips because of the user's join settings, e.g. "Level 5 (no cut: Clean cut is off)". */
export function levelNote(settings: CleanSettings): string | null {
  const extra = LEVELS[settings.level].extra;
  if (!extra || extra.some((j) => settings.joins.includes(j))) return null;
  return `Level ${settings.level} (${SKIPPED[settings.level]})`;
}
