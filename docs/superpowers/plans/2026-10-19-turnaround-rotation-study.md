# Turnaround: Rotation Study Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web app whose first practice mode generates a random compound 3D form, renders evenly spaced reference shots of it on a contact sheet, and gives a live rotatable view that snaps to any shot. It deploys to GitHub Pages.

**Architecture:** There are three layers.
- **Geometry:** pure TypeScript plus the `manifold-3d` WASM library. It turns a serialisable `FormSpec` into a watertight, normalised triangle mesh.
- **Render:** Three.js. It builds a scene from that mesh, with creases and silhouettes drawn as pixel-width lines and hidden lines in a second, depth-inverted pass. It renders both PNG shots and the live view with identical camera maths.
- **UI:** a Preact app shell that hosts practice modes from a registry. The rotation mode keeps its state in a signals store whose actions are pure functions.

**Library choice:** the spec suggests `three-bvh-csg` for the boolean operations. This plan uses `manifold-3d` instead, which is within the builder's discretion, because it guarantees watertight meshes with shared vertices. Silhouette extraction depends on that edge adjacency, and it also gives exact volumes for the generation rules.

**Tech Stack:** Node 24, Vite 8, TypeScript, Preact 11 + `@preact/signals`, Three.js 0.186, `manifold-3d` 3.5, `idb`, `fflate`, Vitest, Playwright, GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-19-turnaround-design.md`. Read it before starting any task. The chosen layout is option B ("Contact sheet") in `.superpowers/brainstorm/218070-1792405849/content/layout.html`, which is gitignored and exists only locally. Where the mockup and the spec disagree, the spec wins.

## Global Constraints

- Web app, desktop-first, must work on phones. The phone layout applies at viewport width `< 760px`. E2E tests cover desktop 1440×900 and phone 390×844 (touch).
- Static site, no backend, deployed to `https://kikis202.github.io/drawing/`. Vite `base: '/drawing/'`, hash routing.
- Primitives: cube, sphere, cylinder, cone, pyramid. Pieces per form: 1–6, default 3. Shot count X: 2–36, default 8.
- Same seed and same settings always produce the same `FormSpec`.
- Camera: vertical FOV 32° (on a square or landscape view), fixed distance, no zoom or pan, world-up with no roll, tilt clamped to [−89°, 89°]. Every view frames the object in the same centred square at the same scale.
- Lighting is fixed relative to the camera, with no cast shadows.
- Shot labels use the format `135° turn, −30° tilt`. The minus sign is U+2212 and turn is in [0, 360).
- Snap animation takes 450 ms with ease-in-out, and is instant under `prefers-reduced-motion: reduce`.
- Palette:
  - paper `#F2F4F5`
  - graphite `#26292D`
  - secondary text `#5E646B`
  - studio grey `#8F9398` (live view background)
  - non-photo blue `#3E95D1` (hidden lines, selection)
  - Shot images use a white `#FFFFFF` background.
- Visible lines are solid graphite and hidden lines are dashed non-photo blue.
- Typeface: Archivo from Google Fonts (`family=Archivo:wdth,wght@62..125,400..700`). Angle labels use `font-stretch: 75%` and tabular figures.
- Copy is sentence case, with no all-caps labels.
- Saved sets live in IndexedDB on the device, and shots download as PNG. There are no accounts and no sync.
- Practice modes are separate modules registered in `src/shell/modes.ts`. The mode switcher is hidden while only one mode exists.

## Review Focus

1. **Unlucky seeds.** Some seeds and settings could make the boolean operations produce empty, disconnected or sliver forms. The user must always get a readable single-piece form, never an error or a blank sheet. Covered by Task 4 `seed sweep`.
2. **Unusual live view proportions.** On a very wide desktop panel, a tall phone, or a resize after snapping, the snapped live view must still frame the object exactly like the shot. Covered by Task 5 `framing is identical for every aspect` and Task 9 `resize keeps the snapped view`.
3. **Dragging past straight up or down.** The camera must stop at ±89° without flipping or producing NaN. Covered by Task 5 `drag clamps tilt` and Task 7 `camera stays finite at the tilt limit`.
4. **Pressing New object, or changing the shot count, while shots are still rendering.** Only shots of the current form may appear, never stale images from the previous one. Covered by Task 8 `drops results from an outdated form`.
5. **Storage blocked or full** (private window, quota exceeded). Save must show a clear message, and everything else keeps working. Covered by Task 11 `reports blocked storage` / `reports full storage` and the e2e `save without storage shows message`.

---

## File Structure

```
index.html                              entry, Google Fonts link, <div id="app">
vite.config.ts                          base '/drawing/', preact preset, vitest config
playwright.config.ts                    desktop + phone projects, webServer = vite preview
.github/workflows/deploy.yml            test, build, deploy to Pages
src/main.tsx                            mounts <App/>
src/shell/App.tsx                       resolves hash route → mode component
src/shell/modes.ts                      PracticeMode registry, resolveMode()
src/styles/tokens.css                   palette + type tokens
src/styles/app.css                      shell + shared component styles
src/geometry/types.ts                   PrimitiveType, Vec3, Piece, FormSpec, GenerateSettings, FormMesh
src/geometry/prng.ts                    mulberry32
src/geometry/manifold.ts                loadManifold() (browser), type re-exports
src/geometry/primitives.ts              pieceManifold()
src/geometry/build-form.ts              buildForm()
src/geometry/generate.ts                generateForm()
src/views/types.ts                      View, Shot
src/views/spacing.ts                    ringViews()
src/views/camera.ts                     FOV_DEG, DISTANCE, cameraPosition(), fovForAspect()
src/views/pose.ts                       clampTilt, wrapTurn, applyDrag, applyKey, interpolateView
src/views/label.ts                      viewLabel(), viewSlug()
src/render/edges.ts                     buildEdgeAdjacency, creaseSegments, silhouetteSegments
src/render/form-scene.ts                FormScene
src/render/shot-renderer.ts             ShotRenderer
src/modes/rotation/index.tsx            RotationMode (registered mode root)
src/modes/rotation/state.ts             RotationState + pure actions
src/modes/rotation/store.ts             signals store wiring actions + async work
src/modes/rotation/shot-images.ts       ShotImages render queue
src/modes/rotation/components/*.tsx     TopBar, ContactSheet, ShotTile, LiveView, Controls, PhoneBar, BottomSheet, SavedPanel
src/modes/rotation/rotation.css         mode layout (desktop + phone)
src/storage/saved-sets.ts               IndexedDB CRUD with typed failures
src/storage/download.ts                 downloadBlob(), zipSet()
tests/unit/**/*.test.ts(x)              Vitest
tests/helpers/manifold.ts               getTestManifold() for Node
tests/e2e/*.spec.ts                     Playwright
```

