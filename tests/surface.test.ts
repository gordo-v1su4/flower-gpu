import { test, expect } from "bun:test";
import { SURFACES, evaluateSpecimenSurface, attachmentSocket } from "../src/speciesSurfaces";
import { triangleContact, relaxContacts } from "../src/contacts";
import { edgeSample } from "../src/petalMesh";
import { attachments } from "../src/surface";
import { createSettings, assignPreset } from "../src/settings";
import { PRESETS } from "../src/presets";

test('all peony layers preserve one petal template under root-pivot scaling and rotation',()=>{
  const s=createSettings();assignPreset(s,PRESETS.find(p=>p.name==='SoftPeony')!);
  const definition=SURFACES.SoftPeony!,roots=definition.layout(s);
  const samples=[[0,0.4],[0.5,0.6],[1,0.9],[0.5,1],[0,1]];
  const distance=(a:number[],b:number[])=>Math.hypot(...a.map((x,k)=>x-b[k]!));
  for(const progress of [0,0.3,0.65,1]) {
    let reference:number[]|undefined;
    const ranges=Array.from({length:16},()=>[Infinity,-Infinity]);
    for(const a of roots) {
      const points=samples.map(([u,v])=>evaluateSpecimenSurface(s,a,u!,v!,progress));
      const size=Math.hypot(...points[1]!);
      const ratios=points.slice(1).map(point=>distance(points[0]!,point)/size);
      if(!reference) reference=ratios;
      else ratios.forEach((ratio,k)=>expect(ratio).toBeCloseTo(reference![k]!,8));
      ranges[a.ring]![0]=Math.min(ranges[a.ring]![0]!,size);
      ranges[a.ring]![1]=Math.max(ranges[a.ring]![1]!,size);
    }
    expect(ranges[15]![0]!).toBeGreaterThan(ranges[0]![1]!);
  }
});
for(const name of PRESETS.map(p=>p.name)) test(`${name}: deterministic surfaces keep all roots anchored throughout bloom`,()=>{
  const s=createSettings(); assignPreset(s,PRESETS.find(p=>p.name===name)!);
  const {layout}=SURFACES[name]!;
  const evaluateSurface=evaluateSpecimenSurface;
  const roots=layout(s); expect(roots.length).toBe(s.instanceCount);
  for(const a of roots) {
    const origin=evaluateSurface(s,a,0.5,0,0);
    for(const progress of [0,0.08,0.3,0.57,0.9,1]) {
      expect(evaluateSurface(s,a,0.5,0,progress)).toEqual(origin);
      for(const u of [0,0.2,0.5,0.8,1]) for(const v of [0.1,0.5,0.85,1])
        expect(evaluateSurface(s,a,u,v,progress).every(Number.isFinite)).toBe(true);
    }
  }
});
test('triangle narrow phase rejects points beyond the triangle and detects both sides',()=>{
  const a:[number,number,number]=[0,0,0],b:[number,number,number]=[1,0,0],c:[number,number,number]=[0,1,0];
  expect(triangleContact([0.2,0.2,0.004],a,b,c,0.01)?.[2]).toBeCloseTo(0.006);
  expect(triangleContact([0.2,0.2,-0.004],a,b,c,0.01)?.[2]).toBeCloseTo(-0.006);
  expect(triangleContact([0.9,0.9,0.004],a,b,c,0.01)).toBeNull();
});
test('relaxation increases clearance without moving the attachment row',()=>{
  const p=new Float32Array([0,0,0,1,0,0,0,1,0, 0.2,0.1,0.003,0.2,0.2,0.003,0.2,0.3,0.003]);
  const report=relaxContacts(p,[0,1,2],3,1,0.01,2);
  expect(report.adjusted).toBeGreaterThan(0);
  expect(p[11]).toBeCloseTo(0.003);
  expect(p[14]).toBeGreaterThan(0.003);
});
test('edge sampling preserves UV endpoints and concentrates divisions at the margins',()=>{
  expect(edgeSample(0)).toBe(0); expect(edgeSample(1)).toBe(1);
  expect(edgeSample(1/32)).toBeLessThan(1/32);
  expect(1-edgeSample(31/32)).toBeLessThan(1/32);
});

test('every attachment socket sits inside the visible receptacle',()=>{
  for(const preset of PRESETS){const s=createSettings();assignPreset(s,preset);for(const a of SURFACES[s.name]!.layout(s)){
    const [x,y,z]=attachmentSocket(s,a);expect((x*x+z*z)/0.04+y*y/0.0049).toBeLessThan(1);
  }}
});
test('closed orchid tepals retain surface area rather than collapsing to curves',()=>{
  const s=createSettings();assignPreset(s,PRESETS.find(p=>p.name==='WildOrchid')!);
  const a=SURFACES.WildOrchid!.layout(s)[0]!;
  const left=evaluateSpecimenSurface(s,a,0.1,0.5,0),right=evaluateSpecimenSurface(s,a,0.9,0.5,0);
  expect(Math.hypot(...left.map((v,i)=>v-right[i]!))).toBeGreaterThan(0.1);
});

test('default dahlia layers remain staggered with organic angular variation',()=>{
  for(const name of ['VelvetDahlia','SunburstDahlia']) {
    const s=createSettings();assignPreset(s,PRESETS.find(p=>p.name===name)!);
    const roots=attachments(s),first=roots.filter(a=>a.ring===0),second=roots.filter(a=>a.ring===1);
    expect(first.length).toBe(second.length);
    const spacing=2*Math.PI/first.length;
    for(const a of second) {
      const nearest=Math.min(...first.map(b=>Math.abs(Math.atan2(Math.sin(a.angle-b.angle),Math.cos(a.angle-b.angle)))));
      expect(nearest).toBeGreaterThan(spacing*0.2);
      expect(nearest).toBeLessThan(spacing*0.7);
    }
  }
});
