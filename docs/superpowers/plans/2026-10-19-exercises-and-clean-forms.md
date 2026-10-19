# Exercises, Clean Forms and Shot Patterns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rotation mode's controls with the "Exercises first" panel. Add rule-based Clean forms with levels, joins and Variation, five shot patterns, a lens setting, drawing aids, a top-view map and "hide one shot". Then finish the phone layout, saving and deploy against the new panel.

**Architecture:**
- **Geometry** gains a Clean generator under `src/geometry/clean/` that builds forms from a recipe of joins on a 0.5-unit module, next to the unchanged Freeform generator.
- **Views** gain lens-aware camera maths and `planShots()` for shot patterns.
- **Render** takes one `RenderOptions` object (lens, hidden lines, box, centre lines, ground, mode) everywhere `hidden: boolean` was passed before.
- **The rotation mode's state** holds exercise, generation, plan and render settings. Exercises are data that set those settings, and settings persist per device.

**Tech Stack:** Unchanged: TypeScript, Vite 8, Preact 10 with signals, Three.js 0.186, manifold-3d 3.5, idb, fflate, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-19-exercises-and-clean-forms-design.md`, which is the authority for this plan. It extends `docs/superpowers/specs/2026-10-19-turnaround-design.md`. Read both. The base plan `docs/superpowers/plans/2026-10-19-turnaround-rotation-study.md` (Tasks 1–9 are done) describes the code you are changing. Its Tasks 10–12 are replaced by Tasks 9–11 here. Mockup: `.superpowers/brainstorm/475642-1792420959/content/controls.html`, option B (it lives only in the worktree and is gitignored).

## Global Constraints

- Everything in the base plan's Global Constraints still holds: palette, Archivo, label format, snap timing, 760px phone breakpoint, `/drawing/` base, no backend.
- Lens vertical FOV: Flat 15°, Normal 32° (the default), Wide 55°. Distance is `1.15 / sin(fov/2)` for every lens, so the bounding sphere is framed identically.
- Clean module: dimensions are multiples of 0.5 in [0.5, 2]. Positions sit on a 0.25 grid, which is half the module, so a centred child on a 1.5-wide face stays exact. Faces are therefore either coplanar or at least 0.25 apart. Rotations are 0° or 90°, except the single Level 6 piece.
- Aid colours: Box `#5E646B`, Centre lines `#3E95D1`, ground grid `#CDD2D7`, Silhouette fill `#26292D`, Lines-only faces `#FFFFFF`.
- UI copy is verbatim from the spec and the mockup: exercise names and blurbs, level names, "Variation", "New object", "Customise", "Applies to the next object", "Add a top-view map", "Hide one shot to test me", "Draw this view: ⟨label⟩", "Reveal", "Top view (map)", "Start from live view", "Variation works with Clean forms".
- Shapes show as Box, Cylinder, Cone, Pyramid and Sphere. `cube` displays as "Box".
- Exercises, levels, joins and shot patterns use exactly the spec tables "Exercises (presets)", "Levels", "Joins" and "Shot patterns".

## Review Focus

1. **Settings that can't all be met** (for example Level 5 with Clean cut off, or Carved blocks with every shape but Box turned off). Generation must still return a valid single-piece form, and the Level line explains what it skipped. Covered by Task 5 `every exercise and random customised settings generate valid forms`.
2. **Stale or corrupt saved settings in localStorage** (missing fields, unknown ids, wrong types). The app loads with valid defaults and never crashes. Covered by Task 7 `loadSettings repairs bad stored data`.
3. **Switching shot patterns back and forth with ticked shots.** Ticks follow their view: no duplicate custom shots, no lost ticks, no stale images. Covered by Task 7 `setPlan keeps ticks by view and never duplicates` and Task 8 e2e `pattern switching keeps ticks`.
4. **Wide lens in a tall or very wide live view.** The object is never clipped, and framing matches the shot. Covered by Task 1 `framing is identical for every lens and aspect`.
5. **"Hide one shot" across New object, Variation, pattern changes and toggling off and on.** The hidden id always names an existing pattern shot (never the map or a custom shot), and Reveal resets. Covered by Task 7 `hidden shot is always a current pattern shot`.

---

## File Structure

