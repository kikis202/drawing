# Turnaround: exercises, clean forms and shot patterns

Date: 2026-10-19
Status: reviewed by a builder check. Calls made from that review are marked "(my call)" in the "Calls made during review" section at the end.
Extends: `docs/superpowers/specs/2026-10-19-turnaround-design.md` (the base design). Everything in the base design still holds unless this document says it replaces it.

## Why

The user tried the first desktop build and gave two pieces of feedback:
- "The shapes feel too random."
- "There doesn't seem to be enough control of the shots being generated."

They want an option where the pieces are "perfect additions": pieces that sit flush on a face, lined up, centred or symmetric, so the joins read as deliberate construction. They also want more options, informed by research.

Two research reports informed this design. They are in the session scratchpad and are summarised here:
- **Drawing teachers:**
  - Drawabox keeps forms near-equilateral and aligned, does boxes first, and puts adding pieces before cutting them away. Its 100 Treasure Chests challenge uses half-sunk cylinders and hinged lids, and its 250 Box Challenge moves from dramatic to shallow to mixed foreshortening.
  - Dorian Iten's turnaround exercise moves from 90° steps to 45° steps to odd angles, and starts with a top-view map.
  - Scott Robertson's book covers mirroring, hinging and cutting volumes.
  - Mental-rotation research shows difficulty rises with the angle between views.
  - Predict, draw, reveal, check is the strongest-supported practice loop.
- **Existing tools:**
  - Practice Drawing This (practicedrawingthis.com/3d) is the closest competitor, with about 17 curated models.
  - No existing tool generates clean compound forms with control over difficulty and the shot set. That is the gap.

The user saw a mockup with two ways to organise the new options and chose **B: "Exercises first"**. Mockup: `.superpowers/brainstorm/475642-1792420959/content/controls.html`, option B. It is gitignored and only on local disk.

## Decided by the user

- An option for clean "perfect additions" forms, alongside today's random forms.
- More options, informed by the research.
- Panel organisation B:
  - The **Exercise** section comes first, as six preset cards plus Variation and New object.
  - Then **Shots**: a pattern picker, the chosen pattern's settings, and an **Aids** row.
  - Then a collapsed **Customise** section: Style, Level, Shapes and joins, Lens, Top-view map, Hide one shot.
  - Then **Save**.
- The option set shown in that mockup. The items the mockup listed as "Later" stay out of scope.

## What this replaces in the base design

| Base design | Now |
|---|---|
| Sidebar controls Shapes, Pieces, "Shots, evenly spaced", Hidden lines | The B panel below. "Pieces" is gone; levels and joins replace it. |
| "New object" in the header | New object and Variation sit in the Exercise section on desktop. The header keeps only "Saved". On phones the header keeps New object, because the panel lives in a bottom sheet. |
| X shots evenly spaced over the sphere, with X from 2 to 36 | Five shot patterns. The old behaviour becomes "All around". |
| One fixed lens, with a 32° vertical field of view | Lens setting: Flat, Normal or Wide. The default is Normal (32°). |
| Anti-goal: "strong perspective" | Unchanged for the default. Wide is opt-in and capped at 55°, never fish-eye. |
| Form generator: random pieces anywhere | Two styles. Clean is the new rule-based generator. Freeform is today's generator, unchanged. |

## The panel

On desktop the panel is the right-hand column under the live view, top to bottom. On phones it moves into the Settings bottom sheet.

1. **Exercise:**
   - Six cards in two columns. Each card shows a name and a one-line description.
   - Below the cards: **Variation** (secondary) and **New object** (primary).
2. **Shots:**
   - A pattern picker: five buttons, each with a small icon and a name.
   - The chosen pattern's settings, as segmented controls, plus a one-line plain-language summary such as "8 shots, 45° apart, at eye level".
   - An **Aids** row of toggle chips: Hidden lines, Box, Centre lines, Ground, Lines only, Silhouette. Lines only and Silhouette can't both be on: turning one on turns the other off.
