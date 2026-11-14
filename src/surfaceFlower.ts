import { BufferGeometry, Float32BufferAttribute, Group, Mesh, SphereGeometry, MeshPhysicalNodeMaterial } from "three/webgpu";
import type { FlowerView } from "./flowerMaterial";
import type { FlowerSettings } from "./settings";
import type { PreparedSurface } from "./prepareSurface";
import { createSurfaceMaterial } from "./petalMaterial";
import { createAnatomy } from "./anatomy";
import { bloomState } from "./bloom";

export function createSurfaceFlower(settings: FlowerSettings): FlowerView {
  const mesh=new Group(), head=new Group(), anatomy=createAnatomy(settings);
  const appearance=createSurfaceMaterial(settings);
  const petals=new Mesh(new BufferGeometry(),appearance.material);
  const receptacle=new Mesh(new SphereGeometry(0.2,48,24),new MeshPhysicalNodeMaterial({color:'#344b28',roughness:0.85}));
  receptacle.scale.set(1,0.35,1);
  head.add(receptacle);
  petals.visible=false;
  petals.frustumCulled=false;
  petals.castShadow=true;
  petals.receiveShadow=true;
  head.add(petals); mesh.add(head,anatomy.group);
  let worker=new Worker(new URL('./surface.worker.ts',import.meta.url),{type:'module'});
  let request=0, signature='', times:number[]=[], disposed=false;
  const shapeSignature=()=>JSON.stringify(Object.fromEntries(Object.entries(settings).filter(([k])=>!k.startsWith('material') && !['animation','motionMode','wireframe','closedScale'].includes(k))));
  function prepare() {
    const next=shapeSignature(); if(signature===next) return;
    signature=next; document.body.dataset.preparing='true';
    if(request) {worker.terminate(); worker=new Worker(new URL('./surface.worker.ts',import.meta.url),{type:'module'});}
    worker.onmessage=receive;
    worker.postMessage({id:++request,settings:{...settings}});
  }
  function receive(event: MessageEvent) {
    if(disposed || event.data.id!==request) return;
    if(event.data.error) { console.error(event.data.error); document.body.dataset.preparing='error'; return; }
    const result=event.data.result as PreparedSurface;
    const geometry=new BufferGeometry();
    geometry.setAttribute('position',new Float32BufferAttribute(result.poses[0]!,3));
    geometry.setAttribute('uv',new Float32BufferAttribute(result.uv,2));
    geometry.setAttribute('petalId',new Float32BufferAttribute(result.ids,1));
    geometry.setAttribute('radialT',new Float32BufferAttribute(result.radial,1));
    geometry.setIndex(result.indices); geometry.computeVertexNormals();
    geometry.morphAttributes.position=result.poses.map(p=>new Float32BufferAttribute(p,3));
    geometry.morphAttributes.normal=result.poses.map(p=>{
      const temp=new BufferGeometry(); temp.setAttribute('position',new Float32BufferAttribute(p,3)); temp.setIndex(result.indices); temp.computeVertexNormals();
      const normal=temp.getAttribute('normal'); temp.dispose(); return normal;
    });
    const previous=petals.geometry; petals.geometry=geometry; petals.updateMorphTargets(); previous.dispose();
    petals.visible=true;
    times=result.times;
    document.body.dataset.preparing='false';
    document.body.dataset.surfaceReport=JSON.stringify({milliseconds:Math.round(result.milliseconds),contacts:result.contacts,vertices:result.ids.length,poses:times.length});
    syncUniforms();
  }
  function syncUniforms() {
    prepare();
    const state=bloomState(settings.animation/10,settings.closedScale);
    head.scale.setScalar(state.scale); anatomy.head.scale.setScalar(state.scale); anatomy.setBloom(state.open);
    if(times.length) {
      const end=times.findIndex(t=>t>=state.open);
      const hi=end<0?times.length-1:end, lo=Math.max(0,hi-1);
      const t=hi===lo?0:(state.open-times[lo]!)/(times[hi]!-times[lo]!);
      petals.morphTargetInfluences!.fill(0);
      petals.morphTargetInfluences![lo]=1-t; petals.morphTargetInfluences![hi]+=t;
    }
  }
  syncUniforms();
  return {mesh,syncUniforms,updateInstances:syncUniforms,rebuildPetal:syncUniforms,
    updateMaterial:()=>{appearance.update();anatomy.update();},
    setSway:(time,strength)=>{anatomy.setSway(time,strength);},
    setWireframe:value=>{appearance.material.wireframe=value;anatomy.setWireframe(value);},
    dispose:()=>{disposed=true;worker.terminate();appearance.dispose();},
  };
}