```
src/views/camera.ts                    + Lens, LENS_FOV, lensDistance; lens params on cameraPosition / fovForAspect
src/views/patterns.ts                  NEW: ShotPlan, DEFAULT_PLAN, planShots, planColumns, planSummary
src/views/types.ts                     Shot gains role?: 'map'
src/views/label.ts                     + shotLabel(shot)
src/render/render-options.ts           NEW: RenderMode, RenderOptions, DEFAULT_RENDER, renderKey
src/render/form-scene.ts               setView(view, aspect, framePx, opts: RenderOptions); aids + modes
src/render/shot-renderer.ts            render(form, view, opts)
src/geometry/types.ts                  FormSpec v2, FormStyle, JoinKind, RecipeStep, FormMesh.bounds/axes
src/geometry/build-form.ts             computes bounds + axes
src/geometry/generate.ts               emits version 2 / style 'freeform' (otherwise unchanged)
src/geometry/clean/joins.ts            NEW: placeJoin and JOIN_SLOTS
src/geometry/clean/generate-clean.ts   NEW: LEVELS, generateCleanForm, varyCleanForm, levelNote
src/modes/rotation/exercises.ts        NEW: ExerciseId, EXERCISES
src/modes/rotation/settings-storage.ts NEW: loadSettings, saveSettings
src/modes/rotation/state.ts            Settings v2 + new actions (old shotCount/pieces/hidden actions removed)
src/modes/rotation/store.ts            newObject by style, variation(), applyExercise(), persistence
src/modes/rotation/shot-images.ts      RenderOptions instead of hidden
src/modes/rotation/components/         ExercisePanel, ShotsPanel, CustomisePanel (replace Controls), TopBar, ContactSheet, ShotTile, LiveView
```

---

### Task 1: Lens and render options plumbing

**Files:**
- Create: `src/render/render-options.ts`
- Modify: `src/views/camera.ts`, `src/render/form-scene.ts`, `src/render/shot-renderer.ts`, `src/modes/rotation/shot-images.ts`, `src/modes/rotation/state.ts`, `src/modes/rotation/index.tsx`, `src/modes/rotation/components/LiveView.tsx`, `src/modes/rotation/components/Controls.tsx`
- Test: `tests/unit/views/views.test.ts`, `tests/unit/render/form-scene.test.ts`, `tests/unit/rotation/shot-images.test.ts`, `tests/unit/rotation/state.test.ts`

**Interfaces:**
- Produces:

```ts
// src/views/camera.ts
export type Lens = 'flat' | 'normal' | 'wide';
export const LENS_FOV: Record<Lens, number> = { flat: 15, normal: 32, wide: 55 };
export function lensDistance(lens: Lens): number;                          // 1.15 / sin(LENS_FOV[lens]/2)
export function cameraPosition(v: View, lens: Lens = 'normal'): Vec3;
export function fovForAspect(aspect: number, lens: Lens = 'normal'): number;
// FOV_DEG and DISTANCE stay exported, equal to the 'normal' values
// src/render/render-options.ts
export type RenderMode = 'shaded' | 'lines' | 'silhouette';
export interface RenderOptions { lens: Lens; hidden: boolean; box: boolean; centreLines: boolean; ground: boolean; mode: RenderMode }
export const DEFAULT_RENDER: RenderOptions;   // normal, all aids false, 'shaded'
export function renderKey(o: RenderOptions): string;   // stable string, e.g. "normal|h1|b0|c0|g0|shaded"
// FormScene.setView(view: View, aspect: number, framePx: number, opts: RenderOptions): void
// ShotRenderer.render(form: FormScene, view: View, opts: RenderOptions): Promise<Blob>
// ShotSource.render(form, view, opts: RenderOptions); ShotImages.update(form, shots, opts: RenderOptions)
// Settings.hidden: boolean  →  Settings.render: RenderOptions  (setHidden(s, on) becomes setRender(s, patch: Partial<RenderOptions>))
```

- `ShotImages` invalidates whenever `renderKey(opts)` changes, where it previously invalidated on `hidden`. Its cache key becomes `${version}|${renderKey}|${turn}|${tilt}`.
- The `imageTag` in `index.tsx` must use the same key.
- In this task FormScene applies only `lens` and `hidden`. The other fields are accepted and ignored until Task 3.
- The Hidden lines checkbox keeps working through `setRender({ hidden })`.

- [ ] **Step 1: Write failing tests.**

