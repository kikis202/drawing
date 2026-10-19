# Turnaround: landscape of form / rotation / reference practice tools

Research date: 2026-10-19. Prepared for the "Turnaround" drawing-practice web app (random compound 3D forms from cube/sphere/cylinder/cone/pyramid with union and subtraction; evenly spaced reference shots; live rotatable 3D view; tick / capture / save shots).

## 0. Read this first (scope and evidence quality)

- Reddit (r/ArtFundamentals, r/learnart, r/drawing) could NOT be fetched or searched: both the fetch tool and the search tool refuse reddit.com. I did not try to bypass that. Reddit-derived evidence below comes only from (a) drawabox.com's public mirror of r/ArtFundamentals posts, (b) Proko forum, Line of Action forum, Hacker News, itch.io comments, App Store and Play Store reviews. Treat the "what users say" section as a partial sample, not a Reddit survey.
- drawabox.com lesson pages are JavaScript-gated for non-browser clients ("One moment please" interstitial). Drawabox lesson facts here come from search-tool summaries of those pages, flagged "(via search summary)".
- "Form Bundle" matched no specific product, course or site in any search. Closest equivalents are the form-study photo packs listed in table 1A.
- Many App Store / itch.io facts are developer marketing copy. Ratings differ per store and date; where I found conflicting numbers I say so.
- Anything marked "Inference" is my own design reasoning, not something a source states.

## Direct answer (short)

1. The closest existing product to Turnaround is Practice Drawing This (site profiles link to Ayal Pinkus): a free set of roughly 17 interactive 3D form models with a "Change model" randomiser for dimensions, "Puzzle mode" (hide construction lines), a "Verify Your Art" camera/AR comparison, and timed/flashcard/game modes. It is hand-curated (boxes moving along a line, stacked extrusions, primitives rotated), not a union/subtraction compound generator, and has no visible seed, shot-count or lens controls.
2. Everything else is either single-form (Cube Buddy, Box Perspective Helper, 3D Box Rotator, Draw Cube), lighting-only (Light Reference, Shading Reference), photo-based (Line of Action "Basic Shapes & Still Life", Geo Art Ref packs), perspective-model apps behind app stores (Zolly, RefCreate), figure posers (Magic Poser, PoseMy.Art, JustSketchMe, DesignDoll, Handy, Clip Studio Paint), or generic spatial puzzles.
3. The complaint "shapes feel too random" has a clear precedent: users of the other tools ask for simpler forms (2-3 shapes), more shapes beyond the cube, direct control, and repeatability. No tool I found offers constrained/clean procedural compounds with seeds and difficulty tiers. That is the main gap.
4. Strongest ideas (ranked in section 3): rule-based "clean" generator (snapping, axis alignment, ratio set, min feature size, symmetry, tidy cutters); difficulty/recipe/palette controls; seed + shareable link + per-part reroll locks; full shot-set control (count, step, axis, elevation, ortho/perspective, FOV, saved cameras); proper session modes (timer, class-style progression, history); predict-then-reveal rotation mode; drawing overlay and hint ladder for verification.

---

## 1. Tool survey

### 1A. Form, rotation and primitive-practice tools

