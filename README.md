# Flora GPU

An interactive botanical studio built with Three.js, WebGPU, TSL node materials, TypeScript, and Vite. Nine procedural specimens use distinct petal geometry, staggered botanical whorls, procedural color and veins, and flower-specific anatomy.

## Run

```bash
npm install
npm run dev
```

Create and inspect the production build:

```bash
npm run build
npm run preview
```

A current WebGPU-capable browser is recommended. A static flower remains visible while the renderer loads or if GPU initialization fails.

## Deploy

The included `vercel.json` configures Vercel to build with `npm run build` and publish the static `dist/` directory. Import the GitHub repository into Vercel with those defaults, or run `npx vercel --prod` from a Vercel-authenticated checkout.

## Controls

- Drag to orbit; scroll or pinch to zoom.
- Use **Previous**, **Next**, or the left/right arrow keys to change flowers.
- **Sway** runs GPU petal motion, **Bloom** opens and closes the petals, and **Orbit** rotates the view.
- **Space** pauses or resumes the selected animation.
- **Studio controls** opens the advanced geometry, distribution, growth, material, and debug settings.
- **Distribution → Randomize Petals** creates a new seeded silhouette. **Petal Randomness** varies each petal's length, width, height, and roll; **Outer Petal Length** ramps length by radial ring.
- **Reset view** restores the camera.

The interface respects `prefers-reduced-motion` and adapts to mobile screens.

## Structure

- `src/flowerMaterial.ts` — GPU petal deformation, procedural shading, and animation uniforms.
- `src/petalMesh.ts` — parametric petal surfaces.
- `src/architecture.ts` and `src/place.ts` — species-specific structures and non-coplanar whorls.
- `src/anatomy.ts` — stems, leaves, orchid lips, flower centers, and stamens.
- `src/presets.ts` — specimen parameters and color palettes.
- `src/gui.ts` — studio and transport controls.

The original parameter study was informed by the public phyllotaxis study at `https://moaaz-rafique.vercel.app/phyllotaxis/`. The flower structures, TSL materials, anatomy, and interface are implemented in this project.
