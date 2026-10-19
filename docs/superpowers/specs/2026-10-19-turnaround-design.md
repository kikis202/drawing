# Turnaround: design

Date: 2026-10-19
Status: draft for review
Working name: "Turnaround" (placeholder; artists call a multi-angle reference sheet a turnaround)

## Intent

Turnaround is a drawing-practice web app. Its first practice mode builds the skill of drawing a 3D form consistently from different angles.

It exists because of two problems the user has:

1. **Drawing real objects:** it's hard to keep the same point of view while you move around, or while you move the object.
2. **Drawing from imagination:** it's hard to keep an object consistent as you rotate it in your head.

The app fixes both by producing a random 3D form and showing it in two ways:

- a set of reference shots from precisely controlled, evenly spaced angles;
- a live 3D view of the same object that you can rotate yourself to check your drawings, including at angles you had no shot for.

More practice modes will follow later. The first one has to be built so the others can slot in beside it.

## The practice loop

1. Press **New object**. The app generates a random form and renders a fresh set of shots.
2. Choose **how many shots** (X). The app renders X shots spaced evenly all around the object, covering turning around it and tilting to see it from above and from below.
3. **Tick the shots to keep.** You can also rotate the live view to any angle and press **Capture view** to add it as your own shot.
4. **Draw** from the kept shots, on paper or digitally, next to the screen.
5. **Check** by rotating the live view. Clicking any shot snaps the live camera to that shot's exact view.
6. **Save** the kept shots.

## Goals

- Shots and the live view render the object identically. The same lighting, camera distance, lens and style are used everywhere, so the only thing that changes between views is the angle.
- Snapping the live view to a shot reproduces that shot exactly.
- Every view has clear edges and readable shading, and a toggle shows the object's hidden (back) edges.
- Random forms are interesting enough to practise on but still drawable.
- It works well on desktop (the main use) and stays usable on a phone.
- It's free to host and needs no server or accounts.
- It's structured so that more practice modes and manual shape editing can be added later without a rewrite.

## Non-goals (v1)

- Other practice modes. Only the architecture has to allow them.
- Editing shapes by hand. The object format has to allow it later (see "Object format"). If it turns out nearly free to add a basic version now, the builder can raise it.
- Importing 3D models.
- Accounts, a backend, or syncing between devices.
- Automatically comparing or grading the user's drawing against the object.

## Anti-goals (failure even if it technically works)

- Lighting, scale or lens that changes between shots, or between a shot and the snapped live view. That defeats the purpose.
- Strong perspective or fish-eye distortion that makes shots harder to draw from than a normal camera lens would.
- Controls and chrome that crowd out the shots, which are the main thing on screen.
- Random forms that are an unreadable jumble, such as pieces fully hidden inside other pieces, slivers, or z-fighting faces.

## Decided by the user

- **Platform:** web app, desktop-first, must also work on mobile.
- **Primitives:** cube, sphere, cylinder, cone, pyramid.
- **Compound forms:** random forms built from those primitives. They are stretched (random proportions), stacked, joined, and cut into each other (subtraction). Generation is random for now.
- **New object:** generates a new form and a fresh set of shots.
- **Shots:**
  - The user chooses X.
  - The app generates X shots evenly spaced around the object, including tilted views from above and below.
  - The user selects which to keep.
  - The user can also pose the live view and capture it as a shot.
- **Snap:** the live camera can be moved to the exact viewpoint of any chosen shot.
- **Look:** clear edges and shading, plus a hidden-lines toggle.
- **Consistency:** lighting and camera are identical across all shots, with mild perspective like a normal lens.
- **Generation controls:** the user can choose which primitives are allowed and roughly how many pieces a form has. This was confirmed with a "yes" to "whether you can choose complexity and which shapes are allowed".
- **Saving:** shots can be saved.
- **Hosting:** online, on a free host.
- **Layout:** option B, "Contact sheet" (mockup: `.superpowers/brainstorm/218070-1792405849/content/layout.html`, second option):
  - Where the mockup and this document disagree, this document wins. For example, the mockup's B sidebar leaves out the Pieces control, but it belongs there.
  - **Desktop:**
    - The shots fill the main area as a large grid, for drawing straight from.
    - A right-hand column holds the live view at the top and the controls below it: allowed shapes, pieces, shot count, hidden lines, and save.
    - New object sits in the top bar.
    - Each shot has an angle label and a keep tick. Clicking a shot snaps the live view to it.
  - **Phone:**
    - The shots are in a two-column grid.
    - The live view is a small floating window over the grid, which expands to full screen when tapped.
    - Settings sit behind a "Settings" button, as a bottom sheet.
    - Save is in a bottom bar.