```ts
it('framing is identical for every lens and aspect', () => {
  for (const lens of ['flat', 'normal', 'wide'] as const)
    for (const aspect of [0.4, 0.75, 1, 1.6, 3]) {
      const half = (fovForAspect(aspect, lens) / 2) * Math.PI / 180;
      // bounding sphere radius 1.15 fits the short side exactly at lensDistance
      expect(lensDistance(lens) * Math.tan(half) * Math.min(1, aspect)).toBeCloseTo(1.15 / Math.cos(LENS_FOV[lens] * Math.PI / 360), 6);
    }
});
it('cameraPosition sits at the lens distance', ...)      // |cameraPosition(v, 'wide')| ≈ lensDistance('wide')
it('normal lens keeps the old constants', ...)           // lensDistance('normal') === DISTANCE; fovForAspect(1) === FOV_DEG
it('renderKey differs for every field', ...)             // flipping any single field changes the key
// form-scene: setView(v, 1, 400, { ...DEFAULT_RENDER, lens: 'wide' }) → camera.fov ≈ 55, |camera.position| ≈ lensDistance('wide')
// shot-images: update(form, shots, { ...DEFAULT_RENDER, lens: 'flat' }) after a normal render → re-renders and revokes
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit`. Expected: FAIL, because the lens exports and `render-options.ts` are missing.
- [ ] **Step 3: Implement.** Make the signature changes above, update every caller, then update the existing tests that pass `hidden`.
- [ ] **Step 4: Run.** `npx tsc -b && npm test && npx playwright test --project=desktop`. Expected: all PASS. The existing e2e still drives the Hidden lines checkbox.
- [ ] **Step 5: Commit.** `git commit -m "feat: lens setting and RenderOptions through scene, shots and live view"`

---

### Task 2: Form spec v2, bounds and piece axes

**Files:**
- Modify: `src/geometry/types.ts`, `src/geometry/build-form.ts`, `src/geometry/generate.ts`, and any `version: 1` literals in tests and `src/modes/rotation/store.ts`
- Test: `tests/unit/geometry/build-form.test.ts`, `tests/unit/geometry/generate.test.ts`

**Interfaces:**
- Produces:

```ts
export type FormStyle = 'clean' | 'freeform';
export type JoinKind = 'stack' | 'totem' | 'halfSunk' | 'wing' | 'through' | 'mirror' | 'hinged' | 'tilt45' | 'cut';
export const JOINS: JoinKind[];   // in the order above
export interface RecipeStep { join: JoinKind | 'base'; type: PrimitiveType; target: number /* piece index it attaches to; -1 for base */; slot: number }
export interface FormSpec { version: 2; seed: number; style: FormStyle; pieces: Piece[]; recipe?: RecipeStep[]; variation?: number }
export interface FormMesh {
  positions: Float32Array; indices: Uint32Array; volume: number;
  bounds: { min: Vec3; max: Vec3 };   // in normalised space
  axes: Float32Array;                 // xyz pairs: one segment per non-sphere piece (cutters included), along the piece's local Y after rotation, through its position, length = size[1] × 1.3, normalised
}
```

- `generateForm` (Freeform) returns `{ version: 2, style: 'freeform', … }` and is otherwise unchanged.

- [ ] **Step 1: Write failing tests.**

```ts
it('bounds are the normalised bounding box', ...)          // 2×1×1 box: bounds ≈ ±(2,1,1)/|(2,1,1)| per axis
it('axes run along each piece's local Y, 1.3× its height', ...)
  // single cylinder size [1,2,1]: one segment, endpoints (0, ±1.3·(2/2), 0) × normalisation scale
it('rotated pieces rotate their axis', ...)                 // cube rotation [90,0,0] → axis along ±Z
it('spheres have no axis; cutters do', ...)                 // sphere + cut cylinder → exactly 1 segment
it('freeform specs are version 2', ...)                     // generateForm(...).version === 2 && .style === 'freeform'
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/geometry`. Expected: FAIL.
- [ ] **Step 3: Implement.** Transform each axis segment by the same centring and scaling `buildForm` applies to the vertices.
- [ ] **Step 4: Run.** `npx tsc -b && npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: form spec v2 with style, bounds and piece axes"`

---

### Task 3: Aids and render modes in FormScene

**Files:**
- Modify: `src/render/form-scene.ts`
- Test: `tests/unit/render/form-scene.test.ts`

**Interfaces:**
- Consumes: `RenderOptions` (Task 1); `FormMesh.bounds` and `FormMesh.axes` (Task 2).
- Produces: no new exports. `setView` honours every `RenderOptions` field.

**What each option draws** (spec "Aids" table):
- **`box`:** the 12 bounding-box edges as `LineSegments2`, colour `#5E646B`, line width 0.6·w.
  - Visible pass: normal depth test.
  - When `hidden` is on, a second dashed pass with `GreaterDepth` and the same dash sizes as the form's hidden lines.
  - When `hidden` is off, only the visible pass.