---

### Task 1: Scaffold, app shell and mode registry

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `src/main.tsx`, `src/shell/App.tsx`, `src/shell/modes.ts`, `src/styles/tokens.css`, `src/styles/app.css`, `src/modes/rotation/index.tsx` (placeholder)
- Test: `tests/unit/shell/modes.test.ts`, `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Produces:
  - `interface PracticeMode { id: string; title: string; load: () => Promise<{ default: ComponentType }> }`
  - `const modes: PracticeMode[]` (one entry: `{ id: 'rotation', title: 'Rotation study' }`)
  - `resolveMode(hash: string): PracticeMode`: unknown or empty hash → first mode
  - npm scripts `dev`, `build`, `preview`, `test` (vitest run), `test:e2e` (playwright test)

- [ ] **Step 1: Scaffold.** The repo root isn't empty, so run `npm create vite@latest tmp-app -- --template preact-ts`, move its files into the repo root, and delete `tmp-app/`. Keep the existing `.gitignore` (merge in the template's entries) and `docs/`. Add the runtime dependencies `three manifold-3d @preact/signals idb fflate` and the dev dependencies `@types/three vitest jsdom @testing-library/preact fake-indexeddb @playwright/test`. Run `npx playwright install chromium`. Delete the template's demo components and assets.
- [ ] **Step 2: Configure.**
  - `vite.config.ts`:
    - `base: '/drawing/'`
    - `test.environment: 'node'`, with per-file `// @vitest-environment jsdom` for component tests
    - `test.include: ['tests/unit/**/*.test.{ts,tsx}']`
  - `playwright.config.ts`:
    - projects `desktop` (viewport 1440×900) and `phone` (`devices['iPhone 13']`, but with `browserName: 'chromium'`)
    - `webServer: { command: 'npm run build && npm run preview -- --port 4173', url: 'http://localhost:4173/drawing/' }`
    - `testDir: 'tests/e2e'`
  - `index.html`: Archivo `<link>` (see Global Constraints), `<title>Turnaround</title>`.
- [ ] **Step 3: Write failing tests.**

```ts
// tests/unit/shell/modes.test.ts
it('resolves the rotation mode by hash', () => expect(resolveMode('#/rotation').id).toBe('rotation'));
it('falls back to the first mode for unknown or empty hashes', () => {
  expect(resolveMode('').id).toBe('rotation');
  expect(resolveMode('#/nope').id).toBe('rotation');
});
// tests/e2e/smoke.spec.ts
test('shows the app name and no mode switcher', async ({ page }) => {
  await page.goto('/drawing/');
  await expect(page.getByRole('banner')).toContainText('Turnaround');
  await expect(page.getByRole('navigation', { name: 'Practice modes' })).toHaveCount(0);
});
```

- [ ] **Step 4: Run.** `npm test` and `npm run test:e2e`. Expected: FAIL (`resolveMode` is not defined, and the banner is missing).
- [ ] **Step 5: Implement.**
  - `modes.ts`.
  - `App.tsx`:
    - Listens to `hashchange`, lazy-loads the mode component, and renders `<header role="banner">` with "Turnaround".
    - Renders `<nav aria-label="Practice modes">` only when `modes.length > 1`.
    - Gives the mode component a slot in the header for its own buttons. Pass a `headerSlot` element via context, or let the mode render the whole header. Either is fine, but keep one `banner`.
  - `tokens.css`: the palette as CSS custom properties (`--paper`, `--graphite`, `--graphite-2`, `--studio`, `--blue`, `--line: #CDD2D7`, `--panel: #E3E7EA`) and `font-family: 'Archivo', system-ui, sans-serif`.
  - The rotation placeholder renders "Rotation study".
- [ ] **Step 6: Run.** `npm test && npm run test:e2e`. Expected: PASS in both projects.
- [ ] **Step 7: Commit.** `git add -A && git commit -m "feat: scaffold app shell with practice mode registry"`

---

### Task 2: Form types, PRNG and primitives

**Files:**
- Create: `src/geometry/types.ts`, `src/geometry/prng.ts`, `src/geometry/manifold.ts`, `src/geometry/primitives.ts`, `tests/helpers/manifold.ts`
- Test: `tests/unit/geometry/primitives.test.ts`, `tests/unit/geometry/prng.test.ts`

**Interfaces:**
- Produces:

```ts
export type PrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'cone' | 'pyramid';
export const PRIMITIVES: PrimitiveType[] = ['cube', 'sphere', 'cylinder', 'cone', 'pyramid'];
export type Vec3 = [number, number, number];
export interface Piece { type: PrimitiveType; size: Vec3; rotation: Vec3 /* degrees, applied X then Y then Z */; position: Vec3; op: 'add' | 'cut' }
export interface FormSpec { version: 1; seed: number; pieces: Piece[] }   // pieces[0].op is always 'add'
export interface GenerateSettings { allowed: PrimitiveType[]; pieces: number }
export interface FormMesh { positions: Float32Array; indices: Uint32Array; volume: number }   // centred, bounding radius exactly 1
```