| Tool | What it does | Notable options / controls | URL |
|---|---|---|---|
| Practice Drawing This: 3D models + Morning Sketches app | Free interactive 3D models of practice forms (cube, sphere, cylinder, cone, pyramid, "Randomly scattered boxes", "Box rotating around a line", "Box swirling around a line", "Stacked extruded shapes", "Boxes on the floor", etc.), tied to 10 rotation warm-ups. Closest competitor to Turnaround. | Viewer tooltips: Rotate view (2 axes), Z-Rotate view, Distance, Zoom, Pan; "Puzzle mode" (hides construction lines so you rebuild the model yourself); "Change model" (randomises dimensions of variable models) plus "Zero Angles"; "Draw Digitally" (canvas with model as reference); "Verify Your Art" (AR comparison of your drawing to the model via device camera); "Save" image; hotkeys. App modes per model: flashcard, timed (600 s), game. Separate "Perspective Game" (move blue dots to make a convincing rotated box). The viewer page text does not mention seed, lighting, wireframe, FOV or timer. Recommends observation first, then imagination. | https://practicedrawingthis.com/3d/ ; https://practicedrawingthis.com/3d/model-randomly-scattered-boxes.html ; https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups ; https://practicedrawingthis.com/cgi-bin/games-landing-page.cgi |
| Generator of Drawing Primitives (HappyMao, itch.io, Windows, Godot) | Spawns 3D primitives (box, cylinder, sphere, pyramid) and 2D shapes into a scene; free camera. Marked "AI Assisted". | Modes 1-5: Camera, Background (colour or image), Generator Point (origin for new shapes), Generator Shapes (enable/disable shape types), Spawner (manual spawn, set spawn point, shuffle). Saves app settings, not individual shapes. No seed mentioned. No comments on page. | https://happymao.itch.io/generator-of-drawing-primitives |
| 3D Box Rotator (Stargazer1o1, itch.io, web + Windows, Godot) | One box you rotate/tilt for gesture and perspective practice. | Drag to rotate, scroll to tilt, WASD rotate, arrows rotate 90 deg, [ ] tilt 90 deg, Space reset, R = random tilt/rotation. Planned (not shipped per page): save/load angles, screenshot, cone/cylinder modes, "body mode" (pelvis box), numeric angle input, multiple cameras, undo. | https://stargazer1o1.itch.io/3d-box-rotator |
| Box Perspective Helper (Halim, itch.io, HTML5/Win/Linux, Godot; page says built with Claude assistance) | Shows a box and compares its edge lengths with a default front-facing cube. | Orthographic vs perspective, adjustable FOV, box rotation. No comments. | https://halim-halim.itch.io/box-perspective-helper |
| Cube Buddy (Ashroo / vital_ash, itch.io + Proko forum) | Browser cube for seeing vanishing points and foreshortening vs focal length. | Orbit with left drag; wheel changes focal length while moving the camera to keep apparent cube size constant (dolly-zoom); on-screen cube controls. Status "On hold". | https://code-flame.itch.io/cube-buddy ; https://proko.com/community/topics/cube-buddy |
| Draw Cube (cdsb, itch.io, HTML5) | Small game to practise drawing rotated cubes "and get feedback"; the author built it because Drawabox "doesn't actually teach you how to rotate cubes". The page does not describe mechanics. | Unknown (no description). | https://cdsb.itch.io/draw-cube ; https://news.ycombinator.com/item?id=42393450 |
| Light Reference (QueueDevelop, itch.io, released 2025-07-01, MIT code) | Browser lighting studio with spheres, cubes, busts. | Light direction/height/distance/beam angle/softness, colour temperature, fill control; presets 3-point, rim, split, silhouette; translate/rotate objects; OBJ import; PNG download; "Copy Link" shares exact setup; mobile gestures. | https://queuedevelop.itch.io/light-reference |
| Shading Reference (skeddles, Aug 2021) | "Simple 3D shapes for artists to study and practice, online." | Presets to start; adjustable angle, lighting, colours; cel-shading mode. Source on GitHub (static site, .glb models). Details thin. | https://shadingreference.com ; https://github.com/skeddles/shading-reference ; https://www.producthunt.com/@skeddles |
| Random Shape Generator (codeitbro) | Draws a random named shape as a wireframe. | Dropdown: all / 14 2D polygons / 11 3D solids; Generate, Copy, SVG export. No seed or compound forms. German page. | https://www.codeitbro.com/de/tool/random-shape-generator |
| Zolly (Proko; iOS, Android, Windows) | Perspective practice with models from primitives to vehicles/buildings. | Full virtual camera control, orthographic through extreme views via dolly-zoom, ground plane and grids, low-poly models, primitives with toggleable edges/guide lines. IAP: XYZ Forms $1.99, packs $4.99, bundle $7.99. App Store 5.0 from 17 ratings. | https://apps.apple.com/us/app/zolly-perspective-models/id6736867463 ; https://proko.com/apps ; https://www.proko.com/course-lesson/zolly-the-ultimate-perspective-tool/comments |
| RefCreate (Lambda Code SL; iPad/iPhone) | 3D constructional-drawing models (Asaro head, Loomis head, skull, form intersections, geometric primitives) plus a 2D canvas. | Swipe-to-snap front/side/top/bottom; solid / wireframe / sectional display; perspective grids, vanishing points, horizon, rotation markers, bounding boxes; PNG export; offline; free + $5.99 Head Construction Pack. Only 1 rating (5.0), which notes the camera shifts when zooming out. | https://apps.apple.com/us/app/refcreate/id6756263277 |
| Line of Action: Basic Shapes & Still Life | Photo-based practice with cubes/spheres/pyramids etc. for "structure and lighting". Announced 2023-07-30; still labelled "(Test feature)" on the site when I fetched it. | Basic shapes only / still life only / both. Single-object category grew from 13 to 114 photos "with a variety of light intensities" (2023-09-14). | https://line-of-action.com/article/a-whole-new-drawing-tool-basic-shapes ; https://line-of-action.com/article/expanding-on-singular-basic-shapes |
| Primitive photo packs: Geo Art Ref Packs 1-3 (65-70 photos, single neutral light, cube/sphere/cone/pyramid/cylinder/prism); Portalsurfer "FSP Primitives" ($3, beauty + deconstruction shot with colour legend for hotspot/bounce/highlight); eavonart free "Basic Drawing Forms Photo Reference Pack" (134 photos; single-source, double, warm/cool lighting) | Static photo references for forms. Also the closest hits for "Form Bundle" (no product by that exact name found). | Fixed lighting setups only (details via search summary; two product pages returned thin or 404 content). | https://geoartref.gumroad.com/l/geo-psp1 ; https://portalsurfer.gumroad.com/l/FSP_Primitives ; https://eavonart.gumroad.com/l/basicformsphotoset |
| 123Draw "Draw CUBES from any angle" | Paid pack with interactive 3D cube references in the browser (via search summary; page body not readable). | Unverified. | https://123draw.gumroad.com/l/cubes |
| Drawabox (course; 250 Box Challenge; Lesson 2/6/7 form intersections) | Paper-based curriculum. The 250 box challenge is meant to build comfort "freely rotating forms in 3D space" and was originally assigned to a student who struggled with rotation, instead of explaining the logic (via search summary of https://drawabox.com/lesson/RWRIQI46). No official 3D rotation tool. | Community utilities exist, e.g. an exercise selector for warm-ups (https://drawabox.com/community/submission/DVEMWPGQ, via search summary; the thread was sceptical that random picking beats deliberate choice). | https://drawabox.com/lesson/1/12 ; https://drawabox.com/r/artfundamentals/post/u8px9u |
| Sketchfab for reference | Free-to-view rotatable 3D models; CTRL+Paint frames it as interactive reference where the camera can move freely; a Substack tutorial pairs it with a quantity-over-quality "draw cubes/cuboids from several angles" assignment. No session, timer, shot or control tooling. | n/a | https://www.ctrlpaint.com/videos/gesture-drawing-with-sketchfab ; https://harshiniwrites.substack.com/p/the-best-art-exercise-ever-form-and |
| Blender (as generator or reference) | Not a practice app, but offers generation ideas: Procedural Shape Builder (random clusters of cubes/cylinders/spheres/cones/planes; per-primitive randomisation of position/rotation/scale, Live Mirror symmetry X/Y/Z, Cluster Radius, Rebuild button; page lists no seed, no presets); Random Shape Gen 2 (free; random line of user-supplied base meshes); Houdini shape generator (random number plus length/scale/rotation variation, non-overlapping); a Gumroad "Perspective drawing practice tool" .blend (EUR 3.99) generating perspective references; a Krita forum reply suggests building cube guides in Blender but calls it heavy. | See left. | https://superhivemarket.com/products/procedural-shape-builder ; https://somartist.gumroad.com/l/mvrfnb ; https://mark-kingsnorth.gumroad.com/l/houdini-shape-generator ; https://robertogatto.gumroad.com/l/perspectivetool ; https://krita-artists.org/t/add-3d-based-perspective-assistant-generator/126724 |

### 1B. Pose and reference practice apps (session and option design)

| Tool | What it does | Notable options / controls | URL |
|---|---|---|---|
| Line of Action | Timed photo reference for figure, animals, faces, hands/feet, scenes; "360 views"; class mode. | Timer incl. custom seconds/minutes; "class mode" (short warm-up poses first, tips and exercise suggestions, subscriber-only, with a 15-min tutorial and badge); limit poses per session; choose a specific model; remembered settings; post-session review; low-timer warning sounds; timer size; filters (clothed/nude, sex, age); themed playlists and orientation filter in progress (Mar 2025); private playlists capped at 100 images; Basic Shapes tool (above). | https://line-of-action.com ; https://line-of-action.com/forums/topic/what-would-you-like-to-see-in-the-next-version-of-line-of-action?page=4 ; https://line-of-action.com/article/in-class-tips-and-a-new-tutorial |
| Quickposes (web + iPad app) | Timed gestures. Web page lists "Challenges" (always 20 images), "Timed practice", "Random gestures" (no limit), Library; desktop app EUR 15. iPad app: 5 s to unlimited durations, cap by pose count, warm-up delay between poses, ordered or random, custom galleries (IAP $5.99), session summary, history, image effects (monochrome, 2-tone, 4-tone, line overlay, blur), Picture-in-Picture, 10x zoom. App Store 4.8 from 93 ratings. A review roundup also lists pose type, sex, clothing and upside-down options for the web version. | See left. | https://quickposes.com ; https://apps.apple.com/app/id1510309896 ; https://conceptartempire.com/gesture-pose-photo-websites/ |
| SketchDaily | Free community timer site: adjustable intervals (about 30 s to 1 h or off), class mode (short to long), filters (gender, clothed/nude, active/passive, angle), body parts/animals/structures/plants, own-photo upload, keyboard flip/mirror shortcuts, dark mode (via search summaries and roundups; the site itself returned only a title). One review: variety shrinks quickly once filtered. | See left. | https://www.sketchdaily.net/ ; https://www.proko.com/community/topics/online-tools-for-practice |
| Proko (Timer, Skelly, Zolly, Value Study) | Timer: web, picks random photos from your packs; you set image count and duration. Skelly: 3D skeleton ($6.99), rotatable camera, editable lighting, saved poses. Turnaround packs (e.g. 736-photo expressive set shot on a rotating platform). | The Timer is described by a community member as "very basic and lacks all the extra options" but praised for library quality. A GestureDrawing! user on the forum disliked that random mode never repeats poses and wanted a review-only-seen mode. | https://proko.com/apps ; https://www.proko.com/tool/700-turnaround-expressive-figure-drawing-reference-pictures ; https://proko.com/community/topics/suggestion-timed-figure-drawing-tool |
| Croquis Cafe | Weekly video life-drawing sessions of 1, 2 and 5 minute poses with an archive. Not an interactive tool (croquiscafe.com fetch failed; source is a blog summary). | Fixed pose lengths per video. | https://linesandcolors.com/?p=6119 |
| PoseMy.Art | Free-to-start browser 3D posing: IK + FK, 6,300+ poses, 5,200+ scenes (vendor numbers; an older blog said 4,800+), mocap library. Premium $15/mo, $150/yr or $99.99 one-time per a third-party roundup. | FOV slider (wide = exaggerated foreshortening, narrow = flatter); numbered "Save Camera Position" with no limit found; directional light (direction, size, intensity) plus "Shadows" slider; import a reference image as a movable 3D plane; OBJ import/export, Depth/Canny/Normals/OpenPose exports; Quick Poses timer (15-180 s, pause, skip, back, random categories). | https://posemy.art/features ; https://posemy.art/blog/features-you-might-be-overlooking/ ; https://posemy.art/blog/quick-sketches-guide-for-artists/ |
| JustSketchMe | 3D mannequin posing in browser/apps. | Hold camera button 1 s to save camera position, rotation and FOV, tap to restore; lock-camera toggle (L); FOV slider; ambient and spot sliders; movable light; hard/soft shadow toggle; floor grid; outline effect; keyboard shortcuts. App Store 3.6/162 vs AppFollow 4.8/12 (conflicting); price listings conflict ($12/mo + $99 one-time vs about $100 one-time + $10/mo). Their "draw poses from every angle" guide suggests a few minutes per angle then re-lighting. | https://justsketch.me/docs/ ; https://justsketch.me/how-to-draw-poses-from-every-angle/ |
| Magic Poser | Mobile/tablet 3D pose app. Free + Pro ($9.99 one-time) + Master ($14.99/mo) per a roundup. | Large library, lighting, props, body morphs. Aggregated reviews: Google Play about 2.1/5 from about 60k vs Justuseapp 3.8 (not comparable). See complaints in section 2. | https://justuseapp.com/en/app/1141755970/magic-poser-art-pose-tool/reviews ; https://artasticfrogstudyspot.substack.com/p/handy-3d-reference-tools-for-artists |
| DesignDoll | Windows 3D sketch doll. | Vendor material (hosted on a spam site, low trust) lists parallel projection, false/real/lens perspective, eye-level display; AlternativeTo 3.3 from 3 reviews; one reviewer calls slider handling "awkward". Wireframe and lighting unverified. | https://alternativeto.net/software/designdoll/about |
| Handy Art Reference Tool (Belief Engine; $1.99 iOS, $4.99 Mac) | Posable hands, feet, skulls, busts. | 3-point lighting rig on 10+ busts; v5 (Oct 2020) PBR, material editor, props, multi-model loading, iCloud light-rig sync; "light rotation can be locked to camera rotation". Complaints: later $1.99 foot pack, crashes, awkward ported UI. | https://apps.apple.com/us/app/handy-art-reference-tool/id1294501485?mt=12 ; https://beliefengine.com/presskit/handy/ |
| Clip Studio Paint 3D | 3D figures and primitives (plane, cube, sphere, prism, pyramid; more divisions approximates cylinder/cone) inside the paint app. | Camera presets, centre object, numeric camera fields, perspective value (1-100, larger = wider angle), parallel projection, lens shift, duplicate/lock/rename saved cameras, touch gestures, perspective ruler follows the camera. | https://help.clip-studio.com/en-us/manual_en/660_3d/Set_camera_angle.htm ; https://tips.clip-studio.com/en-us/articles/7149 ; https://help.clip-studio.com/en-us/manual_en/810_subtools/C.htm |
| DrawGestures (iOS) | Timer app; free: 30 s to 10 min, up to 30 min / 20 images; Pro adds quantity mode, custom intervals, relaxed (no timer), classroom mode, shuffle. Streaks, heatmap, grid overlay, stylus-only mode. App Store 3.9/43. | See left. | https://apps.apple.com/us/app/draw-gestures-figure-drawing/id1552057070 |
| Posemaniacs | Royalty-free 3D pose/hand/figure viewer, "Thirty seconds drawing", Pose of the Day (viewer controls not confirmed). | n/a | https://www.posemaniacs.com/ |
| Gesture Drawing Practice (Android, F-Droid, open source) | Shows each picture for a set time, optional countdown, configurable pauses between images. | See left. | https://cloudflare.f-droid.org/en/packages/v4lpt.vpt.f003.gdp/ |

### 1C. Spatial-reasoning and mental-rotation trainers (not drawing-specific)

| Tool | What it does | Notable options / design | URL |
|---|---|---|---|
| Spatial Vis (eGrove Education / UCSD; based on Sheryl Sorby's curriculum) | The only validated trainer found that combines rotation with sketching: students rotate 3D objects with a finger and sketch isometric/orthographic drawings. | Automatic grading, hints when stuck, peek at solution, unlimited retries; teacher dashboard. 2019 ASEE study (n=131, smartphones): 85% of students scoring 70% or lower on the PSVT:R pre-test moved above 70%; 95% would recommend it; the authors cite "mastery experiences" building self-efficacy. Small screens needed more zoom/pan. The 2013 UCSD article quotes a student: "It's like a video game". | https://today.ucsd.edu/story/ipad_app_teaches_students_key_skill_for_success_in_math_science_engineering ; https://peer.asee.org/freehand-sketching-on-smartphones-for-teaching-spatial-visualization.pdf |
| Rolling Mind (iOS) | 3D maze/puzzle for spatial cognition. | Hints; coin bundles $0.99-$9.99 and $4.99 remove ads; no difficulty modes listed. | https://apps.apple.com/us/app/rolling-mind/id6740234485 |
| rOtal (Android), P.O.V. Spatial Reasoning ($3.99 iPad), 3D Reflection Challenge (100 stages + random mode), Simple Mental Rotation (archived; one review: no instructions), hidden shapes ($0.99; no timer) | Casual puzzles for rotation, perspective, reflection (via search summary of listings). | Levels, timed play, random mode. | https://apps.apple.com/app/id532611500 ; https://apps.apple.com/us/app/simple-mental-rotation/id1614487924?uo=4 |
| Shepard-Metzler / Millisecond mental rotation test | Reference research task: identical vs mirror-image pairs of cube-built shapes. | Reaction time rises roughly linearly with rotation angle (angular disparity) per Shepard & Metzler 1971; feedback during practice trials only. Meta-analysis: spatial training Hedges g about 0.47 over 217 studies, effects durable and transferring to untrained spatial tasks (Uttal et al. 2013). A blog (unverified) says transfer is strongest to similar-looking tasks. | https://en.wikipedia.org/wiki/Mental_rotation ; https://www.millisecond.com/download/library/mentalrotation ; https://pubmed.ncbi.nlm.nih.gov/22663761/ |

---

## 2. Recurring user wants and complaints (with links)

"Direct" = observed on a primary page; "indirect" = via search summary or aggregator.

### 2.1 Rotation is the hard part, and tools to drill it are thin
- A Hacker News commenter says Drawabox "doesn't actually teach you how to rotate cubes. That was pretty frustrating to me," and built Draw Cube to "practice and get feedback" (direct). https://news.ycombinator.com/item?id=42393450
- In the mirrored r/ArtFundamentals thread, a poster cannot rotate boxes in the Lesson 1 organic perspective exercise; a Drawabox admin replies the exercise is meant to be hard and that the box challenge handles it later. Commenter tips: rotating changes at least two (usually all three) vanishing points while moving does not; rotate a real cube or paper model; think of the lines, not the object (direct). https://drawabox.com/r/artfundamentals/post/u8px9u
- Proko forum thread on improving form turning: Drawabox is helpful but "grindy"; some exercises feel like "drilling" (direct). https://www.proko.com/community/topics/how-do-i-improve-my-ability-to-turn-form
- A Proko forum user says Cube Buddy helped him draw boxes for a Drawabox exercise (direct). https://proko.com/community/topics/cube-buddy
- Implication: a rotation drill with a checking view is wanted, and "feedback" is the commonly named missing piece.

### 2.2 Single-form tools: users immediately ask for more forms and direct control
- Cube Buddy commenter wants a cylinder or circles inside the box (with axes) and "a more direct way to control the rate of foreshortening"; calls the tool "a godsend". The author says cylinder would be easy but is busy; status is "On hold" (direct). https://code-flame.itch.io/cube-buddy
- 3D Box Rotator's own planned list includes cone/cylinder modes, save/load angles, numeric angle input, multiple cameras (direct, but unshipped). https://stargazer1o1.itch.io/3d-box-rotator
- Zolly reviewers want multiple models in one scene, object duplication and rotation, and closer zoom (objects get very small at high Zolly settings); one reports half the menu hidden on iPad (direct, App Store). https://apps.apple.com/us/app/zolly-perspective-models/id6736867463 . Lesson-page comments ask for more packs and report about 80% CPU use on an M2 MacBook: https://www.proko.com/course-lesson/zolly-the-ultimate-perspective-tool/comments
- RefCreate's single review praises practising shapes from multiple angles but says zooming out shifts the camera position (direct, n=1). https://apps.apple.com/us/app/refcreate/id6756263277

### 2.3 Simple, readable subjects with visible light; control over lighting
- Line of Action Basic Shapes thread: users asked for simple images with only two or three shapes; clearly visible shadows; colored lights, extreme backlighting, high contrast; a grayscale toggle to compare values; perspective and foreshortening practice; a mode for single shapes or chosen shape types; skulls with rotations. The admin noted single shapes are "much faster and easier to photograph" (direct). https://line-of-action.com/article/a-whole-new-drawing-tool-basic-shapes
- A commenter on the follow-up update wanted to return to basic shapes "to learn how to make them more interesting" (direct). https://line-of-action.com/article/expanding-on-singular-basic-shapes
- Handy's lighting (3-point rig; light lockable to camera rotation) is a headline feature in vendor and press material (vendor). https://beliefengine.com/presskit/handy/

### 2.4 Session control: equal-time classes, caps, repeat/review, challenges, remembered settings
- Line of Action forum requests: classes with equal time per image (e.g. 30 min of 2-min poses), foreshortening-only filters, image tags, enlargeable thumbnails in review (zoomed review images look blurry), challenges such as non-dominant hand or single unbroken line (admin: will "start collecting challenges"), unlimited private uploads for Discord study groups (cap is 100). Already shipped per the admin: auto-pause on load, choose a model, limit poses per session, custom intervals, low-timer warning sounds, timer size, remembered settings, better post-session review (direct). https://line-of-action.com/forums/topic/what-would-you-like-to-see-in-the-next-version-of-line-of-action?page=4
- Proko forum: a user dislikes that a random mode "never repeats a pose" and wants a review option showing only already-seen poses because familiarity builds confidence (direct). https://proko.com/community/topics/suggestion-timed-figure-drawing-tool
- In a Line of Action class-mode first-session post, the poster paused the timer and a 30-minute session became about 90; commenters told them not to pause short poses (direct). https://www.line-of-action.com/forums/topic/my-first-class-session?page=1 . Lesson: if pausing is possible, expect it to be used; make it explicit and record it.
- A SketchDaily review: "not a lot of pose variety, especially if you filter your options" (indirect, via search summary). Filtering fights variety.
- Drawabox community thread about random warm-up pickers: some replies argued random picking is less valuable than deliberately choosing weaker exercises (indirect). https://drawabox.com/community/submission/DVEMWPGQ

### 2.5 Camera / lens: FOV and orthographic-to-extreme are valued; confusing zoom is a recurrent bug
- PoseMy.Art, JustSketchMe and Clip Studio Paint all expose FOV / perspective value and saved cameras; CSP additionally has parallel projection and lens shift (direct docs).
- Cube Buddy's constant-apparent-size focal-length wheel is the clearest "teaching" lens control (direct). Zolly lesson comments mention a toy plane model being useful for understanding lens distortion.
- Zoom-related complaints: RefCreate (camera shift), Zolly (objects tiny at high dolly-zoom), Magic Poser (rotation controls "funky", models hard to control) (direct reviews).

### 2.6 Paywalls and plan churn in figure apps
- Magic Poser: most common complaint is features moved behind paywalls after an update; female model locked; coin system disliked; price "costs almost as much as Photoshop or Netflix per month" (direct, aggregated reviews). https://justuseapp.com/en/app/1141755970/magic-poser-art-pose-tool/reviews
- Handy: unexpected $1.99 charge for feet (direct). PoseMy.Art: import/export and bigger libraries need premium (roundup). JustSketchMe: more models/poses need Pro (roundup). https://artasticfrogstudyspot.substack.com/p/handy-3d-reference-tools-for-artists
- Implication: a free, no-account, offline-capable web app is itself a differentiator.

### 2.7 Verification and feedback loop
- Practice Drawing This offers "Verify Your Art" (AR compare), "Puzzle mode" and "Draw Digitally" inside the viewer (direct UI tooltips). Draw Cube promises "feedback". Spatial Vis offers auto-grading, hints, peek and retry, which the UCSD team compares to "having a private tutor sitting right next to you" (direct). The 2019 study ties mastery experiences to self-efficacy (direct).
- Drawabox tutors advise checking convergence without tools by placing dots then ghosting lines to the vanishing points (via search summary of https://drawabox.com/lesson/1/12/about), i.e. verification is currently manual.

### 2.8 Sharing and groups
- Study groups practise together over Discord (LoA thread above). Light Reference's "Copy Link" shares an exact setup (direct). No form tool I found offers "everyone draws the same form" via a link.

---

## 3. Feature ideas for Turnaround, ranked by likely value

Ranking weighs fit with the stated problems ("too random", "perfect additions", "more options", "better control over shots"), how much evidence supports demand, and how few competitors already offer the feature. "Inference" marks my own reasoning about mechanics; the "Why" lines cite what supports demand.

### Tier 1 (core: fix the "too random" problem)

1. Rule-based "clean compound" generator instead of unconstrained random placement. (Mechanics are inference; demand is evidenced.)
   - Attach each new part to a face or axis of an existing part (face-centre or grid-snapped), not at arbitrary 3D positions; keep parts coaxial or axis-aligned by default (rotations only in multiples of 90 deg, optionally 45 deg in a harder tier).
   - Draw sizes from a small ratio set (e.g. 1, 1.5, 2) so sizes read as intentional; enforce minimum feature size and wall thickness; avoid tangent contacts and coplanar faces that read as ambiguous; guarantee one connected solid; reject forms where a part is hidden from every shot.
   - Limit subtractions to tidy cutters: through-bore along a part's axis, corner/edge notch, hemispherical dent, slot, centred or aligned to the host.
   - Optional mirror/radial symmetry (Procedural Shape Builder offers "Live Mirror" X/Y/Z; the Houdini generator avoids overlaps).
   - Why: no tool found does this. Others use hand-curated models (Practice Drawing This), free random scatter (Generator of Drawing Primitives, Procedural Shape Builder, Random Shape Gen 2) or photos. Users in the LoA thread ask for "only two or three shapes" and more "interesting" basic forms; Drawabox's Lesson 6 critique notes forms must align logically with the object (via search summary). Constraints give variety without the random feel.

2. Difficulty and "recipe" controls: part count, shape palette, orientation freedom, subtraction on/off, symmetry on/off, plus named families.
   - Families modelled on Practice Drawing This's curated sets: stacks, "boxes moving along a line", "forms placed against each other", "stacked extrusions", box/cylinder rotating around an axis; add plinth-and-dome, notched block, cross-bored cylinder.
   - Palette checkboxes (Generator of Drawing Primitives lets users enable/disable shape types) and a complexity slider (1-6 parts). A ladder mirrors Practice Drawing This's advice: rotated square before box, rotated circle before cylinder.
   - Why: every tool covering multiple forms exposes some palette or family selection; users ask for chosen shape types (LoA thread) and for more than a cube (Cube Buddy comments).

3. Seeds, shareable links and per-part locks. (Mechanics are inference; demand evidenced.)
   - Encode seed + options + shot settings in the URL (precedent: Light Reference "Copy Link"). Show the seed; allow "reroll proportions only", "reroll one part", "lock structure, change camera".
   - A "daily form" or study-group seed so people on Discord draw the same form (an LoA user asked for group workflows; no form tool offers this).
   - Why: removes "random with no way back", supports revisiting a form later (cf. the Proko forum user wanting to revisit seen items), and helps bug reports. Blender's Procedural Shape Builder lists no seed, only a Rebuild button, so even generators in this space lag here.

4. Shot-set control (the user explicitly asked for better control over shots).
   - Count (e.g. 4/6/8/12/16/24) or step angle; rotation axis (vertical turntable, tumble about an arbitrary axis, orbit rings at several elevations); elevation presets (0, 15, 30, 45, top-down, below); start-angle offset or randomised start; orthographic vs perspective; FOV/lens presets (CSP-style value or mm-style labels); canonical front/side/top/back snap views (RefCreate swipe-to-snap).
   - Per shot: tick, skip, replace with a random alternative, label with angle, capture from live view (already), lock camera (JustSketchMe), numeric angle entry, save/restore camera (JustSketchMe; CSP duplicate/lock cameras; PoseMy.Art numbered saves; 3D Box Rotator planned).
   - Even-angle spacing mirrors turnaround photo sets (Proko's rotating-platform pack; LoA "360 views").
   - Why: camera and lens options are the most consistently documented shared feature across pose apps and appear in user wishes (Cube Buddy foreshortening control; 3D Box Rotator planned numeric entry; Zolly zoom). Avoid the recurring zoom bug class (RefCreate, Zolly): keep apparent subject size constant when changing FOV, as Cube Buddy does, and keep the orbit centred on the form.

5. Real session modes. (Pattern reuse from reference timers.)
   - Per-shot timer with presets and custom seconds; optional warm-up delay (Quick Poses); auto-advance; pause/skip/back (PoseMy.Art Quick Poses); relaxed no-timer mode (DrawGestures); class-style progression (short shots first, then longer: LoA/SketchDaily) and equal-time class (LoA request); low-time warning sound; remembered settings; session summary and history (Quick Poses, DrawGestures streaks). Record whether the user paused, since LoA beginners routinely did.
   - Why: these are the most requested items in the reference-app threads and cheap to build. Combined with seeds they let a user repeat a form tomorrow.

### Tier 2 (differentiators: feedback and rotation reasoning)

6. "Predict, then reveal" rotation mode. (Inference; supported by spatial-training evidence.)
   - Show shot A, state a rotation ("90 deg about the vertical axis", "tilt up 30 deg"), the user draws the predicted view, then reveals the real shot and ticks hit/miss. Difficulty scales with rotation angle step (reaction time rises with angular disparity per Shepard-Metzler) and part count.
   - Why: rotation is the cited pain point (HN comment; Drawabox admin) and existing drills are paper-only. Spatial Vis shows sketching plus immediate feedback works (85% of at-risk students moved out of the low band in the 2019 study). Near-transfer caveat: gains are strongest on similar tasks, so keep it the same task as real drawing, not a quiz.

7. Drawing overlay and hint ladder for verification.
   - Photograph or upload the drawing; align it to the matching live camera; opacity slider and wire/silhouette overlay (PoseMy.Art imports a reference image as a 3D plane; Practice Drawing This has AR "Verify Your Art").
   - Hint ladder (from Spatial Vis hints/peek/retry): 1) axes and bounding box, 2) centrelines and cross-section ellipses, 3) hidden edges, 4) full wireframe. Hide construction lines by default ("Puzzle mode" equivalent).
   - Why: checking is manual today; verification features are the standout in the tools that have them (Practice Drawing This, Spatial Vis).

