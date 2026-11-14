import { Color, DoubleSide, MeshSSSNodeMaterial } from "three/webgpu";
import { abs, attribute, clamp, exp, float, frontFacing, mix, normalMap, pow, sin, smoothstep, texture, uniform, uv } from "three/tsl";
import type { FlowerSettings } from "./settings";
import { createSurfaceTextures } from "./surfaceTextures";

export const photographic = uniform(0);

/** Procedural pigment, longitudinal branching veins and restrained micro-normal.
 * No imported texture assets. UVs follow the petal surface on both sides. */
export function createSurfaceMaterial(s: FlowerSettings) {
  const bottom=uniform(new Color(s.materialColorBottom)), top=uniform(new Color(s.materialColorTop)), tip=uniform(new Color(s.materialTipColor));
  const roughness=uniform(s.materialRoughness), transmission=uniform(s.materialTransmission);
  const specular=uniform(s.materialSpecular);
  const radialInner=uniform(s.materialRadialInner),radialOuter=uniform(s.materialRadialOuter),radialPower=uniform(s.materialRadialPower),radialStrength=uniform(s.materialRadialStrength),radialFloor=uniform(s.materialRadialFloor);
  const maps=createSurfaceTextures(s.name==='StoneRosette');
  const p=uv(), across=p.x.sub(0.5).mul(2), along=p.y;
  const branch=sin(across.mul(35).add(along.mul(8))).mul(0.5).add(0.5);
  const veins=exp(abs(sin(across.mul(20).add(along.mul(4)))).mul(-22))
    .mul(smoothstep(0.05,0.25,along)).mul(float(1).sub(smoothstep(0.78,1,along)));
  const color=mix(mix(bottom,top,smoothstep(0.03,0.8,along)),tip,smoothstep(0.7,1,along).mul(0.65));
  const variation=sin(attribute("petalId","float").mul(371)).mul(0.035).add(0.965);
  const radialRamp=clamp(mix(radialInner,radialOuter,pow(attribute('radialT','float'),radialPower)),radialFloor,1.5);
  const pigment=color.mul(variation).mul(float(1).sub(veins.mul(0.065)).sub(branch.mul(0.016)))
    .mul(mix(1,radialRamp,radialStrength)).mul(mix(1,texture(maps.albedo,p).rgb,photographic.mul(0.7).add(0.3)));
  const material=new MeshSSSNodeMaterial({side:DoubleSide});
  material.colorNode=mix(pigment,pigment.mul(mix(0.88,1,frontFacing)),photographic);
  material.emissiveNode=pigment.mul(mix(0.025,0,photographic));
  material.roughnessNode=roughness.mul(mix(1,texture(maps.roughness,p).r.mul(0.35).add(0.7),photographic));
  material.specularIntensityNode=specular;
  material.normalNode=normalMap(texture(maps.normal,p));
  // Most petal translucency is diffuse back-scattering. Keep refractive
  // transmission small so overlapping petals do not read as colored glass.
  material.transmissionNode=transmission.mul(s.name==='StoneRosette'?0.12:0.08);
  material.thicknessNode=float(s.name==='StoneRosette'?0.22:0.045);
  material.thicknessColorNode=pigment;
  material.thicknessDistortionNode=float(0.3);
  material.thicknessAmbientNode=transmission.mul(0.015);
  material.thicknessAttenuationNode=float(0.45);
  material.thicknessPowerNode=float(1.5);
  material.thicknessScaleNode=transmission.mul(3)
    .mul(mix(0.55,1,smoothstep(0.15,0.85,along)))
    .mul(mix(0.15,1,pow(attribute('radialT','float'),1.5)));
  material.metalness=0; material.sheen=0.22;
  material.iorNode=float(1.36);
  return {material,update() {
    bottom.value.set(s.materialColorBottom); top.value.set(s.materialColorTop); tip.value.set(s.materialTipColor);
    roughness.value=s.materialRoughness; transmission.value=s.materialTransmission; material.wireframe=s.wireframe;
    specular.value=s.materialSpecular;
    radialInner.value=s.materialRadialInner;radialOuter.value=s.materialRadialOuter;radialPower.value=s.materialRadialPower;radialStrength.value=s.materialRadialStrength;radialFloor.value=s.materialRadialFloor;
  },dispose:()=>maps.dispose()};
}
