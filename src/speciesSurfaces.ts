import { architectureFor, allocateWhorls } from "./architecture";
import { cubic, samplePetal, shapeFor, INNER_KEYS, OUTER_KEYS, HEIGHT_KEYS } from "./shape";
import { outline, ruffle } from "./petalMesh";
import { attachments, evaluateSurface, mix, smooth, type Attachment, type Point } from "./surface";
import type { FlowerSettings } from "./settings";

export type SurfaceDefinition={layout:(s:FlowerSettings)=>Attachment[];evaluate:typeof evaluateSurface};

function radialLayout(s:FlowerSettings):Attachment[] {
  const architecture=architectureFor(s.name),kind=architecture.kind;
  const count=kind==='orchid'?5:kind==='lily'?6:kind==='passion'?10:Math.max(1,Math.min(300,Math.round(s.instanceCount)));
  const counts=kind==='peony'?Array.from({length:16},(_,i)=>Math.floor(count/16)+(i<count%16?1:0)):allocateWhorls(count,architecture),result:Attachment[]=[];
  for(let ring=0;ring<counts.length;ring++) for(let j=0;j<counts[ring]!;j++) {
    const id=result.length;
    const variation=(Math.sin(id*127.1+s.variationSeed*31.7)*43758.5453)%1;
    const lengthVariation=1+variation*s.petalRandomness;
    const widthVariation=1+Math.sin(id*73.17+s.variationSeed)*s.petalRandomness*0.8;
    const spiral=['chrysanthemum','rosette'].includes(kind);
    const layer=spiral?id/Math.max(1,count-1):counts.length>1?ring/(counts.length-1):id/Math.max(1,count-1);
    const t=kind==='peony'?Math.max(0,Math.min(1,layer+Math.sin(id*4.71+s.variationSeed)*0.035)):layer;
    result.push({id,ring,count:counts[ring]!,t,
      angle:spiral?id*s.phyllotaxisAngle*Math.PI/180:kind==='peony'?j/counts[ring]!*Math.PI*2+ring*2.39996+0.09*Math.sin(id*7.31+s.variationSeed):j/counts[ring]!*Math.PI*2+ring*2.39996,
      radius:['orchid','lily','passion'].includes(kind)?0.035+s.radialSpan*t:s.phyllotaxisStartRadius+s.radialSpan*t+ring*0.012,
      height:s.indexYOffset+cubic(HEIGHT_KEYS.map(k=>s[k]),t)+(kind==='peony'?Math.sin(id*9.13+s.variationSeed)*0.035:0),
      scale:mix(s.indexScaleMin,s.indexScaleMax,t**s.indexScalePower),
      width:mix(s.indexWidthMin,s.indexWidthMax,t**s.indexWidthPower)*widthVariation,
      length:mix(s.indexLengthMin,s.indexLengthMax,t**s.indexLengthPower)*lengthVariation,
    });
  }
  return result;
}

type Patch={width:number;length:number;curveT?:number;wrap?:number;ruffle?:number;cup?:number;delay?:number;scallop?:boolean;succulent?:boolean};
/** Shared optional patch primitive. Species choose their layout, proportions,
 * families and articulation separately; no matching topology between specimens. */
