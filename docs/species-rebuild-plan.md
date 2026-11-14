# Independent species geometry and photographic rendering

## User direction and saved baseline

Approved November 14, 2026 for execution in a new Codex chat. Baseline `87ab303` on main saves the current geometry editors, reversible bloom, reference studies, and tests. Preserve that checkpoint and the approved rose curve and leaves as comparison targets.

Each specimen is an independent flower. It does not need to morph into another species. Removing cross-species morphing removes a compatibility constraint; it does not by itself solve current petal intersections or profiles. Blooming within the same species remains required.

The user also requests optional realistic textures and a photographic / DSLR-style look. This is part of the rebuild, with a clear inspection mode retained for geometry review.

## Architecture

Retain Three.js WebGPURenderer initially. Keep renderer, flower geometry, bloom evaluation, and presentation separate. TSL compiles to WGSL on WebGPU; native WGSL via `wgslFn` is available for kernels where explicit code improves control or measurement. Do not rewrite equivalent formulas solely to change language. Verify the active backend and capture actual performance before claiming a renderer limitation.

A species registry creates independent specimens with their own topology, petal families, anatomy, attachment layout, editable parameters, and bloom evaluator. Shared utilities are optional building blocks, not a requirement for matching vertex counts, petal counts, or geometry across species. Two dahlia cultivars may share a family implementation when their shapes support it.

Each specimen owns resources with explicit update/dispose behavior. Preserve edits per specimen. Use a direct switch first; an optional brief fade may be added later without interpolating species parameters or vertices. Rapid selection must not leave stale geometry, resources, or controls.

Represent petals as editable two-dimensional surfaces with independent outline, longitudinal curve, transverse cup, tip/edge curl, and twist. Prototype a spline or Bezier surface implementation and validate it against the rose before committing every species to one surface representation. Species may use multiple patches, separate petal families, or authored geometry where appropriate.

Place petals on an explicit three-dimensional receptacle (the attachment surface), with independent radius, height, orientation, overlap order, and layer density. Use one inspectable surface evaluator for geometry preparation and collision checks; if GPU evaluation is introduced, verify agreement against the CPU reference.

Evaluate deterministic closed, intermediate, and open states. Detect and reduce intersections using spatially accelerated surface checks and constrained adjustments that preserve roots, silhouette, and intended overlap. Validate between prepared poses too: clean endpoints alone do not guarantee a clean animation. Move heavier preparation into a browser worker if measurement shows it blocks editing. GPU playback can use coefficients, pose buffers, or morph targets within a species. No remote compute service is initially required.

## Execution sequence

1. Inspect the current checkout and AGENTS instructions. Use Graft first. Read this plan, the existing geometry plan, ADR, and saved references. Run baseline build/tests and inspect the live browser before changes. Record known issues without treating them as new regressions.
2. Remove cross-species setting/geometry interpolation in `src/gui.ts`. Introduce specimen ownership and independent selection. Keep camera, inspection views, controls, and saved shape edits working. Verify every selection and rapid repeated switching.
3. Build one complete rose through the new surface, attachment, and bloom pipeline. Retain the approved curvature and leaves, broaden the lower bowl rather than pinching it, and make the closed bud substantial. Closing folds first, then reduces the head to approximately half size around its bottom/base pivot; opening reverses this order. Stem and leaves remain anchored. Keep controls understandable and independent.
4. Establish collision diagnostics and shape inspection on the rose, then a dahlia with cupped layered petals. Compare front, side, top, and low upward views against supplied references. Use these two different forms to prove the architecture before expanding it.
5. Migrate all nine specimens: Copper Rose, Velvet Dahlia, Sunburst Dahlia, Chrysanthemum, Soft Peony, Wild Orchid, Stargazer Lily, Passion Flower, and Stone Rosette. Chrysanthemum needs inward-curled inner petals and longer outward/recurved outer petals; peony needs full rounded layering; orchid needs distinct tepal families and lip/column plus credible closure; lily needs six distinct tepals; passionflower corona and central anatomy must retract coherently; green rosette needs more height. Do not force these into a common rose or dahlia shape.
6. Add realistic material auditions after geometry is coherent. Use suitable licensed textures or generated/procedural textures for species-specific petal color, veins, micro-normal/roughness, front/back differences, leaf detail, and thin-petal light transmission. Track sources/licenses for imported assets. Preserve the current stylized appearance as an option. Avoid making petals look like shiny plastic or adding high-frequency noise as a substitute for structure.
7. Add a photographic / DSLR-style mode with soft studio or environment lighting, adjustable exposure, restrained tone/color treatment, and optional subtle grain/vignette. Provide optional depth of field using a compatible perspective view and a clear focal target; preserve sharp orthographic inspection views. Treat this as a combination of materials, lighting, and camera presentation rather than promising one filter can create realism. Measure post-processing cost and offer a lower-cost setting when needed.
8. Verify all specimens, complete bloom cycles, edits, switching, disposal, active WebGPU backend, and frame behavior in the actual browser. Run meaningful math/behavior tests and `bun run build`. Save comparison screenshots and a concise record of remaining visual issues. Geometry and rendering acceptance require inspected images, not only passing tests. Commit and push authorized checkpoints to main, preserving unrelated work.

## Acceptance and limits

- Each species can use different geometry and counts. Selecting another species never morphs its vertices or settings into the previous one.
- Full bloom, substantial bud, and every intermediate stage preserve coherent attachments and avoid conspicuous penetration from multiple views. Intended layered overlap is allowed.
- Height and petal-shape controls act independently and their previews match the evaluated surfaces.
- Rose approval is a reference to preserve, not evidence that all existing geometry is finished.
- Realistic mode is switchable; appearance is judged in the browser with both photographic and sharp inspection views. Do not claim botanical similarity or DSLR realism solely from shader complexity.
- Current unresolved checkpoint issues include tiered chrysanthemum shape, peony profile, dahlia intersections, orchid closure, and passionflower filament clearance. Existing `petalClearance` is a heuristic, not a collision solver.
- If a proposed spline, solver, or shader route fails the two-species proof, document the observed limitation and choose a better representation before migrating every species. No engine migration without evidence of a relevant capability or performance limitation.

## Reference and implementation pointers

User references: `references/user-2026-11-14/`, with real photos, illustrations, and paper templates serving different purposes. Current local review captures: ignored `evidence/geometry-review/`; regenerate them if absent or stale. Current selection logic: `src/gui.ts`; deformation: `src/flowerMaterial.ts`; grid outlines: `src/petalMesh.ts`; placement: `src/place.ts`; anatomy: `src/anatomy.ts`, `src/passionflower.ts`; controls: `src/shape.ts`, `src/curveEditor.ts`; head growth: `src/bloom.ts`; renderer/cameras: `src/main.ts`; math tests: `tests/shape.test.ts`.

Primary technical references from the architecture review:
- https://threejs.org/manual/pages/webgpurenderer
- https://threejs.org/docs/pages/FunctionNode.html
- https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
- https://algorithmicbotany.org/papers/inflorescence.sig16.html

These establish available tools and modeling approaches, not visual or performance certification for this application.