- **`centreLines`:** `mesh.axes` as `LineSegments2`, colour `#3E95D1`, width 0.6·w, `depthTest: false`, `renderOrder` 3, so they read through the form like construction lines.
- **`ground`:**
  - A grid of lines on the plane `y = bounds.min[1]`, spanning x and z from −2 to 2 at 0.25 spacing, colour `#CDD2D7`, width 1px, normal depth test, `renderOrder` −1.
  - Plus the horizon: one `LineSegments2` segment placed at camera height, 1000 units from the camera along the horizontal forward direction, spanning ±5000 sideways, colour `#CDD2D7`. Set `camera.far` to at least 3000.
  - Rebuild the horizon on every `setView`.
- **`mode: 'lines'`:** the surface material becomes unlit white (`MeshBasicMaterial`, `#FFFFFF`, same polygonOffset). Lines are unchanged.
- **`mode: 'silhouette'`:** the surface becomes unlit `#26292D`, and the form's visible and hidden line passes are hidden. Box, centre lines and ground still draw.
- **`mode: 'shaded'`:** today's Lambert material.

Create each aid's objects once, toggle them with `visible`, and dispose them all in `dispose()`.

- [ ] **Step 1: Write failing tests** (scene graph, Node).

```ts
it('box aid adds 12 grey edges and a dashed pass only with hidden lines', ...)
it('centre lines draw on top in blue', ...)          // depthTest false, color #3E95D1, renderOrder > visible lines
it('ground grid sits at the form's lowest point', ...)
it('horizon sits at camera height, far ahead, across the view', ...)
  // after setView({turn: 30, tilt: 20}): both horizon endpoints have y === camera.position.y; midpoint is ≈1000 units from the camera horizontally; segment ⟂ the horizontal forward direction
it('lines mode uses an unlit white surface', ...)
it('silhouette mode hides form lines and fills graphite', ...)
it('dispose frees aid geometries and materials', ...)  // spy dispose counts
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/render`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** `npx tsc -b && npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: box, centre-line, ground and horizon aids; lines-only and silhouette modes"`

---

### Task 4: Clean joins

**Files:**
- Create: `src/geometry/clean/joins.ts`
- Test: `tests/unit/geometry/clean-joins.test.ts`

**Interfaces:**
- Consumes: `Piece`, `PrimitiveType`, `JoinKind` (Task 2), `pieceManifold`, `buildManifold`, `getTestManifold`.
- Produces:

```ts
export const MODULE = 0.5;                  // dimension step
export const GRID = 0.25;                   // position step
export function moduleSize(rand: () => number, min = 0.5, max = 2): number;   // a multiple of 0.5 in [min, max]
export interface JoinContext { pieces: Piece[]; target: number; allowed: PrimitiveType[]; rand: () => number }
export interface Placed { join: JoinKind; pieces: Piece[] }      // mirror → 2 pieces, totem → 2–3 round pieces, cut → 1 'cut' piece, others → 1
export const JOIN_SLOTS: Record<JoinKind, number>;               // number of distinct attachment slots per join
export function placeJoin(join: JoinKind, slot: number, ctx: JoinContext): Placed | null;
  // null when the join can't apply to this target, e.g. halfSunk on a non-box target
```

**Rules:** follow each row of the spec "Joins" table.
- **stack:** centred or on thirds of a face, where the slot picks the face and the spot. The contact face lies inside the target face, and the child's axis runs along the face normal.
- **wing:** on a side face, flush with the target's top or bottom plane.
- **halfSunk:** a cylinder whose axis is parallel to a top edge of a box target, with its centre in the top plane.
- **totem:** 2–3 round pieces (cylinder, cone, sphere) stacked on the target's top-face centre along a shared vertical axis.
- **through:** passes through the target centre and protrudes equally on both sides.
- **mirror:** two identical pieces mirrored across the target's centre plane.
- **hinged:** a box lid on the top face, rotated 30°, 45° or 60° about one top edge.
- **tilt45:** a stack or wing piece turned 45° about the contact normal.
- **cut:** a centred through-hole (cylinder), a half-depth bore, a corner notch (a box of 0.5–0.75 × the target extent per axis), or a half-round groove along an edge. `op: 'cut'`. Cutters may be cylinders or boxes whatever `allowed` says.

Every dimension must satisfy `moduleSize`, every position must lie on `GRID`, and each piece's longest-to-shortest ratio must be ≤ 2.5.