function patch(s:FlowerSettings,a:Attachment,u:number,v:number,p:number,o:Patch,cache?:Map<string,number[]>):Point {
  if(v===0) return [Math.sin(a.angle)*a.radius,a.height,Math.cos(a.angle)*a.radius];
  const signed=u*2-1,t=o.curveT??a.t;
  const key=`${a.id}:${v}`; let spine=cache?.get(key);
  if(!spine) {
    const angles=INNER_KEYS.map((k,i)=>mix(s[k],s[OUTER_KEYS[i]!],t));
    const [r,h]=samplePetal(angles,v,24); spine=[r,h,cubic(angles,v)]; cache?.set(key,spine);
  }
  const [r,h,theta]=spine as [number,number,number];
  const length=s.length*a.scale*a.length*o.length;
  const width=s.width*a.scale*a.width*o.width;
  const base=mix(s.baseWidth,1,smooth(v/0.25));
  const shape=o.succulent ? Math.sin(v*Math.PI)**0.72*(0.65+v*0.35) : o.scallop ? Math.sin(v*Math.PI*0.5)**0.65*(1-0.16*smooth((v-0.65)/0.35)) : outline(s.petalProfile,v);
  const edgeVariation=o.scallop?1+0.018*Math.sin(v*5+signed*3):ruffle(s.petalProfile,v,signed);
  // Each cupped peony petal occupies one angular slot. Unbounded rectangular
  // sheets wrapped around the small inner radius folded across their neighbors.
  const slotWidth=o.scallop?Math.min(width,Math.max(0.03,a.radius+r*length)*2*Math.PI/a.count*1.08)*(1+0.5*Math.sin(v*Math.PI))*(1+Math.sin(a.id*13.17+s.variationSeed)*s.petalRandomness):width;
  const x=signed*slotWidth*0.5*shape*base*edgeVariation;
  const cup=signed*signed*slotWidth*s.petalCup*(o.cup??0.4)*Math.sin(v*Math.PI*(o.scallop?0.5:1));
  let radius=a.radius+r*length-cup*Math.cos(theta);
  if(o.scallop) radius+=signed*0.035*Math.sin(v*Math.PI*0.5);
  const wrap=o.wrap??0,angle=Math.max(-1.45,Math.min(1.45,x/Math.max(0.12,Math.abs(radius))));
  const ox=mix(x,Math.sin(angle)*Math.abs(radius),wrap);
  radius=mix(radius,Math.cos(angle)*radius,wrap);
  const rim=o.scallop ? smooth((v-0.55)/0.45)*(0.18*signed*signed+0.018*(1+Math.cos(signed*Math.PI*4))) : 0;
  const oy=a.height+h*length+cup*Math.sin(theta)+Math.abs(signed)**3*Math.sin(v*18+a.id)*v**4*(o.ruffle??0)-rim*length*Math.cos(theta)+(o.succulent?0.075*(1-signed*signed)*Math.sin(v*Math.PI):0);
  radius-=rim*length*Math.sin(theta);
  const delay=(o.delay??0.25)*(1-a.t),bloom=smooth((p-delay)/(1-delay));
  const budR=mix(a.radius,0.035,v)+Math.sin(v*Math.PI)*s.length*mix(0.24,0.38,a.t);
  const budAngle=Math.max(-1.4,Math.min(1.4,x/Math.max(0.08,budR)));
  const lx=mix(Math.sin(budAngle)*budR,ox,bloom);
  const ly=mix(a.height*(1-v)+v*s.length*1.02,oy,bloom);
  const lz=mix(Math.cos(budAngle)*budR,radius,bloom);
  const azimuth=a.angle+(o.scallop?Math.sin(a.id*3.71+s.variationSeed)*0.065*v:0);
  return [lx*Math.cos(azimuth)+lz*Math.sin(azimuth),ly,lz*Math.cos(azimuth)-lx*Math.sin(azimuth)];
}