- `mulberry32(seed: number): () => number` returns floats in [0, 1).
- `loadManifold(): Promise<ManifoldToplevel>`:
  - Browser singleton: `import Module from 'manifold-3d'`, `import wasmUrl from 'manifold-3d/manifold.wasm?url'`, then `Module({ locateFile: () => wasmUrl })` followed by `.setup()`.
  - Re-export `type ManifoldToplevel, Manifold` from `manifold-3d`.
- `getTestManifold(): Promise<ManifoldToplevel>` (Node: `await Module()` then `setup()`, cached).
- `pieceManifold(wasm: ManifoldToplevel, piece: Piece): Manifold`. The caller owns the result and must call `.delete()`.

- [ ] **Step 1: Write failing tests.**

```ts
it('mulberry32 is deterministic', () => {
  const a = mulberry32(42), b = mulberry32(42);
  expect([a(), a(), a()]).toEqual([b(), b(), b()]);
});
it.each(PRIMITIVES)('%s fills its size box, centred on its position', async (type) => {
  const m = pieceManifold(await getTestManifold(), { type, size: [1.2, 0.8, 0.6], rotation: [0, 0, 0], position: [1, 2, 3], op: 'add' });
  const { min, max } = m.boundingBox();
  expect(min).toEqual([expect.closeTo(0.4, 2), expect.closeTo(1.6, 2), expect.closeTo(2.7, 2)]);
  expect(max).toEqual([expect.closeTo(1.6, 2), expect.closeTo(2.4, 2), expect.closeTo(3.3, 2)]);
  m.delete();
});
it('cone and pyramid point up (+Y)', ...)        // the highest vertex of getMesh() has |x|,|z| < 0.01 relative to position
it('pyramid has a square base with sides aligned to X and Z', ...)   // the 4 lowest vertices are at (±w/2, -h/2, ±d/2)
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/geometry`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement `pieceManifold`.** Build each primitive at unit size, centred at the origin, Y-up:

  | Type | Construction |
  |---|---|
  | cube | `Manifold.cube([1, 1, 1], true)` |
  | sphere | `Manifold.sphere(0.5, 48)` |
  | cylinder | `Manifold.cylinder(1, 0.5, 0.5, 48, true).rotate([-90, 0, 0])` |
  | cone | `Manifold.cylinder(1, 0.5, 0, 48, true).rotate([-90, 0, 0])` |
  | pyramid | `Manifold.cylinder(1, Math.SQRT1_2, 0, 4, true).rotate([-90, 45, 0])` |

  Then apply `.scale(size).rotate(rotation).translate(position)`. Manifold cylinders extrude along +Z, so the −90° X rotation makes them Y-up. Delete every intermediate `Manifold`.
- [ ] **Step 4: Run.** `npx vitest run tests/unit/geometry`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat: form types, seeded PRNG and primitive pieces"`. Add the new files first.

---

### Task 3: Build a form (boolean operations, normalisation, volume)

**Files:**
- Create: `src/geometry/build-form.ts`
- Test: `tests/unit/geometry/build-form.test.ts`

**Interfaces:**
- Consumes: `pieceManifold`, `FormSpec`, `FormMesh`, `getTestManifold`.
- Produces:
  - `buildForm(wasm: ManifoldToplevel, spec: FormSpec): FormMesh`. Throws `Error('empty form')` when the result has zero volume.
  - `buildManifold(wasm, pieces: Piece[]): Manifold`, the un-normalised union and subtraction, which the caller deletes. `generateForm` uses it for rule checks.

- [ ] **Step 1: Write failing tests.**

```ts
it('unions two overlapping cubes', ...)      // cube 1³ at 0 + cube 1³ at [0.5,0,0] → buildManifold(...).volume() ≈ 1.5
it('cuts a notch', ...)                       // cube 1³ minus cube 1³ at [0.5,0.5,0] → volume ≈ 0.75
it('normalises to centre and unit bounding radius', ...)
  // buildForm of a 2×1×1 box at [5,5,5]: max vertex distance from origin ≈ 1 (±1e-4), bbox centre ≈ [0,0,0]
it('returns shared vertices (manifold topology)', ...)
  // for a cube: positions.length/3 === 8, indices.length/3 === 12
it('volume is scaled with the normalisation', ...)
  // unit cube: radius √3/2 → scale 2/√3 → volume ≈ (2/√3)³
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/geometry/build-form.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `buildManifold` folds the pieces in order with `add` or `subtract`.
  - `buildForm`:
    - Calls `getMesh()`. With `numProp === 3` the positions are already shared.
    - Centres on the bounding-box centre and scales by `1 / maxDistance`.
    - Sets `volume = manifold.volume() * scale³`.
    - Copies everything into new typed arrays, then deletes all WASM objects.
- [ ] **Step 4: Run.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: build normalised form meshes with manifold booleans"`.

---

### Task 4: Random form generator

**Files:**
- Create: `src/geometry/generate.ts`
- Test: `tests/unit/geometry/generate.test.ts`

**Interfaces:**
- Consumes: `mulberry32`, `pieceManifold`, `buildManifold`, `GenerateSettings`.
- Produces: `generateForm(wasm: ManifoldToplevel, seed: number, settings: GenerateSettings): FormSpec`.

**Rules, from the spec:**
- Each piece's dimension is in [0.45, 1.6].
- Rotation for each axis is 0 with probability 0.5, otherwise a random multiple of 15° in [15, 90].
- Piece 0 is `add` at the origin with zero rotation.
- Later pieces are `cut` with probability 0.25, otherwise `add`.
- Each later piece's position is a random point on the surface of the current form's bounding box, plus jitter in [−0.15, 0.15] per axis. The jitter avoids coplanar faces.