- [ ] **Step 1: Write failing tests.** For each join on a 1.5×1×1 box target: `placeJoin` returns pieces whose union with the target is a single component, is grid-snapped, and passes its join-specific check:
  - stack: the child's min y equals the target's max y;
  - wing: one coplanar face shared with the target's top or bottom;
  - halfSunk: half the cylinder's volume lies inside the target (±5%);
  - mirror: the two pieces mirror across x = 0;
  - through: equal protrusion on both sides;
  - hinged: the lid touches the hinge edge and is rotated by 30, 45 or 60;
  - cut: removes 10–50% of the target volume.
  Also test that `placeJoin('halfSunk', 0, cylinderTarget)` returns null, and that the same `rand` sequence gives the same pieces.
- [ ] **Step 2: Run.** `npx vitest run tests/unit/geometry/clean-joins.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `placeJoin`. Choose the slot semantics per join and document them in a comment table at the top of the file.
- [ ] **Step 4: Run.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: clean join placement on a 0.5 module"`

---

### Task 5: Clean generator, levels and Variation

**Files:**
- Create: `src/geometry/clean/generate-clean.ts`
- Test: `tests/unit/geometry/generate-clean.test.ts`

**Interfaces:**
- Consumes: `placeJoin`, `JOIN_SLOTS`, `moduleSize` (Task 4); `buildManifold`; `mulberry32`; FormSpec v2 (Task 2).
- Produces:

```ts
export type Level = 1 | 2 | 3 | 4 | 5 | 6;
export interface CleanSettings { level: Level; allowed: PrimitiveType[]; joins: JoinKind[] }
export interface LevelRule { name: string; pieces: [number, number]; joins: JoinKind[]; extra?: JoinKind[]; boxesOnly?: boolean; noSphere?: boolean }
export const LEVELS: Record<Level, LevelRule>;   // names, piece ranges and join lists verbatim from the spec "Levels" table; extra: L5 ['cut'], L6 ['hinged','tilt45']
export function generateCleanForm(wasm: ManifoldToplevel, seed: number, settings: CleanSettings): FormSpec;  // style 'clean', variation 0, recipe set
export function varyCleanForm(wasm: ManifoldToplevel, spec: FormSpec): FormSpec;  // same recipe, next variation number that passes the rules
export function levelNote(settings: CleanSettings): string | null;  // e.g. "Level 5 (no cut: Clean cut is off)"; null when nothing is skipped
```

**Rules, from the spec:**
- **Recipe:** the recipe comes from `mulberry32(seed)`. Proportions (sizes and in-slot offsets) come from `mulberry32(seed ^ Math.imul(variation + 1, 0x9E3779B1))`.
- **Base piece:** a box, unless the level and `allowed` say otherwise. No sphere at Levels 1–2. Level 2 is boxes only.
- **Join choice:** joins = `settings.joins ∩ LEVELS[level].joins`. If any of the level's `extra` joins is enabled, exactly one of them is used.
- **Totem:** always stands on a box base.
- **Overall proportion:** the overall longest-to-shortest extent is at most 2:1. Reject any candidate that exceeds it.
- **Rejection:**
  - The form must be a single component.
  - Each placement step must grow volume by at least 8% (a mirror pair counts as one step).
  - A cut must remove 10–50% of its target.
- **Retries:** up to 12 per step, and up to 6 per form with `seed + n`. After that, return the best attempt.
- **Never throws on valid settings** (`allowed` non-empty).
- **`varyCleanForm`:** keeps `recipe` and steps the variation number until the rules pass, up to 12. If none pass, it returns the last attempt with the same recipe.

- [ ] **Step 1: Write failing tests.**

```ts
it('is deterministic for seed, variation and settings', ...)
it('level 1 is one piece; level 2 is boxes only', ...)
it('respects each level's piece range', ...)                 // seeds 1..30 per level
it('uses only enabled joins allowed by the level', ...)      // recipe steps' join ∈ settings.joins ∩ LEVELS[l].joins
it('level 5 has exactly one cut when Clean cut is on, none when off', ...)
it('variation keeps the recipe and changes proportions', ...)
it('dimensions are on the module and positions on the grid', ...)
it('every exercise and random customised settings generate valid forms', async () => {
  // the 5 Clean exercises' settings (spec table) × seeds 1..40, plus 100 random CleanSettings (random level, non-empty allowed, random joins):
  // single component, volume > 0.05, buildEdgeAdjacency(buildForm(...)) doesn't throw; whole sweep < 30 s
});
it('levelNote explains a skipped extra join', ...)          // {level:5, joins without 'cut'} → "Level 5 (no cut: Clean cut is off)"
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/geometry/generate-clean.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Delete every WASM object, including on rejected candidates and on throw paths, as `generate.ts` does.
- [ ] **Step 4: Run.** `npx vitest run tests/unit/geometry && npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: clean generator with levels, recipes and variation"`

