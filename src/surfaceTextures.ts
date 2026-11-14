import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, UnsignedByteType } from "three/webgpu";

/** Authored procedural texture maps, generated locally. No external image assets.
 * Veins converge at the root and branch toward the margin; correlated relief
 * drives the normal and roughness maps rather than uncorrelated white noise. */
export function createSurfaceTextures(succulent:boolean) {
  const size=512,albedo=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
  const heights=new Float32Array(size*size);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const u=x/(size-1)*2-1,v=y/(size-1),fan=u/(0.22+0.78*Math.sqrt(v+0.001));
    const rib=Math.exp(-u*u*650)*(1-v);
    const vein=Math.exp(-Math.abs(Math.sin(fan*27+v*3))*24)*(Math.sin(v*Math.PI)**0.5);
    const branches=Math.exp(-Math.abs(Math.sin(fan*45-Math.sin(v*12)*0.8))*35)*v*(1-v);
    const cells=Math.sin(u*215+Math.sin(v*31))*Math.sin(v*237+u*41)*0.002;
    const relief=succulent?rib*0.04+cells*0.35:rib*0.05+vein*0.027+branches*0.014+cells;
    heights[y*size+x]=relief;
    const color=succulent?0.96+Math.sin(u*13+v*17)*0.015:0.92+vein*0.065+branches*0.018+Math.sin(u*19+v*7)*0.017;
    const offset=(y*size+x)*4;
    for(let k=0;k<3;k++){albedo[offset+k]=Math.round(color*255);rough[offset+k]=Math.round((0.72-vein*0.1+cells*5)*255);}
    albedo[offset+3]=rough[offset+3]=255;
  }
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const dx=(heights[y*size+Math.min(size-1,x+1)]!-heights[y*size+Math.max(0,x-1)]!)*7;
    const dy=(heights[Math.min(size-1,y+1)*size+x]!-heights[Math.max(0,y-1)*size+x]!)*7;
    const len=Math.hypot(dx,dy,1),offset=(y*size+x)*4;
    normal[offset]=Math.round((-dx/len*0.5+0.5)*255);normal[offset+1]=Math.round((-dy/len*0.5+0.5)*255);normal[offset+2]=Math.round((1/len*0.5+0.5)*255);normal[offset+3]=255;
  }
  const make=(data:Uint8Array)=>{const t=new DataTexture(data,size,size,RGBAFormat,UnsignedByteType);t.magFilter=LinearFilter;t.minFilter=LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;};
  const maps={albedo:make(albedo),normal:make(normal),roughness:make(rough)};
  return {...maps,dispose(){for(const map of Object.values(maps))map.dispose();}};
}