**Acceptance per candidate:** up to 12 attempts per piece; a piece that never passes is skipped.
- `add`: the result has exactly 1 component (`decompose().length === 1`), and its volume grew by at least 0.15 × the piece's own volume.
- `cut`: the result has 1 component, and the removed volume is between 3% and 50% of the previous volume.
- At the end, if fewer than `max(1, settings.pieces - 2)` pieces were placed, retry the whole form with `seed + 1`, at most 5 times. After that, return the attempt with the most pieces. The returned spec keeps the original `seed`, so that `generateForm(seed)` is stable.

- [ ] **Step 1: Write failing tests.**

```ts
it('is deterministic for a seed and settings', ...)          // JSON.stringify equal for two calls
it('uses only allowed primitives', ...)                       // allowed ['cone'] → every piece.type === 'cone'
it('respects the piece count', ...)                           // pieces 1 → length 1; seeds 1..20 with pieces 6 → 4 ≤ length ≤ 6
it('first piece is an add at the origin', ...)
it('seed sweep: 300 seeds always give a valid single-piece form', async () => {
  // for seeds 1..300, settings alternate pieces 1..6 and allowed subsets;
  // buildManifold(...).decompose().length === 1, buildForm(...).volume > 0.05, every position is finite;
  // the whole sweep finishes in < 20 s
});
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/geometry/generate.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `generateForm`** following the rules above. Draw every random value from one `mulberry32(seed)` stream, in a fixed order.
- [ ] **Step 4: Run.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: seeded random compound form generator"`.

---

### Task 5: Views: ring spacing, camera, pose and labels

**Files:**
- Create: `src/views/types.ts`, `src/views/spacing.ts`, `src/views/camera.ts`, `src/views/pose.ts`, `src/views/label.ts`
- Test: `tests/unit/views/*.test.ts`

**Interfaces:**
- Produces:

```ts
export interface View { turn: number; tilt: number }          // degrees
export interface Shot { id: string; view: View; source: 'generated' | 'custom' }
export const FOV_DEG = 32;
export const DISTANCE = 1.15 / Math.sin((FOV_DEG / 2) * Math.PI / 180);   // ≈ 4.172
export function cameraPosition(v: View): Vec3      // [D·cos(tilt)·sin(turn), D·sin(tilt), D·cos(tilt)·cos(turn)]
export function fovForAspect(aspect: number): number  // aspect ≥ 1 → 32; else 2·atan(tan(16°)/aspect) in degrees
export function ringViews(x: number): View[]
export function clampTilt(t: number): number       // [-89, 89]
export function wrapTurn(t: number): number        // [0, 360)
export function applyDrag(v: View, dxPx: number, dyPx: number): View   // turn − dx·0.4, tilt + dy·0.3
export function applyKey(v: View, key: string, shift: boolean): View | null
  // step 5° (15° with shift): ArrowRight turn−, ArrowLeft turn+, ArrowDown tilt+, ArrowUp tilt−; any other key → null
export function interpolateView(a: View, b: View, t: number): View   // shortest turn path
export function easeInOut(t: number): number       // t<.5 ? 2t² : 1−(−2t+2)²/2
export function viewLabel(v: View): string         // "135° turn, −30° tilt"
export function viewSlug(v: View): string          // "135-turn-minus30-tilt"
```

**`ringViews(x)`:** this algorithm is not determined by the signature.

```
a = sqrt(4π / x);  R = max(1, round(π / a))
tilt_i = 90 − (i + 0.5)·180 / R            for i = 0..R−1   (top ring first)
w_i = cos(tilt_i);  share_i = x · w_i / Σw
n_i = max(1, floor(share_i)); hand out x − Σn by largest (share_i − floor(share_i)),
      ties → larger w_i, then lower i; if Σn > x, take from the largest n_i
ring i: turn_j = j · 360 / n_i, j = 0..n_i−1
```

Output is ordered ring by ring, top to bottom, with turn ascending.

- [ ] **Step 1: Write failing tests.**

```ts
it('8 shots → rings at 60, 0, −60 with 2, 4, 2 shots', () => expect(ringViews(8)).toEqual([
  { turn: 0, tilt: 60 }, { turn: 180, tilt: 60 },
  { turn: 0, tilt: 0 }, { turn: 90, tilt: 0 }, { turn: 180, tilt: 0 }, { turn: 270, tilt: 0 },
  { turn: 0, tilt: -60 }, { turn: 180, tilt: -60 }]));
it('2 shots → front and back at eye level', () => expect(ringViews(2)).toEqual([{ turn: 0, tilt: 0 }, { turn: 180, tilt: 0 }]));
it('every x in 2..36 gives exactly x distinct views within tilt (−90, 90)', ...)
it('framing is identical for every aspect', () => {
  for (const aspect of [0.4, 0.75, 1, 1.6, 3]) {
    const half = (fovForAspect(aspect) / 2) * Math.PI / 180;
    expect(Math.tan(half) * Math.min(1, aspect)).toBeCloseTo(Math.tan(16 * Math.PI / 180), 6);
  }
});
it('drag clamps tilt', () => expect(applyDrag({ turn: 0, tilt: 80 }, 0, 1000).tilt).toBe(89));
it('cameraPosition is finite and at DISTANCE at the tilt limit', ...)
it('interpolates the short way round', () => expect(interpolateView({ turn: 350, tilt: 0 }, { turn: 10, tilt: 0 }, 0.5).turn).toBeCloseTo(0));
it('labels with a real minus sign', () => expect(viewLabel({ turn: 135, tilt: -30 })).toBe('135° turn, −30° tilt'));
it('applyKey ignores other keys', () => expect(applyKey({ turn: 0, tilt: 0 }, 'a', false)).toBeNull());
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/views`. Expected: FAIL.
- [ ] **Step 3: Implement** the functions above. `viewLabel` rounds both angles to whole degrees and wraps the turn.
- [ ] **Step 4: Run.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: ring-spaced views, camera framing, pose maths and labels"`.

