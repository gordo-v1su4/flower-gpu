import { SURFACES, evaluateSpecimenSurface } from "./speciesSurfaces";
import { relaxContacts } from "./contacts";
import { edgeSample } from "./petalMesh";
import type { FlowerSettings } from "./settings";

export function prepareSurface(s: FlowerSettings) {
  const definition=SURFACES[s.name];
  if(!definition) throw new Error(`Unknown specimen ${s.name}`);
  const evaluateSurface=evaluateSpecimenSurface;
  const started=performance.now(), roots=definition.layout(s), cache=new Map<string,number[]>();
  const rows=Math.max(12,Math.min(64,Math.round(s.segments)))+1;
  const columns=Math.max(8,Math.min(48,Math.round(s.widthSegments)))+1;
  const perPetal=rows*columns, uv:number[]=[], ids:number[]=[], radial:number[]=[];
  let indices:number[]=[];
  const gridIndices=(r:number,c:number)=>{
    const ix:number[]=[];
    for(const a of roots) for(let y=0;y<r-1;y++) for(let x=0;x<c-1;x++) {
      const i=a.id*r*c+y*c+x; ix.push(i,i+c,i+1,i+1,i+c,i+c+1);
    }
    return ix;
  };
  indices=gridIndices(rows,columns);
  for(const a of roots) for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    uv.push(edgeSample(col/(columns-1)),edgeSample(row/(rows-1))); ids.push(a.id/roots.length); radial.push(a.t);
  }
  const poses:Float32Array[]=[], contacts:number[]=[];
  const times=[0,0.08,0.16,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.93,1];
  // Contact cage is sampled from the same surface. Render tessellation can grow
  // independently; interpolate its bounded corrections onto the dense mesh.
  const cr=17,cc=9,ci=gridIndices(cr,cc);
  for(const time of times) {
    const cage=new Float32Array(roots.length*cr*cc*3); let offset=0;
    for(const a of roots) for(let row=0;row<cr;row++) for(let col=0;col<cc;col++) {
      cage.set(evaluateSurface(s,a,col/(cc-1),row/(cr-1),time,cache),offset); offset+=3;
    }
    const original=cage.slice();
    // Peony uses separated nested shells; a generic near-contact correction
    // would pull those intentionally close sheets back across their neighbors.
    const report=s.name==='SoftPeony'?{contacts:-1}:relaxContacts(cage,ci,cr*cc,cc,Math.max(0.003,s.petalClearance*0.24),2);
    const positions=new Float32Array(roots.length*perPetal*3); offset=0;
    for(const a of roots) for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
      const u=edgeSample(col/(columns-1)),v=edgeSample(row/(rows-1));
      const point=evaluateSurface(s,a,u,v,time,cache);
      const x=u*(cc-1),y=v*(cr-1),loX=Math.min(cc-2,Math.floor(x)),loY=Math.min(cr-2,Math.floor(y));
      for(let k=0;k<3;k++) {
        let correction=0;
        for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++) {
          const i=(a.id*cr*cc+(loY+dy)*cc+loX+dx)*3+k;
          correction+=(cage[i]!-original[i]!)*(dx?x-loX:1-x+loX)*(dy?y-loY:1-y+loY);
        }
        positions[offset++]=point[k]!+correction;
      }
    }
    contacts.push(report.contacts); poses.push(positions);
  }
  return {poses,times,uv:new Float32Array(uv),ids:new Float32Array(ids),radial:new Float32Array(radial),indices,contacts,milliseconds:performance.now()-started};
}
export type PreparedSurface=ReturnType<typeof prepareSurface>;
