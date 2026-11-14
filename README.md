# Flora GPU

Nine independent procedural flowers with editable petal surfaces, reversible blooming, and an optional photographic presentation. Built with Three.js 0.184, WebGPU/TSL, TypeScript, Vite, and Bun.

This is the accepted November 14, 2026 review checkpoint. The user approved stopping geometry refinement here, finishing the material pass, and documenting remaining work. It is a real-time procedural study, not a claim of finished botanical photorealism or collision-free geometry.

## Run and verify

Use Bun 1.4.4 and the committed `bun.lock`.

```bash
bun install --frozen-lockfile
bun run dev
bun test
bun run build
bun run preview
```

A WebGPU-capable browser is recommended. `document.body.dataset.backend` reports the active backend. A static fallback illustration remains while initializing or if initialization fails. The WebGL fallback has not received the same visual acceptance coverage as native WebGPU.

## Controls

- Select flowers directly, with Previous/Next, or the arrow keys. Specimens retain edits when switching during the current page session and never morph into other species. Reload restores the last species name, but not all parameter edits.
- The default inspection view is **Top**. **Stage → Inspection views** provides Front, Side, Top, Below, Three quarter, and Free orbit. Below is useful for transmitted light, vein detail, and problematic attachments.
- **Growth** provides Closed Bud, Half Bloom, Full Bloom, and continuous Progress. Closing folds before reducing the head around its base; opening reverses this. Stem and leaves stay attached.
- **Sway**, **Bloom**, and **Orbit** control animation; Space pauses/resumes it.
- **Stage → Photography → Photographic camera** enables the perspective setup. Soft studio, Backlit, and Daylight have separate key, back, fill, environment, angle, and height controls. Environment adjusts HDR illumination/reflections separately from fill. Backlit follows the viewing camera as a material diagnostic, rather than representing a fixed studio lamp.
- Optional **Depth of field** has Focus offset, Focus range, and Lens blur. Focus starts near the head and may need adjustment per species/angle. Orthographic inspection stays sharp and bypasses photographic post-processing.
- **Contact shading** adds half-resolution screen-space AO with denoising. Disable it and DOF for the lower-cost direct rendering path.
- **Material → Surface** exposes Roughness, Translucency, and Specular. Translucency combines approximate diffuse subsurface scattering with a small refractive transmission term. It is not alpha transparency. Backlighting shows it most clearly; environment reflections primarily affect sheen/highlights.
- Geometry, proportions, seeded variation, and colors remain editable. The curve editor is a longitudinal guide, not an exact preview of the full two-dimensional outline. Dedicated species surfaces do not map every legacy outline/cup parameter one-to-one.

## Species

| Specimen | Current construction |
| --- | --- |
| Copper Rose | 21 nested cups; small tightly curled center, larger outer petals, top-quarter lip roll, root-pivot proportions |
| Velvet Dahlia | 160 cupped petals including 48 small folded center petals; staggered cascading layers |
| Sunburst Dahlia | 144 petals using the dahlia family with an independent cultivar preset |
| Soft Peony | 64 broad rounded petals; common template scaled from the bottom, offset layers, opening outer petals, recessed stamens |
| Chrysanthemum | 144 narrow curved petals with length/width variation |
| Wild Orchid | Dedicated tepal/lip surfaces and column anatomy |
| Stargazer Lily | Six tepals and separate flower anatomy |
| Passion Flower | Petals, corona filaments, and retracting central anatomy |
| Stone Rosette | 24 thicker green leaves with a raised layered profile |

## Structure

- `src/specimens.ts`: independent settings, switching, and resource ownership.
- `src/speciesSurfaces.ts`, `src/surface.ts`: species evaluators and rose/dahlia surfaces.
- `src/prepareSurface.ts`, `src/surface.worker.ts`: twelve morph poses prepared off the main thread, interpolated on the GPU.
- `src/contacts.ts`: sampled surface contact checks and bounded relaxation.
- `src/surfaceFlower.ts`, `src/anatomy.ts`, `src/passionflower.ts`: rendering ownership and supporting anatomy.
- `src/petalMaterial.ts`, `src/surfaceTextures.ts`: locally generated pigment, vein, normal, and roughness detail.
- `src/photography.ts`, `src/main.ts`: post-processing, lighting, and inspection cameras.
- `src/gui.ts`, `src/presets.ts`: studio controls and specimen defaults.

