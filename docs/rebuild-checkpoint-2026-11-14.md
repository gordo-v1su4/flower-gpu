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
