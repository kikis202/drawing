# Turnaround backlog

Ideas agreed as "later", plus research-backed ideas not yet scheduled. The current design is in `docs/superpowers/specs/`. The research behind most of these ideas is in `docs/research/`:
- `2026-10-19-drawing-pedagogy.md`: what drawing teachers and spatial-training research recommend. Each idea there has a source and a tag: [S] the source describes it, [P] the source supports the principle and the application is ours, [I] our inference.
- `2026-10-19-existing-tools.md`: a survey of existing tools, user wants and complaints, and ranked feature ideas.

## Agreed for later (shown as "Later" in the controls mockup, 2026-10-19)

| Idea | What it is | Research ref |
|---|---|---|
| Vanishing points and edge extensions | Mark each box's three vanishing points, or extend reference edges back to them. This is the 250 Box Challenge scaffold: points marked first, then none, then a line-extension check after each page. | pedagogy C5 |
| Ellipse minor axes | Draw the minor-axis line through every visible circular edge, optionally with its degree. This checks cylinder alignment. | pedagogy C3 |
| Cross-section rings | Contour rings around cylinders, cones and spheres, and optional slicing planes through the whole form. | pedagogy C4, D5 |
| Rotation quizzes | Rotation prediction in the PSVT:R style: here is a stated rotation, now pick the result. Also a matching quiz with mirror-image decoys. Generate our own items, never copy test items. | pedagogy D4, B10, D16 |
| Warm-up sessions and counted sets | A 10–15 minute warm-up of 2–3 random drills, then sets of 5–6 forms with a check pass between sets. | pedagogy D1, D2, D14 |
| Timers | Optional and off by default. Show elapsed time quietly rather than a countdown, because Drawabox discourages deadlines. | pedagogy D13 |
| Shareable seed links | Encode the seed and settings in the URL so a study group can draw the same form ("daily form"). | tools #3 |

## Other research-backed ideas, not yet scheduled

- **Seam and intersection highlighter:** colour the curves where pieces meet, and the rims of cuts (pedagogy C9).
- **Answer overlay:** photograph or draw your attempt, then overlay the exact projected linework at the same view with an opacity slider (pedagogy C12; tools "Verify Your Art" precedent).
- **Turnaround mode:** show the plan map plus 1–2 views, draw a named target angle, reveal it, then rotate to compare (pedagogy D3). "Hide one shot" is the first step towards this.
- **Memory / blind mode:** show the form for N seconds, hide it, draw from memory, then reveal (pedagogy D6).
- **Cube-stack (voxel) forms with coded plans:** the stimulus family of the spatial-visualisation literature (pedagogy A9, D7).
- **Adaptive difficulty:** raise the level, angle step or shot count after consistent self-rated passes (pedagogy D12).
- **Self-check tags:** after revealing, tick what went wrong: convergence, ellipse alignment, proportions, intersections or hidden edges (pedagogy D11).
- **Flat planes of light:** three-value shading by plane, plus an optional cast shadow (pedagogy C8, C6).
- **Line-weight hierarchy:** a heavier silhouette, ghost-weight hidden edges, and heavier lines where edges overlap (pedagogy C7).
- **Snap-rotate 90° buttons with a stated axis, for novices** (pedagogy D15).
- **Per-part reroll locks** (tools #3).
- **Lighting presets,** with the light fixed to the world or to the camera (tools #8).
- **Facing cue:** tint faces that point toward the camera, or put a pole ring on spheres (pedagogy C10, A8).
- **Axis gizmo,** off by default, because the evidence is mixed (pedagogy C11).

## Known quality issues to revisit

These are tracked in the build ledger and flagged for the final review:
- Some boolean seams in Freeform forms give short crease lines that stop mid-face, and diagonal shading streaks on flat faces.
- The seed sweep's settings are correlated, so some hard combinations are never tested.