---

### Task 6: Edge extraction (creases and silhouettes)

**Files:**
- Create: `src/render/edges.ts`
- Test: `tests/unit/render/edges.test.ts`

**Interfaces:**
- Consumes: `FormMesh`, `Vec3`.
- Produces:

```ts
export interface EdgeAdjacency { positions: Float32Array; edges: Uint32Array /* a, b, faceL, faceR per edge */; faceNormals: Float32Array; faceCentres: Float32Array }
export function buildEdgeAdjacency(mesh: FormMesh): EdgeAdjacency        // throws if any edge doesn't have exactly 2 faces
export function creaseSegments(adj: EdgeAdjacency, thresholdDeg = 25): Float32Array   // xyz pairs, view-independent
export function silhouetteSegments(adj: EdgeAdjacency, camera: Vec3): Float32Array  // edges whose two faces disagree on facing
```

A face is front-facing when `dot(normal, camera − centre) > 0`. A crease is an edge whose dihedral angle, between face normals, is greater than the threshold.

- [ ] **Step 1: Write failing tests.** Use `buildForm` on a single cube, with positions in ±1/√3:

```ts
it('cube has 12 creases (triangle diagonals excluded)', ...)  // creaseSegments(adj).length === 12 * 6
it('front view silhouette is the 4-edge outline', ...)        // camera [0,0,5] → 4 segments
it('corner view silhouette is a hexagon', ...)                // camera [5,5,5] → 6 segments
it('sphere has no creases', ...)                              // single sphere form → 0 segments
it('generated forms are fully manifold', ...)                 // buildEdgeAdjacency does not throw for seeds 1..50
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/render/edges.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Key the edges by `min*N+max` in a `Map`. Compute face normals and centres once.
- [ ] **Step 4: Run.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: crease and silhouette edge extraction"`.

---

### Task 7: Form scene and shot renderer

**Files:**
- Create: `src/render/form-scene.ts`, `src/render/shot-renderer.ts`
- Test: `tests/unit/render/form-scene.test.ts` (no WebGL; scene-graph assertions), `tests/e2e/render.spec.ts`

**Interfaces:**
- Consumes: `FormMesh`, `View`, `cameraPosition`, `fovForAspect`, `buildEdgeAdjacency`, `creaseSegments`, `silhouetteSegments`.
- Produces:

```ts
export class FormScene {
  constructor(mesh: FormMesh);
  readonly scene: THREE.Scene; readonly camera: THREE.PerspectiveCamera;
  setView(view: View, aspect: number, framePx: number, hidden: boolean): void;
  setResolution(widthPx: number, heightPx: number): void;   // LineMaterial resolution
  dispose(): void;
}
export class ShotRenderer {
  constructor(sizePx = 640);
  render(form: FormScene, view: View, hidden: boolean): Promise<Blob>;   // PNG, white background
  dispose(): void;
}
```

**Scene contents (starting values; tune by eye in Step 6):**
- **Mesh:**
  - Geometry from `toCreasedNormals(geometry, 30°)` (`three/addons/utils/BufferGeometryUtils.js`).
  - `MeshLambertMaterial({ color: '#D5D9DD', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })`.
- **Lights:**
  - `HemisphereLight('#ffffff', '#8a8f95', 1.1)` in the scene.
  - `DirectionalLight('#ffffff', 2.0)` as a child of the camera at local `(-1.2, 1.5, 1)`, targeting an `Object3D` at the world origin.
  - The camera itself is added to the scene.
- **Lines:**
  - One `LineSegmentsGeometry` holding creases plus the current silhouettes, rebuilt in `setView`.
  - Two `LineSegments2` share it:
    - visible: `LineMaterial({ color: '#26292D', linewidth: w })`
    - hidden: `LineMaterial({ color: '#3E95D1', linewidth: 0.75·w, dashed: true, dashSize: 0.06, gapSize: 0.045, depthFunc: THREE.GreaterDepth, depthWrite: false })`, with `computeLineDistances()` called after every rebuild and `visible = hidden`.
  - Line width `w = clamp(framePx / 300, 1.25, 3)`.
- **Camera:** `position = cameraPosition(view)`, `up = (0, 1, 0)`, `lookAt(0, 0, 0)`, `fov = fovForAspect(aspect)`, `aspect = aspect`.

- [ ] **Step 1: Write failing tests.**

```ts
it('places the camera for the view', ...)        // camera.position ≈ cameraPosition({turn: 45, tilt: 30})
it('uses the aspect-corrected FOV', ...)         // setView(v, 0.5, 400, false) → camera.fov ≈ fovForAspect(0.5)
it('hidden pass is dashed blue behind surfaces and toggles', ...)
  // hidden material: dashed true, depthFunc GreaterDepth, color #3E95D1; .visible follows the flag
it('scales line width with frame size', ...)     // framePx 150 → 1.25; 600 → 2; 1200 → 3
it('camera stays finite at the tilt limit', ...) // view tilt 89 → no NaN in camera.quaternion
// tests/e2e/render.spec.ts
test('a shot renders the form with outlines on white', ...)
  // on the app page: the first shot <img> has naturalWidth 640; draw it to a canvas;
  // pixel (2,2) is white, and some pixel near the centre is not white
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/render/form-scene.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `FormScene`.** `ShotRenderer` owns one `WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })` on an offscreen `<canvas>` of `sizePx`², with clear colour `#FFFFFF`. Its `render` calls `form.setView(view, 1, sizePx, hidden)`, `form.setResolution(sizePx, sizePx)`, renders, then `canvas.toBlob(..., 'image/png')`.
- [ ] **Step 4: Run.** Unit tests. Expected: PASS. The e2e test runs after Task 9, when the page shows shots. Mark it `test.fixme` until then and remove the marker in Task 9.
- [ ] **Step 5: Commit.** `git commit -m "feat: form scene with silhouettes, hidden-line pass and PNG shot renderer"`.

