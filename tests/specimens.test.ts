import { test,expect } from "bun:test";
import { Group,Mesh,BufferGeometry,MeshPhysicalNodeMaterial } from "three/webgpu";
import { createSpecimens,SPECIES } from "../src/specimens";
import { createSettings,type FlowerSettings } from "../src/settings";

test('rapid specimen changes preserve all edits, capture independent settings and dispose resources',()=>{
  const factories=new Map(SPECIES),captured:FlowerSettings[]=[],disposals={view:0,geometry:0,material:0};
  try {
    for(const name of SPECIES.keys()) SPECIES.set(name,settings=>{
      captured.push(settings);
      const geometry=new BufferGeometry(),material=new MeshPhysicalNodeMaterial(),mesh=new Group();
      geometry.dispose=()=>{disposals.geometry++;};material.dispose=()=>{disposals.material++;};
      mesh.add(new Mesh(geometry,material));
      return {mesh,syncUniforms(){},updateMaterial(){},rebuildPetal(){},updateInstances(){},setSway(){},setWireframe(){},dispose(){disposals.view++;}};
    });
    const bridge=createSettings(),owner=createSpecimens(bridge);
    bridge.width=2.17;bridge.curveTip=1.87;bridge.materialColorTop='#336699';bridge.animation=4.2;
    owner.select('CopperRose');expect(bridge.name).toBe('CopperRose');expect(bridge.width).not.toBe(2.17);
    bridge.width=1.73;
    owner.select('VelvetDahlia');
    expect(bridge.width).toBe(2.17);expect(bridge.curveTip).toBe(1.87);expect(bridge.materialColorTop).toBe('#336699');expect(bridge.animation).toBe(4.2);
    owner.select('CopperRose');expect(bridge.width).toBe(1.73);
    expect(new Set(captured).size).toBe(4);expect(captured.every(s=>s!==bridge)).toBe(true);
    expect(disposals).toEqual({view:3,geometry:3,material:3});
    owner.dispose();expect(disposals.view).toBe(4);
  } finally { SPECIES.clear();for(const [name,factory] of factories) SPECIES.set(name,factory); }
});