8. Lighting that teaches form. (Mix of evidence and inference.)
   - Presets: single key, rim, split, silhouette (Light Reference); control direction, height, softness; flat/unlit + outline mode for construction-only passes; grayscale toggle (LoA request); clearly visible cast shadow. Offer light fixed in world space vs attached to the camera (Handy locks light rotation to camera). In a turnaround, a world-fixed light changes shading as the form rotates; a camera-fixed light keeps shading constant. Both are useful and neither is exposed elsewhere.
   - Why: lighting is a top request in the LoA Basic Shapes thread and a headline feature of Handy; Practice Drawing This's viewer, Cube Buddy and Box Perspective Helper expose none.

9. Construction aids as toggles.
   - Axis lines through each part, ellipse/centreline guides on cylinders and cones, bounding box, horizon/vanishing-point overlay on perspective shots (Cube Buddy and RefCreate show VP and bounding boxes), x-ray/transparent view (RefCreate wireframe/sectional; Zolly toggles primitive edges), colour-coded cut faces for subtractions to teach intersection edges (Drawabox Lesson 6/7 critiques stress form intersections, via search summary).
   - Why: low effort in a WebGL renderer; the other web tools show a plain solid.

### Tier 3 (nice-to-have)

10. Save and export: store shot sets with seed, camera and the user's drawing photos; export contact sheet (PNG/PDF); printable sheet for paper work; revisit queue ("draw this form again in 3 days"), echoing Practice Drawing This's memory-drawing game and the Proko forum wish to revisit seen items.
11. Challenge modifiers: non-dominant hand, single continuous line, no eraser, flip/upside-down (Quickposes web option; LoA wish), hide reference after N seconds (draw from memory).
12. Tumble/rotation-sequence exercises: a single form rotated about one fixed axis in even steps ("box rotating around a line" in Practice Drawing This; Proko's "Tumbling Cubes" critique is the paper analogue).
13. Neutral material by default (grey; optional per-part colour to help decomposition). Wikipedia's mental-rotation article reports poor rotators were affected by colour and good rotators were not.
14. Mobile/tablet and offline: Spatial Vis found small screens need zoom/pan; Light Reference adapts with gestures; RefCreate works offline. Make the live view and drawing area usable on tablet; consider a PWA.
15. Optional "which view matches?" micro-quiz (MRT-style) as a warm-up. Lowest priority: near-transfer limits and it is off-core for a drawing app.

### Gaps summary (what a new web app can own)
- Clean, parameterised compound forms with seeds and difficulty tiers (nobody has it).
- Multi-angle shot set with user-defined spacing/axis/elevation plus a live checking view (Practice Drawing This has a viewer and free rotation; the single-box tools have no shot sets).
- Free, no-account, shareable (URL) sessions for study groups (figure apps trend to paywalls; LoA caps private uploads at 100).
- Verification: overlay plus hint ladder in the same screen as the reference.
- Lighting and lens control tuned for form reading, not figure posing.

---

## 4. Caveats, conflicts, confidence

- Reddit inaccessible (section 0). The Drawabox mirror of r/ArtFundamentals posts worked for three posts (u8px9u, 4bzc2r, ckpim1); Drawabox lesson and community-submission pages returned the interstitial.
- Conflicts: App Store vs Play ratings differ widely (Magic Poser, JustSketchMe); JustSketchMe and PoseMy.Art price listings conflict across sources; PoseMy.Art library counts differ between its homepage (6,300+ poses, 5,200+ scenes) and an older blog (4,800+ scenes). I did not test any app myself.
- Practice Drawing This viewer details come from a fetch of one model page (tooltip labels); I did not verify that "Verify Your Art" works as an AR overlay or that "Change model" covers every model.
- DesignDoll and SketchDaily facts rest on aggregator or roundup text; their official pages were unreadable.
- Line of Action's Basic Shapes tool was still labelled "(Test feature)" when I fetched the homepage; the posts date from 2023, so photo counts may have changed.
- Dates: most tool pages lack release dates. HN comment 2024-12-11; Light Reference 2025-07-01; Zolly Android Jan 2025; Cube Buddy forum post roughly three years old; RefCreate listing shows version dates without a year (probably early 2026 judging by the listing ID, which is an inference).
- Confidence: high that no existing free web tool combines clean procedural compounds + seeds + shot-set control + live check (over 100 searches and fetches; I may have missed obscure tools or very recent launches). Medium on the user-sentiment themes (small sample, mostly forums and store reviews, no Reddit). Medium-low on the effectiveness of "predict then reveal" for drawing (supported by spatial-training literature and Spatial Vis, but not tested in drawing apps).
- Not verified at all: how any generation constraint in section 3 feels in practice; test a handful of seeds per tier before locking rules.

## Source list (pages fetched or surfaced by search)

- https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=rotating-primitive-forms-warm-ups
- https://practicedrawingthis.com/cgi-bin/carousel.cgi?section=online-tools&episode=2d-to-3d-warm-ups
- https://practicedrawingthis.com/3d/model-randomly-scattered-boxes.html
- https://practicedrawingthis.com/cgi-bin/games-landing-page.cgi
- https://happymao.itch.io/generator-of-drawing-primitives
- https://stargazer1o1.itch.io/3d-box-rotator
- https://halim-halim.itch.io/box-perspective-helper
- https://code-flame.itch.io/cube-buddy ; https://proko.com/community/topics/cube-buddy
- https://cdsb.itch.io/draw-cube ; https://news.ycombinator.com/item?id=42393450
- https://queuedevelop.itch.io/light-reference
- https://shadingreference.com ; https://www.producthunt.com/@skeddles
- https://www.codeitbro.com/de/tool/random-shape-generator
- https://superhivemarket.com/products/procedural-shape-builder
- https://apps.apple.com/us/app/zolly-perspective-models/id6736867463 ; https://proko.com/apps ; https://www.proko.com/course-lesson/zolly-the-ultimate-perspective-tool/comments
- https://apps.apple.com/us/app/refcreate/id6756263277
- https://line-of-action.com/article/a-whole-new-drawing-tool-basic-shapes ; https://line-of-action.com/article/expanding-on-singular-basic-shapes ; https://line-of-action.com/forums/topic/what-would-you-like-to-see-in-the-next-version-of-line-of-action?page=4 ; https://line-of-action.com/article/in-class-tips-and-a-new-tutorial ; https://www.line-of-action.com/forums/topic/my-first-class-session?page=1
- https://quickposes.com ; https://apps.apple.com/app/id1510309896 ; https://apps.apple.com/us/app/draw-gestures-figure-drawing/id1552057070 ; https://conceptartempire.com/gesture-pose-photo-websites/
- https://www.proko.com/community/topics/online-tools-for-practice ; https://proko.com/community/topics/suggestion-timed-figure-drawing-tool ; https://www.proko.com/community/topics/how-do-i-improve-my-ability-to-turn-form ; https://www.proko.com/tool/700-turnaround-expressive-figure-drawing-reference-pictures
- https://posemy.art/features ; https://posemy.art/blog/features-you-might-be-overlooking/ ; https://posemy.art/blog/quick-sketches-guide-for-artists/
- https://justsketch.me/docs/ ; https://justsketch.me/how-to-draw-poses-from-every-angle/
- https://justuseapp.com/en/app/1141755970/magic-poser-art-pose-tool/reviews ; https://artasticfrogstudyspot.substack.com/p/handy-3d-reference-tools-for-artists
- https://apps.apple.com/us/app/handy-art-reference-tool/id1294501485?mt=12 ; https://beliefengine.com/presskit/handy/
- https://help.clip-studio.com/en-us/manual_en/660_3d/Set_camera_angle.htm ; https://tips.clip-studio.com/en-us/articles/7149
- https://drawabox.com/r/artfundamentals/post/u8px9u ; https://drawabox.com/r/artfundamentals/post/4bzc2r ; https://drawabox.com/r/artfundamentals/post/ckpim1
- https://today.ucsd.edu/story/ipad_app_teaches_students_key_skill_for_success_in_math_science_engineering ; https://peer.asee.org/freehand-sketching-on-smartphones-for-teaching-spatial-visualization.pdf
- https://en.wikipedia.org/wiki/Mental_rotation ; https://www.millisecond.com/download/library/mentalrotation ; https://pubmed.ncbi.nlm.nih.gov/22663761/
- https://www.ctrlpaint.com/videos/gesture-drawing-with-sketchfab ; https://harshiniwrites.substack.com/p/the-best-art-exercise-ever-form-and
