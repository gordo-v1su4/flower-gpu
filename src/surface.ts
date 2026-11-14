import type { FlowerSettings } from "./settings";
import { cubic, samplePetal, INNER_KEYS, OUTER_KEYS, HEIGHT_KEYS } from "./shape";
import { outline, ruffle } from "./petalMesh";
import { PRESETS } from "./presets";

export type Point = [number, number, number];
export type Attachment = { id: number; ring: number; count: number; t: number; angle: number; radius: number; height: number; scale: number; width: number; length: number };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, low = 0, high = 1) => Math.max(low, Math.min(high, v));
export const smooth = (v: number) => { const t = clamp(v); return t * t * (3 - 2 * t); };
const hash = (i: number, seed: number) => { const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return v - Math.floor(v); };

/** Explicit receptacle attachments. Rose spirals and dahlia whorls are independent layouts. */
export function attachments(s: FlowerSettings): Attachment[] {
  const rose = s.name === "CopperRose";
  const n = Math.max(1, Math.min(300, Math.round(s.instanceCount)));
  const outerRings=s.name==='SunburstDahlia'?6:7;
  const rings = rose ? 1 : outerRings+3;
  const counts = Array.from({length:rings},()=>Math.floor(n/rings));
  for (let i = counts.reduce((a,b)=>a+b,0); i < n; i++) counts[(i-n+300*rings)%rings]!++;
  const result: Attachment[] = [];
  for (let ring = 0; ring < rings; ring++) for (let j = 0; j < counts[ring]!; j++) {
    const id = result.length;
    const core=!rose&&ring<3;
    const t = rose ? id / Math.max(1,n-1) : Math.max(0,ring-3)/(outerRings-1);
    const random = (hash(id,s.variationSeed)-0.5) * s.petalRandomness;
    result.push({id, ring, count:counts[ring]!, t,
      angle: rose ? 0.4 + id * s.phyllotaxisAngle * Math.PI/180 : (j+(ring%2)*0.5)/counts[ring]! * Math.PI*2+0.1+ring*0.045+random*0.45,
      // Broaden the rose's lower bowl, while retaining the approved tangent curve.
      radius: core?0.008+ring*0.075:s.phyllotaxisStartRadius + s.radialSpan * Math.pow(t,s.phyllotaxisExponent*2) + (rose ? 0.055*Math.sin(t*Math.PI) : 0.32*Math.sin(t*Math.PI*0.5)),
      height: s.indexYOffset + (core?s.heightCenter+0.13-ring*0.04:cubic(HEIGHT_KEYS.map(k=>s[k]),t)) + random*(core?0.12:0.06),
      scale: core?(0.12+ring*0.11)*(1+random*1.5):mix(s.indexScaleMin,s.indexScaleMax,Math.pow(t,s.indexScalePower)),
      width: (core?0.9:mix(s.indexWidthMin,s.indexWidthMax,Math.pow(t,s.indexWidthPower))) * (1+random*0.3),
      length: mix(s.indexLengthMin,s.indexLengthMax,Math.pow(t,s.indexLengthPower)) * (rose?0.94+s.radialLengthRamp*t:0.48+0.08*t)*(1+random),
    });
  }
  return result;
}

/** A two dimensional surface: outline, integrated cubic tangent spine, transverse cup,
 * cylindrical wrap, and edge curl. This exact evaluator supplies rendering and contacts. */
