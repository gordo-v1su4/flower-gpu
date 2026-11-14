import type { Point } from "./surface";
const sub = (a: Point,b: Point): Point => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const dot = (a: Point,b: Point) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross = (a: Point,b: Point): Point => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

/** Signed distance to the plane only when its projection lies inside the triangle. */
export function triangleContact(p: Point,a: Point,b: Point,c: Point,padding: number): Point | null {
  const ab=sub(b,a), ac=sub(c,a), ap=sub(p,a), n=cross(ab,ac);
  const size=Math.sqrt(dot(n,n));
  if(size<1e-9) return null;
  const normal=n.map(v=>v/size) as Point;
  const d=dot(ap,normal);
  if(Math.abs(d)>=padding) return null;
  const aa=dot(ab,ab), bb=dot(ab,ac), cc=dot(ac,ac), pa=dot(ap,ab), pc=dot(ap,ac);
  const denom=aa*cc-bb*bb;
  if(denom<1e-12) return null;
  const u=(cc*pa-bb*pc)/denom, v=(aa*pc-bb*pa)/denom;
  if(u<0 || v<0 || u+v>1) return null;
  return normal.map(value=>value*(d<0?-1:1)*(padding-Math.abs(d))) as Point;
}

/** Spatial hash broad phase and point/triangle narrow phase. Corrections taper to zero
 * at roots, are bounded, and retain intended overlap. This is a sampled thin-surface
 * contact relaxation, not a certification of a continuously collision-free surface. */
export function relaxContacts(positions: Float32Array, indices: number[], perPetal: number, columns: number, padding=0.012, iterations=2) {
  const original=positions.slice(), cell=0.18;
  const point=(i:number):Point=>[positions[i*3]!,positions[i*3+1]!,positions[i*3+2]!];
  let contacts=0, adjusted=0;
  for(let pass=0;pass<iterations;pass++) {
    const bins=new Map<string,number[]>();
    for(let tri=0;tri<indices.length;tri+=3) {
      const a=point(indices[tri]!),b=point(indices[tri+1]!),c=point(indices[tri+2]!);
      const lo=a.map((v,k)=>Math.floor((Math.min(v,b[k]!,c[k]!)-padding)/cell));
      const hi=a.map((v,k)=>Math.floor((Math.max(v,b[k]!,c[k]!)+padding)/cell));
      for(let x=lo[0]!;x<=hi[0]!;x++) for(let y=lo[1]!;y<=hi[1]!;y++) for(let z=lo[2]!;z<=hi[2]!;z++) {
        const key=`${x},${y},${z}`; const bin=bins.get(key); if(bin) bin.push(tri); else bins.set(key,[tri]);
      }
    }
    for(let i=0;i<positions.length/3;i++) {
      const v=Math.floor((i%perPetal)/columns)/(perPetal/columns-1);
      if(v<0.15 || v>0.98) continue;
      const p=point(i), owner=Math.floor(i/perPetal);
      const key=p.map(value=>Math.floor(value/cell)).join(',');
      for(const tri of bins.get(key)??[]) {
        const ia=indices[tri]!;
        if(Math.floor(ia/perPetal)>=owner) continue;
        const delta=triangleContact(p,point(ia),point(indices[tri+1]!),point(indices[tri+2]!),padding);
        if(!delta) continue;
        contacts++;
        const weight=Math.min(1,(v-0.15)/0.2);
        for(let k=0;k<3;k++) {
          const offset=i*3+k;
          positions[offset]=Math.max(original[offset]!-0.025,Math.min(original[offset]!+0.025,positions[offset]!+delta[k]!*weight*0.65));
        }
        adjusted++; break;
      }
    }
  }
  return {contacts,adjusted};
}