The older `flowerMaterial.ts`/`place.ts` path remains as legacy/reference code; it is not the active independent-species surface pipeline.

## Remaining issues and next work

1. **Intersections remain.** Cupped dahlia edges can cross the middle/underside of the next petal and resemble a vein. Rose curls and intermediate poses retain overlaps too. The sampled contact cage and bounded relaxation are not continuous collision detection. Diagnostic contact counts are proximity counts, not proof that the visible mesh is clean. Peony deliberately skips generic relaxation to preserve its template (`contacts: -1` means unmeasured).
2. **Underside and flower base.** Roots are anchored inside the receptacle, but the transition can expose a pinched/folded neck, center-bottom pieces, or an artificial calyx. Inspect from Below and Side before another attachment pass.
3. **Rose profile and edges.** The side profile remains imperfect. Some rims are angular, some layers too regular, and outer petals may benefit from more natural edge/length variation. Preserve this checkpoint before another geometry pass: the user explicitly asked to stop reshaping it.
4. **Material approximation.** Scattering is an inexpensive view/light approximation, not measured multilayer transport or volumetric SSS. Strong backlight can wash out pigment and fail to reproduce overlapping-petal shadows. Veins can be too pronounced underneath. Rose highlights were softened, but grazing reflections can still look sharp or waxy. Species need further roughness, thickness, texture, and lighting auditions.
5. **Post-processing.** Screen-space AO can create halos/noise and misses off-screen occluders. Its scene depth pass uses no MSAA to avoid a native WebGPU multisampled-depth shader incompatibility, so thin edges can alias. Optional DOF can obscure detail and requires focus adjustment.
6. **Botanical refinement.** Peony layer repetition/central anatomy, dahlia center packing, chrysanthemum irregularity, orchid lip/closure, lily volume, and passionflower filament clearance remain appropriate subjects for later review. Finite surfaces and successful playback do not establish botanical accuracy.
7. **Preparation cost.** Dense dahlias took roughly 5–8 seconds to prepare twelve poses in the reviewed browser. Workers keep this off the main thread, but high petal counts and repeated edits still cause waits and substantial memory use. No isolated GPU timing or mobile performance guarantee is provided.
8. **Asset provenance.** Petal maps are generated by this project. User images are modeling references, not redistribution licenses. The inherited `public/environments/studio.hdr` predates this rebuild; its source/license is not recorded and should be established or replaced before asset reuse outside this project. Do not assume it is CC0.
9. **Framing.** Fixed inspection framing is not fitted independently to every species or custom parameter set. Large blooms can extend behind the controls panel. Camera composition and per-species DOF focus need another presentation pass.

No physics simulation, engine migration, DLSS integration, or external rendering service was added.

## Verification

The checkpoint passes **32 tests** and `bun run build`. Tests cover edit/resource ownership, finite anchored surfaces through bloom, triangle contact behavior, peony template proportions, dahlia stagger, orchid bud area, and rose width/curve/height/proportion controls. Browser review covers top, side, front, below, closed, half, and open states. Local ignored screenshots are in `evidence/rebuild/`; `release-*` captures supersede older comparisons for rose, dahlias, and peony. See [the detailed checkpoint](docs/rebuild-checkpoint-2026-11-14.md).

Native WebGPU was verified. On the reviewed desktop/browser, 120-frame averages were 16.67 ms/frame, approximately 0.50 ms CPU submission for the rose with contact shading and 0.58 ms with contact shading plus DOF. These are observed frame intervals/CPU submission times, not isolated GPU timings or cross-device promises.

## Publishing

The reviewed source is committed to `main` and pushed to the GitHub remote. `vercel.json` configures Bun/Vite static deployment to `dist/`; publishing source does not itself verify an external production deployment.

The original parameter study was informed by https://moaaz-rafique.vercel.app/phyllotaxis/. This repository implements the flower surfaces, anatomy, TSL materials, and interface described above.