---

### Task 8: Rotation state, store and shot render queue

**Files:**
- Create: `src/modes/rotation/state.ts`, `src/modes/rotation/store.ts`, `src/modes/rotation/shot-images.ts`
- Test: `tests/unit/rotation/state.test.ts`, `tests/unit/rotation/shot-images.test.ts`

**Interfaces:**
- Consumes: `FormSpec`, `FormMesh`, `View`, `Shot`, `ringViews`, `PRIMITIVES`.
- Produces:

```ts
export interface Settings { allowed: PrimitiveType[]; pieces: number; shotCount: number; hidden: boolean }
export interface RotationState {
  settings: Settings;                       // defaults: all 5, pieces 3, shotCount 8, hidden false
  form: { spec: FormSpec; mesh: FormMesh; version: number } | null;
  generated: Shot[]; custom: Shot[]; kept: string[];    // kept = shot ids, none by default
  live: View; activeShotId: string | null;  // live default { turn: 30, tilt: 20 }
  nextCustomId: number;
}
export const initialState: RotationState;
// pure actions, each (state, ...) → RotationState
setForm(s, spec, mesh)        // version+1; generated = ringViews(shotCount) with ids `g${i}`; custom = []; kept = []; activeShotId = null
setShotCount(s, n)            // clamp 2..36; kept generated shots become custom shots (new ids `c${k}`, still kept); then regenerate
toggleKeep(s, id)
captureView(s)                // adds custom shot at s.live (id `c${k}`), kept, active
toggleAllowed(s, type)        // refuses to remove the last allowed type (returns s unchanged)
setPieces(s, n)               // clamp 1..6
setHidden(s, on)
setLive(s, view, activeShotId: string | null)
keptShots(s): Shot[]          // generated then custom, in display order, filtered by kept
allShots(s): Shot[]           // generated then custom
// store.ts
export function createRotationStore(wasm: ManifoldToplevel): {
  state: Signal<RotationState>;
  newObject(): void;          // seed = (Date.now() ^ (Math.random()*2**32)) >>> 0; generateForm → buildForm → setForm
  openSaved(set: SavedSet): void;   // buildForm(set.form) → setForm, then custom = the saved views, all kept
  dispatch<A extends unknown[]>(action: (s: RotationState, ...a: A) => RotationState, ...a: A): void;
}
// shot-images.ts
export interface ShotSource { render(form: FormScene, view: View, hidden: boolean): Promise<Blob> }
export class ShotImages {
  constructor(source: ShotSource, makeScene: (m: FormMesh) => FormScene, onChange: (urls: ReadonlyMap<string, string>) => void);
  update(form: { mesh: FormMesh; version: number }, shots: Shot[], hidden: boolean): void;
  blob(shot: Shot): Promise<Blob>;   // the cached render for the current form and hidden setting, rendered on demand if missing
  dispose(): void;   // revokes all object URLs
}
```

`ShotImages` renders sequentially and caches by `${version}|${hidden}|${turn}|${tilt}`. When `version` or `hidden` changes, it abandons the in-flight queue, revokes old URLs, and ignores late results from the old key.

`SavedSet` comes from Task 11. In this task, declare `openSaved` against a local `Pick<SavedSet, 'form' | 'shots'>`-shaped interface, `{ form: FormSpec; shots: { view: View }[] }`.

- [ ] **Step 1: Write failing tests.**

```ts
it('setShotCount keeps ticked shots as custom shots', () => {
  let s = setForm(initialState, spec, mesh);            // 8 generated
  s = toggleKeep(s, 'g3');
  s = setShotCount(s, 12);
  expect(s.generated).toHaveLength(12);
  expect(keptShots(s)).toEqual([expect.objectContaining({ source: 'custom', view: ringViews(8)[3] })]);
});
it('setShotCount clamps to 2..36', ...)
it('cannot turn off the last allowed shape', ...)
it('captureView adds a kept, active custom shot at the live view', ...)
it('setForm clears custom shots and ticks and bumps the version', ...)
it('drops results from an outdated form', async () => {
  // fake source whose render() promises resolve manually;
  // update(v1, 8 shots) → update(v2, 8 shots) → resolve all v1 promises → onChange never contains a v1 key's URL
});
it('re-renders when hidden lines change and revokes old URLs', ...)  // spy on URL.revokeObjectURL
it('blob() reuses a cached render and renders missing ones', ...)    // source.render call count: once per view
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/rotation`. Expected: FAIL.
- [ ] **Step 3: Implement** the state functions, the store (`signal` from `@preact/signals`), and `ShotImages`.
- [ ] **Step 4: Run.** Same command. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: rotation mode state, store and shot render queue"`.

---

### Task 9: Desktop contact sheet UI

**Files:**
- Create: `src/modes/rotation/components/{TopBar,ContactSheet,ShotTile,LiveView,Controls}.tsx`, `src/modes/rotation/rotation.css`
- Modify: `src/modes/rotation/index.tsx` (replace the placeholder), `tests/e2e/render.spec.ts` (remove `fixme`)
- Test: `tests/e2e/desktop.spec.ts`

**Interfaces:**
- Consumes: `createRotationStore`, every action in Task 8, `ShotImages`, `ShotRenderer`, `FormScene`, `applyDrag`, `applyKey`, `interpolateView`, `easeInOut`, `viewLabel`, `fovForAspect`, `loadManifold`.