export function evaluateSurface(s: FlowerSettings, a: Attachment, u: number, v: number, progress: number, cache?: Map<string,number[]>): Point {
  if(v===0) return [a.radius*Math.sin(a.angle),a.height,a.radius*Math.cos(a.angle)];
  const rose = s.name === "CopperRose";
  const core=!rose&&a.ring<3;
  const threshold = Math.pow(1-a.t,s.animationOrder)*s.animationSpread*0.68;
  const bloom = smooth(clamp((progress-threshold)/Math.max(0.05,1-threshold)));
  const key=`${a.id}:${v}`;
  let spine=cache?.get(key);
  if(!spine) {
    const reference = PRESETS.find(p=>p.name===s.name)!;
    const angles = INNER_KEYS.map((k,i) => (core?[1,0.8,-0.8,-1.4][i]!+s[k]-[0.2,0.55,1,0.3][i]!:mix(s[k],s[OUTER_KEYS[i]!],a.t))
    + (s.bloomRoot-reference.bloomRoot)
    + (s.bloomSpine-reference.bloomSpine)*i/3 + (s.bloomTip-reference.bloomTip)*(i/3)**2);
    const [r,h]=samplePetal(angles,v,24);
    spine=[r,h,cubic(angles,v)]; cache?.set(key,spine);
  }
  const [r,h,tangent]=spine as [number,number,number];
  const signed = u*2-1;
  const gathered = mix(rose?0.32:0.55,1,smooth(v/0.18));
  const base = rose?mix(s.baseWidth,1,smooth((v-0.04)/0.24)):mix(Math.max(0.55,s.baseWidth),1,smooth(v/0.18));
  const tip = mix(1,s.tipWidth,smooth((v-0.75)/0.25));
  const width = s.width*a.width*a.scale*(rose?1.1:0.66);
  const silhouette=rose?outline(s.petalProfile,v):Math.sin(v*Math.PI)**0.95*(1-0.45*smooth((v-0.68)/0.32));
  const halfWidth=width*0.5*silhouette*gathered*base*tip*ruffle(s.petalProfile,v,signed);
  const rollAngle=0.55+s.petalCup*2.3;
  const transverseRadius=halfWidth/Math.max(1,rollAngle*0.68);
  const x = rose?signed*halfWidth:Math.sin(signed*rollAngle)*transverseRadius;
  const length = s.length*a.length*a.scale;
  const cup = rose?signed*signed*width*s.petalCup*0.42*smooth(v/0.22)*Math.sin(v*Math.PI)
    :(1-Math.cos(signed*rollAngle))*transverseRadius*smooth(v/0.18);
  const openRadius = Math.max(0.001,a.radius+r*length);
  const maxAngle=Math.PI/Math.max(3,a.count)*1.12;
  const wrap = rose ? clamp(x/openRadius,-1.48,1.48) : Math.tanh(x/(openRadius*maxAngle))*maxAngle;
  const wrapWeight = 1;
  const ox = mix(x,Math.sin(wrap)*openRadius,wrapWeight);
  let oz = mix(a.radius+r*length,Math.cos(wrap)*openRadius,wrapWeight)-(rose?cup*Math.cos(tangent):0);
  const edge = Math.abs(signed)**4 * smooth((v-0.55)/0.45);
  const rim=rose ? smooth((v-0.55)/0.45)*(0.2*Math.abs(signed)**4+0.075*Math.exp(-signed*signed*40)) : 0;
  const oy = a.height+h*length+cup*Math.sin(tangent) + edge*width*(rose?-0.06:0.035)-rim*length*Math.cos(tangent);
  oz-=rim*length*Math.sin(tangent);
  oz += s.bloomDome*Math.sin(v*Math.PI)**s.bloomDomePower*(1-signed*signed);
  // Nested substantial bud shells retain every root; the base-pivot scale is separate.
  const basalWeight=1-smooth(v/0.27);
  const budRadius = rose?mix(a.radius,0.04,v)+Math.sin(v*Math.PI)*0.45*s.length*mix(0.72,1,a.t)
    :a.radius*basalWeight+Math.sin(v*Math.PI)*0.36*s.length*(core?0.3+a.ring*0.2:mix(0.72,1,a.t));
  const budAngle = rose?clamp(x/Math.max(0.08,budRadius),-1.4,1.4):signed*Math.PI/a.count*1.12;
  const bx = Math.sin(budAngle)*budRadius;
  const bz = Math.cos(budAngle)*budRadius;
  const by = a.height*(rose?1-v:basalWeight) + v*s.length*(rose?1.12:core?0.75+a.ring*0.1:1.25) + Math.sin(v*Math.PI)*s.budDome;
  const lx = mix(bx,ox,bloom), ly = mix(by,oy,bloom), lz = mix(bz,oz,bloom);
  return [lx*Math.cos(a.angle)+lz*Math.sin(a.angle),ly,lz*Math.cos(a.angle)-lx*Math.sin(a.angle)];
}
