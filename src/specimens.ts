import { Group, Mesh } from "three/webgpu";
import { PRESETS } from "./presets";
import { assignPreset, createSettings, type FlowerSettings } from "./settings";
import { createFlower, type FlowerView } from "./flowerMaterial";

export type SpecimenFactory = (settings: FlowerSettings) => FlowerView;
export const SPECIES = new Map<string, SpecimenFactory>(PRESETS.map(p => [p.name, createFlower]));

/** All geometry and its captured settings belong to a single specimen. The GUI is a bridge. */
export function createSpecimens(bridge: FlowerSettings) {
  const mesh = new Group();
  const saved = new Map<string, FlowerSettings>();
  let active: FlowerView;
  let owned: FlowerSettings;
  function dispose(view: FlowerView) {
    const geometries = new Set<Mesh["geometry"]>();
    const materials = new Set<Mesh["material"]>();
    view.mesh.traverse(object => {
      if (object instanceof Mesh) { geometries.add(object.geometry); materials.add(object.material); }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    mesh.remove(view.mesh);
  }
  function select(name: string) {
    const factory = SPECIES.get(name);
    const preset = PRESETS.find(p => p.name === name);
    if (!factory || !preset) return;
    if (active) { Object.assign(owned, bridge); saved.set(owned.name, {...owned}); dispose(active); }
    owned = createSettings();
    assignPreset(owned, preset);
    Object.assign(owned, saved.get(name));
    Object.assign(bridge, owned);
    active = factory(owned);
    mesh.add(active.mesh);
  }
  select(bridge.name);
  const forward = (method: "syncUniforms" | "updateMaterial" | "rebuildPetal" | "updateInstances") => () => {
    Object.assign(owned, bridge); active[method](); Object.assign(bridge, owned);
  };
  const view: FlowerView = {
    mesh, syncUniforms: forward("syncUniforms"), updateMaterial: forward("updateMaterial"),
    rebuildPetal: forward("rebuildPetal"), updateInstances: forward("updateInstances"),
    setSway: (t, s) => active.setSway(t, s),
    setWireframe: value => { bridge.wireframe = value; active.setWireframe(value); },
  };
  return { view, select, dispose: () => dispose(active) };
}