**Layout:** desktop is option B from the mockup.
- The header holds "Turnaround", a "Saved" button (wired in Task 11) and "New object".
- The main area is a contact sheet grid (`repeat(auto-fill, minmax(180px, 1fr))`, square tiles) on `--panel`.
- A right column 300px wide has the live view in a square at the top and `Controls` below.

**Copy:**
- `Shapes`, `Pieces`, `Shots, evenly spaced`, `Hidden lines`, `Capture view`, `New object`, and `Save N shots` / `Save 1 shot`, which is disabled when N = 0.
- Loading: `Preparing shapes…`.
- When WebGL is unavailable: `This browser can't show 3D graphics. WebGL is turned off or not supported.`

**Behaviour:**
- **ShotTile:**
  - A `<button>` that snaps to its view, containing the shot `<img>`, or a blank tile while it renders.
  - The label uses `viewLabel` with `font-stretch: 75%`.
  - It has a separate `<input type="checkbox">` named `Keep <label>`.
  - The active tile gets a 2px `--blue` outline.
- **LiveView:**
  - A canvas with its own `WebGLRenderer` (clear colour `--studio`) and its own `FormScene`.
  - A `ResizeObserver` sets size and resolution, and calls `setView(live, w/h, min(w,h), hidden)`.
  - Rendering is coalesced through `requestAnimationFrame`.
  - Pointer drag uses `applyDrag` and clears `activeShotId`.
  - The canvas is focusable: `tabIndex=0`, `aria-label="Live view. Drag or use arrow keys to rotate"`, and it uses `applyKey`.
  - Snapping animates `interpolateView` over 450 ms with `easeInOut`, or is instant under reduced motion. A new snap or drag cancels the running one.
  - A readout at the bottom left shows `viewLabel(live)`. "Capture view" sits at the top right.
- **Controls:**
  - Shape chips are `<button aria-pressed>`.
  - Steppers have `−`/`+` buttons with an `<output>`, and the `−` button has `aria-label="Fewer shots"`.
  - Hidden lines is a checkbox.
  - Save is a stub button until Task 11.
- The first object is generated on mount.

- [ ] **Step 1: Write the failing e2e tests** (desktop project).

```ts
test('shows 8 rendered shots by default', ...)                // 8 tiles; every img naturalWidth 640
test('clicking a shot snaps the live view to it', ...)        // click tile "180° turn, 0° tilt" → readout has that text, tile has aria-current="true"
test('dragging the live view clears the active shot', ...)
test('arrow keys rotate the live view', ...)                  // focus canvas, ArrowLeft → readout turn +5
test('keep ticks update the save button', ...)               // tick 2 → "Save 2 shots"; untick all → disabled
test('capture view adds a kept "custom" shot', ...)          // 9 tiles, 9th is kept and active
test('changing the shot count keeps ticked shots', ...)      // tick 1, press + 4 times → 12 + 1 tiles, 1 kept
test('hidden lines toggle re-renders the shots', ...)        // the img src of tile 1 changes after toggling
test('new object replaces the shots', ...)                   // img srcs all change; no ticks remain
test('resize keeps the snapped view', ...)                   // snap, setViewportSize(1100, 800) → readout unchanged, tile still aria-current
```

- [ ] **Step 2: Run.** `npx playwright test --project=desktop`. Expected: FAIL.
- [ ] **Step 3: Implement** the components and `index.tsx`. Use the `frontend-design` skill for the visual pass, within the Global Constraints palette and type. Check focus visibility, and make sure no colour is the only signal: a kept tile shows a filled tick, not just a colour.
- [ ] **Step 4: Run.** `npm test && npx playwright test --project=desktop`. Expected: PASS, including `render.spec.ts`.
- [ ] **Step 5: Check by eye.** Run `npm run dev`. Compare snapped live views to their shots and tune the light, mesh colour and line widths if needed. Take screenshots at 1440×900 and 1100×800.
- [ ] **Step 6: Commit.** `git commit -m "feat: desktop contact sheet with live view, snapping and controls"`.

---

### Task 10: Phone layout

**Files:**
- Create: `src/modes/rotation/components/{PhoneBar,BottomSheet}.tsx`
- Modify: `src/modes/rotation/rotation.css`, `src/modes/rotation/index.tsx`, `src/modes/rotation/components/LiveView.tsx`
- Test: `tests/e2e/phone.spec.ts`

**Interfaces:**
- Consumes: Task 9 components.
- Produces: `LiveView` prop `variant: 'panel' | 'floating' | 'full'`.

**Layout below 760px:**
- The contact sheet has 2 columns.
- The live view floats as a 112px square at the bottom right, 12px above the bottom bar, with a white 2px border and a shadow.
  - A tap without a drag (movement < 6px) expands it to a full-screen overlay with a "Back to shots" button.
  - Dragging inside the expanded view rotates the object.
- The bottom bar has "Settings", which opens a `BottomSheet` with `Controls` minus Save, and "Save N shots".
- The header keeps "New object".

- [ ] **Step 1: Write the failing e2e tests** (phone project).

```ts
test('two-column sheet with a floating live view', ...)     // first two tiles share a row; floating canvas box ≈ 112×112
test('tapping the floating view expands it, back returns', ...)
test('touch drag rotates the expanded view', ...)          // page.touchscreen / dispatch pointer events → readout changes
test('settings open in a bottom sheet', ...)                // "Settings" → dialog with "Shots, evenly spaced"; Escape closes it
test('no horizontal scroll', ...)                           // document.scrollingElement.scrollWidth <= 390
```

- [ ] **Step 2: Run.** `npx playwright test --project=phone`. Expected: FAIL.
- [ ] **Step 3: Implement.** The bottom sheet is a `<dialog>` opened with `showModal()`.
- [ ] **Step 4: Run.** `npm run test:e2e`. Expected: PASS in both projects.
- [ ] **Step 5: Commit.** `git commit -m "feat: phone layout with floating live view and settings sheet"`.