// Nested spheres tangent at a common bottom pivot. Changing shell radius scales
// the complete petal from that pivot, rather than translating equal-size sheets.
// Within each shell, angular slots stay disjoint; alternating shells fill gaps.
const peony:SurfaceDefinition={layout:radialLayout,evaluate:(s,a,u,v,p)=>{
  const q=u*2-1,base=shapeFor(s.name),bloom=smooth(p);
  const layer=a.ring/15;
  const radialGrowth=Math.expm1(layer*1.1)/Math.expm1(1.1);
  const shell=s.length*(0.37+0.37*radialGrowth+Math.sin(a.id*9.17+s.variationSeed)*s.petalRandomness*0.065);
  const sizeControl=mix(s.indexScaleMin/0.42,s.indexScaleMax,layer);
  const radius=shell*sizeControl;
  const tip=mix(Math.PI,2.5,bloom);
  // Round off the corners of each spherical sector into a broad petal rim.
  const rim=(0.22*(1-Math.sqrt(Math.max(0,1-q*q)))+0.009*(1+Math.cos(q*Math.PI*4)))*v**4;
  const along=v-rim;
  const controls=INNER_KEYS.map((k,i)=>mix(s[k]-base[k],s[OUTER_KEYS[i]!]-base[OUTER_KEYS[i]!],layer));
  const phi=Math.max(0,tip*along+cubic(controls,v)*v*0.2);
  const halfSlot=Math.PI/a.count*Math.min(0.98,0.95*s.width/1.3);
  const spread=smooth(v/0.22)*(1-0.15*v**5);
  const angle=q*halfSlot*spread;
  // Opening is a root-pivot rotation of the SAME spherical petal template.
  // Never replace its outline or stretch its center into a different tip.
  const release=(smooth((layer-0.65)/0.35)*0.85+Math.sin(a.id*4.13+s.variationSeed)*s.petalRandomness*0.5)*bloom;
  const sr=radius*Math.sin(phi),sy=radius*(1-Math.cos(phi));
  const x=sr*Math.sin(angle),z=sr*Math.cos(angle);
  const r=z*Math.cos(release)+sy*Math.sin(release);
  const height=sy*Math.cos(release)-z*Math.sin(release);
  const lean=Math.sin(a.id*8.19+s.variationSeed)*s.petalRandomness*0.45*bloom;
  const px=x*Math.cos(lean)-height*Math.sin(lean),py=height*Math.cos(lean)+x*Math.sin(lean);
  const heightEdit=cubic(HEIGHT_KEYS.map(k=>s[k]-base[k]),layer)*smooth(v/0.25);
  return [px*Math.cos(a.angle)+r*Math.sin(a.angle),py+heightEdit,r*Math.cos(a.angle)-px*Math.sin(a.angle)];
}};
const chrysanthemum:SurfaceDefinition={layout:radialLayout,evaluate:(s,a,u,v,p,c)=>patch(s,a,u,v,p,{width:0.72,length:mix(0.52,1.12,a.t),curveT:a.t**3,ruffle:0.006,cup:0.7,delay:0.38},c)};
const rosette:SurfaceDefinition={layout:radialLayout,evaluate:(s,a,u,v,p,c)=>patch(s,a,u,v,p,{width:1,length:1,wrap:0,cup:0.2,delay:0.15,succulent:true},c)};
const lily:SurfaceDefinition={layout:radialLayout,evaluate:(s,a,u,v,p,c)=>patch(s,a,u,v,p,{width:a.id%2?0.86:1.1,length:a.id%2?0.95:1.05,cup:0.45,delay:0.08},c)};
const passion:SurfaceDefinition={layout:radialLayout,evaluate:(s,a,u,v,p,c)=>patch(s,a,u,v,p,{width:a.id%2?0.78:0.94,length:1,cup:0.2,delay:0.04},c)};
const orchid:SurfaceDefinition={layout:radialLayout,evaluate:(s,a,u,v,p)=>{
  const root:Point=[Math.sin(a.angle)*a.radius,a.height,Math.cos(a.angle)*a.radius];
  if(v===0) return root;
  const angles=[-1.18,1.18,0,-2.38,2.38],angle=angles[a.id]!;
  const width=s.width*(a.id<2?1.05:0.65);
  const signed=u*2-1,span=signed*width*0.5*outline(s.petalProfile,v)*smooth(v/0.22);
  const curve=INNER_KEYS.map((k,i)=>mix(s[k],s[OUTER_KEYS[i]!],a.t));
  const [r,h]=samplePetal(curve,v,24);
  const reach=s.length*h*(a.id<2?1:0.9);
  const ox=Math.cos(angle)*span+Math.sin(angle)*reach,oy=Math.cos(angle)*reach-Math.sin(angle)*span;
  const oz=0.14+r*0.45+signed*signed*s.petalCup*0.25*Math.sin(v*Math.PI);
  const bloom=smooth(p),phi=a.id/5*Math.PI*2+(u-0.5)*Math.PI*2/5*1.16;
  const br=Math.sin(v*Math.PI)*s.length*0.28;
  return [root[0]+mix(Math.sin(phi)*br,ox,bloom),root[1]+mix(v*s.length,oy,bloom),root[2]+mix(Math.cos(phi)*br,oz*smooth(v/0.2),bloom)];
}};

export const SURFACES:Record<string,SurfaceDefinition>={
  CopperRose:{layout:attachments,evaluate:evaluateSurface},
  VelvetDahlia:{layout:attachments,evaluate:evaluateSurface},
  SunburstDahlia:{layout:attachments,evaluate:evaluateSurface},
  SoftPeony:peony,GardenChrysanthemum:chrysanthemum,StoneRosette:rosette,
  StargazerLily:lily,PassionFlower:passion,WildOrchid:orchid,
};

/** Bind a basal band to the visible receptacle, then smoothly recover the full
 * species surface. Spatial weighting is independent of the bloom time blend. */
export function attachmentSocket(s:FlowerSettings,a:Attachment):Point {
  const radius=s.name==='StoneRosette'?0.06+0.1*a.t:0.055+0.1*a.t;
  return [Math.sin(a.angle)*radius,0.025+(1-a.t)*0.025,Math.cos(a.angle)*radius];
}

export function evaluateSpecimenSurface(s:FlowerSettings,a:Attachment,u:number,v:number,p:number,cache?:Map<string,number[]>):Point {
  const definition=SURFACES[s.name]!;
  const point=definition.evaluate(s,a,u,v,p,cache);
  const originalRoot=definition.evaluate(s,a,0.5,0,p,cache);
  const root=attachmentSocket(s,a);
  const weight=1-smooth(v/0.27);
  return point.map((value,k)=>value+(root[k]!-originalRoot[k]!)*weight) as Point;
}