3. **Customise** (collapsed by default):
   - Style (Clean or Freeform).
   - Level (1–6, with the level's name shown).
   - Shapes and joins (toggle chips).
   - Lens (Flat, Normal or Wide).
   - "Add a top-view map" checkbox.
   - "Hide one shot to test me" checkbox.
4. **Save N shots.** This is unchanged.

Selecting an exercise card applies all of its settings and generates a new object. Changing anything in Shots, Aids or Customise afterwards de-selects the card, so the panel is in a "custom" state with no card highlighted. Changing a shot pattern, setting, lens or aid re-renders the shots of the current object without generating a new one. Changing Style, Level, Shapes or Joins takes effect on the next New object, and the Customise section says so ("Applies to the next object"). The last-used settings are remembered per device. On first visit, "Box basics" is selected.

## Exercises (presets)

| Exercise | Style | Level | Shapes | Joins | Shot pattern | Lens | Aids on |
|---|---|---|---|---|---|---|---|
| Box basics | Clean | 1 | box | none | Turntable, 90°, eye level | Normal | Hidden lines |
| Stacks and totems | Clean | 3 | box, cylinder, cone, pyramid | Stack, Totem | Turntable, 45°, above | Normal | Centre lines |
| Chests and lids | Clean | 6 | box, cylinder | Stack, Half-sunk, Hinged lid (not 45° piece) | Turntable, 45°, above | Normal | Hidden lines |
| Intersections | Clean | 4 | box, cylinder, cone, pyramid | Through, Wing, Mirror pair | Grid 6 × 3 | Normal | Hidden lines |
| Carved blocks | Clean | 5 | box, cylinder (cylinders only as cutters) | Clean cut | Turntable, 45°, above | Normal | Hidden lines |
| Freeform | Freeform | (n/a) | all five | (n/a) | All around, 8 | Normal | none |

## Clean forms ("perfect additions")

All pieces are built from a unit module, so proportions can be compared across views.

**Sizes and proportions:**
- Every piece dimension is a multiple of 0.5 units, from 0.5 to 2.
- One piece's longest-to-shortest dimension is at most 2.5 : 1.
- The whole form's longest-to-shortest overall extent is at most 2 : 1, so forms stay near-equilateral.

**Orientation:** pieces are axis-aligned (rotations of 0° or 90° only). Level 6 alone allows exactly one tilted piece: a hinged lid at 30°, 45° or 60°, or one piece at 45°.

**Attachment:**
- A piece attaches by a whole face sitting flush on a face of the existing form, at one of these spots:
  - centred;
  - at a third of the face;
  - flush to one edge;
  - flush to a corner.
- Positions snap to the 0.5-unit grid. Faces are therefore either exactly coplanar or clearly apart, by at least 0.25 units, so slivers and z-fighting cannot occur.

**Joins** (each can be switched on or off):

| Join | Rule |
|---|---|
| Stack | Piece B stands on a face of A, centred or on thirds, with its axis along the face normal. B's contact face lies fully inside A's face. |
| Totem | 2–4 round pieces (cylinder, cone, sphere) share one axis, like a lathe-turned object. A totem always stands on a box base, so the form doesn't look identical from every turn. |
| Half-sunk | A cylinder lies with its axis parallel to a box's top edge, its centre in the top face's plane, so half of it is buried. This is the chest lid. |
| Wing (L / T) | A second box attaches to a side face of A, with its contact face fully inside that face. It is also flush with A along one more face, sharing A's top or bottom plane exactly, which gives L and T shapes. Wings on opposite sides give U shapes, and wings offset on opposite sides give Z shapes. |
| Through | A cylinder or box passes through A's centre and sticks out equally on both sides. |
| Mirror pair | Two identical pieces are mirrored across A's centre plane, like ears or arms. |
| Hinged lid | A box lid sits on the top face, rotated about one top edge by 30°, 45° or 60°. Level 6 only. |
| 45° piece | One stacked or winged piece turned 45° about its own axis along the contact-face normal. Level 6 only. |
| Clean cut | An axis-aligned cut into one target piece (a box or cylinder of the form):<br>• a centred through-hole (cylinder)<br>• a half-depth bore<br>• a corner notch (a box sized 0.5–0.75 of the target's extent on each axis)<br>• a half-round groove along an edge<br>It must remove 10–50% of the target piece's volume. Level 5 and up. |

**Levels:** the joins available at a level are the user's enabled joins intersected with the level's list.

**How pieces count:** every primitive in the form counts as one piece, including a totem's base box and both halves of a mirror pair. Cutters don't count.

| Level | Name shown | Pieces | Joins allowed |
|---|---|---|---|
| 1 | One shape, varied proportions | 1 | none |
| 2 | Boxes only, joined flush | 2 (boxes only) | Stack, Wing |
| 3 | Mixed shapes, stacked and joined | 2–4 | Stack, Totem (base + 2 round pieces), Half-sunk, Wing |
| 4 | Adds mirror pairs and totems | 3–5 | + Through, Mirror pair, Totem with up to 3 round pieces |
| 5 | Adds one clean cut | 3–5 | + Clean cut (exactly one) |
| 6 | Adds one tilted or hinged piece | 3–6 | + Hinged lid or 45° piece (exactly one) |

**Spheres:** a sphere never appears alone, because a bare sphere gives no rotation cue. At Levels 1 and 2 a sphere can't be chosen. Elsewhere a sphere appears only in a totem or on top of a stack.

**Rejection rules** (generate again with the next seed, up to a retry cap, as today):
- The form must be one connected piece.
- Each placement step must grow the form's volume, at that point in construction, by at least 8%. A mirror pair counts as one step. A Through piece's protruding parts count.
- Every cut must remove 10–50% of its target piece's volume.
- A level whose extra join is enabled must produce at least one of it. This means the clean cut at Level 5, and the hinged lid or 45° piece at Level 6.

**Settings that can't all be met:** the generator never fails and never blocks the user.
- In Customise, join chips the current level doesn't allow are shown disabled with "from level N".
- At least one shape always stays selected.
- If the user turns off the level's extra join (for example Clean cut at Level 5), that level generates without it. The Level line then reads "Level 5 (no cut: Clean cut is off)".
- If the retry cap is hit, the best attempt so far is used, as today.

**Determinism and Variation:**
- A Clean form comes from a recipe: the piece types, the joins used and where each piece attaches.
- The recipe is derived from the seed. The proportions are derived from the seed plus a variation number, which is 0 for a new object.
- The same seed, variation number and settings always give the same form. The stored form records the recipe, the seed and the variation number.
- **Variation** keeps the recipe and increments the variation number, which draws new proportions. Sizes and attachment offsets stay on the grid.
- If the new proportions break a rejection rule, it tries the next variation number, up to the retry cap. It never changes the recipe.
- Variation is disabled for Freeform, with the tooltip "Variation works with Clean forms".

**Freeform** is today's generator, unchanged.

## Shot patterns

These replace "X shots evenly spaced". All angles are turn and tilt in degrees, and labels keep the base format.

| Pattern | Settings | Shots |
|---|---|---|
| Turntable | Step 90°, 45° or 30°. Tilt Above (+30°), Eye level (0°) or Below (−30°). | 4, 8 or 12 shots around one ring. The first turn is 30° so no shot is exactly face-on. |
| Grid | 4 × 3, 6 × 3 or 8 × 5 (turn steps × tilt rows). | Turns start at 30° and step evenly. Tilt rows are +45°, 0° and −45° for 3 rows, or +60°, +30°, 0°, −30° and −60° for 5. The sheet lays them out as a real grid, one row per tilt and one column per turn. |
| Sequence | Axis: Vertical (turn changes) or Side to side (tilt changes). Steps 4 × 15°, 6 × 15° or 4 × 30°. Also a "Start from live view" button. | The start angle is captured from the live view when Sequence is chosen or "Start from live view" is pressed. It doesn't follow later drags. Shots are ordered as the rotation. For Side to side, the start shifts if needed so every step stays within ±89°. |
| All around | 6, 8, 12 or 24. | Today's ring spacing (`ringViews`). |
| Front, side, top | none | Front (0°, 0°), right side (90°, 0°), back (180°, 0°), left side (270°, 0°), top (0°, 89°), and a 3/4 view (45°, 30°). These are straight-on reference views on purpose, so "no face-on shot" doesn't apply here. |

**Top-view map** (checkbox): adds one shot first, at turn 0° and tilt 89°, labelled "Top view (map)". It isn't added if the pattern already has a top view.

**Hide one shot to test me** (checkbox):
- One random shot from the pattern's own shots is covered by a card saying "Draw this view: ⟨label⟩" with a Reveal button. It is never the map or a custom shot.
- New object, Variation and pattern changes pick a new hidden shot.
- Snapping the live view to a hidden shot is allowed, since the user is checking.
- A hidden shot can still be ticked and saved. Its saved image is the real view, and the Save count is unaffected.

**Changing the pattern or its settings:**
- Ticked shots that are still in the new set stay ticked.
- Ticked shots that aren't become custom shots, as when the shot count changes today.

## Lens

- Settings: Flat (about 15° vertical field of view), Normal (32°) and Wide (55°).
- The camera distance is recomputed so the object fills the same centred square in every view and every lens. The fit uses the form's bounding sphere (radius 1 after normalisation, plus today's margin), so nothing clips at Wide.
- Aids never change the framing. The Box aid's corners may come close to the frame edge on round forms, and the ground grid may run off the frame. That's accepted.
- Shots and the live view always share the lens.
- Saved sets record their lens.

## Aids

Every aid applies identically to the shots and to the live view. Changing an aid re-renders the shots.

| Aid | What it draws |
|---|---|
| Hidden lines | Today's dashed non-photo-blue back edges. Moved into this row. |
| Box | The bounding box of the whole form as thin secondary-graphite (`#5E646B`) lines. Its back edges are dashed when Hidden lines is on, and hidden when it's off. |
| Centre lines | Each piece's central axis as a thin non-photo-blue line, extended slightly beyond the piece. |
| Ground | A light grid plane under the form's lowest point, plus the horizon line. The horizon is the vanishing line of horizontal planes, where the ground grid converges, computed from the same camera. It is drawn across the view when it falls inside the frame. With no camera roll it is always horizontal on screen. |
| Lines only | Turns off shading. Faces are plain white and only the lines are drawn. Hidden-line removal still works. |
| Silhouette | The form is drawn as a flat solid graphite shape with no interior lines or shading, which trains the outline. The Box, Centre lines and Ground aids still draw on top. Hidden lines don't apply. |

## Saving

A saved set also stores its exercise settings: the preset or custom settings, the pattern and its settings, the lens and the aids. Opening a saved set restores them. Saved images are rendered exactly as shown, aids included.

Saving isn't built yet (base plan Task 11), so no existing saved data needs migrating. `FormSpec` moves to `version: 2`, which adds `style`, plus `recipe` and `variation` for Clean forms. Freeform forms keep their pieces as today.

## Phone

- The Settings bottom sheet holds the whole panel: exercise cards in two columns, then Shots, then Customise.
- The header keeps New object. Variation sits in the sheet.
- The bottom bar is unchanged: Settings, and Save N shots.

## Later (not in this round)

These were shown as "Later" in the mockup:
- vanishing-point and edge-extension overlays
- ellipse minor axes
- cross-section rings
- rotation-prediction and matching quizzes
- warm-up sessions and counted sets
- timers
- shareable seed links

## Left to the builder

- The exact parameter tables per join, such as cut depths and stack offsets on thirds, within the rules above. Tune them with seed-sweep tests.
- The icons for the patterns.
- The per-device storage format for the last-used settings.
- The exact wording of one-line pattern summaries, matching the mockup's tone.

## Calls made during review (my calls; the user can override)

- **Wing:** a box on a side face, flush with A's top or bottom plane, giving L, T, U and Z shapes.
- **Piece counting:** every primitive counts, including a totem's base and both halves of a mirror pair. Level piece ranges were widened to fit (L3 2–4, L4 3–5, L5 3–5, L6 3–6).
- **Volume rule:** at least 8% growth per placement step, measured at that point in construction. A mirror pair is one step. Cuts must remove 10–50% of the target piece, not 15–50% of the whole form, so a corner notch qualifies.
- **New join "45° piece":** Level 6 picks either it or a hinged lid. Chests and lids uses only the hinged lid.
- **Settings that can't all be met:** the generator never blocks. Disallowed join chips are disabled with "from level N". If the level's extra join is switched off, the level generates without it and says so.
- **Variation:** keeps the recipe and steps a variation number. On failure it tries the next number and never changes the recipe. It is disabled for Freeform.
- **Sequence start:** captured when the pattern is chosen or "Start from live view" is pressed. It doesn't follow drags.
- **Hide one shot:** only the pattern's own shots can be hidden. Saved images show the real view.
- **Lens framing:** fitted to the bounding sphere. Aids never change framing.
- **Horizon:** the vanishing line of horizontal planes, drawn when it is inside the frame.
- **Saved data:** none exists yet. `FormSpec` goes to version 2.
