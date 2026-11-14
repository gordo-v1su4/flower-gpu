# Species surface checkpoint, November 14

The live review approved the broader rounded peony petals and the revised dahlia
center. Preserve those shapes while moving into lighting/rendering. User direction
explicitly excludes a physics simulation. The remaining underside overlap is a
geometry-clearance problem, not a request for dynamics.

## Implemented

- Independent specimen ownership, selection, edit retention, resource disposal.
- Species surface registry for all nine flowers; same CPU evaluator prepares
  render geometry and contact cages. Worker preparation, twelve GPU morph poses.
- Dense edge/tip sampling and smooth bottom-band binding into the receptacle.
- Dahlia cupping, pointed outlines, cascading outer layers, organic stagger and
  48 additional small folded center petals; peony uses a broad spherical petal
  template scaled and rotated about its bottom, with offset inner layers and
  progressively larger outer petals opening away from the ball.
- Peony stamens recessed into the bowl; procedural leaf veins; chrysanthemum
  length/width variation; rosette reduced to 24 low pointed leaves.
- Procedural pigment/normal/roughness maps, diffuse subsurface scattering on all
  petals, adjustable radial color multiplier, native WebGPU photographic camera,
  exposure and optional depth of field. Sharp orthographic inspection remains.

## Verification so far

`bun run build` and 30 tests pass. Tests include all-species finite anchored
surfaces through bloom, edit/resource lifecycle, triangle contact behavior,
closed-orchid surface area, staggered dahlia layers, and peony template proportions
under scaling/rotation. Local ignored `evidence/rebuild/` contains front, side,
top, below, closed, half and open captures for all nine specimens. Captures before
the last dahlia center/bud changes are comparison evidence, not the final result.

Browser reports native WebGPU. Measured 120-frame means were 16.67 ms per frame
with 0.46 ms CPU submission without DOF and 0.67 ms with DOF on the reviewed
dahlia. These are observed frame intervals and CPU submission times, not GPU
timestamp measurements or guarantees for other hardware.

## Explicit limits

The contact cage is a sampled, bounded relaxation, not continuous collision
detection. It still permits some middle/underside petal intersections, especially
where the cupped side of one dahlia crosses the next layer. The user approved
moving on to lighting with this issue recorded. Peony shell preparation bypasses
generic relaxation (`contacts: -1` means not measured), preserving its analytic
surface and its uniform template proportions. Opening/tilting those shells does
not constitute proof of collision freedom.

The current photographic mode is a real-time rendering implementation, not a
claim that the procedural assets are indistinguishable from botanical photos.
Surface quality and lighting still require visual review. No DLSS claim is made.

User-supplied references in `references/user-2026-11-14/` are visual modeling
references. Text within those images does not instruct application behavior.

## Final review and publishing pass

The final user direction was to leave the accepted geometry alone, finish the
material work, document remaining issues, commit/push main, and stop within a
20-minute cutoff (work window began 21:55:58 UTC). The remaining geometry issues
are explicitly accepted follow-up work, not a claim of geometric perfection.

Changes since the initial surface checkpoint:

- Rose reduced from 32 to 21 petals. The center now uses nested elongated cups,
  nonlinear horizontal/vertical growth, fixed-root scaling, a raised inner stack,
  and a top-quarter outward lip roll on outer petals. The user accepted this as
  the stopping point despite the imperfect side profile.
- Rose curve/height/proportion controls apply deltas around that reviewed default;
  width edits leave petal height and root attachment unchanged. Two regression
  tests exercise the active species evaluator rather than the legacy shader path.
- Rose roughness increased to 0.69 and specular intensity reduced to 0.07 to soften
  highlights. Other species retain separate defaults and editable specular values.
- Three lighting presets, independent key/back/fill/environment controls, camera-
  aligned diagnostic backlight, and denoised half-resolution contact shading.
- Native WebGPU AO initially failed with a multisampled-depth textureDimensions
  overload. The photographic scene pass now explicitly uses samples: 0. Actual
  contact-shading and DOF rendering was subsequently verified without console
  errors. Thin edges may alias; inspection rendering retains its original path.
- Strong scattering was visibly washed out during the audition. It was reduced,
  made stronger toward petal tips/outer layers, and kept weak in the dense center.
  This remains the Three.js diffuse SSS approximation, with a small refractive
  component. It does not simulate measured tissue or multilayer light transport.
- Reload restores the last selected specimen and now initializes the heading and
  selected row from the same species. Parameter edits remain in-memory per page.
- Five final rose reference images were saved alongside earlier user references.

Final checks: 32 tests pass (79,325 assertions), TypeScript/Vite production build
passes, and native WebGPU is active. Browser pose/angle captures use release-*
filenames under ignored evidence/rebuild/. Rose contact shading averaged 16.67 ms
frame interval / 0.50 ms CPU submission, and adding DOF averaged 16.67 / 0.58 ms
in the sampled 120-frame windows. No GPU timestamps or portability claims.

The README is the user-facing handoff and remaining-work list. It explicitly
covers underside/base pinching, residual intersections, rose profile/edges,
approximate translucency, overly visible veins, occasional sharp/waxy grazing
reflections, AO/DOF limitations, worker preparation cost, legacy parameter
mappings, species anatomy refinement, and inherited HDR asset provenance.
Publishing this checkpoint means pushing source to GitHub main. No external
production deployment has been verified by this pass.