## Builder's calls (made during design; the user can override)

**Stack.**
- TypeScript, Three.js and Vite.
- Static site, deployed to GitHub Pages.
- No backend.
- Deploying needs the user's GitHub account and a repo, which must be public on the free plan. That's needed for deployment only, not for building.

**Shot spacing.**
- The X camera directions are spread evenly over a sphere around the object, using rings of equal tilt rather than a Fibonacci sphere.
- Each ring gets a share of the shots in proportion to its size, so the spacing stays roughly even and the labels come out as round-ish numbers.
- On the sheet, shots are ordered ring by ring from the top view to the bottom view, then by turn angle within each ring.
- Each shot is labelled with its turn and tilt (e.g. "135° turn, −30° tilt").
- The camera stays upright: world-up, no roll. Directions exactly at the poles are nudged slightly off so "up" stays defined.
- X ranges from 2 to about 36, default 8.
- Changing X replaces all generated directions. Any shots that were ticked to keep are turned into custom shots, so they aren't lost.

**Camera and rendering.**
- The camera orbits the object's centre at a fixed distance with a mild, normal-lens perspective: roughly a 30–35° vertical field of view.
- Every view, shot or live, frames the object in the same centred square at the same scale. When the live view isn't square, the extra space is just background. That way a snapped live view looks exactly like the shot.
- There's no zoom or pan in v1, so scale stays identical between the shots and the live view.
- Shots are rendered with exactly the same camera parameters as the live view. A shot is fully described by (turn, tilt).
- Lighting is fixed relative to the camera, like a lamp beside the artist, so the light falls from the same side in every shot.
- Light is soft, with no cast shadows in v1.

**Line rendering.**
- Visible edges are solid dark lines. This covers sharp creases and the outlines of curved surfaces, such as the sides of a sphere or cylinder.
- Hidden edges are dashed non-photo blue lines, shown when the toggle is on. This means sharp creases that sit behind the object, for example the back rim of a cylinder's base.

**Controls.**
- Drag to rotate (turn and tilt; tilt clamped to ±90°).
- Arrow keys rotate in fine steps.
- Clicking a shot snaps the view with a short animation of about 0.45 s, which is instant when the OS asks for reduced motion.
- Capture view adds the current angle as a kept custom shot.

**Saving.**
- A saved set holds the kept shots as images plus the object's description and the shot angles, so the object can be reopened and rotated later.
- Saved sets live in the browser on that device (IndexedDB) and appear in a simple saved-sets list.
- Any shot or set can be downloaded as PNGs.
- Saves don't sync between devices. The user has been told this.

**Look** (from the mockups):
- Palette:
  - paper `#F2F4F5`
  - graphite `#26292D`
  - secondary text `#5E646B`
  - studio grey `#8F9398` for the live view's background
  - non-photo blue `#3E95D1` for hidden lines and selection
- Shots are on white or paper; the live view is on studio grey.
- Typeface: Archivo, with condensed widths for angle labels and tabular figures.

**Object format.**
- A form is a plain, serialisable description: a list of pieces, each with a primitive type, dimensions, position and rotation, and whether it adds or cuts. A random seed is kept too.
- The generator produces this description and the renderer builds the mesh from it.
- Manual editing later becomes "edit the description".
- Boolean cuts and joins can use a CSG library such as `three-bvh-csg`.

**Generation rules.**
- 1–6 pieces; the default range is the builder's call.
- Pieces must visibly touch or overlap the existing form, and cuts must leave a visible notch.
- No piece may be fully swallowed by another, and the whole form is recentred and scaled to fit the frame.
- The same seed always gives the same form.

**App structure.**
- An app shell plus practice modes as separate modules or routes.
- With only one mode the shell shows no mode switcher, but adding a mode should mean adding a module and a route.

## Left to the builder

- Exact sizes, spacing, copy and icons, within the look above.
- The default piece count and how generation chooses sizes, placements and cut depths, within the rules above.
- The edge-detection threshold and line weights. Lines should be visibly thicker in the live view than in small thumbnails, or scale with view size.
- Test approach. At minimum, cover generator determinism, shot-direction spacing, and that snapping matches a shot's camera.
- The final app name.