---

### Task 6: Shot patterns

**Files:**
- Create: `src/views/patterns.ts`
- Modify: `src/views/types.ts`, `src/views/label.ts`
- Test: `tests/unit/views/patterns.test.ts`

**Interfaces:**
- Produces:

```ts
// types.ts: Shot gains `role?: 'map'`
export type PatternId = 'turntable' | 'grid' | 'sequence' | 'allAround' | 'orthographic';
export interface ShotPlan {
  pattern: PatternId;
  turntable: { step: 90 | 45 | 30; tilt: 'above' | 'level' | 'below' };
  grid: { size: '4x3' | '6x3' | '8x5' };
  sequence: { axis: 'vertical' | 'sideways'; steps: '4x15' | '6x15' | '4x30'; start: View };
  allAround: { count: 6 | 8 | 12 | 24 };
  topMap: boolean;
}
export const DEFAULT_PLAN: ShotPlan;   // turntable {90, 'level'}, grid '6x3', sequence {vertical, '6x15', {turn:30, tilt:20}}, allAround 8, topMap false
export const MAP_VIEW: View;           // { turn: 0, tilt: 89 }
export interface PlannedShot { view: View; role?: 'map' }
export function planShots(plan: ShotPlan): PlannedShot[];   // the map comes first when topMap is on and the pattern isn't orthographic
export function planColumns(plan: ShotPlan): number | null; // grid → number of turns; otherwise null
export function planSummary(plan: ShotPlan): string;
export function shotLabel(shot: Shot): string;               // in label.ts: role 'map' → "Top view (map)", otherwise viewLabel
```

**Pattern values:** spec "Shot patterns" table.
- **Turntable:** starts at turn 30 with step `step`, so `360/step` shots, at tilt +30, 0 or −30.
- **Grid:** turns start at 30 and step `360/turns`. Tilt rows are +45, 0, −45 for 3 rows and +60, +30, 0, −30, −60 for 5. Order is row by row, top row first.
- **Sequence:**
  - **Vertical:** `start.turn + i·step`, wrapped, at `start.tilt`.
  - **Sideways:** `start.tilt + i·step`, with the start shifted so every tilt is within [−89, 89]. Turn stays `start.turn`.
- **All around:** `ringViews(count)`.
- **Orthographic:** (0,0), (90,0), (180,0), (270,0), (0,89), (45,30).

**Summary copy:**

| Pattern | Summary |
|---|---|
| Turntable | `"8 shots, 45° apart, at eye level"`, `"… above"` or `"… below"` |
| Grid | `"18 shots: 6 turns × 3 tilts"` |
| Sequence | `"6 steps of 15° around the vertical axis"` or `"… side to side"` |
| All around | `"8 shots spread above, level and below"` |
| Orthographic | `"Front, sides, back, top and a 3/4 view"` |

Append `", plus a top-view map"` when the map is added.

- [ ] **Step 1: Write failing tests.**

```ts
it('turntable 90° at eye level → 4 shots from turn 30', ...)   // [{30,0},{120,0},{210,0},{300,0}]
it('grid 6x3 → 18 shots, rows +45/0/−45, 6 columns', ...)
it('sideways sequence stays within ±89 by shifting its start', ...)  // start tilt 70, 6×15 → tilts 14..89 or similar, max ≤ 89, step 15, count 6
it('top map comes first and is skipped for orthographic', ...)
it('summaries read as the spec says', ...)
it('shotLabel names the map', ...)
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/views/patterns.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** `npx vitest run tests/unit/views && npx tsc -b`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: shot patterns, top-view map and plan summaries"`

---

### Task 7: Exercises, settings v2, state and persistence

