# Turnaround: what drawing teachers and spatial-training research suggest for the app

Research date: 2026-10-19. Drawabox pages were fetched live on that date. Every claim is cited by URL.

Support tags used on every idea:
- [S] directly supported by a cited source (the source describes this exercise, rule or format)
- [P] partly supported (the source supports the principle; applying it to this app is my design)
- [I] my inference (reasonable, but no source tested or described it)

---------------------------------------------------------------------------------------------------

## 0. Bottom line

1. For "perfect additions", use a named library of clean attachment recipes plus snapped parameters. Drawabox's own composite drill is "take a box, place a cylinder on top so half of it is submerged", then rotate the lid about its hinge axis. CAD mate vocabulary (coincident, concentric, tangent, flush) supplies the rules. [S/P]
2. Teachers consistently say: start with boxes only, keep forms roughly equilateral, add one new primitive type at a time, and treat subtractive construction as the harder, rarer tool. That is a ready-made difficulty ladder. [S]
3. The current generator feels random because of how it places pieces (section 1). Snapping size, rotation and position is the single biggest fix. [P]
4. For shots, control the angular step. Mental-rotation time grows linearly with angle (Shepard and Metzler). The Purdue rotation test is ordered 90 degrees about one axis, then 180 degrees about one axis, then 90 degrees about two axes, then mixed. Dorian Iten's turnaround exercise goes 90 degrees, then 45 degrees, then odd angles. [S]
5. Drawabox's 250-box structure maps onto a camera "lens" setting: 50 dramatic-foreshortening boxes with vanishing points marked, 50 shallow with none marked, 150 mixed. [S for the phasing, I for the FOV mapping]
6. Aids with the strongest teacher backing: draw-through (hidden edges), enclosing bounding box, centre lines and minor axes, cross-contour rings, and vanishing-point or line-extension checks. Shading is the weakest-supported aid for this goal; Drawabox explicitly does not use it to convey form. [S]
7. The most useful self-check loop is predict, draw, reveal, then rotate the live model. It appears in Iten's turnaround, in the engineering-graphics spatial course, and in Drawabox's error-checking methods. [S]
8. Caveat: I found no published curriculum for "draw the same compound form from N evenly spaced angles and compare". The app's core loop is a novel combination. The nearest are Iten's turnaround, Practice Drawing This warm-ups 7 and 8, and the TeachEngineering rotation drills. Spatial-test gains have also not been shown to transfer to drawing quality (section 8).

---------------------------------------------------------------------------------------------------

## 1. What the current generator does (read-only look at the repo)

From /home/kikis/Projects/drawing/.claude/worktrees/rotation-study/src/geometry/generate.ts:
- Size per axis is random in 0.45 to 1.60, so forms are often stretched.
- Rotation per axis is 0 or one of 15, 30 ... 90 degrees at random, so most attached pieces sit off-axis at odd angles.
- Position is a random point on a random face (area-weighted) plus up to 0.15 jitter, so attachments are never centred or flush.
- 25% of operations are cuts (from the second piece on), removing 3% to 50% of the volume.
- Primitives are uniform random over the allowed set.

From src/views/spacing.ts: shots are a ring-by-ring spread over the viewing sphere (turn and tilt), evenly spaced by solid angle. src/render/form-scene.ts already draws creases and silhouette lines, optional dashed hidden lines, and Lambert shading. src/shell/modes.ts has a mode registry, so new exercise modes can be added as separate entries.

Why it reads as random, in teaching terms: Drawabox tells students to "stick to equilateral forms" for form-intersection work and treats arbitrary free rotation as the advanced skill (the 250-box challenge). The app currently starts at the advanced end. [P]

---------------------------------------------------------------------------------------------------

## 2. Evidence digest (what the teachers and researchers actually prescribe)

### 2.1 Drawabox (Uncomfortable)
- Lesson 1 box path: Plotted Perspective (ruler, 2-point), Rough Perspective (freehand, vanishing points on page), Rotated Boxes, then Organic Perspective. https://drawabox.com/lesson/1/11
- Rotated Boxes: boxes arranged around a central box, each rotated progressively across a full 180 degree arc on both axes. Neighbouring boxes are kept tight so they give information about each other. The most common mistake is confusing perspective convergence with real rotation (the vanishing points did not move). The exercise is flagged as deliberately too hard. https://drawabox.com/lesson/1/rotatedboxes
- Organic Perspective and the Y method: three edges from the nearest corner, each pointing at its own vanishing point; the remaining edges must converge consistently. Angles between Y arms must be at least 90 degrees. The author says the exercise came from Peter Han's Dynamic Sketching course. https://drawabox.com/lesson/1/organicperspective and https://drawabox.com/lesson/250boxes
- 250 Box Challenge:
  - First 50: three-point perspective, all three vanishing points marked on the page, dramatic foreshortening.
  - Next 50: vanishing points not marked, shallow foreshortening.
  - Last 150: no vanishing points marked, mixed foreshortening.
  - Throughout: 5 to 6 boxes per page, boxes drawn through ("x-ray"), line extensions run back along each edge after each page to check convergence, vary the Y, never draw edges parallel on the page.
  - https://drawabox.com/lesson/250boxes/2 , https://drawabox.com/lesson/250boxes/3 , https://drawabox.com/lesson/250boxes/4