---

### Task 11: Saving, saved sets and downloads

**Files:**
- Create: `src/storage/saved-sets.ts`, `src/storage/download.ts`, `src/modes/rotation/components/SavedPanel.tsx`
- Modify: `Controls.tsx`, `PhoneBar.tsx`, `TopBar.tsx`, `store.ts` (replace the local `openSaved` type with `SavedSet`)
- Test: `tests/unit/storage/saved-sets.test.ts`, `tests/unit/storage/download.test.ts`, `tests/e2e/saving.spec.ts`

**Interfaces:**
- Consumes: `keptShots`, `ShotImages.blob`, `viewLabel`, `viewSlug`, `openSaved`.
- Produces:

```ts
export interface SavedShot { view: View; label: string; image: Blob }
export interface SavedSet { id: string; createdAt: number; form: FormSpec; hidden: boolean; shots: SavedShot[] }
export type SaveResult = { ok: true; id: string } | { ok: false; reason: 'blocked' | 'quota' | 'unknown' };
export function saveSet(set: Omit<SavedSet, 'id' | 'createdAt'>): Promise<SaveResult>;   // id = crypto.randomUUID()
export function listSets(): Promise<SavedSet[] | { error: 'blocked' }>;                   // newest first
export function deleteSet(id: string): Promise<void>;
export function downloadBlob(blob: Blob, filename: string): void;
export function zipSet(set: SavedSet): Promise<Blob>;   // fflate zipSync; files "<viewSlug>.png"; zip name "turnaround-<YYYY-MM-DD-HHmm>.zip"
```

**Storage details:**
- Use `idb`: database `turnaround`, version 1, object store `sets`, keyPath `id`, index `createdAt`.
- `indexedDB` missing, or open failing with `SecurityError` or `InvalidStateError` → `blocked`. `QuotaExceededError` → `quota`.

**Behaviour:**
- **Save:**
  - Gets the kept shots' images from `ShotImages.blob()`. They're 640px renders with the current hidden-lines setting.
  - Saves the set, then shows a status line: `Saved 3 shots.`
  - Failure copy:
    - blocked: `Couldn't save: this browser is blocking storage. Download the shots instead.`
    - quota: `Couldn't save: browser storage is full. Delete an old set or download the shots instead.`
    - unknown: `Couldn't save. Download the shots instead.`
  - On failure, a "Download shots" button appears in the status line.
- **"Saved" panel:** a `<dialog>` that lists sets, each showing its first image, its date, `N shots`, and the buttons `Open`, `Download`, `Delete`.
  - Empty state: `No saved sets yet. Tick shots and press Save to keep them here.`
  - `Open` calls `openSaved` and closes the panel.
- **Single shot download:** each ShotTile gets a small "Download" icon button (`aria-label="Download <label>"`). It saves `<viewSlug>.png`.

- [ ] **Step 1: Write failing tests.**

```ts
// unit, with fake-indexeddb/auto
it('saves and lists newest first', ...)
it('deletes a set', ...)
it('reports blocked storage', ...)   // vi.stubGlobal('indexedDB', undefined) → { ok: false, reason: 'blocked' }
it('reports full storage', ...)      // the put rejects with DOMException('', 'QuotaExceededError') → reason 'quota'
it('zipSet names files by view', ...) // unzipSync → keys ['0-turn-60-tilt.png', ...]
// e2e (desktop)
test('save, list, reopen', ...)      // tick 2 → Save → "Saved 2 shots." → Saved → 1 set "2 shots" → Open → those 2 views are kept custom tiles
test('save without storage shows message', ...)  // addInitScript deletes window.indexedDB → blocked copy is visible; the app still snaps and rotates
test('download a set', ...)          // page.waitForEvent('download') → suggestedFilename matches /^turnaround-.*\.zip$/
```

- [ ] **Step 2: Run.** `npx vitest run tests/unit/storage && npx playwright test tests/e2e/saving.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the storage functions, the downloads, the panel and the wiring.
- [ ] **Step 4: Run.** `npm test && npm run test:e2e`. Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat: save shot sets to the browser, reopen them, download PNGs"`.

---

### Task 12: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md` (what the app is, `npm run dev`, `npm test`, `npm run test:e2e`, and the live URL)

**Workflow:**
- Triggers on `push` to `main` and on `workflow_dispatch`.
- Permissions: `pages: write`, `id-token: write`, `contents: read`. Concurrency group `pages`.
- Job `build`:
  - `actions/checkout@v4`
  - `actions/setup-node@v4` with `node-version: 24` and `cache: npm`
  - `npm ci`, `npm test`
  - `npx playwright install --with-deps chromium`, `npm run test:e2e`
  - `npm run build`
  - `actions/configure-pages@v5`, then `actions/upload-pages-artifact@v3` with `path: dist`
- Job `deploy` needs `build`, runs in environment `github-pages`, and uses `actions/deploy-pages@v4`.

- [ ] **Step 1: Enable Pages for Actions.** Run `gh api -X POST repos/kikis202/drawing/pages -f build_type=workflow`. Expected: JSON containing `"build_type":"workflow"`. A 409 means it's already enabled, which is fine.
- [ ] **Step 2: Write the workflow and README, then commit and push.** `git add .github README.md && git commit -m "ci: test and deploy to GitHub Pages" && git push`.
- [ ] **Step 3: Watch the run.** `gh run watch --exit-status $(gh run list --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')`. Expected: success.
- [ ] **Step 4: Verify it's live.**
  - `curl -s -o /dev/null -w '%{http_code}' https://kikis202.github.io/drawing/` → `200`.
  - Open it in a browser and confirm the shots render and `manifold.wasm` loads from `/drawing/assets/`.