**Files:**
- Create: `src/modes/rotation/exercises.ts`, `src/modes/rotation/settings-storage.ts`
- Modify: `src/modes/rotation/state.ts`, `src/modes/rotation/store.ts`
- Test: `tests/unit/rotation/state.test.ts`, `tests/unit/rotation/store.test.ts`, `tests/unit/rotation/settings-storage.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 2, 5, 6.
- Produces:

```ts
// exercises.ts
export type ExerciseId = 'boxBasics' | 'stacks' | 'chests' | 'intersections' | 'carved' | 'freeform';
export interface Exercise { id: ExerciseId; name: string; blurb: string; apply: Pick<Settings, 'style' | 'level' | 'allowed' | 'joins'> & { plan: Partial<ShotPlan> & { pattern: PatternId }; render: Partial<RenderOptions> } }
export const EXERCISES: Exercise[];   // order and values verbatim from the spec "Exercises (presets)" table; names/blurbs from the mockup cards
// state.ts
export interface Settings {
  exercise: ExerciseId | null;      // null = customised
  style: FormStyle; level: Level; allowed: PrimitiveType[]; joins: JoinKind[];
  pieces: number;                   // Freeform only, fixed at 3 (no UI)
  plan: ShotPlan; hideOne: boolean; render: RenderOptions;
}
export interface RotationState { /* existing fields */ hiddenShotId: string | null; revealed: boolean }
export const initialState: RotationState;   // settings = Box basics applied
export function applyExercise(s, id: ExerciseId): RotationState;    // settings only; the store then generates
export function setPlan(s, patch: Partial<ShotPlan>, rand: number): RotationState;
export function setStyle(s, style: FormStyle): RotationState;
export function setLevel(s, level: Level): RotationState;
export function toggleJoin(s, join: JoinKind): RotationState;
export function toggleAllowed(s, type: PrimitiveType): RotationState;   // keeps ≥ 1 (existing)
export function setRender(s, patch: Partial<RenderOptions>): RotationState;  // turning on lines turns off silhouette and vice versa
export function setHideOne(s, on: boolean, rand: number): RotationState;
export function reveal(s): RotationState;
export function setForm(s, spec, mesh, rand: number): RotationState;   // existing behaviour + picks a hidden shot when hideOne
// removed: setShotCount, setPieces, setHidden
// settings-storage.ts
export const SETTINGS_KEY = 'turnaround.settings.v1';
export function loadSettings(): Settings;            // validated; anything invalid → defaults (Box basics)
export function saveSettings(s: Settings): void;     // try/catch; never throws
// store.ts adds: variation(): void; applyExercise(id: ExerciseId): void;
//   newObject() picks generateCleanForm or generateForm by style; persists settings on every change.
```

**Rules:**
- Generated shots are `planShots(plan)` with ids `g${i}` and `role` copied across.
- **Exercise flag:** every action except `applyExercise` that changes settings sets `exercise = null`.
- **`setPlan` and ticks:**
  - A ticked generated shot whose view is still in the new set stays ticked under its new id.
  - A ticked shot whose view isn't becomes a custom shot.
  - If a custom shot with an equal view already exists, don't add a duplicate.
- **Sequence start:** `setPlan({ pattern: 'sequence' })` and the "Start from live view" action both set `sequence.start = s.live`.
- **Hidden shot:** `hiddenShotId` is chosen from generated shots without `role: 'map'`, as index `floor(rand × count)`. It is re-picked on `setForm`, on `setPlan`, and when hideOne turns on. `revealed` resets to false.
- **`variation()`** calls `varyCleanForm`. It is a no-op for Freeform.

- [ ] **Step 1: Write failing tests.**

```ts
it('initial settings are Box basics', ...)
it('applyExercise sets the spec values for each exercise', ...)        // table-driven over EXERCISES vs the spec table
it('changing anything else marks the settings customised', ...)
it('setPlan keeps ticks by view and never duplicates', ...)            // tick, switch turntable→grid→turntable: same ticked views, custom count stable
it('hidden shot is always a current pattern shot', ...)                // across setForm, setPlan, setHideOne(false/true), with topMap on
it('lines and silhouette are exclusive', ...)
it('sequence start comes from the live view', ...)
it('loadSettings repairs bad stored data', ...)                        // missing keys, unknown exercise id, level 9, allowed [], wrong types, invalid JSON
it('store.newObject uses the clean generator for clean style', ...)
it('store.variation keeps the recipe', ...)
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/rotation`. Expected: FAIL.
- [ ] **Step 3: Implement.** Update `index.tsx` and `Controls.tsx` only as much as needed to compile. The old shot-count stepper and pieces stepper may be removed now, and the Hidden lines checkbox calls `setRender`. Remove any e2e assertions on the removed steppers and mark them `test.fixme` with a note for Task 8.
- [ ] **Step 4: Run.** `npx tsc -b && npm test`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: exercises, settings v2, plan-driven shots and persisted settings"`

---

### Task 8: Exercises-first panel (desktop)