- Ellipses: degree (width) tracks how much the circle faces the viewer; the minor axis aligns with the circle's normal vector; fold test for symmetry. https://drawabox.com/lesson/1/5
- Form Intersections (Lesson 2): 4 filled pages, the first boxes-only (homework list at https://drawabox.com/lesson/2/3). Forms should be roughly equilateral ("avoid any that are overly stretched"). The repertoire is five forms: boxes, tubes, balls, pyramids, cones. Fill the page with overlapping forms, no tiny groups, nothing half off the page, draw through, start ellipse-based forms from the minor axis. Rule for intersection lines: they sit "exactly where they are able to run along the surfaces of both forms simultaneously". Hatching is used only to show which side faces the viewer. https://drawabox.com/lesson/2/8
- Organic Intersections: sausage forms piled cross-wise (perpendicular), not parallel, because parallel reads as unstable. https://drawabox.com/lesson/2/9
- Construction method: observe, identify basic forms, rebuild, then add in successive passes; "any additional forms you add to your drawing must be supported by what is already there". https://drawabox.com/lesson/2/3
- 250 Cylinder Challenge: 150 cylinders around an arbitrary minor axis (must vary foreshortening) and 100 cylinders constructed inside a box (X across planes to find centres, ellipse touches all four plane edges, minor axis through both plane centres). Error check per page, not per cylinder, using a ruler and a different-colour pen. https://drawabox.com/lesson/250cylinders
- 100 Treasure Chests: 25 closed (a box with a cylinder placed on top, half submerged), 25 open (lid rotated about the hinge axis), 50 detailed. All three sections are done in each sitting, in those proportions. https://drawabox.com/lesson/100chests
- Additive vs subtractive (TA critiques): additive construction is the default; subtractive is used "very rarely, only when absolutely necessary". To remove part of a form, first split it into two distinct 3D pieces with a contour line across its surface, then treat one piece as a void. Never cut back across a silhouette. https://drawabox.com/community/submission/AIP0FNZA/S393IY9 and https://drawabox.com/community/submission/5G86DFD/3W3MCIM2
- Shading stance: Drawabox does not use form shading to convey 3D. It uses construction, contour lines and silhouette, and focuses on cast shadows. https://drawabox.com/lesson/2/2
- Horizon and ground plane: vanishing points of ground-parallel edges lie on the horizon; tilted-up sets go above, tilted-down sets go below. https://drawabox.com/lesson/1/7
- Session structure: once a lesson is done, its exercises go into a pool; each sitting starts with 2 or 3 random picks for 10 to 15 minutes. https://drawabox.com/lesson/0/3 . The 50% rule: at most half of drawing time is study, at least half is play. https://drawabox.com/lesson/0/2 . Lesson 0 also discourages self-imposed deadlines because they cause rushing. https://drawabox.com/lesson/0

### 2.2 Scott Robertson, How to Draw (2013)
I could read only the table of contents and OCR fragments of chapters 1 to 4. I did not find the chapter 6 text.
- Draw through: "draw even the edges that would not be seen". Freehand ellipses and "Drawing an Ellipse on the Minor Axis" (draw the minor axis first, then the ellipse; fold the paper on the minor axis to check that the halves line up).
- Chapter 4 includes "Rotated 2-Point Grids with Same-Sized Squares" and "Mirroring" (including mirroring rotated, tilted planes).
- A passage warns that a rotated object can look as if it is floating above the ground, or tilted, if the vanishing points are not matched to the same cone of vision.
- Chapter 5 "Ellipses and Rotations": Creating a Cube Using Ellipses, Offsetting Ellipses, Hinging and Rotating Flaps and Doors, Subdividing Ellipses.
- Chapter 6 "Working with Volume": Planning Before Perspective, Orthographic Views, Transferring a Side View into Perspective, X-Y-Z Section Drawing, Extending the Sections, Cutting Volumes, Adding Radii and Fillets, Contour Lines, Overlapping and Line Weight.
- Sources: https://dokumen.pub/how-to-draw-drawing-and-sketching-objects-and-environments-from-your-imagination-first-edition-1933492732-9781933492735.html (table of contents and early chapters) and https://archive.org/stream/Scott_Robertson_How_To_Draw/Scott_Robertson_How_To_Draw_djvu.txt (garbled OCR, headings only).
- Drawabox's own note on the book: strong resource but easy to over-rely on. https://drawabox.com/article/h2d

### 2.3 Marshall Vandruff
- Seminar outline: "Rotating and Tilting Forms in Space: drawing forms without being bound by reference", "Refining Forms: placing the center line and accuracy in cross contours", "The Gridded Sphere: mastering ellipses". https://www.marshallart.com/HOME/seminars/draftsmanship/
- A student's notes of his lecture list the basic skills as "spin a box", "tilt a cylinder", "draw lines on the other side of the form, as if seeing through it", "check each form's height, width, and depth", plus cross contours as lines that wrap simple forms. http://www.sjhcalvin.com/lecture---demonstration/notes-from-a-lecture-by.html (secondary: a student's notes)
- Another student's notes: "Master cubes, then reduce objects to cubes"; "Stack, cut away, and extrude primitive forms"; build a cross-contour grid on every primitive; find a square's centre with diagonals. https://letslearntogether.neocities.org/art/marshall01 (secondary)

### 2.4 Proko and Peter Han
- Proko Structure Basics: box, cylinder, sphere as building blocks; ask whether you see 1, 2 or 3 planes of a box; practise by drawing boxes from objects around you from different angles, and by drawing boxes from imagination and checking whether you reproduced the one you pictured. https://www.proko.com/course-lesson/structure-basics-making-things-look-3d/
- Proko cross contour lesson (premium video; notes only): curvature and spacing of cross contours change perceived depth; steepest curves near the form edge; draw all the way around as if transparent. https://www.proko.com/course-lesson/how-to-draw-cross-contour-on-3d-forms
- Proko value basics: terminology of light, halftone, core shadow, reflected light, cast shadow, occlusion shadow; value follows how a plane faces the light; reduce to light and dark groups first. https://www.proko.com/course-lesson/shading-light-and-form-basics
- Peter Han: his Proko lesson shows a worked demo (organic object to planes and lines in perspective, keep symmetry, rotate the drawing). No public exercise list found. https://proko.com/course-lesson/how-to-mechanize-organic-forms . His influence is mainly visible through Drawabox's credit for the organic perspective boxes.

### 2.5 Other form-rotation exercise sets
- Practice Drawing This, "10 Drawing Warm-Up Exercises That Will Improve Your Ability To Rotate" (site owner not named; credits brokendraw and Zefdraws). Ladder: 1 rotating boxes, 2 matrix of boxes, 3 irregularly stacked boxes, 4 boxes moving along a line, 5 cylinders, 6 all five primitives rotated, 7 box rotated around a line (easier), 8 boxes swirling around a line (harder), 9 boxes on the floor, 10 forms placed against each other (neighbouring boxes, stacked extrusions). Each links to a 3D model plus flashcard, timed (600 s) and game modes. https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups
- Dorian Iten, "Perspective Drawing Exercise: Turnarounds": pick an object, reduce to basic forms, draw a small top view as a map, then draw the turnaround. Start with 90 degree rotations, move to 45 degrees and unusual angles. Start with simple household objects without overlapping parts. From life: imagine the side view, draw it, then look to verify. From reference: use photos or 3D renders of each view. https://www.dorian-iten.com/turnaround/

### 2.6 Mental rotation and spatial visualisation research
- Shepard and Metzler (1971): participants compared pairs of drawings of asymmetrical cube assemblages. Reaction time rose linearly with angular difference, equally for rotation in the picture plane or in depth. Some pairs were mirror images and had to be rejected. https://plato.stanford.edu/archives/Spr2016/entries/mental-imagery/mental-rotation.html
- PSVT:R (Guay): 30 items, 20 minutes, ordered by difficulty. Items go 90 degrees about one axis, then 180 degrees about one axis, then 90 degrees about two axes, then 90 degrees about one plus 180 degrees about another. A first object pair shows the rotation; a second object must be mentally rotated the same way; five choices. Solids are truncated cubes, cylinders, rectangular and triangular prisms. https://peer.asee.org/the-addition-of-coordinate-axes-to-the-purdue-spatial-visualization-test-visualization-of-rotations-a-study-at-two-universities.pdf
- Adding coordinate axes to PSVT:R items: at NC State the scores rose (significantly on part 2) and gender differences disappeared; at Purdue the scores fell. The earlier study found slower responses with axes. The effect is mixed. Same PDF as above.
- Mental Rotation Test (Vandenberg and Kuse): a criterion figure and four options, pick the two that are the same object rotated. Mental Cutting Test: pick the cross-section from five options. Both are described in Sorby and Baartmans (2000). https://www.vanderbilt.edu/gised/wp-content/uploads/Sorby_DevelopmentAssessmentCourse-Enhancing3DSpatialVisualizationSkillsEngineering.pdf
- Sorby's 10-week course (Michigan Tech): week 2 isometric and orthographic sketching from snap cubes using coded plans, week 3 orthographic drawings with inclined surfaces, week 7 sketching isometric views of snap-cube objects rotated first about one axis then about two or more, week 8 reflection and symmetry, week 9 cross-sections of cubes, cones and cylinders, week 10 solids of revolution and intersections. PSVT:R averaged about 50% before and about 80% after, over six cohorts. Same PDF as above.
- Sorby (1999): "the answer is sketching, sketching, sketching"; sketching hand-held models seems especially helpful; physical models you can touch help more than models only seen on a screen (citing McKim); move from concrete (physical models) to semi-concrete (pictorial sketches) to abstract (multi-view). In that study, the CAD-only courses showed smaller gains than the sketching-based courses, and in one CAD course the MRT and PSVT:R gains were not significant. https://edgj.org/index.php/EDGJ/article/view/126
- TeachEngineering spatial series: "Let's Take a Spin: One-Axis Rotation" has students rotate a snap-cube shape by a stated rotation (for example +90 degrees about Y, +180 degrees about Z), draw the result on isometric dot paper, and check with the block; a two-axis activity follows. Also "Connect the Dots: Isometric Drawing and Coded Plans" with partner cross-checking. https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity3 and https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity1
- Uttal et al. (2013) meta-analysis: spatial training works (Hedges' g about 0.47 overall); effects were durable and transferred to untrained spatial tasks. Training categories were video games, courses, and task practice. https://pubmed.ncbi.nlm.nih.gov/22663761/ and full text https://groups.psych.northwestern.edu/uttal/vittae/documents/Themalleabilityofspatialskillsametaanalysisoftrainingstudies.pdf . The paper notes that mental-rotation training improves both rotation speed (slope) and encoding (intercept), so training should also help people encode the form's structure.
- Wright et al. (2008): 21 days of practice on mental rotation or paper folding transferred to new stimuli and to the other spatial task. https://www.nmr.mgh.harvard.edu/publications/journal_articles/4115
- Keehner et al. (2008, Cognitive Science): in a task of inferring and drawing cross-sections of a 3D object, interactive rotation helped only when it gave the viewer better information; passive viewers who saw the same views did as well. "What matters is what you see, not whether you interact." https://discovery.dundee.ac.uk/en/publications/spatial-reasoning-with-external-visualizations-what-matters-is-wh/
- Goodale lab (active exploration): actively rotating novel objects on screen gave faster recognition than passively viewing the same images, but participants studied only a few views. https://www.uwo.ca/bmi/goodalelab/research/past/active_exploration.html

### 2.7 Generic learning-science items
- Retrieval practice (testing effect): Roediger and Karpicke 2006, testing beats restudying on delayed tests. https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf
- Deliberate practice: individualised tasks, clear goal, immediate informative feedback, tasks pitched at the learner's edge. Ericsson, Krampe and Tesch-Romer 1993 (only secondary summaries read). https://pmc.ncbi.nlm.nih.gov/articles/PMC8049893/

### 2.8 Geometry vocabulary for "clean" attachments
- Constructive solid geometry: primitives (cuboid, cylinder, prism, pyramid, sphere, cone) combined with union, difference and intersection; this is the app's own model. https://en.wikipedia.org/wiki/Constructive_solid_geometry
- CAD standard mates: coincident (faces, edges or vertices in contact or flush), concentric (axes of round faces aligned), parallel, perpendicular, tangent (flat face to cylinder), distance, angle. These are the "clean relationship" vocabulary. https://help.solidworks.com/2022/english/SolidWorks/sldworks/c_standard_mates_swassy.htm and https://pressbooks.pub/solidworks2/chapter/standard-mates

---------------------------------------------------------------------------------------------------

## 3. (a) Form-generation rules and types

A1. "Clean" generator mode with snapped parameters [P]
- What: replace free random size, rotation and position with discrete sets. Sizes from simple ratios (for example 1, 1/2, 2) with the overall form kept near-equilateral (longest to shortest overall extent about 2:1 at most). Rotation limited to 0 and 90 degrees (flush) at early levels; 45 degrees allowed for one deliberate diagonal piece; 15 degree steps only at the top level. Attachment points limited to face centre, edge-flush, or corner-flush instead of random surface point plus jitter.
- Why: the current generator's free values produce arbitrary relationships; teachers keep forms equilateral and aligned until the student can handle foreshortening consistency.
- Sources: https://drawabox.com/lesson/2/8 ("stick to equilateral forms"); mates vocabulary https://help.solidworks.com/2022/english/SolidWorks/sldworks/c_standard_mates_swassy.htm . The numeric thresholds are mine [I].

A2. Attachment recipe library ("perfect additions") [S/P]
Offer each as a named recipe the generator picks from, with a user-facing checkbox list:
- Stack: box, cylinder, cone or pyramid sitting centred on a flat face, axis along the face normal. [P] Source for the principle: https://drawabox.com/lesson/100chests ("place a cylinder on top such that half of the cylinder is submerged into the box").
- Half-sunk cylinder (the chest lid): cylinder axis parallel to a box edge, half embedded in the top face. [S] https://drawabox.com/lesson/100chests
- Coaxial totem: cylinder, cone, sphere (or hemisphere) stacked on a shared axis, equivalent to a solid of revolution (CAD "concentric"). [P] https://pressbooks.pub/solidworks2/chapter/standard-mates and Sorby week 10, https://www.vanderbilt.edu/gised/wp-content/uploads/Sorby_DevelopmentAssessmentCourse-Enhancing3DSpatialVisualizationSkillsEngineering.pdf
- Flush wing: a second box sharing one flush face with the first, producing L, T, U or Z shapes. These are the cube-chain "arm with right-angle elbows" shapes of the classic mental-rotation stimuli. [P] https://plato.stanford.edu/archives/Spr2016/entries/mental-imagery/mental-rotation.html
- Through pin: cylinder through the centre of a box, protruding equally on both sides. [I]
- Mirror pair: two identical pieces placed symmetrically either side of a plane (ears, arms, legs). [P] Robertson "Mirroring" chapter, https://dokumen.pub/how-to-draw-drawing-and-sketching-objects-and-environments-from-your-imagination-first-edition-1933492732-9781933492735.html
- Radial array: 3, 4 or 6 identical arms at equal angles around an axis. [I; related: Vandruff's gridded sphere and Robertson's "Subdividing Ellipses"]
- Hinged part: lid or flap rotated about an edge by a fixed angle (30, 45, 60, 90). [S] https://drawabox.com/lesson/100chests ("lid needs to be rotated on the axis of its hinges"); Robertson "Hinging and Rotating Flaps and Doors" (chapter 5 title, same dokumen.pub URL).
- Rationale (one line): each recipe is a relationship a draughtsperson can name and check, which is what "intentional" means.

A3. Clean cuts for subtractive forms [P]
- Recipes: centred through-hole, half-depth bore, corner notch (a box removed from a corner at half size), half-round groove along an edge, spherical dimple, cone or pyramid countersink, planar slice. Cut axes aligned to the base form's axes. Reject slivers: removed volume at least about 15% and no more than 50% (the repo currently allows as little as 3%).
- Why: subtractive construction is described as harder and used rarely; when it is used, the form is first divided into two solid pieces by a contour line. A "cut guide" overlay (idea C9) can show that dividing curve.
- Sources: https://drawabox.com/community/submission/AIP0FNZA/S393IY9 , https://drawabox.com/community/submission/5G86DFD/3W3MCIM2 ; Robertson "Cutting Volumes" (table of contents, same dokumen.pub URL). Thresholds are mine [I].

A4. Difficulty ladder for forms [P]
- L0: one primitive (box, then cylinder, then cone or pyramid; a sphere only with a pole marker, see A8).
- L1: two pieces, add-only, boxes only, flush or centred.
- L2: add-only, mixed primitives, stack or coaxial or half-sunk recipes, near-equilateral.
- L3: three to four pieces, mirror pair or radial array allowed.
- L4: add one clean cut.
- L5: one hinged or 45 degree piece (the single "askew" element).
- L6: free orientation (roughly today's behaviour).
- Why: Drawabox's own order is boxes only first, then the other four forms ("The first page should consist only of boxes"), additive before subtractive, aligned before free; Practice Drawing This runs boxes, then cylinders, then all primitives, then stacking.
- Sources: https://drawabox.com/lesson/2/3 , https://drawabox.com/lesson/2/8 , https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups . The exact level boundaries are mine [I].

A5. Form-quality filters (reject-and-retry) [P/I]
- No two coplanar faces that differ by a sliver; no piece that is hidden in every shot; no cut so small it never reads in a shot; at least one visible intersection curve per attachment so the relationship is drawable.
- Avoid forms that are indistinguishable under rotation (high rotational symmetry) unless the "symmetry" setting is chosen. The original mental-rotation stimuli were deliberately asymmetrical, with mirror-image decoys.
- Why: Drawabox says intersection lines are what define how two forms relate in space; symmetric forms cannot tell the user which view they are looking at.
- Sources: https://drawabox.com/lesson/2/8 ; https://plato.stanford.edu/archives/Spr2016/entries/mental-imagery/mental-rotation.html . The filters themselves are mine [I].

A6. Presets (named seeds with fixed recipe sets) [I]
- Examples: Chest (box plus half-sunk cylinder plus hinge angle), Totem (coaxial stack), Bracket (L-shape with a hole), Gear-ish (radial array), Steps (stacked boxes), Tee (flush wing).
- Why: easy for a user to ask for "that kind of form again" without understanding every control. Builds on the app's existing deterministic seeds.

A7. Single-primitive rotation drills [S]
- Random orientation of one box, one cylinder, one cone or one pyramid, with foreshortening setting; the cylinder variant can show its enclosing box.
- Why: these are the base drills of the 250 Box and 250 Cylinder challenges, and warm-ups 1, 4 and 6 of Practice Drawing This.
- Sources: https://drawabox.com/lesson/250boxes , https://drawabox.com/lesson/250cylinders , https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups

A8. Spheres only with a facing cue [P]
- Never leave a lone sphere; attach it (ball on cylinder, hemisphere dome) or add a pole ring or equator ring.
- Why: a bare sphere gives no rotation cue (hard to tell any two views apart); Drawabox uses a pole ellipse on spheres to show facing, and notes an uneven circle will not read as a sphere.
- Source: https://drawabox.com/lesson/2/8

A9. Voxel or cube-stack form type [S/I]
- A separate generator producing snap-cube objects (3 to 8 cubes) with a top-down coded plan available as a hint.
- Why: this is the exact stimulus family of the spatial-visualisation literature and the Sorby course; coded plans and isometric sketching are how that course builds the skill.
- Sources: https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity1 , https://plato.stanford.edu/archives/Spr2016/entries/mental-imagery/mental-rotation.html

A10. Proportion unit grid [P]
- Build every piece from one unit module so cross-view comparisons are checkable (for example "the lid is half the box height in every view").
- Why: Vandruff's checklist is height, width, depth of each form; Robertson has chapters on multiplying and dividing rectangles in perspective.
- Sources: http://www.sjhcalvin.com/lecture---demonstration/notes-from-a-lecture-by.html , dokumen.pub table of contents above. [P]

---------------------------------------------------------------------------------------------------

## 4. (b) Shot and view patterns

B1. Angle-step presets in place of one even spread [S/P]
- Presets: "Quarter turns" (4 shots at 90 degrees, one tilt), "Eighths" (8 shots at 45 degrees), "Two levels" (the same turns at +30 and -30 tilt), "Free sphere" (today's ring spread).
- Why: mental-rotation time grows linearly with the angle between views, so the preset is a direct difficulty dial; Iten's turnaround starts at 90 degrees, then 45 degrees, then odd angles.
- Sources: https://plato.stanford.edu/archives/Spr2016/entries/mental-imagery/mental-rotation.html ; https://www.dorian-iten.com/turnaround/

B2. One-axis then two-axis rotation steps between consecutive shots [S]
- Sequence A: successive shots differ by 90 degrees about the vertical axis only. Sequence B: 180 degrees about one axis. Sequence C: 90 degrees about two axes. Sequence D: 90 degrees about one and 180 degrees about another.
- Why: this is the item ordering of the Purdue rotation test, and the TeachEngineering series teaches one-axis then two-axis rotation as separate lessons.
- Sources: https://peer.asee.org/the-addition-of-coordinate-axes-to-the-purdue-spatial-visualization-test-visualization-of-rotations-a-study-at-two-universities.pdf ; https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity3

B3. Canonical views versus general-position views [P]
- Canonical: front, side, top, plus the opposite sides (an orthographic "map"). General: tilt and turn chosen so all three edge directions visibly converge, with no edge set running parallel to the picture plane.
- Why: canonical views flatten a box to a rectangle and make perspective convergence disappear, whereas Drawabox wants boxes freely rotated with every set converging; Robertson and Iten both use plan and ortho views as an orientation map first.
- Sources: https://drawabox.com/lesson/250boxes/2 ("make sure all of your boxes' lines converge"); https://drawabox.com/lesson/1/8 (a vanishing point goes to infinity only when the edges run perpendicular to the line of sight); https://www.dorian-iten.com/turnaround/ (top-view map). The toggle is my application [P].

B4. Lens (foreshortening) control: Dramatic, Shallow, Mixed [S for phasing, I for the mapping]
- Wide FOV or camera close = dramatic foreshortening; narrow FOV or camera far = shallow. Phase presets mirror the 250 box structure: dramatic with vanishing points shown, then shallow with none shown, then mixed.
- Why: Drawabox uses exactly this progression, and in src/views/camera.ts the field of view is a fixed 32 degrees and the camera distance derives from it, so a lens setting means varying both together to keep the form framed.
- Sources: https://drawabox.com/lesson/250boxes/2 , https://drawabox.com/lesson/250boxes/3 , https://drawabox.com/lesson/250boxes/4

B5. Rotation-grid sheet [S/P]
- Present the shots as a grid: yaw on one axis, pitch on the other, in equal steps (for example -90 to +90 by 45), with the neighbours visible so each drawing is checked against its neighbours.
- Why: Drawabox's Rotated Boxes exercise is exactly this, with tight consistent gaps between neighbours; Practice Drawing This warm-up 2 is a "matrix of boxes" with deliberate rotation per cell.
- Sources: https://drawabox.com/lesson/1/rotatedboxes ; https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups

B6. Informative-view selection [P]
- Choose or force shots so that every piece and every cut is visible in at least two shots, and include one shot that shows the least-visible feature; avoid degenerate views (exactly face-on or edge-on).
- Why: Keehner et al. found that what the learner sees matters more than whether they interact; if the shots are chosen well, passive viewing is as good as free rotation.
- Source: https://discovery.dundee.ac.uk/en/publications/spatial-reasoning-with-external-visualizations-what-matters-is-wh/

B7. Plan-first "map" shot [S]
- Always offer a top-down view as shot zero, and optionally mark a viewing direction arrow on it for each following shot.
- Why: Iten's step 3 is "draw a small top view as a map to orient yourself"; Robertson's chapter 6 starts with planning and orthographic views; Sorby's coded plans are a top-view grid.
- Sources: https://www.dorian-iten.com/turnaround/ ; https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity1

B8. Held-out shot [S/P]
- Show N shots, hide one (for example from behind or below), the user draws it, then reveal and rotate the live model to compare.
- Why: this is Iten's "imagine the side view, draw it, then look to verify", Proko's "draw from imagination, then check", and the visualisation-of-views family of tests.
- Sources: https://www.dorian-iten.com/turnaround/ ; https://www.proko.com/course-lesson/structure-basics-making-things-look-3d/

B9. Shot count and gap controls [I]
- Few shots (3 to 4, so the user must infer the rest) versus many (12 or more, so the user can interpolate). Optional alternating "known / unknown" pattern.
- Why: sets how much of the rotation the learner must do mentally; no source tests this directly.

B10. Matching shots (recognition) [S]
- Show one target shot and four candidate shots, two of which are the same form rotated and two are mirror-image or altered decoys.
- Why: this is the Mental Rotation Test format and the Shepard and Metzler mirror-image trial; the mirror decoy is what stops people matching by a single feature.
- Sources: https://www.vanderbilt.edu/gised/wp-content/uploads/Sorby_DevelopmentAssessmentCourse-Enhancing3DSpatialVisualizationSkillsEngineering.pdf ; https://plato.stanford.edu/archives/Spr2016/entries/mental-imagery/mental-rotation.html

B11. Ground and eye level fixed across shots [P]
- Keep a consistent "up" and a ground plane with the horizon line, never rolling the camera.
- Why: Robertson warns that a rotated object looks like it is floating or tilted if its vanishing points are not matched; Drawabox ties vanishing point position to the horizon and ground-parallel edges. The app already clamps tilt to +/-89 degrees. [P]
- Sources: https://drawabox.com/lesson/1/7 ; Robertson (dokumen.pub URL above).

---------------------------------------------------------------------------------------------------

## 5. (c) Drawing aids and overlays (all toggleable on the rendered references)

C1. Bounding box / construction box [S]
- Draw the wire cuboid enclosing the whole form (and optionally the box around each piece), with edges extended slightly. For cylinders and cones show the square-ended box that contains them.
- Why: Drawabox's cylinder challenge builds every cylinder inside a box so it relates to other forms; Vandruff's note is "master cubes, then reduce objects to cubes"; Proko starts every form from a box.
- Sources: https://drawabox.com/lesson/250cylinders ; https://letslearntogether.neocities.org/art/marshall01 ; https://www.proko.com/course-lesson/structure-basics-making-things-look-3d/

C2. Centre lines, plane diagonals and axes [S]
- Show each piece's centre line (spine) and the X diagonals across its box faces that locate centres, in a distinct colour.
- Why: the "X across the plane" method gives the centre of a plane in perspective, and the spine line is how Drawabox, Robertson and Vandruff place circular forms.
- Sources: https://drawabox.com/lesson/250cylinders ; https://letslearntogether.neocities.org/art/marshall01 ; https://www.marshallart.com/HOME/seminars/draftsmanship/

C3. Ellipse minor axis and degree readout [S]
- For every visible circular edge, show its minor axis line (extended through both ends of a cylinder) and optionally its degree (width relative to length).
- Why: the minor axis shares the circle's normal direction and a vanishing point with the cylinder's sides; the fold test is the self-check; the far end is slightly wider than the near end.
- Sources: https://drawabox.com/lesson/1/5 ; https://drawabox.com/lesson/250cylinders ; Robertson's "Drawing an Ellipse on the Minor Axis" (dokumen.pub URL in section 2.2)

C4. Cross-section contour rings [S]
- Ribs wrapped around cylinders, cones and spheres at fixed spacing (and a lat-long grid on spheres), plus optional full-form slicing planes along X, Y or Z for compound forms.
- Why: cross contours show how a surface turns; Vandruff builds a cross-contour grid on every primitive; Robertson's section drawing slices the whole form along three axes; Sorby's course teaches cross-sections as a spatial skill.
- Sources: https://www.proko.com/course-lesson/how-to-draw-cross-contour-on-3d-forms ; https://letslearntogether.neocities.org/art/marshall01 ; https://drawabox.com/lesson/2 ; Robertson chapter 6 (dokumen.pub URL) ; Sorby PDF above

C5. Vanishing points and edge-extension overlay [S]
- Modes: off; show the three vanishing points (computed from the base form's principal axes) as markers outside the frame or at the page edge; show reference edges extended back to their vanishing points.
- Why: this is the 250-box scaffold: points marked for the first 50, none after, and line extensions as the check after each page.
- Sources: https://drawabox.com/lesson/250boxes/2 , https://drawabox.com/lesson/250boxes/3
- Note: forms with off-axis pieces have several vanishing point sets; limit the overlay to one set per piece, or to the base box only. [I]

C6. Ground plane, horizon and contact shadow [P]
- A grid or tile plane under the form, the horizon line at eye level, and a soft contact shadow.
- Why: Robertson warns that a rotated object looks like it floats if its vanishing points do not match the same viewing setup; Drawabox ties vanishing points to the horizon; "boxes on the floor" is warm-up 9; Drawabox says to focus on cast shadows rather than form shading.
- Sources: https://drawabox.com/lesson/1/7 ; https://drawabox.com/lesson/2/2 ; https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups

C7. Draw-through (hidden lines) and line-weight hierarchy [S]
- The app already has dashed hidden lines. Add: a "ghost" weight for hidden edges, heavier weight on the silhouette, and heavier weight only where one edge overlaps another.
- Why: Robertson, Drawabox and Vandruff all say to draw the back edges; Drawabox warns it makes forms harder to read and so asks for line weight on the visible silhouette and overlaps.
- Sources: https://drawabox.com/lesson/2/8 ; https://drawabox.com/lesson/1/rotatedboxes ; Robertson (dokumen.pub) ; http://www.sjhcalvin.com/lecture---demonstration/notes-from-a-lecture-by.html

C8. Render modes [mixed]
- Silhouette only (solid fill): trains the outline and the overall shape. [P] https://drawabox.com/lesson/2/2 (silhouette is the first thing the eye registers)
- Line only (the current outline plus creases): the default.
- Wireframe or construction view (every piece's edges, including cut edges, with pieces tinted differently): shows how the form was built. [I]
- Flat planes of light: three values by plane normal against a fixed light, with no gradients (light, mid, shadow, plus an optional cast shadow on the ground). [P] https://www.proko.com/course-lesson/shading-light-and-form-basics ("value follows how a plane faces the light", reduce to light and dark groups)
- Why shading is last: Drawabox deliberately avoids it for form-learning and says construction, contour lines and silhouette do the job; Proko covers it as a separate subject. https://drawabox.com/lesson/2/2

C9. Seam, cut and intersection highlighter [S for the principle, I for the UI]
- Highlight the curves where one piece meets another, in a colour; for cuts highlight the rim of the removed volume; optionally show the planar "dividing line" across a form before a cut.
- Why: Drawabox's rule is that intersection curves run along the surfaces of both forms, and subtractive cuts begin by dividing the form with a contour line. Booleans merge the meshes, so the seams have to be computed from the piece surfaces.
- Sources: https://drawabox.com/lesson/2/8 ; https://drawabox.com/community/submission/AIP0FNZA/S393IY9

C10. Facing cue [P]
- Tint or hatch the faces that point toward the camera, or show a small normal arrow on circular faces.
- Why: Drawabox uses hatching only to show which side of a form faces the viewer, and a pole ellipse on spheres.
- Source: https://drawabox.com/lesson/2/8

C11. Axis gizmo (X, Y, Z triad) [P, evidence mixed]
- Small triad that rotates with the model, off by default.
- Why: adding coordinate axes to rotation items raised scores at one university and lowered them at another; the earlier study found slower responses.
- Source: https://peer.asee.org/the-addition-of-coordinate-axes-to-the-purdue-spatial-visualization-test-visualization-of-rotations-a-study-at-two-universities.pdf

C12. Answer-overlay on the user's own drawing [I, built on S practices]
- After the user draws (on paper, then photographed, or on-canvas), overlay the exact projected linework at the same view with an opacity slider, plus the extended edges from C5.
- Why: this is the on-screen version of Drawabox's line-extension and ruler-over-minor-axis checks and of Iten's "check against the real object". No source describes an overlay, but the check itself is standard practice.
- Sources: https://drawabox.com/lesson/250boxes/2 ; https://drawabox.com/lesson/250cylinders ; https://www.dorian-iten.com/turnaround/

C13. Scaffold fading [I, with conflicting views]
- Show aids at low levels and remove them as levels rise, or show them only on the reveal.
- Why: Sorby moves from concrete to abstract, so fading fits; Drawabox says its extra lines are "not training wheels" to be removed, so some teachers treat aids as permanent. Offer both choices.
- Sources: https://edgj.org/index.php/EDGJ/article/view/126 ; https://drawabox.com/lesson/2/3

---------------------------------------------------------------------------------------------------

## 6. (d) Exercise modes and session structure

D1. Warm-up mode [S]
- Draw 2 or 3 random drills from a pool of exercises the user has unlocked, for 10 to 15 minutes.
- Source: https://drawabox.com/lesson/0/3

D2. Counted sets ("pages") with a check step between them [S]
- A set is 5 to 6 forms; after each set the user runs the check (C5 extensions or C12 overlay) before starting the next. Phases follow B4 (dramatic, shallow, mixed).
- Why: Drawabox runs the box challenge as 50 / 50 / 150 with a check after every page; variation is required ("do not draw the same box over and over").
- Sources: https://drawabox.com/lesson/250boxes/2 , https://drawabox.com/lesson/250boxes/3 , https://drawabox.com/lesson/250boxes/4

D3. Turnaround mode [S]
- Show a plan map plus 1 or 2 views; the user draws the form from a named target angle (90 degrees first, then 45 degrees, then odd angles); reveal; rotate the live view to compare.
- Sources: https://www.dorian-iten.com/turnaround/ ; stated-rotation drills (for example +90 degrees about Y) at https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity3

D4. Rotation-prediction quick-fire (PSVT:R style) [S for the format]
- Show a reference form and a stated rotation ("+90 degrees about the vertical, then +90 degrees about the left-right axis"), then a second form; the user picks which of 4 or 5 candidates shows that form after the same rotation. Keep distractors as mirror images or wrong-axis rotations.
- Pacing note: the standard test allows 20 minutes for 30 items, about 40 seconds each.
- Use: diagnostic at the start and as a progress measure; also a drill.
- Do not copy PSVT items (copyrighted); generate your own from the app's forms.
- Sources: https://peer.asee.org/the-addition-of-coordinate-axes-to-the-purdue-spatial-visualization-test-visualization-of-rotations-a-study-at-two-universities.pdf ; https://www.vanderbilt.edu/gised/wp-content/uploads/Sorby_DevelopmentAssessmentCourse-Enhancing3DSpatialVisualizationSkillsEngineering.pdf

D5. Cross-section prediction mode (Mental Cutting Test style) [S]
- Show a form with a slicing plane; the user draws or picks the cross-section outline. Build on C4.
- Why: Sorby week 9 teaches cross-sections of cubes, cones and cylinders; Keehner et al.'s task was inferring and drawing cross-sections; Robertson's X-Y-Z section drawing is the drawing equivalent.
- Sources: Sorby PDF above ; https://discovery.dundee.ac.uk/en/publications/spatial-reasoning-with-external-visualizations-what-matters-is-wh/

D6. Memory / blind mode (retrieval practice) [P]
- Show the form for N seconds, hide it, and have the user draw it from memory or from a different angle; then reveal.
- Why: retrieval beats restudy on delayed tests; Proko's "draw boxes from imagination, then check"; Vandruff's seminar goal is drawing forms "without being bound by reference".
- Sources: https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf ; https://www.proko.com/course-lesson/structure-basics-making-things-look-3d/ ; https://www.marshallart.com/HOME/seminars/draftsmanship/

D7. Build-from-plan mode for cube-stack forms [S]
- Give a top-down coded plan (heights per cell); the user draws the isometric view (or any chosen view), then reveals. Reverse variant: from a view, write the plan.
- Sources: https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity1 ; Sorby PDF above

D8. Cylinder-in-box drill with error check [S]
- Show a box, the user places the cylinder; reveal the true minor axis and contact points and let the user compare.
- Source: https://drawabox.com/lesson/250cylinders

D9. Overlapping-forms page ("form intersections") [S]
- Show a cluster of 6 to 10 near-equilateral forms overlapping; the user redraws it, then rotates the view and draws it again to keep each form's size consistent.
- Source: https://drawabox.com/lesson/2/8

D10. Rotation-around-a-line drills [S]
- Boxes rotated around a centre line (one rib on the line), and the harder version where boxes swirl around the line on ellipses.
- Source: https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups (warm-ups 7 and 8)

D11. Self-check protocol: predict, draw, reveal, rotate, mark [S/P]
- Steps: predict the view; draw; reveal the reference shot; rotate the live model to see why; tick what went wrong from a short list (convergence, ellipse alignment, proportions, intersections, hidden edges).
- Why: the same loop appears in Iten (imagine, draw, verify), Sorby's course (partner cross-check), and Drawabox (extensions and ruler checks). The error-tag list is mine [I].
- Sources: https://www.dorian-iten.com/turnaround/ ; https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity1 ; https://drawabox.com/lesson/250cylinders

D12. Adaptive difficulty staircase [P/I]
- Raise form level, angular step, or shot count after N consecutive self-rated passes; lower after misses. Show the level, not a score.
- Why: deliberate practice calls for tasks at the edge of ability with immediate feedback; PSVT:R and Dorian Iten both order steps by difficulty; Drawabox warns against self-imposed deadlines.
- Sources: https://pmc.ncbi.nlm.nih.gov/articles/PMC8049893/ (secondary summaries only) ; the two ordered ladders above. The staircase rule is mine [I].

D13. Timers: optional, not default [mixed]
- Offer a per-form timer (for example a 600 second flashcard mode as in Practice Drawing This), but default to untimed, and show elapsed time quietly rather than a countdown.
- Why: Drawabox discourages deadlines because they cause rushing; Practice Drawing This offers timed and game modes; gesture-drawing apps (30 seconds to 2 minutes) are for gesture, not construction, so I would not copy their timings.
- Sources: https://drawabox.com/lesson/0 ; https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups

D14. Session shape [P]
- Suggested default session: (1) 10 to 15 minute warm-up of 2 or 3 pool drills, (2) a main set of 5 to 6 forms with one theme (for example "half-sunk cylinders, shallow lens"), (3) check pass, (4) a prompt to spend time drawing freely.
- Why: the first two steps are Drawabox's structure; the last reflects the 50% rule (at most half of drawing time as study).
- Sources: https://drawabox.com/lesson/0/3 ; https://drawabox.com/lesson/0/2

D15. Live-rotate check as a reward, not a crutch [P]
- Keep the live 3D view as the final check. For novices, add a "snap rotate" with 90 degree buttons and a stated axis, so the user rehearses single-axis reasoning before free-orbiting.
- Why: physical models help more than screen images (Sorby citing McKim) and active rotation helped recognition, but Keehner et al. found that interaction adds nothing beyond seeing the right views; so the benefit is in the views, and the 90 degree buttons keep the rotation explicit.
- Sources: https://edgj.org/index.php/EDGJ/article/view/126 ; https://www.uwo.ca/bmi/goodalelab/research/past/active_exploration.html ; https://discovery.dundee.ac.uk/en/publications/spatial-reasoning-with-external-visualizations-what-matters-is-wh/

D16. Mirror-image trap [P]
- Occasionally show a shot of the mirror form and ask "same or mirrored?" before the user draws.
- Why: mirror-image pairs are what force actual rotation instead of feature matching in Shepard and Metzler.
- Source: https://plato.stanford.edu/archives/Spr2016/entries/mental-imagery/mental-rotation.html

---------------------------------------------------------------------------------------------------

## 7. Suggested build order (my recommendation)

Highest value for effort, most strongly supported first:
1. A1, A2, A4: snapped "clean" generator with a recipe library and a level ladder (fixes the "too random" complaint directly).
2. B1, B2, B4: angle-step presets, one-axis then two-axis steps, and a lens setting.
3. C1, C2, C5, C7: bounding box, centre lines, vanishing-point and extension overlay, hidden-line weight (cheapest, best backed aids).
4. D11 and D3: the predict, draw, reveal, rotate loop as a turnaround mode.
5. C4, C9 and A3: cross-section rings, seam highlighting, clean cuts (needs more geometry work).
6. D4, D5, B10: quiz-style modes (rotation prediction, cross-section prediction, matching) as a diagnostic and progress measure.
7. D1, D2, D14: warm-up pool and counted sets with a check pass.

---------------------------------------------------------------------------------------------------

## 8. Caveats, conflicts, and what remains uncertain

Versions and dates
- Drawabox pages were read live on 2026-10-19. The current pages describe the 250 box challenge as 50 / 50 / 150. A community search snippet claimed the challenge was altered on 2024-02-19 (and one student was told to draw 50 instead of 250); I could not find that note on the live pages, so treat the counts as the live pages state them. Drawabox URLs and numbering can change.
- Sorby's results are from 1993 to 1998 cohorts of engineering students; Uttal's meta-analysis is from 2013; the PSVT:R axes study is from 1999. None of these were about drawing apps.

Gaps in my access
- Scott Robertson: only the table of contents and OCR fragments of early chapters were readable. I did not read the chapter 6 text (sections, cutting volumes), so ideas based on those are inferred from the chapter titles.
- Proko form lessons and Peter Han's courses are paywalled; I could see only lesson notes and summaries. Vandruff's teaching comes from his seminar outline plus two students' lecture notes (secondary).
- I could not retrieve the PSVT "Views" subtest format. The "view from a marked corner" description is from my memory and unverified.
- Practice Drawing This does not name its author; it credits other creators for individual warm-ups.

Conflicts between sources
- Shading: Proko teaches form shading as a core skill; Drawabox says shading is not how it makes forms read as 3D.
- Scaffolds: Drawabox says its extra construction lines are not training wheels to be removed; Sorby's concrete-to-abstract sequence suggests fading.
- Axes overlays: adding coordinate axes to rotation items helped at one university and hurt at another (mixed).
- Interactivity: active rotation helps recognition, but Keehner et al. found no advantage once passive viewers see the same good views; Sorby (citing McKim) says physical models beat screens. The takeaway is to choose good views and not to assume free rotation alone teaches.
- Timing: Drawabox discourages deadlines; other practice sites offer timed modes.

Biggest uncertainty
- No source shows that improving at mental-rotation tests improves drawing quality. Sorby's course gains are on spatial tests and retention in engineering, not on drawings. The drawing-teacher exercises (Drawabox, Iten, Vandruff) are experience-based, not tested in controlled studies.
- Several of my numeric thresholds (cut size 15% to 50%, aspect limit 2:1, level boundaries) are design suggestions, not figures from any source.

Confidence
- High that: teachers start with boxes, equilateral forms, additive before subtractive, aligned before free; the 250-box phases are as described; Iten's turnaround and the PSVT:R item ordering are as described.
- Medium that: the aids list (bounding box, centre lines, minor axes, cross contours, extension lines) will help in the app's setting; these are standard teaching tools but unvalidated as toggled overlays.
- Low to medium that: the specific recipe library and difficulty ladder will map well; they combine Drawabox's chest drill, CAD mates and the stimulus families of mental-rotation tests, and need user testing.

---------------------------------------------------------------------------------------------------

## 9. Primary and near-primary sources used (all fetched 2026-10-19 unless noted)

Drawabox
- https://drawabox.com/lesson/0 , /lesson/0/2 , /lesson/0/3
- https://drawabox.com/lesson/1/5 , /lesson/1/7 , /lesson/1/8 , /lesson/1/11 , /lesson/1/rotatedboxes , /lesson/1/organicperspective
- https://drawabox.com/lesson/2/2 , /lesson/2/3 , /lesson/2/8 , /lesson/2/9
- https://drawabox.com/lesson/250boxes , /lesson/250boxes/2 , /lesson/250boxes/3 , /lesson/250boxes/4
- https://drawabox.com/lesson/250cylinders , /lesson/100chests , /lesson/25wheels
- https://drawabox.com/article/h2d
- TA critiques on additive and subtractive construction: https://drawabox.com/community/submission/AIP0FNZA/S393IY9 , https://drawabox.com/community/submission/5G86DFD/3W3MCIM2 , https://drawabox.com/community/submission/J681YW6T/93GFO6GV

Robertson, Vandruff, Proko, Han
- https://dokumen.pub/how-to-draw-drawing-and-sketching-objects-and-environments-from-your-imagination-first-edition-1933492732-9781933492735.html
- https://archive.org/stream/Scott_Robertson_How_To_Draw/Scott_Robertson_How_To_Draw_djvu.txt
- https://www.marshallart.com/HOME/seminars/draftsmanship/ ; http://www.sjhcalvin.com/lecture---demonstration/notes-from-a-lecture-by.html ; https://letslearntogether.neocities.org/art/marshall01
- https://www.proko.com/course-lesson/structure-basics-making-things-look-3d/ ; https://www.proko.com/course-lesson/how-to-draw-cross-contour-on-3d-forms ; https://www.proko.com/course-lesson/shading-light-and-form-basics ; https://proko.com/course-lesson/how-to-mechanize-organic-forms

Rotation exercise sets
- https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups
- https://www.dorian-iten.com/turnaround/

Spatial research and teaching
- https://plato.stanford.edu/archives/Spr2016/entries/mental-imagery/mental-rotation.html (Shepard and Metzler)
- https://peer.asee.org/the-addition-of-coordinate-axes-to-the-purdue-spatial-visualization-test-visualization-of-rotations-a-study-at-two-universities.pdf (PSVT:R format and ordering; axes study)
- https://www.vanderbilt.edu/gised/wp-content/uploads/Sorby_DevelopmentAssessmentCourse-Enhancing3DSpatialVisualizationSkillsEngineering.pdf (Sorby and Baartmans 2000)
- https://edgj.org/index.php/EDGJ/article/view/126 (Sorby 1999)
- https://www.teachengineering.org/activities/cub_spatviz_lesson01_activity1 and /cub_spatviz_lesson01_activity3
- https://pubmed.ncbi.nlm.nih.gov/22663761/ (Uttal 2013) ; https://groups.psych.northwestern.edu/uttal/vittae/documents/Themalleabilityofspatialskillsametaanalysisoftrainingstudies.pdf
- https://www.nmr.mgh.harvard.edu/publications/journal_articles/4115 (Wright 2008)
- https://discovery.dundee.ac.uk/en/publications/spatial-reasoning-with-external-visualizations-what-matters-is-wh/ (Keehner 2008)
- https://www.uwo.ca/bmi/goodalelab/research/past/active_exploration.html
- https://psychology.ecu.edu/wp-content/pv-uploads/sites/216/2019/03/Roediger-Karpicke-2006.pdf ; https://pmc.ncbi.nlm.nih.gov/articles/PMC8049893/

Geometry vocabulary
- https://en.wikipedia.org/wiki/Constructive_solid_geometry ; https://help.solidworks.com/2022/english/SolidWorks/sldworks/c_standard_mates_swassy.htm ; https://pressbooks.pub/solidworks2/chapter/standard-mates ; https://en.wikipedia.org/wiki/Multiview_orthographic_projection

---------------------------------------------------------------------------------------------------

## 10. Support summary by idea

Well supported by a cited source (the exercise, rule or format is described there): A2 (half-sunk cylinder, hinged lid), A7, B2, B5, B7, B8, B10, C1, C2, C3, C4, C5, C7, D1, D2, D3, D4, D5, D7, D8, D9, D10.

Principle supported, application to the app is mine: A1, A3, A4, A8, A10, B1, B3, B6, B11, C6, C8 (silhouette, flat planes), C10, C11, D6, D11, D12, D14, D15, D16.

Mostly my inference: A5 filters, A6 presets, A9 (voxel form type, though the stimulus family is well documented), B4 (lens mapping, though the phasing is documented), B9, C9 UI, C12, C13, D13, and every numeric threshold.