**Files:**
- Create: `src/modes/rotation/components/{ExercisePanel,ShotsPanel,CustomisePanel}.tsx`
- Delete: `src/modes/rotation/components/Controls.tsx`
- Modify: `TopBar.tsx` (desktop: "Saved" only), `ContactSheet.tsx` (`columns?: number | null` forces the column count for Grid; tiles still sized by `fitSheet` with that column count, scrolling if needed), `ShotTile.tsx` (map label via `shotLabel`; hidden card), `index.tsx`, `rotation.css`
- Test: `tests/e2e/desktop.spec.ts` (update), `tests/e2e/panel.spec.ts` (new)

**Interfaces:**
- Consumes: everything in Task 7, plus `planSummary`, `planColumns`, `levelNote`, `LEVELS`, `EXERCISES`.

**Panel:** the spec "The panel" section and mockup option B.
- **Exercise:** six cards in two columns. The selected card has a blue border and `aria-pressed="true"`. Below them, **Variation** (disabled for Freeform, with the tooltip from Global Constraints) and **New object**.
- **Shots:**
  - Five pattern buttons with SVG icons from the mockup, `aria-pressed`.
  - The chosen pattern's segmented settings, plus "Start from live view" for Sequence.
  - The `planSummary` line.
  - The Aids chips: Hidden lines, Box, Centre lines, Ground, Lines only, Silhouette, all `aria-pressed`.
- **Customise:**
  - A disclosure button with `aria-expanded`, collapsed by default.
  - Contents: Style segmented; Level 1–6 with `LEVELS[l].name` and `levelNote` when set; Shapes chips; Joins chips (chips the level doesn't allow are disabled with "from level N"); Lens segmented; "Add a top-view map"; "Hide one shot to test me"; and "Applies to the next object" under Style, Level, Shapes and Joins.
- **Save** button: unchanged.

**Hidden tile:** shows "Draw this view: ⟨label⟩" and a **Reveal** button in place of the image. The keep checkbox stays.

- [ ] **Step 1: Write the failing e2e tests.**

```ts
test('Box basics is selected on first visit and shows 4 turntable shots', ...)
test('choosing an exercise applies it and makes a new object', ...)
test('changing a pattern re-renders without a new object', ...)        // live readout unchanged; tile labels change; form version unchanged (img srcs from same version)
test('pattern switching keeps ticks', ...)
test('grid shows tilt rows as rows', ...)                              // 6×3: tiles in row 2 have tilt 0
test('variation is disabled for Freeform', ...)
test('customise shows level names and disables joins above the level', ...)
test('hide one shot covers a tile until Reveal', ...)
test('aids re-render the shots', ...)                                  // toggle Box → img src changes
test('settings persist across reload', ...)
test('a sequence starts from the live view', ...)                      // drag, choose Sequence, first tile label = readout
```

- [ ] **Step 2: Run.** `npx playwright test --project=desktop`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** Use the `frontend-design` skill for the visual pass, keeping to the mockup's direction and the palette. Retake the 1440×900 screenshots for Box basics, Chests and lids with hidden lines, and Grid 6×3. Check by eye that Clean forms read as deliberate construction.
- [ ] **Step 4: Run.** `npx tsc -b && npm test && npx playwright test --project=desktop`. Expected: PASS, with every remaining `fixme` from Task 7 removed or rewritten.
- [ ] **Step 5: Commit.** `git commit -m "feat: exercises-first panel with patterns, aids and customise"`

---

### Task 9: Phone layout

This is base plan Task 10, with these changes:
- The Settings bottom sheet contains ExercisePanel, ShotsPanel and CustomisePanel, in that order.
- The phone header shows **New object**. Variation stays inside the sheet.
- On phones the Grid pattern's forced columns are capped at 2; tiles keep their row-major order.
- Tests: base Task 10's five tests, plus `the settings sheet shows exercises first` and `grid falls back to two columns on phones`.

---

### Task 10: Saving, saved sets and downloads

This is base plan Task 11, with these changes:
- `SavedSet` gains `settings: Settings`, and `form` is FormSpec v2.
- Opening a set restores its settings, its form via `buildForm`, and its views as kept custom shots.
- Save gets images from `ShotImages.blob()`. A `superseded` rejection (a New object or settings change during save) aborts the save with "Couldn't save: the object changed while saving. Try again."
- Saved images include the aids and lens as shown.
- Extra tests: `opening a set restores its exercise settings`, and `save during New object reports superseded`.

---

### Task 11: Deploy to GitHub Pages

This is base plan Task 12, unchanged, under controller Ruling R2:
- The workflow and README are committed on the branch.
- Enabling Pages, merging and pushing to `main`, and the live check all happen at finish, with the user's go-ahead.
